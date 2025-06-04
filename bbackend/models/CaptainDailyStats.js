const mongoose = require('mongoose');

const captainDailyStatsSchema = new mongoose.Schema({
    captainId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Captain',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    earnings: {
        type: Number,
        default: 0
    },
    rides: {
        type: Number,
        default: 0
    },
    rideTime: {
        type: Number, // in minutes
        default: 0
    },
    acceptanceRate: {
        type: Number,
        default: 0
    },
    totalRidesOffered: {
        type: Number,
        default: 0
    },
    completedRides: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index to ensure one stats document per captain per day
captainDailyStatsSchema.index({ captainId: 1, date: 1 }, { unique: true });

// Method to reset stats for a new day
captainDailyStatsSchema.statics.resetStats = async function(captainId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.findOneAndUpdate(
        { captainId, date: today },
        {
            earnings: 0,
            rides: 0,
            rideTime: 0,
            acceptanceRate: 0,
            totalRidesOffered: 0,
            completedRides: 0
        },
        { upsert: true, new: true }
    );
};

// Method to update stats for a completed ride
captainDailyStatsSchema.statics.updateStats = async function(captainId, rideData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.findOneAndUpdate(
        { captainId, date: today },
        {
            $inc: {
                earnings: rideData.fare || 0,
                rides: 1,
                rideTime: rideData.rideTime || 0,
                completedRides: 1
            }
        },
        { upsert: true, new: true }
    );

    // Update acceptance rate
    if (stats) {
        stats.acceptanceRate = (stats.completedRides / stats.totalRidesOffered) * 100;
        await stats.save();
    }

    return stats;
};

// Method to increment total rides offered
captainDailyStatsSchema.statics.incrementRidesOffered = async function(captainId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.findOneAndUpdate(
        { captainId, date: today },
        { $inc: { totalRidesOffered: 1 } },
        { upsert: true, new: true }
    );

    // Update acceptance rate
    if (stats) {
        stats.acceptanceRate = (stats.completedRides / stats.totalRidesOffered) * 100;
        await stats.save();
    }

    return stats;
};

const CaptainDailyStats = mongoose.model('CaptainDailyStats', captainDailyStatsSchema);

module.exports = CaptainDailyStats; 