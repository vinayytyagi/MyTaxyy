const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ride = require('../models/ride.model');
const { authUser } = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');
const { sendMessageToSocketId } = require('../socket');
const captainModel = require('../models/captain.model');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
router.post('/create-order', authUser, async (req, res) => {
    try {
        const { rideId, amount } = req.body;

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `ride_${rideId}`,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order' });
    }
});

// Verify payment
router.post('/verify', authUser, async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            rideId
        } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Get ride details with captain
            const ride = await Ride.findById(rideId).populate('captain');
            if (!ride) {
                return res.status(404).json({ message: 'Ride not found' });
            }

            // Update ride status
            await Ride.findByIdAndUpdate(rideId, {
                paymentStatus: 'completed',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });

            // Notify captain about payment completion
            if (ride.captain && ride.captain.socketId) {
                sendMessageToSocketId(ride.captain.socketId, {
                    event: 'payment_completed',
                    data: {
                        rideId: ride._id,
                        amount: ride.fare,
                        paymentMethod: 'online'
                    }
                });
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Error verifying payment' });
    }
});

// Payment routes
router.post('/create-payment', authUser, paymentController.createPayment);
router.post('/verify-payment', authUser, paymentController.verifyPayment);
router.get('/payment-history', authUser, paymentController.getPaymentHistory);
router.get('/receipt/:paymentId', authUser, paymentController.generateReceipt);

module.exports = router; 