import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../src/services/auth.service';
import { SocketContext } from '../src/context/SocketContext';
import { toast } from 'react-hot-toast';

const FinishRide = (props) => {
    const navigate = useNavigate();
    const { socket } = useContext(SocketContext);
    const [isCompleting, setIsCompleting] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [cashCollected, setCashCollected] = useState(false);

    // Check if payment is ready to be completed
    const isPaymentReady = () => {
        // For online payments
        if (props.ride?.paymentMethod === 'online') {
            // Check payment status directly from the ride prop
            return props.ride?.paymentStatus === 'completed';
        }
        // For cash payments
        return cashCollected; // Check if cash has been marked as collected via local state
    };

    // Handle payment method selection (only for cash payments)
    const handlePaymentMethodSelect = async (method) => {
        if (props.ride?.paymentMethod === 'online') return; // Don't allow selection for online payments
        if (method === 'cash' && !cashCollected) {
            try {
                setIsCompleting(true);
                const token = getToken('captain');
                if (!token) {
                    toast.error('Authentication error');
                    return;
                }

                // Mark payment as received via backend endpoint
                const paymentResponse = await axios.post(
                    `${import.meta.env.VITE_BASE_URL}/rides/${props.ride._id}/cash-payment`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (paymentResponse.data.success) {
                    // On successful cash confirmation, update local state
                    // The parent (CaptainRiding) should ideally also get a ride status update
                    // via socket, but we update local state for immediate UI feedback.
                    // setPaymentStatus('completed'); // Removed local state update
                    setSelectedPaymentMethod('cash');
                    setCashCollected(true);
                    toast.success('Cash payment confirmed! You can now complete the ride.');
                } else {
                    toast.error(paymentResponse.data.message || 'Failed to confirm cash payment');
                }
            } catch (error) {
                console.error('Error processing cash payment:', error);
                toast.error(error.response?.data?.message || 'Failed to process cash payment');
            } finally {
                setIsCompleting(false);
            }
        }
    };

    async function endRide() {
        try {
            setIsCompleting(true);
            const token = getToken('captain');
            if (!token) {
                toast.error('Authentication error');
                return;
            }

            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/rides/end-ride`,
                {
                rideId: props.ride._id
                },
                {
                headers: {
                    Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 200) {
                // Emit socket event to notify user that ride is completed
                socket.emit('ride-completed', { 
                    rideId: props.ride._id, 
                    userId: props.ride.user._id,
                    paymentMethod: selectedPaymentMethod || props.ride.paymentMethod
                });
                
                // Show success message before navigating
                toast.success('Ride completed successfully!');
                
                // Small delay to show the success message
                setTimeout(() => {
                    navigate('/captain-home');
                }, 1000);
            }
        } catch (error) {
            console.error('Error ending ride:', error);
            toast.error(error.response?.data?.message || 'Failed to complete ride');
            setIsCompleting(false);
        }
    }

  return (
        <div className="mx-auto w-[93%] max-w-2xl bg-white rounded-t-2xl shadow-lg py-8 px-6 overflow-y-auto min-h-[50vh] max-h-[85vh] hide-scrollbar">
            {/* Close Button */}
            {/* <button
                onClick={() => props.setFinishRidePanel(false)}
                className="absolute top-4 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <i className="ri-close-line text-2xl"></i>
            </button> */}

            {/* Down Button */}
            <button
                onClick={() => props.setFinishRidePanel(false)}
                className="absolute top-0 left-1/2 transform -translate-x-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors z-10 cursor-pointer hover:scale-105 active:scale-95"
            >
                <i className="ri-arrow-down-wide-fill text-2xl"></i>
            </button>

            <h3 className='text-2xl font-semibold mb-5 text-center'>Finish this Ride</h3>

            {/* User Info Card */}
            <div className='flex items-center justify-between bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-4 shadow-md mb-6'> 
                <div className='flex items-center justify-start gap-3'>
                    {props.ride?.user.profilePhoto ? (
                        <img 
                            className='h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm' 
                            src={props.ride?.user.profilePhoto} 
                            alt={`${props.ride?.user.fullname.firstname} ${props.ride?.user.fullname.lastname}`} 
                        />
                    ) : (
                        <div className='h-14 w-14 bg-white rounded-full flex items-center justify-center text-lg font-bold text-yellow-600 border-2 border-white shadow-sm'>
                            {props.ride?.user.fullname.firstname?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <h4 className='text-lg font-medium text-gray-900'>{props.ride?.user.fullname.firstname}</h4>
                        <p className='text-sm text-gray-700'>Ride Distance: {props.ride?.distance?.toFixed(1)} KM</p>
                    </div>
                </div> 
        </div>

            {/* Ride Details Card */}
            <div className='bg-white rounded-xl shadow-sm p-4 mb-6'>
                <div className='space-y-4'>
                    <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg'>
                        <div className='h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center'>
                            <i className="ri-map-pin-2-fill text-xl text-blue-600"></i>
                        </div>
                    <div>
                            <h3 className='text-sm font-medium text-gray-500'>Pickup</h3>
                            <p className='text-gray-900'>{props.ride?.pickupAddress}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg'>
                        <div className='h-10 w-10 bg-green-100 rounded-full flex items-center justify-center'>
                            <i className="ri-map-pin-2-fill text-xl text-green-600"></i>
                </div>
                    <div>
                            <h3 className='text-sm font-medium text-gray-500'>Destination</h3>
                            <p className='text-gray-900'>{props.ride?.destinationAddress}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg'>
                        <div className='h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center'>
                            <i className="ri-currency-line text-xl text-purple-600"></i>
                        </div>
                        <div className='flex-1'>
                            <h3 className='text-sm font-medium text-gray-500'>Fare</h3>
                            <div className='flex items-center justify-between'>
                                <p className='text-xl font-semibold text-gray-900'>₹{props.ride?.fare}</p>
                                {props.ride?.paymentMethod === 'online' && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                                        // Use paymentStatus from props.ride
                                        props.ride?.paymentStatus === 'completed'
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse'
                                    }`}>
                                        <i className={`ri-${props.ride?.paymentStatus === 'completed' ? 'checkbox-circle' : 'time'}-line mr-1.5`}></i>
                                        {props.ride?.paymentStatus === 'completed' ? 'Payment Received' : 'Waiting for Payment'}
                                    </span>
                                )}
                    </div>
                </div>
                    </div>
                </div>
            </div>
           
            {/* Payment Method Selection */}
            <div className='bg-white rounded-xl shadow-sm p-4 mb-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>Payment Method</h3>
                <div className='grid grid-cols-2 gap-4'>
                    {/* Online Payment Button */}
                    <button
                        disabled={true} // Always disabled for selection by captain
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            props.ride?.paymentMethod === 'online' && props.ride?.paymentStatus === 'completed'
                                ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                                : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                            props.ride?.paymentMethod === 'online' && props.ride?.paymentStatus === 'completed' 
                                ? 'bg-green-100' 
                                : 'bg-gray-100'
                        }`}>
                            <i className={`ri-bank-card-line text-xl ${
                                props.ride?.paymentMethod === 'online' && props.ride?.paymentStatus === 'completed' 
                                    ? 'text-green-600' 
                                    : 'text-gray-400'
                            }`}></i>
                        </div>
                        <span className='font-medium'>
                            {props.ride?.paymentMethod === 'online' && props.ride?.paymentStatus === 'completed'
                                ? `₹${props.ride?.fare} Received`
                                : 'Online Payment'
                            }
                        </span>
                    </button>

                    {/* Cash Payment Button */}
                    <button
                        onClick={() => handlePaymentMethodSelect('cash')}
                        disabled={props.ride?.paymentMethod === 'online' || cashCollected || isCompleting}
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            props.ride?.paymentMethod === 'online'
                                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                : cashCollected
                                    ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                                    : isCompleting
                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700 cursor-wait'
                                        : 'bg-gray-50 border-gray-200 hover:border-yellow-400 hover:bg-gray-100 cursor-pointer active:scale-[0.98]'
                        }`}
                    >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                            props.ride?.paymentMethod === 'online'
                                ? 'bg-gray-100'
                                : cashCollected
                                    ? 'bg-green-100'
                                    : isCompleting
                                        ? 'bg-yellow-100'
                                        : 'bg-yellow-100'
                        }`}>
                            <i className={`ri-${cashCollected ? 'check' : 'money-dollar-circle'}-line text-xl ${
                                props.ride?.paymentMethod === 'online'
                                    ? 'text-gray-400'
                                    : cashCollected
                                        ? 'text-green-600'
                                        : isCompleting
                                            ? 'text-yellow-600'
                                            : 'text-yellow-600'
                            }`}></i>
                        </div>
                        <span className='font-medium'>
                            {props.ride?.paymentMethod === 'online'
                                ? 'Cash Payment'
                                : cashCollected
                                    ? `₹${props.ride?.fare} Collected`
                                    : isCompleting
                                        ? 'Confirming...'
                                        : 'Cash Payment'
                            }
                        </span>
                    </button>
                </div>
            </div>

            {/* Complete Ride Button */}
                <button 
                onClick={endRide}
                disabled={!isPaymentReady() || isCompleting}
                className={`w-full flex justify-center items-center gap-2 p-4 rounded-xl font-semibold text-lg transition-all transform ${
                    isPaymentReady() 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
                {isCompleting ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Completing Ride...</span>
                    </>
                ) : (
                    <>
                        <i className={`ri-${isPaymentReady() ? 'check' : (props.ride?.paymentMethod === 'cash' ? 'money-dollar-circle' : 'time')}-line text-xl`}></i>
                        <span>
                            {isCompleting 
                                ? 'Completing Ride...' 
                                : props.ride?.paymentMethod === 'online' && !isPaymentReady()
                                    ? 'Waiting for Payment...'
                                    : 'Complete Ride'
                            }
                        </span>
                    </>
                )}
            </button>
        </div>
    );
};

export default FinishRide
