// User Service: Handles user-related operations
// This service manages user creation and authentication

const userModel = require('../models/user.model');

// Create a new user account
// Used when a new user signs up through the app
module.exports.createUser = async ({
    firstname, lastname, email, password
}) => {
    // Validate required fields
    if (!firstname || !email || !password) {
        throw new Error('All fields are required');
    }

    // Create new user in database
    const user = userModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password
    });

    return user;
}