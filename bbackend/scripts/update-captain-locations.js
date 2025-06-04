const mongoose = require('mongoose');
const captainModel = require('../models/captain.model');
require('dotenv').config();

async function updateCaptainLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create 2dsphere index on location field
    await captainModel.collection.createIndex({ location: '2dsphere' });
    console.log('Created 2dsphere index on location field');

    // Find all captains with old location format
    const captains = await captainModel.find({
      'location.ltd': { $exists: true },
      'location.lng': { $exists: true }
    });
    console.log(`Found ${captains.length} captains with old location format`);

    // Update each captain to use the new location format
    for (const captain of captains) {
      const oldLocation = captain.location;
      const newLocation = {
        type: 'Point',
        coordinates: [oldLocation.lng, oldLocation.ltd] // [longitude, latitude]
      };

      await captainModel.findByIdAndUpdate(captain._id, {
        location: newLocation
      });
      console.log(`Updated captain ${captain._id}`);
    }

    console.log('All captains updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating captain locations:', error);
    process.exit(1);
  }
}

updateCaptainLocations(); 