const userModel=require('../models/user.model');
// from this we create the entry of user in the mongoose 
const userService=require('../services/user.service');
// this take the validation result 
const {validationResult}=require('express-validator')
const blackListTokenModel=require('../models/blacklistToken.model');
const cloudinary = require('../config/cloudinary.config');
const fs = require('fs');

// this is the logic for registering thte user 
const registerUser=async(req,res,next)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()){
        res.status(400).json({errors:errors.array()});
    }
    const {fullname,lastname,email,password}=req.body;
    const isUserAlreadyExist=await userModel.findOne({email});
    if(isUserAlreadyExist){
        return res.status(400).json({message:"User Already Exist"});
    }
    //now w go for hashing the password whose logic is already return in userModel
    const hashedPassword=await userModel.hashPassword(password);
    // now we create the user whose logic is written in the service section 
    const user=await userService.createUser({
        firstname:fullname.firstname,
        lastname:fullname.lastname,
        email,
        password:hashedPassword,
    });

    // now we create the token whose logic is written the usermodel 
    const token=user.generateAuthToken();

    res.status(201).json({
        token,
        user,
    })
}

const userLogin=async(req,res,next)=>{

    // this is to handle the validation error 
    const errors=validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // now we find out weather user exist or not 
    const {email,password}=req.body;

    // in this we add the +password because select is false in model for password hence we use it to fetch in the query 
    const user=await userModel.findOne({email}).select('+password');
    if(!user){
        return res.status(401).json({
            message:"Invalid Email go the registration",
        });
    }

    // now we match the password 
    const isMatch=await user.comparePassword(password);

    if(!isMatch){
        return res.status(401).json({ message:"Invalid email or password"});
    }

    const token=user.generateAuthToken();
    res.cookie('token',token);

    res.status(200).json({token,user});
}


const getUserProfile=async(req,res,next)=>{
   res.status(200).json(req.user);
}


const logoutUser = async (req, res, next) => {
    res.clearCookie('token');
    const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.status(200).json({ message: 'Logged out' });

}

const updateUserProfile = async (req, res) => {
    try {
        const { fullname, email, phone } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!fullname || !fullname.firstname) {
            return res.status(400).json({
                success: false,
                message: 'First name is required'
            });
        }

        // Build update object
        const updateData = {
            fullname: {
                firstname: fullname.firstname,
                lastname: fullname.lastname || ''
            },
            email,
            phone
        };

        // If a new profile image was uploaded, add it to update data
        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        // Update user profile
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

const uploadProfilePhoto = async (req, res, next) => {
    try {
        console.log('Upload request received:', req.file);
        
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path); // Delete the file
            return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and JPG are allowed.' });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path); // Delete the file
            return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
        }

        console.log('Uploading to Cloudinary...');
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'user-profiles',
            resource_type: 'auto'
        });

        console.log('Cloudinary upload successful:', result);

        // Delete the temporary file after successful upload
        fs.unlinkSync(req.file.path);

        // Update user's profile photo
        const user = await userModel.findByIdAndUpdate(
            req.user._id,
            { profilePhoto: result.secure_url },
            { new: true }
        );

        console.log('User profile updated successfully');

        res.status(200).json({
            message: 'Profile photo uploaded successfully',
            profilePhoto: user.profilePhoto
        });
    } catch (error) {
        console.error('Error in uploadProfilePhoto:', error);
        
        // Clean up the temporary file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
        
        res.status(500).json({ 
            message: 'Error uploading profile photo',
            error: error.message 
        });
    }
};

module.exports = {
    registerUser,
    userLogin,
    getUserProfile,
    logoutUser,
    updateUserProfile,
    uploadProfilePhoto
};