// Ride Model: Defines the schema for ride requests and tracking
// This model stores all ride-related information including status, location, and payment details

const mongoose = require('mongoose');

// Define the ride schema
const rideSchema = new mongoose.Schema({
    // User who requested the ride
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Captain (driver) assigned to the ride
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Captain'
    },
    // Pickup location coordinates
    pickup: {
        type: String,
        required: true
    },
    // Destination location coordinates
    destination: {
        type: String,
        required: true
    },
    // Human-readable pickup address
    pickupAddress: {
        type: String,
        required: true
    },
    // Human-readable destination address
    destinationAddress: {
        type: String,
        required: true
    },
    // Type of vehicle requested
    vehicleType: {
        type: String,
        required: true,
        enum: ['car', 'motorcycle', 'bike']
    },
    // Current status of the ride
    status: {
        type: String,
        enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
        default: 'pending'
    },
    // Time when the ride was booked
    bookingTime: {
        type: Date,
        default: Date.now
    },
    // Time when the ride was scheduled (for future rides)
    scheduledTime: {
        type: Date
    },
    // Time when the ride started
    startTime: {
        type: Date
    },
    // Time when the ride ended
    endTime: {
        type: Date
    },
    // Distance of the ride in kilometers
    distance: {
        type: Number,
        default: 0
    },
    // Duration of the ride in minutes
    duration: {
        type: Number,
        default: 0
    },
    // Fare amount for the ride
    fare: {
        type: Number
    },
    // OTP for ride verification
    otp: {
        type: String,
        select: false // Hidden by default for security
    },
    // Payment status
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    // Payment method used
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'wallet'],
        default: 'cash'
    },
    // Rating given by user
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    // Review given by user
    review: {
        type: String
    },
    // now this made for payment 
    paymentId: {
        type: String
    },
    orderId: {
        type: String
    },
    signature:{
        type:String,
    },
    // Add a field to store captains who ignored this ride
    ignoredBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Captain'
        }
    ]
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create indexes for common queries
rideSchema.index({ user: 1, status: 1 });
rideSchema.index({ captain: 1, status: 1 });
rideSchema.index({ status: 1, bookingTime: 1 });

module.exports = mongoose.model('Ride', rideSchema);
