// Captain Model: Defines the schema for driver accounts
// This model stores driver information, vehicle details, and location data

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Define the captain (driver) schema
const captainSchema = new mongoose.Schema({
    // Driver's full name
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'Firstname must be at least 3 characters long'],
        },
        lastname: {
            type: String,
            minlength: [3, 'Lastname must be at least 3 characters long'],
        }
    },
    // Driver's email address (used for login)
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [ /^\S+@\S+\.\S+$/, 'Please enter a valid email' ]
    },
    // Hashed password for security
    password: {
        type: String,
        required: true,
        select: false,
    },
    // Phone number for ride notifications
    phone: {
        type: String,
        required: true,
        minlength: [10, 'Phone number must be at least 10 digits long'],
        select: true
    },
    // Vehicle information
    vehicle: {
        color: {
            type: String,
            required: true,
            minlength: [3, 'Color must be at least 3 characters long'],
        },
        plate: {
            type: String,
            required: true,
            minlength: [3, 'Plate must be at least 3 characters long'],
        },
        capacity: {
            type: Number,
            min: [1, 'Capacity must be at least 1'],
        },
        vehicleType: {
            type: String,
            required: true,
            enum: ['car', 'motorcycle', 'auto'],
        }
    },
    // Current location for ride matching
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            index: '2dsphere'
        }
    },
    // Socket ID for real-time communication
    socketId: {
        type: String,
    },
    // Driver's current status
    status: {
        type: String,
        enum: ['active', 'inactive', 'busy'],
        default: 'inactive'
    },
    // Whether driver is available for new rides
    isAvailable: {
        type: Boolean,
        default: true
    },
    // Driver's profile photo
    profilePhoto: {
        type: String,
        default: null
    },
    // Driver's current earnings
    earnings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create geospatial index for location queries
captainSchema.index({ location: '2dsphere' });

// Hash password before saving
captainSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password for login
captainSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
captainSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
};

// Static method to hash password
captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

// Register the model with proper name
const Captain = mongoose.model('Captain', captainSchema);

module.exports = Captain;