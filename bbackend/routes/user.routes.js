const express=require('express');
const router=express.Router();
const {body}=require('express-validator');
const userController=require('../controllers/user.controller');
const authMiddleware=require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and JPG are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

router.post('/register',[//this is the validation part
    body('email').isEmail().withMessage('Invalid Email format'),
    body('fullname.firstname').isLength({min:3}).withMessage('Firstname have minimum of 3 characters'),
    body('password').isLength({min:6}).withMessage('Password must have minimum 6 character'),
],
    userController.registerUser//this is the logic that run 
)
router.post('/login',[
    body('email').isEmail().withMessage('Invalid Email format'),
    body('password').isLength({min:6}).withMessage('Password must have minimum 6 character'),
],
    userController.userLogin,
)

router.get('/profile',authMiddleware.authUser,userController.getUserProfile);
router.get('/logout',authMiddleware.authUser,userController.logoutUser);

// Add new route for profile update
router.put('/profile', 
    authMiddleware.authUser,
    upload.single('profileImage'),
    [
        body('fullname.firstname').optional().isLength({min:3}).withMessage('Firstname must have minimum of 3 characters'),
        body('fullname.lastname').optional().isLength({min:3}).withMessage('Lastname must have minimum of 3 characters'),
        body('email').optional().isEmail().withMessage('Invalid Email format'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    ],
    userController.updateUserProfile
);

// Add new route for profile photo upload
router.post('/profile/photo', 
    authMiddleware.authUser,
    upload.single('profilePhoto'),
    (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    },
    userController.uploadProfilePhoto
);

module.exports=router;