// Ride Controller: Handles all ride-related operations
// This file manages ride creation, status updates, and ride history

const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const rideModel = require('../models/ride.model');
const { sendMessageToSocketId } = require('../socket');
const captainModel = require('../models/captain.model');

// Create a new ride request
// Frontend flow: User enters pickup/destination -> This endpoint creates ride -> Notifies nearby captains
const createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType, scheduledTime } = req.body;

    try {
        // Convert addresses to coordinates using Google Maps API
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        const destinationCoordinates = await mapService.getAddressCoordinate(destination);

        if (!pickupCoordinates || !destinationCoordinates) {
            return res.status(400).json({ message: 'Invalid pickup or destination address' });
        }

        // Create ride object with all necessary data
        const rideData = {
            user: req.user._id,
            pickup: `${pickupCoordinates.ltd},${pickupCoordinates.lng}`,
            destination: `${destinationCoordinates.ltd},${destinationCoordinates.lng}`,
            pickupAddress: pickup,
            destinationAddress: destination,
            vehicleType,
            bookingTime: new Date(),
            scheduledTime: scheduledTime ? new Date(scheduledTime) : null
        };

        // Save ride to database
        const ride = await rideService.createRide(rideData);
        
        // Find and notify nearby captains with matching vehicle type
        const captainsInRadius = await mapService.getCaptainsInTheRadius(
            pickupCoordinates.ltd, 
            pickupCoordinates.lng, 
            100, // radius in km
            vehicleType
        );

        // Send ride details to all nearby captains
        if (ride) {
            const rideWithUser = await rideModel.findOne({ _id: ride._id })
                .populate('user')
                .select('+distance +duration');
            
            captainsInRadius.forEach(captain => {
                if (captain.socketId) {
                    sendMessageToSocketId(captain.socketId, {
                        event: 'new-ride',
                        data: rideWithUser
                    });
                }
            });
        }

        // Send response to user after all operations
        return res.status(201).json(ride);

    } catch (err) {
        console.error('Error creating ride:', err);
        return res.status(500).json({ message: err.message });
    }
};

// Calculate fare for a ride
// Frontend flow: User enters pickup/destination -> This endpoint calculates fare -> Shows to user
const getFare = async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { pickup, destination } = req.query;
    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// Captain accepts a ride
// Frontend flow: Captain accepts ride -> This endpoint updates ride status -> Notifies user
const confirmRide = async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });
        
        // Get updated ride with populated fields
        const updatedRide = await rideModel.findOne({ _id: rideId })
            .populate('user')
            .populate({
                path: 'captain',
                select: 'fullname phone vehicle.color vehicle.plate vehicle.vehicleType avatar profilePhoto',
                model: 'Captain'
            })
            .select('+otp');

        if (!updatedRide) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Send OTP to user for ride verification
        sendMessageToSocketId(updatedRide.user.socketId, {
            event: 'ride-confirmed',
            data: {
                ...updatedRide.toObject(),
                otp: updatedRide.otp
            }
        });
        
        return res.status(200).json(updatedRide);
    } catch (err) {
        console.error('Error confirming ride:', err);
        return res.status(500).json({ message: err.message });
    }
}

// Start a ride with OTP verification
// Frontend flow: Captain enters OTP -> This endpoint verifies and starts ride -> Updates status
const startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;
    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        // Notify user that ride has started
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// End a ride
// Frontend flow: Captain ends ride -> This endpoint updates status -> Triggers payment
const endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        // Notify user that ride has ended
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// Get user's active ride
// Frontend flow: User opens app -> This endpoint checks for active ride -> Shows ride status
const getActiveRideForUser = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Check and cancel any old pending rides
        await checkAndCancelOldPendingRides();
        
        const activeRide = await rideModel.findOne({
            user: userId,
            status: { $in: ['accepted', 'ongoing'] }
        }).populate({
            path: 'captain',
            select: 'fullname phone vehicle.color vehicle.plate vehicle.vehicleType avatar',
            model: 'Captain'
        });

        if (!activeRide) {
            return res.status(404).json({ message: 'No active ride found' });
        }

        res.status(200).json({ ride: activeRide });
    } catch (error) {
        console.error('Error getting active ride:', error);
        res.status(500).json({ message: 'Error getting active ride' });
    }
};

// Get user's ride history
// Frontend flow: User views history -> This endpoint fetches past rides -> Shows in UI
const getRideHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const ridesPerPage = 10;
        const skip = (page - 1) * ridesPerPage;
        
        // Get total count of rides for the user
        const totalRides = await rideModel.countDocuments({
            user: userId,
            status: { $in: ['completed', 'cancelled', 'ongoing', 'pending'] }
        });
        
        const totalPages = Math.ceil(totalRides / ridesPerPage);
        
        // Get paginated rides with captain information
        const rides = await rideModel.find({
            user: userId,
            status: { $in: ['completed', 'cancelled', 'ongoing', 'pending'] }
        })
        .sort({ bookingTime: -1 })
        .skip(skip)
        .limit(ridesPerPage)
        .populate({
            path: 'captain',
            select: 'fullname phone vehicle.color vehicle.plate vehicle.vehicleType',
            model: 'Captain'
        });

        // Map through rides to include payment information
        const mappedRides = rides.map(ride => {
            const rideObj = ride.toObject();
            if (rideObj.status === 'pending' && rideObj.captain) {
                rideObj.status = 'cancelled';
            }
            
            // Add payment information if available
            if (rideObj.paymentId) {
                rideObj.payment = {
                    paymentId: rideObj.paymentId,
                    orderId: rideObj.orderId,
                    status: rideObj.paymentStatus,
                    paymentMethod: rideObj.paymentMethod
                };
            }
            
            return rideObj;
        });
        
        res.status(200).json({ 
            rides: mappedRides,
            pagination: {
                currentPage: page,
                totalPages,
                totalRides,
                ridesPerPage,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error getting ride history:', error);
        res.status(500).json({ message: 'Error getting ride history' });
    }
};

// Get captain's ride history
// Frontend flow: Captain views history -> This endpoint fetches past rides -> Shows in UI
const getCaptainRideHistory = async (req, res) => {
    try {
        const captainId = req.captain._id;

        // Find all rides for this captain, sorted by createdAt in descending order
        const rides = await rideModel.find({ captain: captainId })
            .sort({ createdAt: -1 })
            .populate('user', 'fullname phone email')
            .lean();

        res.json({
            success: true,
            rides: rides
        });
    } catch (error) {
        console.error('Error fetching captain ride history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ride history'
        });
    }
};

// Get captain's daily earnings
// Frontend flow: Captain views earnings -> This endpoint calculates earnings -> Shows in UI
const getCaptainDailyEarnings = async (req, res) => {
    try {
        const captainId = req.captain._id;
        
        // Get today's start and end time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all completed rides for today
        const rides = await rideModel.find({
            captain: captainId,
            status: 'completed',
            updatedAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Calculate total earnings
        const totalEarnings = rides.reduce((sum, ride) => sum + ride.fare, 0);

        res.status(200).json({ 
            totalEarnings,
            rideCount: rides.length
        });
    } catch (error) {
        console.error('Error getting captain daily earnings:', error);
        res.status(500).json({ message: 'Error getting daily earnings' });
    }
};

// Update ride status (e.g., cancel ride)
// Frontend flow: User cancels ride -> This endpoint updates status -> Notifies captain
const updateRideStatus = async (req, res) => {
    try {
        const { rideId, status } = req.body;
        
        const ride = await rideModel.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Only allow status updates for rides belonging to the user
        if (ride.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this ride' });
        }

        ride.status = status;
        await ride.save();

        res.json({ message: 'Ride status updated successfully', ride });
    } catch (error) {
        console.error('Error updating ride status:', error);
        res.status(500).json({ message: 'Error updating ride status' });
    }
};

// Helper function to cancel old pending rides
const checkAndCancelOldPendingRides = async () => {
    try {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        
        const oldPendingRides = await rideModel.find({
            status: 'pending',
            bookingTime: { $lt: oneMinuteAgo }
        });

        for (const ride of oldPendingRides) {
            ride.status = 'cancelled';
            await ride.save();
            
            if (ride.user.socketId) {
                sendMessageToSocketId(ride.user.socketId, {
                    event: 'ride-cancelled',
                    data: { rideId: ride._id, reason: 'No captain found within time limit' }
                });
            }
        }

        return oldPendingRides.length;
    } catch (error) {
        console.error('Error checking old pending rides:', error);
        return 0;
    }
};

module.exports = {
    createRide,
    getFare,
    confirmRide,
    startRide,
    endRide,
    getActiveRideForUser,
    getRideHistory,
    getCaptainRideHistory,
    getCaptainDailyEarnings,
    updateRideStatus,
    checkAndCancelOldPendingRides
};
