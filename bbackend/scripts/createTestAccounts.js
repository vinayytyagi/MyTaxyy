const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
require('dotenv').config();

const createTestAccounts = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create test user
        const testUserPassword = await userModel.hashPassword('testuser');
        const testUser = await userModel.create({
            fullname: {
                firstname: 'Test',
                lastname: 'User'
            },
            email: 'testuser@gmail.com',
            password: testUserPassword
        });
        console.log('Test user created:', testUser.email);

        // Create test captain
        const testCaptainPassword = await captainModel.hashPassword('testcaptain');
        const testCaptain = await captainModel.create({
            fullname: {
                firstname: 'Test',
                lastname: 'Captain'
            },
            email: 'testcaptain@gmail.com',
            password: testCaptainPassword,
            vehicle: {
                color: 'Black',
                plate: 'TEST123',
                capacity: 4,
                vehicleType: 'car'
            },
            location: {
                type: 'Point',
                coordinates: [0, 0] // Default location
            }
        });
        console.log('Test captain created:', testCaptain.email);

        console.log('Test accounts created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating test accounts:', error);
        process.exit(1);
    }
};

createTestAccounts(); 