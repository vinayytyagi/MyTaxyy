const paymentModel = require('../models/payment.model');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');

// Process payment
const processPayment = async ({ rideId, amount, paymentMethod, userId }) => {
    try {
        // Create payment record
        const payment = await paymentModel.create({
            ride: rideId,
            user: userId,
            amount,
            paymentMethod,
            status: 'completed'
        });

        // Update ride status
        await rideModel.findByIdAndUpdate(rideId, {
            paymentStatus: 'completed',
            payment: payment._id
        });

        // Get ride details with captain
        const ride = await rideModel.findById(rideId)
            .populate('captain')
            .populate('user');

        if (!ride) {
            throw new Error('Ride not found');
        }

        // Update captain's earnings
        if (ride.captain) {
            await captainModel.findByIdAndUpdate(ride.captain._id, {
                $inc: { earnings: amount }
            });
        }

        return {
            payment,
            ride,
            message: 'Payment processed successfully'
        };
    } catch (error) {
        console.error('Error in processPayment service:', error);
        throw error;
    }
};

// Get payment history
const getPaymentHistory = async (userId) => {
    try {
        const payments = await paymentModel.find({ user: userId })
            .populate('ride')
            .sort({ createdAt: -1 });
        return payments;
    } catch (error) {
        console.error('Error in getPaymentHistory service:', error);
        throw error;
    }
};

// Get captain earnings
const getCaptainEarnings = async (captainId) => {
    try {
        const payments = await paymentModel.find({
            'ride.captain': captainId,
            status: 'completed'
        })
        .populate({
            path: 'ride',
            populate: {
                path: 'user',
                select: 'fullname'
            }
        })
        .sort({ createdAt: -1 });

        const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);

        return {
            payments,
            totalEarnings
        };
    } catch (error) {
        console.error('Error in getCaptainEarnings service:', error);
        throw error;
    }
};

module.exports = {
    processPayment,
    getPaymentHistory,
    getCaptainEarnings
}; 