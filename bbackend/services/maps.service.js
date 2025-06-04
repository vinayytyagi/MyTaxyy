// Maps Service: Handles all location-based operations using Google Maps API
// This service converts addresses to coordinates, finds nearby captains, and calculates distances

const captainModel = require('../models/captain.model');
const axios = require('axios');

// Convert address to coordinates (latitude, longitude)
// Used when user enters pickup/destination addresses
module.exports.getAddressCoordinate = async (address) => {
    const apiKey = process.env.GOOGLE_MAPS_API;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            const location = response.data.results[0].geometry.location;
            return {
                ltd: location.lat,
                lng: location.lng
            };
        } else {
            throw new Error('Unable to fetch the coordinates');
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error.message);
        throw error;
    }
}

// Convert coordinates back to address
// Used for displaying readable addresses in the UI
module.exports.getAddressFromCoordinates = async (lat, lng) => {
    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            return response.data.results[0].formatted_address;
        } else {
            throw new Error('Unable to fetch the address');
        }
    } catch (error) {
        console.error('Error fetching address:', error.message);
        throw error;
    }
}

// Calculate distance and duration between two points
// Used for fare calculation and ETA estimation
module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            if (response.data.rows[0].elements[0].status === 'ZERO_RESULTS') {
                throw new Error('No routes found');
            }
            return response.data.rows[0].elements[0];
        } else {
            throw new Error('Unable to fetch distance and time');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// Get address suggestions as user types
// Used for autocomplete in pickup/destination fields
module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:in&types=address`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
            return response.data.predictions.map(prediction => prediction.description).filter(value => value);
        } else {
            console.error('Google Places API error:', response.data);
            throw new Error(`Google Places API error: ${response.data.status}`);
        }
    } catch (err) {
        console.error('Error in getAutoCompleteSuggestions:', err);
        if (err.response) {
            console.error('API Response:', err.response.data);
        }
        throw new Error('Unable to fetch suggestions');
    }
}

// Find nearby captains within a radius
// Used when matching riders with available captains
module.exports.getCaptainsInTheRadius = async (ltd, lng, radius, vehicleType) => {
    // Map 'moto' to 'motorcycle' for database query
    const dbVehicleType = vehicleType === 'moto' ? 'motorcycle' : vehicleType;

    // Find captains with matching vehicle type within radius
    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [[lng, ltd], radius / 6371] // Convert km to radians
            }
        },
        'vehicle.vehicleType': dbVehicleType
    });

    return captains;
}
