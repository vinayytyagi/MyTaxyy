import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../src/services/auth.service';

const ConfirmRidePopUp = (props) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [rideData, setRideData] = useState(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        if (props.ride) {
            setRideData(props.ride);
            console.log('Ride data received:', props.ride);
        }
    }, [props.ride]);
    
    const submitHandler = async (e) => {
        e.preventDefault();
        setError('');

        if (!rideData || !rideData._id) {
            setError('Invalid ride data. Please try again.');
            return;
        }

        if (!otp || otp.length < 4) {
            setError('Please enter a valid OTP');
            return;
        }

        try {
            const token = getToken('captain');
            if (!token) {
                setError('Authentication error. Please login again.');
                return;
            }

            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/start-ride`, {
                params: {
                    rideId: rideData._id,
                    otp: otp
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 200) {
                props.setConfirmRidePopupPanel(false);
                props.setRidePopupPanel(false);
                navigate('/captain-riding', { state: { ride: rideData } });
                if (props.onCancelOrComplete) props.onCancelOrComplete();
            }
        } catch (error) {
            console.error('Error starting ride:', error);
            setError(error.response?.data?.message || 'Failed to start ride. Please try again.');
        }
    }

    const handleCancel = async () => {
        if (rideData?._id) {
            try {
                await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, { rideId: rideData._id });
            } catch (err) {
                // Optionally handle error
            }
        }
        props.setConfirmRidePopupPanel(false);
        props.setRidePopupPanel(false);
        if (props.onCancelOrComplete) props.onCancelOrComplete();
    };

    if (!rideData) {
        return (
            <div className="relative p-4">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
                        <i className="ri-error-warning-line text-2xl text-red-600"></i>
                    </div>
                    <p className="text-red-600 mb-4">No ride data available</p>
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-t-3xl p-6 overflow-y-auto min-h-[50vh] max-h-[85vh] hide-scrollbar">
            {/* Down Button */}
            <button
                onClick={() => {
                    props.setConfirmRidePopupPanel(false);
                    props.setRidePopupPanel(false);
                }}
                className="absolute top-0 left-1/2 transform -translate-x-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors z-10 cursor-pointer hover:scale-105 active:scale-95"
            >
                <i className="ri-arrow-down-wide-fill text-2xl"></i>
            </button>

            <h3 className='text-2xl font-semibold mb-5 text-center'>Verify OTP to Start Ride</h3>

            {/* User Info Card */}
            <div className='flex items-center justify-between bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-4 shadow-md mb-6'> 
                <div className='flex items-center justify-start gap-3'>
                    {rideData?.user?.profilePhoto ? (
                        <img 
                            className='h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm' 
                            src={rideData.user.profilePhoto} 
                            alt={`${rideData.user.fullname?.firstname || ''} ${rideData.user.fullname?.lastname || ''}`} 
                        />
                    ) : (
                        <div className='h-14 w-14 bg-white rounded-full flex items-center justify-center text-lg font-bold text-yellow-600 border-2 border-white shadow-sm'>
                            {rideData?.user?.fullname?.firstname?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <h4 className='text-lg font-medium text-gray-900'>{rideData?.user?.fullname?.firstname || 'User'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                                <i className="ri-map-pin-line mr-1"></i>
                                {typeof rideData?.distance === 'number' ? `${Math.round(rideData.distance)} KM` : 'N/A'}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                                <i className="ri-money-rupee-circle-line mr-1"></i>
                                ₹{rideData?.fare || '0'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ride Details Card */}
            <div className='bg-white rounded-xl shadow-sm p-4 mb-6'>
                <div className='space-y-4'>
                    {/* Pickup Location */}
                    <div className='flex items-start gap-4 p-3 bg-gray-50 rounded-lg'>
                        <div className='h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
                            <i className="ri-map-pin-2-fill text-xl text-blue-600"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className='text-sm font-medium text-gray-500'>Pickup Location</h3>
                            <p className='text-gray-900 truncate'>{rideData?.pickupAddress || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Destination Location */}
                    <div className='flex items-start gap-4 p-3 bg-gray-50 rounded-lg'>
                        <div className='h-10 w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0'>
                            <i className="ri-map-pin-2-fill text-xl text-green-600"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className='text-sm font-medium text-gray-500'>Destination</h3>
                            <p className='text-gray-900 truncate'>{rideData?.destinationAddress || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* OTP Input Form */}
            <div className='bg-white rounded-xl shadow-sm p-4'>
                <form onSubmit={submitHandler} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <i className="ri-error-warning-line"></i>
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter OTP
                        </label>
                        <div className="relative">
                            <input 
                                id="otp"
                                type="text" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-[#fdc700] rounded-lg text-lg font-mono tracking-widest text-center focus:ring-[#fdc700] focus:border-[#fdc700] transition-colors cursor-text"
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <i className="ri-shield-keyhole-line text-[#fdc700]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={handleCancel} 
                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                        >
                            <i className="ri-close-line"></i>
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 bg-[#fdc700] text-gray-900 rounded-xl font-medium hover:bg-[#fdc700]/90 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                        >
                            <i className="ri-check-line"></i>
                            <span>Start Ride</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConfirmRidePopUp;