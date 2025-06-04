const express=require('express');
const router=express.Router();
const {body, validationResult}=require('express-validator');
const captainController = require('../controllers/captain.controller');
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

router.post('/register',[
    body('email').isEmail().withMessage('Invalid email'),
    body('fullname.firstname').isLength({min:3}).withMessage('First name must have atleast 3 charater'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').isIn([ 'car', 'motorcycle', 'auto' ]).withMessage('Invalid vehicle type')
],captainController.registerCaptain);

router.post('/login',[
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
],
captainController.loginCaptain
);

router.get('/profile',authMiddleware.authCaptain,captainController.getCaptainProfile);
router.get('/logout',authMiddleware.authCaptain,captainController.logoutCaptain);

// Add PUT endpoint for updating profile
router.put('/profile', 
    authMiddleware.authCaptain,
    [
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('fullname.firstname').optional().isLength({min:3}).withMessage('First name must have atleast 3 characters'),
        body('fullname.lastname').optional().isLength({min:3}).withMessage('Last name must have atleast 3 characters'),
        body('phone').optional().isLength({min:10}).withMessage('Phone number must be atleast 10 digits'),
        body('vehicle.color').optional().isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
        body('vehicle.plate').optional().isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
        body('vehicle.vehicleType').optional().isIn([ 'car', 'motorcycle', 'auto' ]).withMessage('Invalid vehicle type')
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    captainController.updateCaptainProfile
);

router.post('/profile/photo', 
    authMiddleware.authCaptain,
    upload.single('profilePhoto'),
    (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    },
    captainController.uploadProfilePhoto
);

// Daily stats routes
router.get('/daily-stats', authMiddleware.authCaptain, captainController.getDailyStats);
router.post('/reset-daily-stats', authMiddleware.authCaptain, captainController.resetDailyStats);

// Add route for ignoring a ride
router.post('/ignore-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride ID'),
    captainController.ignoreRide
);

module.exports=router;