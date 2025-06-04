import React, { useState, useEffect } from 'react';
import Payment from './Payment';
import axios from 'axios';
import { getToken } from '../src/services/auth.service';

const RideDetails = ({ rideData, onRideComplete }) => {
    const [currentRide, setCurrentRide] = useState(rideData);
    const [isLoading, setIsLoading] = useState(false);

    // Poll for ride status updates
    useEffect(() => {
        const pollRideStatus = async () => {
            try {
                const token = getToken('user');
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/rides/${rideData._id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                setCurrentRide(response.data);
            } catch (error) {
                console.error('Error fetching ride status:', error);
            }
        };

        // Poll every 5 seconds if ride is ongoing
        const interval = setInterval(() => {
            if (currentRide?.status === 'ongoing') {
                pollRideStatus();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [currentRide?.status, rideData._id]);

    const handlePaymentSuccess = async (response) => {
        try {
            setIsLoading(true);
            // Update ride status after successful payment
            const token = getToken('user');
            await axios.put(
                `${import.meta.env.VITE_BASE_URL}/rides/${currentRide._id}/payment-complete`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setCurrentRide(prev => ({
                ...prev,
                paymentStatus: 'completed'
            }));
        } catch (error) {
            console.error('Error updating ride status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentFailure = (error) => {
        console.error('Payment failed:', error);
        alert('Payment failed. Please try again.');
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Ride Details</h2>
                <p className="text-gray-600">Status: {currentRide?.status}</p>
                <p className="text-gray-600">Fare: ₹{currentRide?.fare}</p>
                <p className="text-gray-600">From: {currentRide?.pickupAddress}</p>
                <p className="text-gray-600">To: {currentRide?.destinationAddress}</p>
            </div>

            {currentRide?.status === 'ongoing' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <p className="text-blue-600">Ride in progress...</p>
                </div>
            )}
            
            {currentRide?.status === 'completed' && currentRide?.paymentStatus === 'pending' && (
                <div className="mt-4">
                    <Payment
                        rideData={currentRide}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentFailure={handlePaymentFailure}
                    />
                </div>
            )}

            {currentRide?.status === 'completed' && currentRide?.paymentStatus === 'completed' && (
                <div className="mt-4 p-4 bg-green-50 rounded-md">
                    <p className="text-green-600">Payment completed successfully!</p>
                    <p className="text-sm text-gray-600 mt-2">Thank you for using MyTaxy!</p>
                </div>
            )}
        </div>
    );
};

export default RideDetails; 