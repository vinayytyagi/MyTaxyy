import { useGSAP } from '@gsap/react';
import axios from 'axios';
import gsap from 'gsap';
import React, { useRef, useState, useContext, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../../components/LocationSearchPanel';
import VehiclePanel from '../../components/VehiclePanel';
import ConfirmRide from '../../components/ConfirmRide';
import LookingForDriver from '../../components/LookingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import LiveTracking from '../../components/LiveTracking';
import { GoogleMap, Marker, Circle, useLoadScript } from '@react-google-maps/api';
import { getToken } from '../services/auth.service';
import myTaxyLogo from '../assets/MyTaxy.png';
import { toast } from 'react-hot-toast';

const Home = () => {

    const [pickup, setPickup] = useState(() => {
        return localStorage.getItem('pickup') || '';
    });
    const [destination, setDestination] = useState(() => {
        return localStorage.getItem('destination') || '';
    });
    const [panelOpen, setPanelOpen] = useState(() => {
        return localStorage.getItem('panelOpen') === 'true';
    });
    const [userLocation, setUserLocation] = useState(() => {
        // Try to get cached location from localStorage
        const cachedLocation = localStorage.getItem('userLocation');
        if (cachedLocation) {
            return JSON.parse(cachedLocation);
        }
        return { lat: 28.6139, lng: 77.2090 }; // Default location
    });
    const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default center
    const mapRef = useRef(null);
    const vehiclePanelRef = useRef(null)
    const confirmRidePanelRef = useRef(null)
    const vehicleFoundRef = useRef(null)
    const panelRef = useRef(null)
    const panelCloseRef = useRef(null)
    const pickupInputRef = useRef(null)
    const destinationInputRef = useRef(null)
    const [vehiclePanel, setVehiclePanel] = useState(() => {
        return localStorage.getItem('vehiclePanel') === 'true';
    });
    const [confirmRidePanel, setConfirmRidePanel] = useState(() => {
        return localStorage.getItem('confirmRidePanel') === 'true';
    });
    const [vehicleFound, setVehicleFound] = useState(() => {
        return localStorage.getItem('vehicleFound') === 'true';
    });
    const [pickupSuggestions, setPickupSuggestions] = useState([])
    const [destinationSuggestions, setDestinationSuggestions] = useState([])
    const [activeField, setActiveField] = useState(() => {
        return localStorage.getItem('activeField') || null;
    });
    const [fare, setFare] = useState({})
    const [vehicleType, setVehicleType] = useState(null)
    const [ride, setRide] = useState(null)
    const [currentRide, setCurrentRide] = useState(null);
    const [showLiveTracking, setShowLiveTracking] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isLoadingPickup, setIsLoadingPickup] = useState(false);
    const [isLoadingDestination, setIsLoadingDestination] = useState(false);
    const [pickupLocationSet, setPickupLocationSet] = useState(() => {
        return localStorage.getItem('pickupLocationSet') === 'true';
    });
    const [destinationLocationSet, setDestinationLocationSet] = useState(() => {
        return localStorage.getItem('destinationLocationSet') === 'true';
    });
    const [isLoadingFare, setIsLoadingFare] = useState(false);
    const [fareError, setFareError] = useState(null);
    const [mapType, setMapType] = useState(() => {
        return localStorage.getItem('mapType') || 'hybrid';
    });

    const navigate = useNavigate()

    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)

    // Initialize states from localStorage if available
    useEffect(() => {
        // Clear all location and ride state
        setPickup('');
        setDestination('');
        setPickupLocationSet(false);
        setDestinationLocationSet(false);
        setPickupSuggestions([]);
        setDestinationSuggestions([]);
        setFare({});
        setFareError(null);
        setVehiclePanel(false);
        setConfirmRidePanel(false);
        setVehicleFound(false);
        setPanelOpen(false);
        setCurrentRide(null);
        setShowLiveTracking(false);
        setRide(null);
        
        // Clear only ride-related localStorage items
        localStorage.removeItem('currentRide');
        localStorage.removeItem('activeRide');
        
        // Reset map center to user location
        if (userLocation) {
            setMapCenter(userLocation);
        }
    }, []); // Empty dependency array means this runs only on mount

    useEffect(() => {
        socket.emit("join", { userType: "user", userId: user._id })

        socket.on('ride-confirmed', ride => {
            setRide(ride)
            // Don't change panels, just update the ride data
        })

        socket.on('ride-started', ride => {
            console.log("ride")
            setVehicleFound(false)
            navigate('/riding', { state: { ride } })
        })

        socket.on('ride-completed', () => {
            setVehicleFound(false)
            setConfirmRidePanel(false)
            setVehiclePanel(false)
            setPanelOpen(false)
            navigate('/')
        })

        // Add handler for automatic ride cancellation
        socket.on('ride-cancelled', (data) => {
            console.log('Ride cancelled:', data);
            setVehicleFound(false)
            setConfirmRidePanel(false)
            setVehiclePanel(false)
            setPanelOpen(false)
            // Show notification to user
            alert('Your ride was cancelled because no captain was found within the time limit. Please try again.');
        })

        return () => {
            socket.off('ride-confirmed')
            socket.off('ride-started')
            socket.off('ride-completed')
            socket.off('ride-cancelled')
        }
    }, [user, socket, navigate])

    // Cache location when it changes
    useEffect(() => {
        if (userLocation) {
            localStorage.setItem('userLocation', JSON.stringify(userLocation));
        }
    }, [userLocation]);

    // Save UI states to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('pickup', pickup);
    }, [pickup]);

    useEffect(() => {
        localStorage.setItem('destination', destination);
    }, [destination]);

    useEffect(() => {
        localStorage.setItem('panelOpen', panelOpen);
    }, [panelOpen]);

    useEffect(() => {
        localStorage.setItem('vehiclePanel', vehiclePanel);
    }, [vehiclePanel]);

    useEffect(() => {
        localStorage.setItem('confirmRidePanel', confirmRidePanel);
    }, [confirmRidePanel]);

    useEffect(() => {
        localStorage.setItem('vehicleFound', vehicleFound);
    }, [vehicleFound]);

    useEffect(() => {
        localStorage.setItem('pickupLocationSet', pickupLocationSet);
    }, [pickupLocationSet]);

    useEffect(() => {
        localStorage.setItem('destinationLocationSet', destinationLocationSet);
    }, [destinationLocationSet]);

    useEffect(() => {
        localStorage.setItem('activeField', activeField);
    }, [activeField]);

    // Save map type to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('mapType', mapType);
    }, [mapType]);

    //this for handlingig=ng pikups
    const handlePickupChange = async (e) => {
        const value = e.target.value;
        setPickup(value);
        setPickupLocationSet(false);

        if (!value.trim()) {
            setPickupSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: value },
                headers: {
                    Authorization: `Bearer ${getToken('user')}`
                }
            });
            setPickupSuggestions(response.data);
        } catch {
            // handle error
        }
    }
    const handleDestinationChange = async (e) => {
        const value = e.target.value;
        setDestination(value);
        setDestinationLocationSet(false);

        if (!value.trim()) {
            setDestinationSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: value },
                headers: {
                    Authorization: `Bearer ${getToken('user')}`
                }
            });
            setDestinationSuggestions(response.data);
        } catch {
            // handle error
        }
    }

    const submitHandler = (e) => {
        e.preventDefault();
    }

    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [vehiclePanel])

    useGSAP(function () {
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(0)',
                display: 'block'
            })
        } else {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [confirmRidePanel])

    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(0)',
                display: 'block'
            })
        } else {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [vehicleFound])

    // Add GSAP animation for location search panel
    useGSAP(function () {
        if (panelOpen) {
            gsap.to(panelRef.current, {
                y: 0,
                duration: 0.5,
                ease: "power3.out"
            })
        } else {
            gsap.to(panelRef.current, {
                y: "100%",
                duration: 0.4,
                ease: "power2.in"
            })
        }
    }, [panelOpen])

    // Add effect to focus input when panel opens
    useEffect(() => {
        if (panelOpen && activeField === 'pickup' && pickupInputRef.current) {
            pickupInputRef.current.focus();
        } else if (panelOpen && activeField === 'destination' && destinationInputRef.current) {
            destinationInputRef.current.focus();
        }
    }, [panelOpen, activeField]);

    async function findTrip() {
        try {
            setIsLoadingFare(true);
            setFareError(null);
            setVehiclePanel(true);
            setPanelOpen(false);
            setFare({}); // Reset fare before calculating new one

            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
                params: { pickup, destination },
                headers: {
                    Authorization: `Bearer ${getToken('user')}`
                }
            });
            setFare(response.data);
        } catch (error) {
            console.error('Error calculating fare:', error);
            setFareError('Unable to calculate fare. Please try again.');
            setVehiclePanel(false);
            setFare({});
        } finally {
            setIsLoadingFare(false);
        }
    }

    async function cancelCurrentRide() {
        try {
            const token = getToken('user');
            if (currentRide?._id) {
                console.log("Attempting to cancel ride:", currentRide._id);
                await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/update-status`, {
                    rideId: currentRide._id,
                    status: 'cancelled'
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log("Ride cancelled successfully.");
                // Reset UI and state
                setCurrentRide(null);
                setShowLiveTracking(false);
                setVehicleFound(false);
                setConfirmRidePanel(false);
                setVehiclePanel(false);
                setPanelOpen(false); // Close all panels
                setFare({});
                setFareError(null);
                localStorage.removeItem('currentRide'); // Clear local storage
                localStorage.removeItem('activeRide');
                toast.success('Ride cancelled.');
            } else {
                console.log("No active ride to cancel.");
                // Just reset state if there's no currentRide but panels are open
                setVehicleFound(false);
                setConfirmRidePanel(false);
                setVehiclePanel(false);
                setPanelOpen(false);
                setFare({});
                setFareError(null);
            }
        } catch (error) {
            console.error("Error cancelling ride:", error);
            toast.error('Failed to cancel ride. Please try again.');
        }
    }

    async function createRide() {
        setConfirmRidePanel(false);

        // Then show looking for driver panel
        setVehicleFound(true);
        const response = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/rides/create`,
            {
                pickup,
                destination,
                vehicleType
            },
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
        console.log(response.data);
    }

    // Add cleanup function to cancel ride when component unmounts
    useEffect(() => {
        const cleanupRide = async () => {
            try {
                const token = getToken('user');
                if (currentRide?._id) {
                    await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/update-status`, {
                        rideId: currentRide._id,
                        status: 'cancelled'
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    console.log("Ride cancelled due to page leave/refresh");
                }
            } catch (error) {
                console.error("Error cancelling ride during cleanup:", error);
            }
        };

        // Handle page refresh/close
        window.addEventListener('beforeunload', cleanupRide);

        // Handle component unmount
        return () => {
            window.removeEventListener('beforeunload', cleanupRide);
            cleanupRide();
        };
    }, [currentRide]);

    // Modify the fetchActiveRide function to handle accepted rides
    useEffect(() => {
        const fetchActiveRide = async () => {
            try {
                const token = getToken('user');
                if (!token || !user?._id) {
                    console.log("No user token or ID found, skipping active ride fetch");
                    return;
                }

                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.data && response.data.ride) {
                    const ride = response.data.ride;

                    // If ride is completed or cancelled, clear ride state and return
                    if (ride.status === 'completed' || ride.status === 'cancelled') {
                        console.log("Found completed or cancelled ride on load. Clearing state.");
                        setCurrentRide(null);
                        setShowLiveTracking(false);
                        // Clear any related UI states that might be set
                        setPickup('');
                        setDestination('');
                        setPickupLocationSet(false);
                        setDestinationLocationSet(false);
                        setVehiclePanel(false);
                        setConfirmRidePanel(false);
                        setVehicleFound(false);
                        setPanelOpen(false);
                        setFare({});
                        setFareError(null);
                        localStorage.removeItem('currentRide');
                        localStorage.removeItem('activeRide');

                        return;
                    }

                    // Only show live tracking for ongoing rides
                    if (ride.status === 'accepted' || ride.status === 'started') {
                        console.log("Found ongoing ride on load.", ride);
                        const pickupCoords = ride.pickup.split(',');
                        const destinationCoords = ride.destination.split(',');

                        if (pickupCoords.length === 2 && destinationCoords.length === 2) {
                            const pickupLat = parseFloat(pickupCoords[0]);
                            const pickupLng = parseFloat(pickupCoords[1]);
                            const destLat = parseFloat(destinationCoords[0]);
                            const destLng = parseFloat(destinationCoords[1]);

                            if (!isNaN(pickupLat) && !isNaN(pickupLng) &&
                                !isNaN(destLat) && !isNaN(destLng)) {

                                setCurrentRide({
                                    _id: ride._id,
                                    pickup: {
                                        lat: pickupLat,
                                        lng: pickupLng,
                                        address: ride.pickupAddress
                                    },
                                    destination: {
                                        lat: destLat,
                                        lng: destLng,
                                        address: ride.destinationAddress
                                    }
                                });
                                setShowLiveTracking(true);
                                // Potentially set other UI states if needed for live tracking view
                                setPanelOpen(false); // Close the find trip panel if live tracking is shown

                            } else {
                                console.error("Invalid coordinates in ride data:", ride);
                                // Clear ride state if coordinates are invalid
                                setCurrentRide(null);
                                setShowLiveTracking(false);
                            }
                        } else {
                             console.error("Pickup or destination format invalid:", ride);
                             // Clear ride state if format is invalid
                             setCurrentRide(null);
                             setShowLiveTracking(false);
                        }
                    } else {
                         // If status is not completed, cancelled, accepted, or started, treat as no active ride
                         console.log("Found ride with unexpected status on load:", ride.status, ride);
                         setCurrentRide(null);
                         setShowLiveTracking(false);
                    }
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log("No active ride found on the server.");
                    // Clear any existing ride data in state/local storage if none found on server
                    setCurrentRide(null);
                    setShowLiveTracking(false);
                    localStorage.removeItem('currentRide');
                    localStorage.removeItem('activeRide');
                } else {
                    console.error("Error fetching active ride:", error);
                    // Also clear state on other errors
                    setCurrentRide(null);
                    setShowLiveTracking(false);
                }
            }
        };

        fetchActiveRide();
    }, [user]); // Dependency on user to refetch if user changes

    // Listen for ride status updates
    useEffect(() => {
        if (socket && currentRide?._id) {
            socket.on(`ride-status:${currentRide._id}`, (status) => {
                if (status === 'completed' || status === 'cancelled') {
                    setShowLiveTracking(false);
                    setCurrentRide(null);
                }
            });

            // Join the ride room for updates
            socket.emit('join-ride', { rideId: currentRide._id });
        }

        return () => {
            if (socket && currentRide?._id) {
                socket.off(`ride-status:${currentRide._id}`);
            }
        };
    }, [socket, currentRide]);

    // Add useEffect for getting user's location
    useEffect(() => {
        const getUserLocation = () => {
            if (navigator.geolocation) {
                const options = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                };

                const successCallback = (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    setMapCenter({ lat: latitude, lng: longitude });
                };

                const errorCallback = (error) => {
                    console.error("Error getting user location:", error);

                    // Handle different error cases
                    switch (error.code) {
                        case 1: // PERMISSION_DENIED
                            alert("Please enable location access to get accurate ride information. Using default location for now.");
                            setUserLocation({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
                            setMapCenter({ lat: 28.6139, lng: 77.2090 });
                            break;
                        case 2: // POSITION_UNAVAILABLE
                            alert("Location information is unavailable. Using default location.");
                            setUserLocation({ lat: 28.6139, lng: 77.2090 });
                            setMapCenter({ lat: 28.6139, lng: 77.2090 });
                            break;
                        case 3: // TIMEOUT
                            alert("Location request timed out. Using default location.");
                            setUserLocation({ lat: 28.6139, lng: 77.2090 });
                            setMapCenter({ lat: 28.6139, lng: 77.2090 });
                            break;
                        default:
                            alert("An unknown error occurred. Using default location.");
                            setUserLocation({ lat: 28.6139, lng: 77.2090 });
                            setMapCenter({ lat: 28.6139, lng: 77.2090 });
                    }
                };

                // Try to get location
                navigator.geolocation.getCurrentPosition(
                    successCallback,
                    errorCallback,
                    options
                );
            } else {
                alert("Geolocation is not supported by your browser. So, We're using default location.");
                setUserLocation({ lat: 28.6139, lng: 77.2090 });
                setMapCenter({ lat: 28.6139, lng: 77.2090 });
            }
        };

        getUserLocation();
    }, []);

    const handleMyLocationClick = async (field) => {
        if (field === 'pickup') {
            setIsLoadingPickup(true);
        } else {
            setIsLoadingDestination(true);
        }

        // First try to use cached location
        if (userLocation && userLocation.lat && userLocation.lng) {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/maps/get-address`,
                    {
                        params: {
                            lat: userLocation.lat,
                            lng: userLocation.lng
                        },
                        headers: {
                            Authorization: `Bearer ${getToken('user')}`
                        }
                    }
                );

                if (field === 'pickup') {
                    setPickup(response.data);
                    setPickupLocationSet(true);
                    setIsLoadingPickup(false);
                } else {
                    setDestination(response.data);
                    setDestinationLocationSet(true);
                    setIsLoadingDestination(false);
                }
                return;
            } catch (error) {
                console.error('Error getting address from cached location:', error);
            }
        }

        // If cached location fails or doesn't exist, get new location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(newLocation);

                    try {
                        const response = await axios.get(
                            `${import.meta.env.VITE_BASE_URL}/maps/get-address`,
                            {
                                params: {
                                    lat: newLocation.lat,
                                    lng: newLocation.lng
                                },
                                headers: {
                                    Authorization: `Bearer ${getToken('user')}`
                                }
                            }
                        );

                        if (field === 'pickup') {
                            setPickup(response.data);
                            setPickupLocationSet(true);
                        } else {
                            setDestination(response.data);
                            setDestinationLocationSet(true);
                        }
                    } catch (error) {
                        console.error('Error getting address:', error);
                    } finally {
                        if (field === 'pickup') {
                            setIsLoadingPickup(false);
                        } else {
                            setIsLoadingDestination(false);
                        }
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    if (field === 'pickup') {
                        setIsLoadingPickup(false);
                    } else {
                        setIsLoadingDestination(false);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }
    };

    const handleClearInput = (field) => {
        if (field === 'pickup') {
            setPickup('');
            setPickupLocationSet(false);
            setPickupSuggestions([]);
            pickupInputRef.current?.focus();
        } else {
            setDestination('');
            setDestinationLocationSet(false);
            setDestinationSuggestions([]);
            destinationInputRef.current?.focus();
        }
    };

    // Add cleanup when locations change
    useEffect(() => {
        setFare({});
        setFareError(null);
    }, [pickup, destination]);

    const handleMapTypeChange = (newMapType) => {
        setMapType(newMapType);
    };

    return (
        <div className="relative h-screen w-full">
            <div className='h-screen relative overflow-hidden bg-gray-50'>
                {/* Header with blur effect */}
                <div className='fixed px-6 py-2 top-0 flex items-center justify-between w-screen z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => window.location.reload()}
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
                        <button 
                            onClick={() => setPanelOpen(true)}
                            className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                        >
                            <i className="text-xl ri-search-line"></i>
                        </button>
                        <Link
                            to='/user/profile'
                            className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                        >
                            <i className="text-xl ri-user-line"></i>
                        </Link>
                        <Link
                            to='/user/logout'
                            className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                        >
                            <i className="text-xl ri-logout-box-r-line"></i>
                        </Link>
                    </div>
                </div>

                {/* Show live tracking if there's an active ride */}
                {showLiveTracking && currentRide && (
                    <div className="fixed inset-0 z-30 bg-white">
                        <div className="h-full">
                            <LiveTracking 
                                rideData={currentRide} 
                                mapType={mapType} 
                                onMapTypeChange={handleMapTypeChange}
                            />
                        </div>
                        <button
                            onClick={() => setShowLiveTracking(false)}
                            className="fixed z-40 bottom-4 right-4 bg-gray-100 text-gray-600 p-4 rounded-full shadow-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            <i className="ri-arrow-down-line"></i>
                        </button>
                    </div>
                )}

                {/* Map - with mapType prop and handler */}
                <div className='h-full w-full fixed top-0 left-0 z-0'>
                    <LiveTracking 
                        rideData={null} 
                        mapType={mapType} 
                        onMapTypeChange={handleMapTypeChange}
                    />
                </div>

                {/* Default view when panel is closed */}
                {!panelOpen && !vehiclePanel && !confirmRidePanel && !vehicleFound && (
                    <div className='absolute bottom-0 inset-x-0 z-10 max-w-2xl mx-auto md:max-w-2xl md:mx-auto shadow-lg rounded-t-3xl overflow-hidden'>
                        <div className='p-6 bg-white'>
                            <form className='space-y-4'>
                                <div className="relative">
                                    <input
                                        ref={pickupInputRef}
                                        onClick={() => {
                                            setPanelOpen(true)
                                            setActiveField('pickup')
                                        }}
                                        value={pickup}
                                        onChange={handlePickupChange}
                                        className='bg-gray-50 px-12 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                        type="text"
                                        placeholder='Enter pickup location'
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (pickup) {
                                                handleClearInput('pickup');
                                            } else {
                                                handleMyLocationClick('pickup');
                                            }
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${pickupLocationSet && !pickup ? 'text-gray-400' : pickup ? 'text-gray-500 hover:text-gray-600' : 'text-gray-500 hover:text-[#fdc700]'} transition-colors cursor-pointer`}
                                        disabled={isLoadingPickup}
                                    >
                                        {isLoadingPickup ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fdc700] border-t-transparent"></div>
                                        ) : pickup ? (
                                            <i className="ri-close-circle-line text-xl"></i>
                                        ) : (
                                            <i className="ri-crosshair-2-line"></i>
                                        )}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        ref={destinationInputRef}
                                        onClick={() => {
                                            setPanelOpen(true)
                                            setActiveField('destination')
                                        }}
                                        value={destination}
                                        onChange={handleDestinationChange}
                                        className='bg-gray-50 px-12 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                        type="text"
                                        placeholder='Enter your destination'
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (destination) {
                                                handleClearInput('destination');
                                            } else {
                                                handleMyLocationClick('destination');
                                            }
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${destinationLocationSet && !destination ? 'text-gray-400' : destination ? 'text-gray-500 hover:text-gray-600' : 'text-gray-500 hover:text-[#fdc700]'} transition-colors cursor-pointer`}
                                        disabled={isLoadingDestination}
                                    >
                                        {isLoadingDestination ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fdc700] border-t-transparent"></div>
                                        ) : destination ? (
                                            <i className="ri-close-circle-line text-xl"></i>
                                        ) : (
                                            <i className="ri-crosshair-2-line"></i>
                                        )}
                                    </button>
                                </div>
                            </form>
                            <button
                                onClick={findTrip}
                                disabled={!pickup || !destination || isLoadingFare}
                                className={`relative bg-[#fdc700] text-gray-800 font-semibold px-4 py-3 rounded-xl mt-4 w-full transition-all shadow-sm ${!pickup || !destination || isLoadingFare
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-[#fdc700]/90 cursor-pointer hover:shadow-md active:scale-[0.98]'
                                    }`}
                            >
                                {isLoadingFare ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                        Calculating Fare...
                                    </div>
                                ) : (
                                    'Find Trip'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Location Search Panel - Controlled by panelOpen state */}
                {panelOpen && (
                    <div ref={panelRef} className='fixed inset-x-0 bottom-0 h-[calc(100vh-80px)] z-50 bg-white shadow-lg rounded-t-3xl overflow-y-auto transform translate-y-full max-w-2xl mx-auto md:max-w-2xl md:mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                        <div className="sticky top-0 bg-white/80 backdrop-blur-sm p-4 border-b flex justify-between items-center rounded-t-3xl z-50">
                            <h4 className="text-lg font-semibold text-gray-800">Select locations</h4>
                            <button
                                onClick={() => setPanelOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                            >
                                <i className="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        <div className='p-6'>
                            <h4 className='text-2xl font-semibold mb-4 text-gray-800'>Find a trip</h4>
                            <form className='relative py-3' onSubmit={submitHandler}>
                                <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-[#fdc700] rounded-full z-10"></div>
                                <div className="relative">
                                    <input
                                        ref={pickupInputRef}
                                        onClick={() => {
                                            setActiveField('pickup')
                                        }}
                                        value={pickup}
                                        onChange={handlePickupChange}
                                        className='bg-gray-50 px-12 py-3 text-lg rounded-lg w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all'
                                        type="text"
                                        placeholder='Add a pick-up location'
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (pickup) {
                                                handleClearInput('pickup');
                                            } else {
                                                handleMyLocationClick('pickup');
                                            }
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${pickupLocationSet && !pickup ? 'text-gray-400' : pickup ? 'text-gray-500 hover:text-gray-600' : 'text-gray-500 hover:text-[#fdc700]'} transition-colors cursor-pointer`}
                                        disabled={isLoadingPickup}
                                    >
                                        {isLoadingPickup ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fdc700] border-t-transparent"></div>
                                        ) : pickup ? (
                                            <i className="ri-close-circle-line text-xl"></i>
                                        ) : (
                                            <i className="ri-crosshair-2-line"></i>
                                        )}
                                    </button>
                                </div>
                                <div className="relative mt-3">
                                    <input
                                        ref={destinationInputRef}
                                        onClick={() => {
                                            setActiveField('destination')
                                        }}
                                        value={destination}
                                        onChange={handleDestinationChange}
                                        className='bg-gray-50 px-12 py-3 text-lg rounded-lg w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all'
                                        type="text"
                                        placeholder='Enter your destination'
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (destination) {
                                                handleClearInput('destination');
                                            } else {
                                                handleMyLocationClick('destination');
                                            }
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${destinationLocationSet && !destination ? 'text-gray-400' : destination ? 'text-gray-500 hover:text-gray-600' : 'text-gray-500 hover:text-[#fdc700]'} transition-colors cursor-pointer`}
                                        disabled={isLoadingDestination}
                                    >
                                        {isLoadingDestination ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fdc700] border-t-transparent"></div>
                                        ) : destination ? (
                                            <i className="ri-close-circle-line text-xl"></i>
                                        ) : (
                                            <i className="ri-crosshair-2-line"></i>
                                        )}
                                    </button>
                                </div>
                            </form>
                            <button
                                onClick={findTrip}
                                disabled={!pickup || !destination || isLoadingFare}
                                className={`relative bg-[#fdc700] text-gray-800 font-semibold px-4 py-3 rounded-xl mt-4 w-full transition-all shadow-sm ${!pickup || !destination || isLoadingFare
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-[#fdc700]/90 cursor-pointer hover:shadow-md active:scale-[0.98]'
                                    }`}>
                                {isLoadingFare ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                        Calculating Fare...
                                    </div>
                                ) : (
                                    'Find Trip'
                                )}
                            </button>
                        </div>
                        {fareError && (
                            <div className="mt-2 text-red-500 text-sm text-center">
                                {fareError}
                            </div>
                        )}
                        <LocationSearchPanel
                            suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                            setPanelOpen={setPanelOpen}
                            setPickup={setPickup}
                            setDestination={setDestination}
                            activeField={activeField}
                            pickup={pickup}
                            destination={destination}
                            setPickupSuggestions={setPickupSuggestions}
                            setDestinationSuggestions={setDestinationSuggestions}
                        />
                    </div>
                )}
                <div className="panels-container fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto md:max-w-2xl md:mx-auto md:translate-x-[0%]">
                    <div ref={vehiclePanelRef} className='fixed w-full z-40 bottom-0 translate-y-full rounded-t-3xl px-3 py-5 bg-white pt-12'>
                        {isLoadingFare ? (
                            <div className="space-y-4 px-3">
                                <h5 className=' py-1 cursor-pointer text-center w-[93%] absolute top-0'
                                    onClick={() => {
                                        props.setVehiclePanel(false);
                                    }}>
                                    <i className="text-3xl text-gray-200 ri-arrow-down-wide-line cursor-pointer"></i>
                                </h5>
                                <div className="h-10 my-4 bg-gray-200 rounded-lg animate-pulse"></div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center space-x-4 px-8 py-6 border rounded-lg">
                                            <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                            </div>
                                            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <VehiclePanel
                                selectVehicle={setVehicleType}
                                fare={fare}
                                setConfirmRidePanel={setConfirmRidePanel}
                                setVehiclePanel={setVehiclePanel}
                            />
                        )}
                    </div>
                    <div ref={confirmRidePanelRef} className='fixed w-full hidden z-40 bottom-0 translate-y-full rounded-t-3xl bg-white px-3 py-6 pt-12'>
                        <ConfirmRide
                            pickup={pickup}
                            destination={destination}
                            fare={fare}
                            vehicleType={vehicleType}
                            setConfirmRidePanel={setConfirmRidePanel}
                            setVehicleFound={setVehicleFound}
                            createRide={createRide}
                        />
                    </div>
                    <div ref={vehicleFoundRef} className='fixed w-full hidden z-40 bottom-0 translate-y-full rounded-t-3xl bg-white px-4 py-6 pt-8 max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                        {ride?.captain ? (
                            <div className="space-y-6">
                                {/* Captain Found Section */}
                                <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {ride.captain.profilePhoto ? (
                                                <img src={ride.captain.profilePhoto} alt={`${ride.captain.fullname?.firstname}'s avatar`} className="h-14 w-14 rounded-full object-cover shadow" />
                                            ) : (
                                                <div className="h-14 w-14 bg-[#fdc70010] rounded-full flex items-center justify-center shadow">
                                                    <i className="ri-user-fill text-2xl text-[#fdc700]"></i>
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-800 capitalize">
                                                    {ride.captain.fullname?.firstname} {ride.captain.fullname?.lastname}
                                                </h2>
                                                <p className="text-sm text-gray-600">
                                                    {ride.captain.phone || 'Phone not available'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-[#fdc70010] text-gray-800 px-3 py-1 rounded-md font-bold text-sm ">
                                                {ride.captain.vehicle?.plate || 'NO PLATE'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* OTP Section */}
                                <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-gray-800 mb-2">Your Ride OTP</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 mb-2">Share this OTP with your captain to start the ride.</p>
                                            <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-inner flex items-center justify-between">
                                                <p className="text-3xl font-extrabold text-gray-900 tracking-widest">
                                                    {ride.otp?.split('').join(' ') || '0 0 0 0 0 0'}
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(ride.otp || '');
                                                        // Add animation class
                                                        const otpSpan = document.querySelector('.copied-message');
                                                        if (otpSpan) {
                                                            // Temporarily show and then hide
                                                            otpSpan.style.opacity = '1';
                                                            otpSpan.style.transition = 'opacity 300ms ease-in-out';
                                                            setTimeout(() => {
                                                                otpSpan.style.opacity = '0';
                                                            }, 2000);
                                                        }
                                                    }}
                                                    className="copy-btn p-2 bg-[#fdc700] cursor-pointer rounded-lg hover:bg-[#fdc700]/90 transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] relative group">
                                                    <i className="ri-file-copy-line text-xl text-gray-900 transition-transform duration-300 group-hover:scale-110"></i>
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                        Copy OTP
                                                    </span>
                                                    <span className="copied-message absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-0 transition-all duration-300 whitespace-nowrap copied:opacity-100 copied:bg-green-500">
                                                        OTP Copied!
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ride Details */}
                                <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-gray-800 mb-3">Ride Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-map-pin-line text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Pickup</h4>
                                                <p className="text-base text-gray-800 mt-1">{pickup}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-map-pin-2-fill text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Destination</h4>
                                                <p className="text-base text-gray-800 mt-1">{destination}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-money-rupee-circle-line text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Fare</h4>
                                                <p className="text-base text-gray-800 mt-1">₹{fare?.[vehicleType] || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel Ride Button */}
                                <button
                                    onClick={() => {
                                            cancelCurrentRide(); // Call the separate cancel function
                                    }}
                                    className="w-full cursor-pointer py-3 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-md hover:shadow-lg active:scale-[0.98]"
                                >
                                    Cancel Ride
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 pt-8 pb-4">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#fdc700] border-t-transparent mx-auto mb-4"></div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Looking for a Captain</h3>
                                    <p className="text-gray-600">Please wait while we find the nearest captain for you...</p>
                                </div>

                                {/* Ride Details */}
                                <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
                                    <h3 className="text-base font-semibold text-gray-800 mb-3">Ride Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-map-pin-line text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Pickup</h4>
                                                <p className="text-base text-gray-800 mt-1">{pickup}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-map-pin-2-fill text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Destination</h4>
                                                <p className="text-base text-gray-800 mt-1">{destination}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center">
                                                    <i className="ri-money-rupee-circle-line text-[#fdc700]"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Fare</h4>
                                                <p className="text-base text-gray-800 mt-1">₹{fare?.[vehicleType] || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel Ride Button */}
                                <button
                                    onClick={() => {
                                            cancelCurrentRide(); // Call the separate cancel function
                                    }}
                                    className="w-full cursor-pointer py-3 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-md hover:shadow-lg active:scale-[0.98]"
                                >
                                    Cancel Ride
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home 