const captainModel=require('../models/captain.model');
const captainService=require('../services/captain.service');
const{validationResult}=require('express-validator')
const blacklistTokenModel = require('../models/blacklistToken.model');
const cloudinary = require('../config/cloudinary.config');
const fs = require('fs');
const path = require('path');
const CaptainDailyStats = require('../models/CaptainDailyStats');
const rideModel = require('../models/ride.model');

module.exports.registerCaptain=async(req,res,next)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    const {fullname,email,password,phone,vehicle}=req.body;

    const isCaptainAlreadyExist=await captainModel.findOne({email});
    if(isCaptainAlreadyExist){
        return res.status(400).json({message:'Captain Already Exists'});
    }

    const hashedPassword=await captainModel.hashPassword(password);
    const captain=await captainService.createCaptain({
        firstname:fullname.firstname,
        lastname:fullname.lastname,
        email,
        phone,
        password:hashedPassword,
        color:vehicle.color,
        plate:vehicle.plate,
        capacity:vehicle.capacity,
        vehicleType:vehicle.vehicleType
    });

    // now we create the token 
    const token= captain.generateAuthToken();
    res.status(201).json({
        token,
        captain,
    })

}

module.exports.loginCaptain=async(req,res,next)=>{

    const errors=validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }

    const {email,password}=req.body;

    const captain=await captainModel.findOne({email}).select('+password');
    if(!captain){
        return res.status(401).json({message:"Invalid email or password"});
    }
    // now we gonna check the password 
    const isMatch=await captain.comparePassword(password);
    if(!isMatch){
        return res.status(401).json({message:"Invalid email or password"});
    }
    const token=captain.generateAuthToken();
    // cookie creattion 
    res.cookie('token',token);

    res.status(200).json({token,captain});


}
module.exports.getCaptainProfile=async(req,res,next)=>{
    res.status(200).json(req.captain);
 }
module.exports.logoutCaptain=async(req,res,next)=>{
  
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blacklistTokenModel.create({ token });

    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}

module.exports.uploadProfilePhoto = async (req, res, next) => {
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
            folder: 'captain-profiles',
            resource_type: 'auto'
        });

        console.log('Cloudinary upload successful:', result);

        // Delete the temporary file after successful upload
        fs.unlinkSync(req.file.path);

        // Update captain's profile photo
        const captain = await captainModel.findByIdAndUpdate(
            req.captain._id,
            { profilePhoto: result.secure_url },
            { new: true }
        );

        console.log('Captain profile updated successfully');

        res.status(200).json({
            message: 'Profile photo uploaded successfully',
            profilePhoto: captain.profilePhoto
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

module.exports.updateCaptainProfile = async (req, res, next) => {
    try {
        const updates = {};
        const allowedFields = ['email', 'phone', 'fullname', 'vehicle'];

        // Only update fields that are provided in the request
        Object.keys(req.body).forEach(field => {
            if (allowedFields.includes(field)) {
                if (field === 'vehicle') {
                    // For vehicle updates, only include the fields that are provided
                    updates[field] = {};
                    Object.keys(req.body[field]).forEach(vehicleField => {
                        if (req.body[field][vehicleField]) {
                            updates[field][vehicleField] = req.body[field][vehicleField];
                        }
                    });
                } else {
                    updates[field] = req.body[field];
                }
            }
        });

        // If no valid fields to update
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        // Update the captain's profile
        const captain = await captainModel.findByIdAndUpdate(
            req.captain._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            data: captain
        });
    } catch (error) {
        console.error('Error updating captain profile:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ 
            message: 'Error updating profile',
            error: error.message 
        });
    }
};

// Get captain's daily stats
module.exports.getDailyStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let stats = await CaptainDailyStats.findOne({
            captainId: req.captain._id,
            date: today
        });

        if (!stats) {
            // Create new stats for today if none exists
            stats = await CaptainDailyStats.create({
                captainId: req.captain._id,
                date: today
            });
        }

        // Convert rideTime from minutes to hours for frontend
        const statsForFrontend = {
            earnings: stats.earnings,
            rides: stats.rides,
            rideTime: stats.rideTime / 60, // Convert to hours
            acceptance: Math.round(stats.acceptanceRate)
        };

        res.json(statsForFrontend);
    } catch (error) {
        console.error('Error getting daily stats:', error);
        res.status(500).json({ message: 'Error fetching daily stats' });
    }
};

// Reset captain's daily stats
module.exports.resetDailyStats = async (req, res) => {
    try {
        await CaptainDailyStats.resetStats(req.captain._id);
        res.json({ message: 'Daily stats reset successfully' });
    } catch (error) {
        console.error('Error resetting daily stats:', error);
        res.status(500).json({ message: 'Error resetting daily stats' });
    }
};

// Add function to ignore a ride
module.exports.ignoreRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;
    const captainId = req.captain._id;

    try {
        const ride = await rideModel.findById(rideId);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Add captain's ID to ignoredBy array if not already present
        if (!ride.ignoredBy.includes(captainId)) {
            ride.ignoredBy.push(captainId);
            await ride.save();
        }

        res.status(200).json({ message: 'Ride ignored successfully' });
    } catch (error) {
        console.error('Error ignoring ride:', error);
        res.status(500).json({ message: 'Error ignoring ride' });
    }
};