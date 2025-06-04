// Authentication Middleware: Handles user and captain authentication
// This middleware verifies JWT tokens and attaches user/captain data to requests

const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const captainModel = require('../models/captain.model');
const blacklistTokenModel = require('../models/blacklistToken.model');

// Middleware to authenticate regular users
// Used to protect user-specific routes
module.exports.authUser = async (req, res, next) => {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if token is blacklisted (e.g., after logout)
    const isBlacklisted = await blacklistTokenModel.findOne({ token: token });
    if (isBlacklisted) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify token and get user data
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id);
        req.user = user;
        return next();
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
}

// Middleware to authenticate captains (drivers)
// Used to protect captain-specific routes
module.exports.authCaptain = async (req, res, next) => {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if token is blacklisted
    const isBlacklisted = await blacklistTokenModel.findOne({ token: token });
    if (isBlacklisted) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify token and get captain data
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const captain = await captainModel.findById(decoded._id);
        req.captain = captain;
        return next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
}