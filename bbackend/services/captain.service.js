// Captain Service: Handles captain (driver) related operations
// This service manages captain registration and profile management

const captainModel = require('../models/captain.model');

// Create a new captain account
// Used when a new driver signs up through the app
module.exports.createCaptain = async ({
    firstname, lastname, email, password, phone, color, plate, capacity, vehicleType
}) => {
    // Validate required fields
    if (!firstname || !email || !password || !phone || !color || !plate || !capacity || !vehicleType) {
        throw new Error('All fields are required');
    }

    // Create new captain in database with default location
    const captain = captainModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        phone,
        password,
        vehicle: {
            color,
            plate,
            capacity,
            vehicleType
        },
        location: {
            type: "Point",
            coordinates: [0, 0] // Default coordinates, will be updated when captain starts driving
        }
    });

    return captain;
}
