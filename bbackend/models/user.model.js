// User Model: Defines the schema for user accounts
// This model stores user information and authentication details

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Define the user schema
const userSchema = new mongoose.Schema({
    // User's full name with first and last name
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'First name must have length 3 characters'],
            trim: true
        },
        lastname: {
            type: String,
            minlength: [3, 'Last name must have length 3 characters'],
            trim: true
        },
    },
    // User's email address (used for login)
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: [5, 'Email must have atleast 5 characters'],
        trim: true,
        lowercase: true
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
        trim: true
    },
    // Socket ID for real-time communication
    socketId: {
        type: String,
        default: null
    },
    // User's current location (for ride tracking)
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    profilePhoto: {
        type: String,
        default: null
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create geospatial index for location queries
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

// Register the model with proper name
const User = mongoose.model('User', userSchema);

module.exports = User;