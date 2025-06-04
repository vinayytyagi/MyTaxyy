// Socket.io implementation for real-time communication between users, captains, and the server
// This file handles all real-time events like ride requests, location updates, and ride status changes

const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');

let io;

function initializeSocket(server) {
    // Configure CORS for socket.io to allow connections from frontend
    const corsOptions = {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://mytaxy.vercel.app', 'http://localhost:5173'],
        methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST'],
        credentials: process.env.CORS_CREDENTIALS === 'true',
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Content-Type', 'Authorization']
    };

    // Initialize socket.io with the server
    io = socketIo(server, {
        cors: corsOptions
    });

    // Handle new client connections
    io.on("connection", (socket) => {
        console.log(`Client connected:${socket.id}`);

        // When a user or captain joins the app
        socket.on('join', async (data) => {
            const { userId, userType } = data;
            console.log(`User ${userId} joined as ${userType}`);
            
            // Update user's socket ID in database for real-time communication
            if (userType === "user") {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } 
            // Update captain's socket ID and status
            else if (userType === "captain") {
                await captainModel.findByIdAndUpdate(userId, {
                    socketId: socket.id,
                    status: 'active'
                });

                // Send available rides to newly connected captain
                try {
                    const availableRides = await rideModel.find({
                        status: { $in: ['pending', 'accepted'] },
                        captain: { $exists: false }
                    })
                    .select('+distance +duration')
                    .sort({ createdAt: -1 });

                    if (availableRides.length > 0) {
                        socket.emit('available-rides', availableRides);
                    }
                } catch (error) {
                    console.error('Error fetching available rides for new captain:', error);
                }
            }
        });

        // Handle captain location updates for live tracking
        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;

            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            // Update captain's location in database
            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    type: 'Point',
                    coordinates: [location.lng, location.ltd]
                },
                status: 'active'
            });
        });

        // Handle driver location updates during active rides
        socket.on('driver-location-update', (data) => {
            const { rideId, location } = data;
            
            if (!rideId || !location || !location.latitude || !location.longitude) {
                return socket.emit('error', { message: 'Invalid driver location data' });
            }
            
            // Broadcast driver location to all clients tracking this ride
            io.emit(`driverLocation:${rideId}`, location);
        });

        // Handle clients joining a specific ride room for real-time updates
        socket.on('join-ride', (data) => {
            const { rideId } = data;
            
            if (!rideId) {
                return socket.emit('error', { message: 'Invalid ride ID' });
            }
            
            socket.join(`ride:${rideId}`);
        });

        // Handle new ride requests
        socket.on('request-ride', async (data) => {
            const { rideId, pickup, destination, vehicleType } = data;
            
            if (!rideId || !pickup || !destination || !vehicleType) {
                return socket.emit('error', { message: 'Invalid ride request data' });
            }

            try {
                // Find nearby captains with matching vehicle type
                const nearbyCaptains = await captainModel.find({
                    'location': {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [pickup.lng, pickup.lat]
                            },
                            $maxDistance: 5000 // 5km radius
                        }
                    },
                    'vehicle.vehicleType': vehicleType === 'moto' ? 'motorcycle' : vehicleType,
                    isAvailable: true
                }).limit(5);

                if (nearbyCaptains.length === 0) {
                    return socket.emit('no-captains-available', { 
                        message: `No ${vehicleType} captains available nearby` 
                    });
                }

                // Send ride request to all nearby captains
                nearbyCaptains.forEach(captain => {
                    if (captain.socketId) {
                        io.to(captain.socketId).emit('new-ride-request', {
                            rideId,
                            pickup,
                            destination,
                            vehicleType
                        });
                    }
                });
            } catch (error) {
                console.error('Error finding nearby captains:', error);
                socket.emit('error', { message: 'Error finding nearby captains' });
            }
        });

        // Handle ride acceptance by captain
        socket.on('ride-accepted', async (data) => {
            const { rideId } = data;
            
            if (!rideId) {
                return socket.emit('error', { message: 'Invalid ride ID' });
            }

            try {
                // Update ride status in database
                await rideModel.findByIdAndUpdate(rideId, {
                    status: 'accepted'
                });

                // Notify all captains that this ride is no longer available
                io.emit('ride-no-longer-available', { 
                    rideId,
                    message: 'Ride has been accepted by another captain'
                });
            } catch (error) {
                console.error('Error handling ride acceptance:', error);
            }
        });

        // Handle payment success notification
        socket.on('payment_successful', async (data) => {
            try {
                const { rideId, captainId, amount } = data;
                
                // Get captain's socket ID and update their earnings
                const captain = await captainModel.findById(captainId);
                if (!captain) {
                    console.error('Captain not found:', captainId);
                    return;
                }

                // Update captain's earnings
                captain.earnings = (captain.earnings || 0) + amount;
                await captain.save();

                // Send payment success notification to captain
                if (captain.socketId) {
                    io.to(captain.socketId).emit('payment_received', {
                        rideId,
                        amount,
                        timestamp: new Date(),
                        message: `Payment of ₹${amount} received successfully!`
                    });

                    // Also update captain's earnings in real-time
                    io.to(captain.socketId).emit('earnings_updated', {
                        amount,
                        totalEarnings: captain.earnings
                    });

                    console.log('Payment notification sent to captain:', captainId);
                } else {
                    console.error('Captain socket ID not found:', captainId);
                }
            } catch (error) {
                console.error('Error handling payment notification:', error);
                socket.emit('error', { message: 'Error processing payment notification' });
            }
        });

        // Handle client disconnection
        socket.on("disconnect", async () => {
            console.log(`Client disconnected:${socket.id}`);
            // Set captain status to inactive on disconnect
            await captainModel.findOneAndUpdate(
                { socketId: socket.id },
                { status: 'inactive' }
            );
        });
    });
}

// Helper function to send messages to specific socket IDs
function sendMessageToSocketId(socketId, messageObject) {
    if (io) {
        try {
            io.to(socketId).emit(messageObject.event, messageObject.data);
        } catch (error) {
            console.error(`Error sending message to ${socketId}:`, error);
        }
    }
}

// Helper function to broadcast driver location updates
function broadcastDriverLocation(rideId, location) {
    if (io) {
        io.emit(`driverLocation:${rideId}`, location);
    }
}

module.exports = {
    initializeSocket,
    sendMessageToSocketId,
    broadcastDriverLocation
};