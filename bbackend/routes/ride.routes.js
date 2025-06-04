const express=require('express');
const router=express.Router();
const {body,query}=require('express-validator');
const rideController=require('../controllers/ride.controller');
const authMiddleware=require('../middlewares/auth.middleware');
const rideModel = require('../models/ride.model');

router.post('/create',authMiddleware.authUser,
    body('pickup').isString().isLength({min:3}).withMessage('Invalid pickup address'),
    body('destination').isString().isLength({min:3}).withMessage('Invalid destination address'),
    body('vehicleType').isString().isIn(['auto','car','motorcycle','moto']).withMessage('Invalid vehicle'),
    rideController.createRide
)
router.get('/get-fare',
    authMiddleware.authUser,
    query('pickup').isString().isLength({min:3}).withMessage('Invalid pickup address'),
    query('destination').isString().isLength({min:3}).withMessage('Invalid destination address'),
    rideController.getFare
) 
router.post('/confirm',authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('otp').isString().isLength({min:6,max:6}).withMessage('Invalid otp'),
    rideController.confirmRide
)
router.get('/start-ride',authMiddleware.authCaptain,
    query('rideId').isMongoId().withMessage('Invalid ride id'),
    query('otp').isString().isLength({min:6,max:6}).withMessage('Invalid otp'),
    rideController.startRide
)
router.post('/end-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.endRide
)

// Add cash payment confirmation endpoint
router.post('/:rideId/cash-payment',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    async (req, res) => {
        try {
            const { rideId } = req.params;
            const ride = await rideModel.findById(rideId);
            
            if (!ride) {
                return res.status(404).json({ message: 'Ride not found' });
            }

            // Update ride payment status
            await rideModel.findByIdAndUpdate(rideId, {
                paymentStatus: 'completed',
                paymentMethod: 'cash'
            });

            // Notify user about cash payment confirmation
            if (ride.user && ride.user.socketId) {
                sendMessageToSocketId(ride.user.socketId, {
                    event: 'payment_completed',
                    data: {
                        rideId: ride._id,
                        amount: ride.fare,
                        paymentMethod: 'cash'
                    }
                });
            }

            res.json({ success: true, message: 'Cash payment confirmed' });
        } catch (error) {
            console.error('Error confirming cash payment:', error);
            res.status(500).json({ message: 'Error confirming cash payment' });
        }
    }
);

router.get('/active', authMiddleware.authUser, rideController.getActiveRideForUser);
router.get('/history', authMiddleware.authUser, rideController.getRideHistory);
router.get('/captain/history', authMiddleware.authCaptain, rideController.getCaptainRideHistory);
router.get('/captain/daily-earnings', authMiddleware.authCaptain, rideController.getCaptainDailyEarnings);
router.post('/update-status', 
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('status').isString().isIn(['cancelled', 'completed', 'in_progress']).withMessage('Invalid status'),
    rideController.updateRideStatus
);

// Get available rides for captain
router.get('/available', authMiddleware.authCaptain, async (req, res) => {
    try {
        const captainId = req.captain.id;
        
        // Find rides that are:
        // 1. Not completed
        // 2. Not cancelled
        // 3. Not already assigned to another captain
        // 4. Not ignored by the current captain
        const availableRides = await rideModel.find({
            status: { $in: ['pending', 'accepted'] },
            captain: { $exists: false },
            ignoredBy: { $nin: [captainId] }
        })
        .populate('user', 'fullname profilePhoto')
        .sort({ createdAt: -1 });

        res.json({ rides: availableRides });
    } catch (error) {
        console.error('Error fetching available rides:', error);
        res.status(500).json({ message: 'Error fetching available rides' });
    }
});

module.exports=router;
