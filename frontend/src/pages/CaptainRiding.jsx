import React, { useRef, useState, useEffect, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import FinishRide from '../../components/FinishRide';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import LiveTracking from '../../components/LiveTracking';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import myTaxyLogo from '../assets/myTaxy.png';

const CaptainRiding = () => {
    const [finishRidePanel, setFinishRidePanel] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [distanceToDestination, setDistanceToDestination] = useState('Calculating...');
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const finishRidePanelRef = useRef(null);
    const location = useLocation();
    const [rideData, setRideData] = useState(location.state?.ride);
    const { socket } = useContext(SocketContext);
    const navigate = useNavigate();
    const watchPositionId = useRef(null);
    const socketInitialized = useRef(false);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [showDetailsButton, setShowDetailsButton] = useState(true);
    const [mapType, setMapType] = useState('roadmap');

    // Format ride data for LiveTracking component
    const [formattedRideData, setFormattedRideData] = useState(null);

    useEffect(() => {
        if (rideData) {
            setFormattedRideData({
                _id: rideData._id,
                pickup: {
                    lat: parseFloat(rideData.pickup.split(',')[0]),
                    lng: parseFloat(rideData.pickup.split(',')[1])
                },
                destination: {
                    lat: parseFloat(rideData.destination.split(',')[0]),
                    lng: parseFloat(rideData.destination.split(',')[1])
                }
            });
        }
    }, [rideData]);

    // Set up socket event listeners
    useEffect(() => {
        if (!socket || !rideData) return;

        const handlePaymentCompleted = async (data) => {
            console.log('Received payment-completed event in CaptainRiding:', data);
            if (data.rideId === rideData._id) {
                console.log('Payment completed for current ride. Updating state.');
                // Update the rideData state with the new payment status
                setRideData(prevRideData => ({
                    ...prevRideData,
                    paymentStatus: 'completed', // Assuming the event confirms completion
                    paymentMethod: data.paymentMethod // Update payment method from event data
                }));
                        
                // The setShowPaymentSuccess(true) and automatic ride completion logic 
                // based on payment success from the previous implementation seems a bit aggressive.
                // We should let the captain manually complete the ride after payment is received.
                // Removing the automatic completion and success modal here.
                toast.success('Payment received! You can now complete the ride.');
            }
        };

        // The original handlePaymentSuccess listener seems to trigger automatic ride completion
        // which might not be desired. Let's keep the payment_completed listener as the primary 
        // way to update payment status.
        // socket.on('payment-successful', handlePaymentSuccess); // Removing this listener

        // We can keep the ride-ended listener if needed for other reasons
        // socket.on('ride-ended', handleRideEnded);

        // Add the payment_completed listener
        socket.on('payment_completed', handlePaymentCompleted);

        // Cleanup listeners on unmount
        return () => {
            console.log('Cleaning up CaptainRiding socket listeners');
            socket.off('payment_completed', handlePaymentCompleted);
            // socket.off('payment-successful'); // Also remove this if it was there
            // socket.off('ride-ended');
        };

    }, [socket, rideData]); // Depend on socket and rideData

    // Watch driver position and send updates to server
    useEffect(() => {
        if (navigator.geolocation && socket && rideData?._id) {
            // Start watching position
            watchPositionId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    
                    setCurrentPosition(currentLocation);
                    
                    // Send position to server via socket
                    socket.emit('driver-location-update', {
                        rideId: rideData._id,
                        location: currentLocation
                    });
                    
                    // Calculate distance to destination
                    if (formattedRideData?.destination) {
                        const distance = calculateDistance(
                            position.coords.latitude,
                            position.coords.longitude,
                            formattedRideData.destination.lat,
                            formattedRideData.destination.lng
                        );
                        setDistanceToDestination(`${distance.toFixed(1)} KM away`);
                    }
                },
                (error) => {
                    console.error("Error getting geolocation:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 5000
                }
            );
        }

        // Cleanup function
        return () => {
            if (watchPositionId.current !== null) {
                navigator.geolocation.clearWatch(watchPositionId.current);
            }
        };
    }, [socket, rideData, formattedRideData]);

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        return distance;
    };

    // Handle completing the ride
    const completeRide = () => {
        setFinishRidePanel(true);
    };

    useGSAP(() => {
        if (finishRidePanel) {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(0)'
            });
        } else {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(100%)'
            });
        }
    }, [finishRidePanel]);

  return (
    <div className="relative w-full">
        {/* Header - Consistent with Home page */}
        <div className='fixed px-6 py-2 top-0 flex items-center justify-between w-screen z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/captain-home')}
            >
                <img className='w-12 h-12' src={myTaxyLogo} alt="MyTaxy"/>
                <span className="text-2xl font-bold text-gray-900">MyTaxy</span>
            </div>
            <div className="flex items-center space-x-3">
                {/* Map Type Toggle Button */}
                <button 
                    onClick={() => setMapType(prev => prev === 'hybrid' ? 'roadmap' : 'hybrid')}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title={mapType === 'hybrid' ? 'Switch to Map View' : 'Switch to Satellite View'}
                >
                    <i className={`text-xl ri-${mapType === 'hybrid' ? 'map-2-line' : 'earth-line'}`}></i>
                </button>
                {/* Call User Button */}
                <button 
                    onClick={() => window.location.href = `tel:${rideData?.user?.phone}`}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title="Call User"
                >
                    <i className="text-xl ri-phone-line"></i>
                </button>
                {/* Back to Captain Home Button */}
                <button 
                    onClick={() => navigate('/captain-home')}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title="Back to Home"
                >
                    <i className="text-xl ri-home-5-line"></i>
                </button>
                {/* Logout Button */}
                <button 
                    onClick={() => {
                        if (socket) {
                            socket.disconnect();
                        }
                        navigate('/captain-login');
                    }}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title="Logout"
                >
                    <i className="text-xl ri-logout-box-r-line"></i>
                </button>
            </div>
        </div>
        {/* Full screen map */}
        <div className='fixed inset-0 z-0'>
                {formattedRideData && (
                    <LiveTracking rideData={formattedRideData} />
                )}
        </div>

        {/* Floating Show Details/Complete Ride Button */}
        {showDetailsButton && !finishRidePanel && (
                <button 
                className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#fdc700] text-gray-900 font-semibold px-8 py-3 rounded-full shadow-lg text-lg z-50 hover:bg-yellow-400 transition-all"
                onClick={() => setFinishRidePanel(true)}
                >
                <i className="ri-information-line mr-2"></i>
                Show Details
                </button>
        )}

        {/* Complete Ride Panel (FinishRide) */}
        {finishRidePanel && (
            <div ref={finishRidePanelRef} className="fixed inset-x-0 bottom-0 z-50" style={{transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)'}}>
              <FinishRide 
              ride={rideData}
                    setFinishRidePanel={setFinishRidePanel}
                />
            </div>
        )}
    </div>
  )
}

export default CaptainRiding