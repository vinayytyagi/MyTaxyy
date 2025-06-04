const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ride = require('../models/ride.model');
const Payment = require('../models/payment.model');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment
exports.createPayment = async (req, res) => {
    try {
        const { rideId, amount } = req.body;

        // Validate ride
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Create Razorpay order
        const options = {
            amount: amount * 100, // amount in smallest currency unit
            currency: 'INR',
            receipt: `receipt_${rideId}`,
            notes: {
                rideId: rideId
            }
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ message: 'Error creating payment' });
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            rideId
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Create payment record
            const payment = new Payment({
                userId: req.user._id,
                rideId,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                amount: req.body.amount,
                status: 'completed'
            });
            await payment.save();

            // Update ride status
            await Ride.findByIdAndUpdate(rideId, {
                paymentStatus: 'completed',
                status: 'completed'
            });

            res.json({ 
                success: true, 
                message: 'Payment verified successfully',
                paymentId: payment._id 
            });
        } else {
            res.status(400).json({ message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ message: 'Error verifying payment' });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user._id })
            .populate('rideId')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ message: 'Error fetching payment history' });
    }
};

// Generate payment receipt
exports.generateReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        // Find payment by Razorpay payment ID instead of MongoDB _id
        const payment = await Payment.findOne({ paymentId: paymentId })
            .populate({
                path: 'rideId',
                populate: [
                    { path: 'user', select: 'name email phone' },
                    { path: 'captain', select: 'name phone vehicleNumber vehicleType' }
                ]
            });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Generate receipt data
        const receipt = {
            receiptNumber: `REC-${payment._id.toString().slice(-6).toUpperCase()}`,
            date: payment.createdAt,
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            ride: {
                pickup: payment.rideId.pickupAddress,
                destination: payment.rideId.destinationAddress,
                distance: payment.rideId.distance,
                duration: payment.rideId.duration,
                fare: payment.rideId.fare
            },
            user: {
                name: payment.rideId.user.name,
                email: payment.rideId.user.email,
                phone: payment.rideId.user.phone
            },
            captain: payment.rideId.captain ? {
                name: payment.rideId.captain.name,
                phone: payment.rideId.captain.phone,
                vehicleNumber: payment.rideId.captain.vehicleNumber,
                vehicleType: payment.rideId.captain.vehicleType
            } : null
        };

        res.json(receipt);
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ message: 'Error generating receipt' });
    }
}; 