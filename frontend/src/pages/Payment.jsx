import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import Loader from '../components/Loader';
import { FaCreditCard, FaMoneyBillWave, FaWallet } from 'react-icons/fa';
import axios from 'axios';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [rideDetails, setRideDetails] = useState(null);

  useEffect(() => {
    if (location.state?.rideDetails) {
      setRideDetails(location.state.rideDetails);
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handlePayment = async () => {
    if (!rideDetails) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/payments/process`,
        {
          rideId: rideDetails._id,
          amount: rideDetails.fare,
          paymentMethod
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Notify driver about successful payment using socket
        if (socket && socket.connected && rideDetails.captain?._id) {
          socket.emit('payment_successful', {
            rideId: rideDetails._id,
            captainId: rideDetails.captain._id,
            amount: rideDetails.fare
          });
          
          toast.success('Payment successful!');
          
          // Wait for 2 seconds to ensure notification is sent
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } else {
          console.error('Socket not connected or captain ID missing');
          toast.error('Payment successful but notification failed');
          navigate('/home');
        }
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!rideDetails) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Ride Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">
              <span className="font-medium">From:</span> {rideDetails.pickupAddress}
            </p>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">To:</span> {rideDetails.destinationAddress}
            </p>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Fare:</span> ₹{rideDetails.fare}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Select Payment Method</h3>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center p-4 rounded-lg border ${
                paymentMethod === 'card' ? 'border-[#fdc700] bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <FaCreditCard className="text-xl mr-3" />
              <span>Credit/Debit Card</span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`w-full flex items-center p-4 rounded-lg border ${
                paymentMethod === 'cash' ? 'border-[#fdc700] bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <FaMoneyBillWave className="text-xl mr-3" />
              <span>Cash</span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('wallet')}
              className={`w-full flex items-center p-4 rounded-lg border ${
                paymentMethod === 'wallet' ? 'border-[#fdc700] bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <FaWallet className="text-xl mr-3" />
              <span>Wallet</span>
            </button>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-[#fdc700] text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader /> : 'Pay Now'}
        </button>
      </div>
    </div>
  );
};

export default Payment; 