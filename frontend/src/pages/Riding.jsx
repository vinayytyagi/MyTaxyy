import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import LiveTracking from '../../components/LiveTracking'
import axios from 'axios'
import { getToken } from '../services/auth.service'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import myTaxyLogo from '../assets/myTaxy.png'

const Riding = () => {
    const location = useLocation()
    const { ride } = location.state || {}
    const { socket } = useContext(SocketContext)
    const navigate = useNavigate()
    const [formattedRideData, setFormattedRideData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [razorpayLoaded, setRazorpayLoaded] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showPanel, setShowPanel] = useState(true)
    const [routeDetails, setRouteDetails] = useState(null)
    const panelRef = useRef(null)
    const [mapType, setMapType] = useState('roadmap')

    // GSAP animation for panel
    useGSAP(() => {
        if (showPanel) {
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
    }, [showPanel])

    // Format ride data for LiveTracking component
    useEffect(() => {
        if (ride) {
            setFormattedRideData({
                _id: ride._id,
                pickup: {
                    lat: parseFloat(ride.pickup.split(',')[0]),
                    lng: parseFloat(ride.pickup.split(',')[1])
                },
                destination: {
                    lat: parseFloat(ride.destination.split(',')[0]),
                    lng: parseFloat(ride.destination.split(',')[1])
                }
            })
        }
    }, [ride])

    useEffect(() => {
        if (socket) {
    socket.on("ride-ended", () => {
        navigate('/home')
    })
        }

        return () => {
            if (socket) {
                socket.off("ride-ended")
            }
        }
    }, [socket, navigate])

    // Load Razorpay script on component mount
    useEffect(() => {
        const loadRazorpay = async () => {
            try {
                const res = await initializeRazorpay()
                setRazorpayLoaded(res)
                console.log('Razorpay loaded:', res)
            } catch (error) {
                console.error('Error loading Razorpay:', error)
                setRazorpayLoaded(false)
            }
        }
        loadRazorpay()
    }, [])

    const initializeRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                console.log('Razorpay already loaded')
                resolve(true)
                return
            }

            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => {
                console.log('Razorpay script loaded successfully')
                resolve(true)
            }
            script.onerror = () => {
                console.error('Failed to load Razorpay script')
                resolve(false)
            }
            document.body.appendChild(script)
        })
    }

    const handlePayment = async () => {
        try {
            console.log('Starting payment process...')
            setIsLoading(true)
            setError(null)

            if (!razorpayLoaded) {
                console.log('Razorpay not loaded, attempting to load...')
                const loaded = await initializeRazorpay()
                if (!loaded) {
                    throw new Error('Failed to load Razorpay SDK')
                }
                setRazorpayLoaded(true)
            }

            const token = getToken('user')
            if (!token) {
                throw new Error('Authentication required')
            }

            console.log('Creating order...')
            const orderResponse = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/api/payment/create-order`,
                {
                    rideId: ride._id,
                    amount: ride.fare
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            console.log('Order created:', orderResponse.data)

            if (!orderResponse.data || !orderResponse.data.id) {
                throw new Error('Failed to create order')
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderResponse.data.amount,
                currency: orderResponse.data.currency,
                name: 'MyTaxy',
                description: `Payment for ride #${ride._id}`,
                order_id: orderResponse.data.id,
                prefill: {
                    name: ride.user?.name || '',
                    email: ride.user?.email || '',
                    contact: ride.user?.phone || ''
                },
                theme: {
                    color: '#1360db'
                },
                handler: async function (response) {
                    console.log('Payment successful, verifying...', response)
                    try {
                        const verifyResponse = await axios.post(
                            `${import.meta.env.VITE_BASE_URL}/api/payment/verify`,
                            {
                                rideId: ride._id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        )

                        console.log('Payment verification response:', verifyResponse.data)

                        if (verifyResponse.data.success) {
                            try {
                                await axios.put(
                                    `${import.meta.env.VITE_BASE_URL}/api/rides/${ride._id}/complete-payment`,
                                    {},
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`
                                        }
                                    }
                                )
                                // Emit socket event to notify driver about payment
                                console.log('Emitting payment-successful event:', {
                                    rideId: ride._id,
                                    captainId: ride.captain._id
                                });
                                
                                // Make sure socket is connected before emitting
                                if (socket && socket.connected) {
                                    socket.emit('payment-successful', {
                                        rideId: ride._id,
                                        captainId: ride.captain._id
                                    });
                                    console.log('Payment success event emitted');
                                } else {
                                    console.error('Socket not connected');
                                }
                                
                                // Clear all state and navigate to home
                                socket.emit('leave-ride', { rideId: ride._id });
                                localStorage.removeItem('currentRide');
                                localStorage.removeItem('activeRide');
                                window.location.replace('/home');
                            } catch (updateError) {
                                console.error('Error updating ride status:', updateError)
                                socket.emit('leave-ride', { rideId: ride._id });
                                localStorage.removeItem('currentRide');
                                localStorage.removeItem('activeRide');
                                window.location.replace('/home');
                            }
                        } else {
                            throw new Error('Payment verification failed')
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error)
                        setError('Payment verification failed. Please try again.')
                    }
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal dismissed')
                        setIsLoading(false)
                    }
                },
                config: {
                    display: {
                        blocks: {
                            banks: {
                                name: "Pay using UPI",
                                instruments: [
                                    {
                                        method: "upi"
                                    }
                                ]
                            }
                        },
                        sequence: ["block.banks"],
                        preferences: {
                            show_default_blocks: true
                        }
                    }
                },
                image: {
                    width: "100",
                    height: "100"
                },
                notes: {
                    address: "MyTaxy Payment"
                },
                retry: {
                    enabled: true,
                    max_count: 3
                }
            }

            console.log('Opening Razorpay payment window...')
            const paymentObject = new window.Razorpay(options)
            paymentObject.open()

        } catch (error) {
            console.error('Payment error:', error)
            setError(error.message || 'Payment initialization failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRouteDetails = (details) => {
        setRouteDetails(details);
    };

  return (
    <div className="relative h-screen w-full">
        {/* Header - Consistent with Home page */}
        <div className='fixed px-6 py-2 top-0 flex items-center justify-between w-screen z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/home')}
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
                {/* Call Captain Button */}
                <button 
                    onClick={() => window.location.href = `tel:${ride?.captain?.phone}`}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title="Call Captain"
                >
                    <i className="text-xl ri-phone-line"></i>
                </button>
                {/* Back to Home Button */}
                <button 
                    onClick={() => navigate('/home')}
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
                        navigate('/');
                    }}
                    className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                    title="Logout"
                >
                    <i className="text-xl ri-logout-box-r-line"></i>
                </button>
            </div>
        </div>

        <div className='h-screen relative overflow-hidden bg-gray-50'>
            {/* Map Section */}
            <div className='fixed inset-0'>
                {formattedRideData && (
                    <LiveTracking 
                        rideData={formattedRideData} 
                        onRouteDetails={handleRouteDetails}
                    />
                )}
            </div>

            {/* Home Button */}
            {/* <Link 
                to='/home' 
                className='fixed right-4 top-4 h-12 w-12 bg-white flex items-center justify-center rounded-full shadow-lg hover:bg-gray-50 transition-colors z-50'
            >
                <i className="text-xl text-gray-700 ri-home-5-line"></i>
            </Link> */}

            {/* Ride Details Panel */}
            <div 
                ref={panelRef}
                className='fixed inset-x-0 bottom-0 h-[75vh] bg-white rounded-t-3xl shadow-lg transform translate-y-full max-w-2xl mx-auto md:max-w-2xl md:mx-auto z-[100]'
            >
                {/* Panel Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-sm p-4 border-b flex justify-between items-center rounded-t-3xl z-50">
                    <h4 className="text-lg font-semibold text-gray-800">Ride Details</h4>
                    <button
                        onClick={() => setShowPanel(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    >
                        <i className="ri-arrow-down-line text-xl"></i>
                    </button>
                </div>

                <div className='p-6 overflow-y-auto h-[calc(75vh-64px)]'>
                    {/* Driver Info Card */}
                    <div className='bg-gray-50 rounded-xl p-4'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <div className='h-14 w-14 bg-[#fdc70010] rounded-full flex items-center justify-center'>
                                    <i className="ri-user-line text-2xl text-[#fdc700]"></i>
                                </div>
                                <div>
                                    <h2 className='text-lg font-semibold text-gray-800 capitalize'>{ride?.captain.fullname.firstname} {ride?.captain.fullname.lastname}</h2>
                                    <p className='text-sm text-gray-600'>{ride?.captain.vehicle.model}</p>
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='bg-[#fdc70010] px-3 py-1 rounded-lg'>
                                    <h4 className='text-lg font-bold text-gray-800'>{ride?.captain.vehicle.plate}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ride Details */}
                    <div className='mt-6 space-y-4'>
                        {/* Pickup Location */}
                        <div className='bg-gray-50 rounded-xl p-4'>
                            <div className='flex items-start gap-4'>
                                <div className='mt-1'>
                                    <div className='h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center'>
                                        <i className="ri-map-pin-line text-[#fdc700]"></i>
                                    </div>
                                </div>
                                <div>
                                    <h3 className='text-sm font-medium text-gray-500'>Pickup</h3>
                                    <p className='text-base text-gray-800 mt-1'>{ride?.pickupAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Destination */}
                        <div className='bg-gray-50 rounded-xl p-4'>
                            <div className='flex items-start gap-4'>
                                <div className='mt-1'>
                                    <div className='h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center'>
                                        <i className="ri-map-pin-2-fill text-[#fdc700]"></i>
                                    </div>
                                </div>
                                <div>
                                    <h3 className='text-sm font-medium text-gray-500'>Destination</h3>
                                    <p className='text-base text-gray-800 mt-1'>{ride?.destinationAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Ride Details */}
                        <div className='bg-gray-50 rounded-xl p-4'>
                            <div className='flex items-start gap-4'>
                                <div className='mt-1'>
                                    <div className='h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center'>
                                        <i className="ri-route-line text-[#fdc700]"></i>
                                    </div>
                                </div>
                                <div className='flex-1'>
                                    <h3 className='text-sm font-medium text-gray-500'>Ride Details</h3>
                                    <div className='mt-2 space-y-2'>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Distance</span>
                                            <span className='text-sm font-medium text-gray-800'>{routeDetails?.distance || 'Calculating...'}</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Duration</span>
                                            <span className='text-sm font-medium text-gray-800'>{routeDetails?.duration || 'Calculating...'}</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Ride ID</span>
                                            <span className='text-sm font-medium text-gray-800'>{ride?._id?.slice(-6)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fare Details */}
                        <div className='bg-gray-50 rounded-xl p-4'>
                            <div className='flex items-start gap-4'>
                                <div className='mt-1'>
                                    <div className='h-8 w-8 rounded-full bg-[#fdc70010] flex items-center justify-center'>
                                        <i className="ri-currency-line text-[#fdc700]"></i>
                                    </div>
                                </div>
                                <div className='flex-1'>
                                    <h3 className='text-sm font-medium text-gray-500'>Fare Details</h3>
                                    <div className='mt-2 space-y-2'>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Base Fare</span>
                                            <span className='text-sm font-medium text-gray-800'>₹{ride?.fare}</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Payment Method</span>
                                            <span className='text-sm font-medium text-gray-800'>Online/Cash</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-sm text-gray-600'>Status</span>
                                            <span className='text-sm font-medium text-[#fdc700]'>In Progress</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className='mt-6'>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                                {error}
                            </div>
                        )}
                        
                        <button 
                            onClick={handlePayment}
                            disabled={isLoading || !razorpayLoaded}
                            className={`w-full font-semibold py-4 mb-4 rounded-xl transition-all ${
                                isLoading || !razorpayLoaded
                                    ? 'bg-gray-200 cursor-not-allowed text-gray-500 '
                                    : 'bg-[#fdc700] cursor-pointer hover:bg-[#fdc700]/90 text-gray-800 shadow-md hover:shadow-lg active:scale-[0.98]'
                            }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                    Processing...
                                </div>
                            ) : 'Make Payment'}
                        </button>

                        {!razorpayLoaded && (
                            <p className="mt-3 text-sm text-yellow-600 text-center">
                                Loading payment gateway...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Show Panel Button when panel is hidden */}
            {!showPanel && (
                <button
                    onClick={() => setShowPanel(true)}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors z-[90] flex items-center gap-2 cursor-pointer"
                >
                    <i className="ri-arrow-up-line text-xl text-gray-700"></i>
                    <span className="text-gray-700 font-medium">Show Details</span>
                </button>
            )}
        </div>
    </div>
  )
}

export default Riding