import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../src/services/auth.service';
import PaymentReceipt from './PaymentReceipt';
import { showToast } from '../src/components/CustomToast';

const Payment = ({ rideData, onPaymentSuccess, onPaymentFailure }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [paymentId, setPaymentId] = useState(null);
    const navigate = useNavigate();

    // Load Razorpay script on component mount
    useEffect(() => {
        const loadRazorpay = async () => {
            try {
                const res = await initializeRazorpay();
                setRazorpayLoaded(res);
                console.log('Razorpay loaded:', res);
            } catch (error) {
                console.error('Error loading Razorpay:', error);
                setRazorpayLoaded(false);
            }
        };
        loadRazorpay();
    }, []);

    const initializeRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                console.log('Razorpay already loaded');
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                console.log('Razorpay script loaded successfully');
                resolve(true);
            };
            script.onerror = () => {
                console.error('Failed to load Razorpay script');
                resolve(false);
            };
            document.body.appendChild(script);
        });
    };

    const makePayment = async () => {
        try {
            console.log('Starting payment process...');
            setIsLoading(true);
            setError(null);

            if (!razorpayLoaded) {
                console.log('Razorpay not loaded, attempting to load...');
                const loaded = await initializeRazorpay();
                if (!loaded) {
                    throw new Error('Failed to load Razorpay SDK');
                }
                setRazorpayLoaded(true);
            }

            const token = getToken('user');
            if (!token) {
                throw new Error('Authentication required');
            }

            console.log('Creating order...');
            const orderResponse = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/api/payment/create-order`,
                {
                    rideId: rideData._id,
                    amount: rideData.fare
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log('Order created:', orderResponse.data);

            if (!orderResponse.data || !orderResponse.data.id) {
                throw new Error('Failed to create order');
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderResponse.data.amount,
                currency: orderResponse.data.currency,
                name: 'MyTaxy',
                description: `Payment for ride #${rideData._id}`,
                order_id: orderResponse.data.id,
                prefill: {
                    name: rideData.user?.name || '',
                    email: rideData.user?.email || '',
                    contact: rideData.user?.phone || ''
                },
                theme: {
                    color: '#1360db'
                },
                handler: async function (response) {
                    console.log('Payment successful, verifying...', response);
                    try {
                        const verifyResponse = await axios.post(
                            `${import.meta.env.VITE_BASE_URL}/api/payment/verify`,
                            {
                                rideId: rideData._id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        );

                        console.log('Payment verification response:', verifyResponse.data);

                        if (verifyResponse.data.success) {
                            setPaymentId(response.razorpay_payment_id);
                            setShowReceipt(true);
                            onPaymentSuccess(verifyResponse.data);
                            showToast.success('Payment successful!');
                        } else {
                            throw new Error('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        onPaymentFailure('Payment verification failed');
                        showToast.error('Payment verification failed');
                    }
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal dismissed');
                        setIsLoading(false);
                    }
                }
            };

            console.log('Opening Razorpay payment window...');
            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error) {
            console.error('Payment error:', error);
            setError(error.message || 'Payment initialization failed');
            onPaymentFailure(error.message || 'Payment initialization failed');
            showToast.error(error.message || 'Payment initialization failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Complete Your Payment</h2>
            <div className="mb-4">
                <p className="text-gray-600">Ride Fare: ₹{rideData.fare}</p>
                <p className="text-sm text-gray-500">Please complete the payment to finish your ride</p>
            </div>
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
                    {error}
                </div>
            )}
            <button
                onClick={makePayment}
                disabled={isLoading || !razorpayLoaded}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                    isLoading || !razorpayLoaded
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
                {isLoading ? 'Processing...' : 'Pay Now'}
            </button>
            {!razorpayLoaded && (
                <p className="mt-2 text-sm text-yellow-600">
                    Loading payment gateway...
                </p>
            )}
            
            {showReceipt && paymentId && (
                <PaymentReceipt
                    paymentId={paymentId}
                    onClose={() => {
                        setShowReceipt(false);
                        navigate('/rides');
                    }}
                />
            )}
        </div>
    );
};

export default Payment;