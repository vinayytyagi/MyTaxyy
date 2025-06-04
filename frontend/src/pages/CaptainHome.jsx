import React, { useRef,useState,useContext,useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CaptainDetails from '../../components/CaptainDetails'
import RidePopUp from '../../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../../components/ConfirmRidePopUp'
import AvailableRidesList from '../../components/AvailableRidesList'
import { CaptainDataContext } from '../context/CaptainContext'  
import { SocketContext } from '../context/SocketContext'
import axios from 'axios'
import LiveTracking from '../../components/LiveTracking'
import { getToken } from '../services/auth.service'
import myTaxyLogo from '../assets/MyTaxy.png'

const CaptainHome = () => {
  const [ridePopupPanel, setRidePopupPanel] = useState(false);
  const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false);
  const [showAvailableRides, setShowAvailableRides] = useState(false);
  const [availableRides, setAvailableRides] = useState(() => {
    // Initialize from localStorage if available
    const savedRides = localStorage.getItem('availableRides');
    return savedRides ? JSON.parse(savedRides) : [];
  });
  const ridePopupPanelRef=useRef(null);
  const confirmRidePopupPanelRef=useRef(null);
const [ride, setRide] = useState(null);
  const { socket } = useContext(SocketContext);
  const { captain } = useContext(CaptainDataContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [mapType, setMapType] = useState(() => {
    return localStorage.getItem('captainMapType') || 'hybrid';
  });

//   here we find the captain location and send it to the backend

  useEffect(() => {
    socket.emit('join', {
        userId: captain._id,
        userType: 'captain'
    })
    //this is used tp get curreent location continously
    const updateLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                console.log({ 
                    userId: captain._id,
                    location: {
                        ltd: position.coords.latitude,
                        lng: position.coords.longitude
                    }});
                socket.emit('update-location-captain', {
                    userId: captain._id,
                    location: {
                        ltd: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                })
            })
        }
    }

    const locationInterval = setInterval(updateLocation, 10000)
    updateLocation()

    return () => clearInterval(locationInterval)
}, [])

// Sync available rides with localStorage
useEffect(() => {
    localStorage.setItem('availableRides', JSON.stringify(availableRides));
}, [availableRides]);

// Fetch available rides on component mount
useEffect(() => {
    const fetchAvailableRides = async () => {
        try {
            const token = getToken('captain');
            if (!token) return;

            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/rides/available`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.rides) {
                setAvailableRides(response.data.rides);
            }
        } catch (error) {
            console.error('Error fetching available rides:', error);
        }
    };

    fetchAvailableRides();
}, []);

// Handle socket events
useEffect(() => {
    if (socket) {
        // Handle initial available rides when joining
        socket.on('available-rides', (rides) => {
            console.log('Received initial available rides:', rides);
            if (rides && rides.length > 0) {
                setAvailableRides(rides);
                localStorage.setItem('availableRides', JSON.stringify(rides));
                // Only show the panel if we're not currently on a ride
                if (!ride) {
                    setShowAvailableRides(true);
                }
            }
        });

        socket.on('new-ride', (data) => {
            console.log('New ride received:', data);
            setAvailableRides(prev => {
                const newRides = [...prev, data];
                localStorage.setItem('availableRides', JSON.stringify(newRides));
                return newRides;
            });
            // Only show the panel if we're not currently on a ride
            if (!ride) {
                setShowAvailableRides(true);
            }
        });

        socket.on('ride-no-longer-available', (data) => {
            console.log('Ride no longer available:', data);
            setAvailableRides(prev => {
                const updatedRides = prev.filter(ride => ride._id !== data.rideId);
                localStorage.setItem('availableRides', JSON.stringify(updatedRides));
                return updatedRides;
            });

            // If this was our current ride, reset the ride state
            if (data.rideId === ride?._id) {
                setRidePopupPanel(false);
                setRide(null);
            }

            // If we have no more available rides, hide the panel
            if (availableRides.length <= 1) {
                setShowAvailableRides(false);
            }
        });

        return () => {
            socket.off('available-rides');
            socket.off('new-ride');
            socket.off('ride-no-longer-available');
        };
    }
}, [socket, ride, availableRides]);

// On mount, check for ongoing ride in localStorage
useEffect(() => {
    const ongoingRide = localStorage.getItem('ongoingRide');
    if (ongoingRide) {
        const rideObj = JSON.parse(ongoingRide);
        // Fetch latest ride status from backend
        const fetchRideStatus = async () => {
            try {
                const token = getToken('captain');
                if (!token) return;
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/${rideObj._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const rideStatus = response.data.ride?.status;
                if (rideStatus === 'ongoing' || rideStatus === 'accepted') {
                    setRide(response.data.ride);
                    setConfirmRidePopupPanel(true);
                } else if (rideStatus === 'started') {
                    // If ride is already started, go to riding screen
                    navigate('/captain-riding', { state: { ride: response.data.ride } });
                } else {
                    // Ride is not ongoing, clear localStorage
                    localStorage.removeItem('ongoingRide');
                    setRide(null);
                    setConfirmRidePopupPanel(false);
                }
            } catch (err) {
                localStorage.removeItem('ongoingRide');
                setRide(null);
                setConfirmRidePopupPanel(false);
            }
        };
        fetchRideStatus();
    }
}, [navigate]);

// Add click outside handler
useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAvailableRides(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

const handleAcceptRide = async (selectedRide) => {
    try {
        const token = getToken('captain');
        if (!token) {
            console.error('No captain token found');
            return;
        }
        // Set the ride data first, ensuring distance is in meters
        const rideWithDistance = {
            ...selectedRide,
            distance: typeof selectedRide.distance === 'number' ? Math.round(selectedRide.distance) : 0
        };
        setRide(rideWithDistance);
        setRidePopupPanel(false);
        setConfirmRidePopupPanel(true);
        // Save to localStorage
        localStorage.setItem('ongoingRide', JSON.stringify({ 
            _id: selectedRide._id,
            distance: rideWithDistance.distance 
        }));

        const response = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/rides/confirm`,
            {
                rideId: selectedRide._id,
                otp: selectedRide.otp || "000000"
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        if (response.status === 200) {
            socket.emit('ride-accepted', { rideId: selectedRide._id });
            setAvailableRides(prev => {
                const updatedRides = prev.filter(ride => ride._id !== selectedRide._id);
                localStorage.setItem('availableRides', JSON.stringify(updatedRides));
                return updatedRides;
            });
            setShowAvailableRides(false);
            // Preserve the distance data from the selected ride
            setRide({
                ...response.data,
                distance: rideWithDistance.distance // Keep the original distance in meters
            });
            // Update localStorage with full ride info
            localStorage.setItem('ongoingRide', JSON.stringify({ 
                _id: response.data._id,
                distance: rideWithDistance.distance // Keep the original distance in meters
            }));
        }
    } catch (error) {
        console.error('Error confirming ride:', error);
        setRide(null);
        setConfirmRidePopupPanel(false);
        localStorage.removeItem('ongoingRide');
    }
};

const handleRejectRide = (rideId) => {
    setAvailableRides(prev => {
        const updatedRides = prev.filter(ride => ride._id !== rideId);
        // Update localStorage
        localStorage.setItem('availableRides', JSON.stringify(updatedRides));
        return updatedRides;
    });
    if (availableRides.length === 1) {
        setShowAvailableRides(false);
    }
};

const handleCancelOrComplete = () => {
    localStorage.removeItem('ongoingRide');
    setRide(null);
    setConfirmRidePopupPanel(false);
};

  useGSAP(()=>{
    if(ridePopupPanel){
        gsap.to(ridePopupPanelRef.current,{
            transform:'translateY(0)',
            duration: 0.5,
            ease: "power3.out"
        })
    }else{
        gsap.to(ridePopupPanelRef.current,{
            transform:'translateY(100%)',
            duration: 0.4,
            ease: "power2.in"
        })
    }
},[ridePopupPanel])

useGSAP(()=>{
    if(confirmRidePopupPanel){
        gsap.to(confirmRidePopupPanelRef.current,{
            transform:'translateY(0)',
            duration: 0.5,
            ease: "power3.out"
        })
    }else{
        gsap.to(confirmRidePopupPanelRef.current,{
            transform:'translateY(100%)',
            duration: 0.4,
            ease: "power2.in"
        })
    }
},[confirmRidePopupPanel])

// Save map type to localStorage when it changes
useEffect(() => {
    localStorage.setItem('captainMapType', mapType);
}, [mapType]);

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
            <img className='w-12 h-12' src={myTaxyLogo} alt="MyTaxy Captain"/>
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
            {/* Available Rides Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowAvailableRides(!showAvailableRides)}
              className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer relative'
            >
              <i className="text-xl ri-route-line"></i>
              {availableRides.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {availableRides.length}
                </span>
              )}
            </button>

              {/* Available Rides Dropdown */}
              {showAvailableRides && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 transform transition-all duration-200 ease-out z-50">
                  {/* Header */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                          <i className="ri-route-line text-yellow-600"></i>
                        </div>
                        <h2 className="font-medium text-gray-800">Available Rides</h2>
                      </div>
                      <button 
                        onClick={() => setShowAvailableRides(false)}
                        className="h-6 w-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <i className="ri-close-line text-sm text-gray-600"></i>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 ml-8">Tap to accept a ride</p>
                  </div>

                  {/* Rides List with Custom Scrollbar */}
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <style jsx>{`
                      .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                        margin: 4px 0;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #e5e7eb;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #d1d5db;
                      }
                      .custom-scrollbar {
                        scrollbar-width: thin;
                        scrollbar-color: #e5e7eb transparent;
                      }
                    `}</style>
                    <div className="p-2 space-y-1.5">
                      {availableRides.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i className="ri-search-line text-lg text-yellow-600"></i>
                          </div>
                          <p className="text-gray-600 text-sm">No rides available</p>
                        </div>
                      ) : (
                        availableRides.map((ride) => (
                          <div 
                            key={ride._id}
                            className="bg-white rounded-lg border border-gray-100 hover:border-yellow-200 hover:shadow-sm transition-all duration-200"
                          >
                            <div className="p-2.5">
                              {/* User Info and Ride Summary */}
                              <div className="flex items-center gap-2.5">
                                {ride?.user?.profilePhoto ? (
                                  <img 
                                    src={ride.user.profilePhoto} 
                                    alt={ride.user.fullname?.firstname || 'User'} 
                                    className="h-9 w-9 rounded-full object-cover border border-yellow-100"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-200">
                                    <span className="text-sm font-semibold text-yellow-600">
                                      {ride?.user?.fullname?.firstname?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-gray-900 text-sm truncate">
                                      {ride?.user?.fullname?.firstname || 'User'}
                                    </h3>
                                    <span className="text-sm font-medium text-yellow-600">
                                      ₹{ride?.fare}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                                      <i className="ri-map-pin-line mr-0.5"></i>
                                      {typeof ride?.distance === 'number' ? `${Math.round(ride.distance)} KM` : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Ride Details */}
                              <div className="mt-1.5 pl-11 space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <i className="ri-map-pin-2-fill text-yellow-500"></i>
                                  <p className="truncate">{ride?.pickupAddress}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <i className="ri-map-pin-2-fill text-green-500"></i>
                                  <p className="truncate">{ride?.destinationAddress}</p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-1.5 mt-2 pl-11">
                                <button
                                  onClick={() => handleRejectRide(ride._id)}
                                  className="flex-1 py-1 px-2 bg-gray-100 text-gray-600 cursor-pointer rounded text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                                >
                                  <i className="ri-close-line"></i>
                                  <span>Ignore</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleAcceptRide(ride);
                                    setShowAvailableRides(false);
                                  }}
                                  className="flex-1 py-1 px-2 bg-yellow-500 text-white rounded cursor-pointer text-xs font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1"
                                >
                                  <i className="ri-check-line"></i>
                                  <span>Accept</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link 
              to='/captain-profile' 
              className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
            >
              <i className="text-xl ri-user-line"></i>
            </Link>
            <Link 
              to='/captain/logout' 
              className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
            >
              <i className="text-xl ri-logout-box-r-line"></i>
            </Link>
          </div>
        </div>

        {/* Map */}
        <div className='h-full w-full fixed top-0 left-0 z-0'>
          <LiveTracking 
            rideData={null} 
            mapType={mapType}
            onMapTypeChange={handleMapTypeChange}
          />
        </div>

        {/* Stats Section */}
        <div className='absolute bottom-0 inset-x-0 z-10 max-w-2xl mx-auto md:max-w-2xl md:mx-auto shadow-lg rounded-t-3xl overflow-hidden'>
          <div className='px-4 py-2 bg-white'>
          <h3 className='text-lg font-semibold my-2 mb-4 text-gray-800 text-center'>Today's Performance</h3>
            <CaptainDetails/>
          </div>
        </div>

        {/* Ride Popup Panel */}
        <div ref={ridePopupPanelRef} className='fixed w-full z-50 bottom-0 translate-y-full bg-white rounded-t-3xl shadow-lg px-6 py-8 md:max-w-2xl md:left-1/2 md:-translate-x-1/2'>
          <RidePopUp 
            ride={ride}
            setRidePopupPanel={setRidePopupPanel} 
            setConfirmRidePopupPanel={setConfirmRidePopupPanel}
            confirmRide={() => handleAcceptRide(ride)}
          />
        </div>

        {/* Confirm Ride Popup Panel */}
        {confirmRidePopupPanel && (
          <div ref={confirmRidePopupPanelRef} className='fixed w-full z-50 bottom-0 left-0 right-0 translate-y-full bg-white rounded-t-3xl shadow-lg md:max-w-2xl md:mx-auto'>
          <ConfirmRidePopUp
            ride={ride}
            setConfirmRidePopupPanel={setConfirmRidePopupPanel} 
            setRidePopupPanel={setRidePopupPanel} 
              onCancelOrComplete={handleCancelOrComplete}
          />
        </div>
        )}
      </div>
    </div>
  )
}

export default CaptainHome