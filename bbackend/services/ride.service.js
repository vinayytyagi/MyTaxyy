const rideModel = require('../models/ride.model');
const mapService = require('../services/maps.service');
const crypto = require('crypto');
const CaptainDailyStats = require('../models/CaptainDailyStats');

// Generate OTP
const generateOTP = (length = 6) => {
    try {
        return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
    } catch (error) {
        console.error('Error generating OTP:', error);
        // Fallback to a simpler OTP generation if crypto.randomInt fails
        return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    }
};

// Calculate fare for a ride
const getFare = async (pickup, destination) => {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        car: 50,
        auto: 30,
        motorcycle: 20,
        moto: 20  // Add moto as alias for motorcycle
    };

    const perKmRate = {
        car: 12,
        auto: 10,
        motorcycle: 8,
        moto: 8  // Add moto as alias for motorcycle
    };

    const perMinuteRate = {
        car: 2,
        auto: 1.8,
        motorcycle: 1.5,
        moto: 1.5  // Add moto as alias for motorcycle
    };

    const calculateFare = (distanceTime, vehicleType) => {
        // Map 'moto' to 'motorcycle' for calculations
        const type = vehicleType === 'moto' ? 'motorcycle' : vehicleType;
        
        if (type === 'car') {
            return Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car) + ((distanceTime.duration.value / 60) * perMinuteRate.car));
        } else if (type === 'auto') {
            return Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto) + ((distanceTime.duration.value / 60) * perMinuteRate.auto));
        } else if (type === 'motorcycle') {
            return Math.round(baseFare.motorcycle + ((distanceTime.distance.value / 1000) * perKmRate.motorcycle) + ((distanceTime.duration.value / 60) * perMinuteRate.motorcycle));
        }
        return 0;
    };

    const fare = {
        auto: calculateFare(distanceTime, 'auto'),
        car: calculateFare(distanceTime, 'car'),
        motorcycle: calculateFare(distanceTime, 'motorcycle'),
        moto: calculateFare(distanceTime, 'moto')  // Add moto fare calculation
    };

    return fare;
};

// Create a new ride
const createRide = async ({ user, pickup, destination, vehicleType, pickupAddress, destinationAddress, bookingTime, scheduledTime }) => {
    if (!user || !pickup || !destination || !vehicleType || !pickupAddress || !destinationAddress) {
        throw new Error('All fields are required');
    }

    try {
        const fare = await getFare(pickupAddress, destinationAddress);
        const distanceTime = await mapService.getDistanceTime(pickupAddress, destinationAddress);
        
        // Calculate ride time based on distance (50 seconds per km)
        const distanceInKm = distanceTime.distance.value / 1000;
        const estimatedRideTimeInMinutes = (distanceInKm * 50) / 60; // Convert seconds to minutes
        
        const ride = await rideModel.create({
            user,
            pickup,
            destination,
            pickupAddress,
            destinationAddress,
            vehicleType,
            otp: generateOTP(),
            fare: fare[vehicleType],
            distance: distanceInKm,
            duration: estimatedRideTimeInMinutes, // Store estimated ride time in minutes
            bookingTime: bookingTime || new Date(),
            scheduledTime
        });
        return ride;
    } catch (error) {
        console.error('Error in createRide service:', error);
        throw error;
    }
};

// Confirm a ride
const confirmRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    try {
        // Update ride status and assign captain
        await rideModel.findOneAndUpdate(
            { _id: rideId },
            { 
                status: 'accepted',
                captain: captain._id
            }
        );

        // Increment total rides offered in captain's daily stats
        await CaptainDailyStats.incrementRidesOffered(captain._id);

        // Get updated ride with populated fields
        const ride = await rideModel.findOne({ _id: rideId })
            .populate('user')
            .populate('captain')
            .select('+otp');

        if (!ride) {
            throw new Error('Ride not found');
        }

        return ride;
    } catch (error) {
        console.error('Error in confirmRide service:', error);
        throw error;
    }
};

// Start a ride
const startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    try {
        const ride = await rideModel.findOne({ _id: rideId })
            .populate('user')
            .populate('captain')
            .select('+otp');

        if (!ride) {
            throw new Error('Ride not found');
        }

        if (ride.status !== 'accepted') {
            throw new Error('Ride not accepted');
        }

        if (ride.otp !== otp.trim()) {
            throw new Error('Invalid OTP');
        }

        await rideModel.findOneAndUpdate(
            { _id: rideId },
            { status: 'ongoing' }
        );

        return ride;
    } catch (error) {
        console.error('Error in startRide service:', error);
        throw error;
    }
};

// End a ride
const endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    try {
        const ride = await rideModel.findOne({
            _id: rideId,
            captain: captain._id
        })
        .select('+distance +duration') // Explicitly select these fields
        .populate('user')
        .populate('captain')
        .select('+otp');

        if (!ride) {
            throw new Error('Ride not found');
        }

        if (ride.status !== 'ongoing') {
            throw new Error('Ride not ongoing');
        }

        // Ensure distance is a valid number, default to 0 if not
        const distance = parseFloat(ride.distance) || 0;
        
        // Calculate actual ride time based on distance (50 seconds per km)
        // Ensure we have a valid number by using Math.max
        const actualRideTimeInMinutes = Math.max(0, (distance * 50) / 60);

        console.log('Ride details:', {
            distance,
            actualRideTimeInMinutes,
            fare: ride.fare
        });

        // Update ride status and actual duration
        await rideModel.findOneAndUpdate(
            { _id: rideId },
            { 
                status: 'completed',
                duration: actualRideTimeInMinutes // Update with actual ride time
            }
        );

        // Update captain's daily stats with actual ride time
        await CaptainDailyStats.updateStats(captain._id, {
            fare: ride.fare || 0,
            rideTime: actualRideTimeInMinutes // duration is in minutes
        });

        return ride;
    } catch (error) {
        console.error('Error in endRide service:', error);
        throw error;
    }
};

module.exports = {
    getFare,
    createRide,
    confirmRide,
    startRide,
    endRide
};