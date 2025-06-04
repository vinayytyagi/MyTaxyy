import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import GoogleMap from './GoogleMap';
import { toast } from 'react-hot-toast';

const LiveTracking = ({ rideId, initialLocation }) => {
  const { socket } = useSocket();
  const [driverLocation, setDriverLocation] = useState(initialLocation);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket || !rideId) return;

    // Join ride room for real-time updates
    socket.emit('join-ride', { rideId });

    // Listen for driver location updates
    const handleDriverLocation = (location) => {
      if (!location || !location.latitude || !location.longitude) {
        setError('Invalid location data received');
        return;
      }
      setDriverLocation(location);
      setError(null);
    };

    socket.on(`driverLocation:${rideId}`, handleDriverLocation);

    // Handle errors
    socket.on('error', (error) => {
      setError(error.message);
      toast.error(error.message);
    });

    return () => {
      socket.off(`driverLocation:${rideId}`, handleDriverLocation);
      socket.off('error');
    };
  }, [socket, rideId]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error loading map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!driverLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fdc700]"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <GoogleMap
        center={{
          lat: driverLocation.latitude,
          lng: driverLocation.longitude
        }}
        markers={[
          {
            position: {
              lat: driverLocation.latitude,
              lng: driverLocation.longitude
            },
            icon: {
              url: '/car-icon.png',
              scaledSize: { width: 40, height: 40 }
            }
          }
        ]}
      />
    </div>
  );
};

export default LiveTracking; 