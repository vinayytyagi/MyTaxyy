import React, { useContext, useEffect, useState } from 'react';
import { CaptainDataContext } from '../context/CaptainContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'remixicon/fonts/remixicon.css';

const CaptainProfile = () => {
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  const [rideHistory, setRideHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ridesPerPage = 10;
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    vehicleType: '',
    plate: '',
    color: ''
  });
  const [paymentNotification, setPaymentNotification] = useState(null);
  const [completingRide, setCompletingRide] = useState(false);
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [selectedRideForCash, setSelectedRideForCash] = useState(null);

  useEffect(() => {
    const fetchRideHistory = async () => {
      try {
        const token = localStorage.getItem('captainToken');
        if (!token) {
          setError('Authentication token not found');
          setLoading(false);
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/captain/history`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Process and validate the ride data
        const processedRides = (response.data.rides || []).map(ride => ({
          ...ride,
          fare: ride.fare || 0,
          // Determine payment method based on payment status and payment ID
          paymentMethod: ride.paymentStatus === 'completed' && ride.paymentId ? 'online' : 'cash',
          status: ride.status || 'unknown'
        }));

        setRideHistory(processedRides);
      } catch (err) {
        console.error('Error fetching ride history:', err);
        setError('Failed to load ride history');
      } finally {
        setLoading(false);
      }
    };

    fetchRideHistory();
  }, []);

  useEffect(() => {
    if (captain) {
      // console.log('Raw captain data in useEffect:', captain); // Debug log
      setFormData({
        firstname: captain.fullname?.firstname || '',
        lastname: captain.fullname?.lastname || '',
        email: captain.email || '',
        phone: captain.phone || '',
        vehicleType: captain.vehicle?.vehicleType || '',
        plate: captain.vehicle?.plate || '',
        color: captain.vehicle?.color || ''
      });
    }
  }, [captain]);

  // Update socket listener for payment completion
  useEffect(() => {
    if (!socket) return;

    // Listen for payment completion
    socket.on('payment_completed', (data) => {
      const { rideId, amount } = data;
      
      // Update ride history immediately with payment and status
      setRideHistory(prevRides => 
        prevRides.map(ride => 
          ride._id === rideId 
            ? { 
                ...ride, 
                paymentMethod: 'online', 
                paymentStatus: 'completed',
                paymentAmount: amount
              }
            : ride
        )
      );

      // Show notification
      setPaymentNotification({
        rideId,
        amount,
        timestamp: new Date()
      });

      // Auto-hide notification after 15 seconds
      setTimeout(() => {
        setPaymentNotification(null);
      }, 15000);
    });

    // Listen for ride status updates
    socket.on('ride_status_updated', (data) => {
      const { rideId, status } = data;
      setRideHistory(prevRides =>
        prevRides.map(ride =>
          ride._id === rideId
            ? { ...ride, status }
            : ride
        )
      );
    });

    return () => {
      socket.off('payment_completed');
      socket.off('ride_status_updated');
    };
  }, [socket]);

  const handleLogout = () => {
    localStorage.removeItem('captainToken');
    setCaptain(null);
    if (socket) {
      socket.disconnect();
    }
    navigate('/captain-login');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 km';
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${(km * 1000).toFixed(0)} m`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 min';
    const minutes = Math.floor(seconds / 60);
    return minutes >= 60 
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or JPG image.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('profilePhoto', file);

    try {
      setUploading(true);
      setError(null);
      const token = localStorage.getItem('captainToken');
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/captains/profile/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.profilePhoto) {
        setCaptain({ ...captain, profilePhoto: response.data.profilePhoto });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError(error.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);

    // Validate required fields
    const requiredFields = {
      firstname: 'First Name',
      lastname: 'Last Name',
      email: 'Email',
      phone: 'Phone Number',
      vehicleType: 'Vehicle Type',
      plate: 'Vehicle Plate',
      color: 'Vehicle Color'
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !formData[field])
      .map(([_, label]) => label);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setUploading(false);
      return;
    }

    try {
      const token = localStorage.getItem('captainToken');
      const updateData = {
        fullname: {
          firstname: formData.firstname,
          lastname: formData.lastname
        },
        email: formData.email,
        phone: formData.phone,
        vehicle: {
          vehicleType: formData.vehicleType,
          plate: formData.plate,
          color: formData.color
        }
      };

      const response = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/captains/profile`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.data) {
        const currentCaptain = captain || {};
        const updatedCaptain = {
          ...currentCaptain,
          fullname: {
            ...currentCaptain.fullname,
            ...response.data.data.fullname
          },
          vehicle: {
            ...currentCaptain.vehicle,
            ...response.data.data.vehicle
          },
          email: response.data.data.email || currentCaptain.email,
          phone: response.data.data.phone || formData.phone,
          _id: response.data.data._id || currentCaptain._id
        };
        
        setCaptain(updatedCaptain);
        
        const storedCaptain = localStorage.getItem('captainData');
        if (storedCaptain) {
          localStorage.setItem('captainData', JSON.stringify(updatedCaptain));
        }
        
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.join(', ') || 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Add pagination calculation
  const indexOfLastRide = currentPage * ridesPerPage;
  const indexOfFirstRide = indexOfLastRide - ridesPerPage;
  const currentRides = rideHistory.slice(indexOfFirstRide, indexOfLastRide);
  const totalPages = Math.ceil(rideHistory.length / ridesPerPage);

  // Add pagination controls component with limited page buttons
  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5; // Show max 5 page buttons
      
      if (totalPages <= maxVisiblePages) {
        // If total pages are less than max visible, show all
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Always show first page
        pageNumbers.push(1);
        
        // Calculate start and end of visible pages
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        
        // Adjust if at the start
        if (currentPage <= 2) {
          endPage = 4;
        }
        // Adjust if at the end
        if (currentPage >= totalPages - 1) {
          startPage = totalPages - 3;
        }
        
        // Add ellipsis after first page if needed
        if (startPage > 2) {
          pageNumbers.push('...');
        }
        
        // Add middle pages
        for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
        }
        
        // Add ellipsis before last page if needed
        if (endPage < totalPages - 1) {
          pageNumbers.push('...');
        }
        
        // Always show last page
        pageNumbers.push(totalPages);
      }
      
      return pageNumbers;
    };

    return (
      <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-4">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstRide + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(indexOfLastRide, rideHistory.length)}
            </span>{' '}
            of <span className="font-medium">{rideHistory.length}</span> rides
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <i className="ri-arrow-left-s-line"></i>
          </button>
          
          {getPageNumbers().map((number, index) => (
            number === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
            ) : (
              <button
                key={number}
                onClick={() => setCurrentPage(number)}
                className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  currentPage === number
                    ? 'bg-[#fdc700] text-gray-900 hover:bg-[#fdc700]/90'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {number}
              </button>
            )
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <i className="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    );
  };

  // Handle cash payment confirmation
  const handleCashPaymentConfirm = async (rideId) => {
    try {
      setCompletingRide(true);
      const token = localStorage.getItem('captainToken');
      
      // First mark payment as received
      const paymentResponse = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/${rideId}/cash-payment`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (paymentResponse.data.success) {
        // Then complete the ride
        const completeResponse = await axios.post(
          `${import.meta.env.VITE_BASE_URL}/rides/${rideId}/complete`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (completeResponse.data.success) {
          setSuccess('Ride completed successfully with cash payment!');
          // Update ride status in history
          setRideHistory(prevRides =>
            prevRides.map(ride =>
              ride._id === rideId
                ? { 
                    ...ride, 
                    status: 'completed',
                    paymentMethod: 'cash',
                    paymentStatus: 'completed'
                  }
                : ride
            )
          );
        }
      }
    } catch (error) {
      console.error('Error processing cash payment:', error);
      setError(error.response?.data?.message || 'Failed to process cash payment');
    } finally {
      setCompletingRide(false);
      setShowCashPaymentModal(false);
      setSelectedRideForCash(null);
    }
  };

  // Handle ride completion
  const handleCompleteRide = async (rideId) => {
    try {
      setCompletingRide(true);
      const token = localStorage.getItem('captainToken');
      
      // For online payments, verify payment status first
      const ride = rideHistory.find(r => r._id === rideId);
      if (ride.paymentMethod === 'online' && ride.paymentStatus !== 'completed') {
        setError('Cannot complete ride: Payment not received');
        setCompletingRide(false);
        return;
      }

      // For cash payments, show confirmation modal
      if (ride.paymentMethod === 'cash') {
        setSelectedRideForCash(ride);
        setShowCashPaymentModal(true);
        setCompletingRide(false);
        return;
      }

      // Complete the ride
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/${rideId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Ride completed successfully!');
        // Update ride status in history
        setRideHistory(prevRides =>
          prevRides.map(ride =>
            ride._id === rideId
              ? { ...ride, status: 'completed' }
              : ride
          )
        );
      }
    } catch (error) {
      console.error('Error completing ride:', error);
      setError(error.response?.data?.message || 'Failed to complete ride');
    } finally {
      setCompletingRide(false);
    }
  };

  if (!captain) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Consistent with Home page */}
      <div className='fixed px-6 py-2 top-0 left-0 right-0 flex items-center justify-between z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/captain-home')} // Navigate to captain home on logo click
        >
          {/* Assuming myTaxyLogo is imported in Home.jsx and can be reused or use a placeholder */}
          {/* Replace with actual logo import if available */}
          <div className='w-12 h-12 bg-[#fdc700] rounded-full flex items-center justify-center text-white font-bold text-2xl'>M</div> {/* Placeholder Logo */}
          <span className="text-2xl font-bold text-gray-900">MyTaxy</span>
        </div>
        <div className="flex items-center space-x-3">
        <button 
            onClick={() => navigate('/captain-home')} // Back to captain home button
            className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer"
        >
            <i className="ri-arrow-left-line text-xl"></i>
        </button>
        <button 
          onClick={handleLogout}
            className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer"
        >
            <i className="ri-logout-box-r-line text-xl"></i>
        </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 mt-20">
        <div className="max-w-2xl mx-auto">
      {/* Profile Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="relative">
                {captain?.profilePhoto ? (
              <img 
                src={captain.profilePhoto} 
                alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#fdc700]"
              />
            ) : (
                  <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center text-4xl font-bold text-gray-600 border-2 border-[#fdc700]">
                    {captain?.fullname?.firstname?.charAt(0).toUpperCase() || 'C'}
              </div>
            )}
            {isEditing && (
              <label 
                htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 bg-[#fdc700] text-gray-800 rounded-full p-2 cursor-pointer hover:bg-[#fdc700]/90 transition-colors shadow-md"
              >
                    <i className="ri-camera-line text-xl"></i>
              </label>
            )}
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {captain?.fullname?.firstname && captain?.fullname?.lastname
                    ? `${captain.fullname.firstname} ${captain.fullname.lastname}`
                    : 'Captain'}
            </h2>
                <p className="text-gray-600">{captain?.email || 'captain@example.com'}</p>
                {captain?.phone && <p className="text-gray-600">{captain.phone}</p>}
                {captain?.vehicle && (
                  <p className="text-gray-600 mt-1">
                    <span className="font-medium">Vehicle:</span>{' '}
                    {[
                      captain.vehicle.plate,
                      captain.vehicle.color && `(${captain.vehicle.color})`,
                      captain.vehicle.vehicleType && `${captain.vehicle.vehicleType}`
                    ].filter(Boolean).join(' ')}
                  </p>
                )}
          </div>
        </div>

            {/* Single Edit Profile Button (Show only when not editing) */}
            {!isEditing && (
        <div className="mb-6">
          <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 px-4 bg-[#fdc700] cursor-pointer text-gray-800 font-semibold rounded-xl hover:bg-[#fdc700]/90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Profile
          </button>
          </div>
        )}

            {/* Profile Edit Form (Show only when editing) */}
            {isEditing && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>First Name</label>
                    <input
                      type="text"
                      name="firstname"
                      value={formData.firstname}
                      onChange={handleInputChange}
                      className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                      disabled={uploading}
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Last Name</label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleInputChange}
                      className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                      disabled={uploading}
                      required
                    />
                  </div>
                </div>

                  <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                    disabled={true}
                    />
                  <p className="mt-1 text-sm text-gray-500">Email cannot be changed here.</p>
                  </div>

                  <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Phone Number</label>
                    <input
                    type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                    disabled={uploading}
                      required
                    />
                  </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>Vehicle Type</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                        disabled={uploading}
                      required
                    >
                      <option value="">Select Vehicle Type</option>
                      <option value="car">Car</option>
                        <option value="bike">Bike</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>Vehicle Color</label>
                    <input
                      type="text"
                        name="color"
                        value={formData.color}
                      onChange={handleInputChange}
                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                        disabled={uploading}
                      required
                    />
                  </div>
                    <div className="md:col-span-2">
                      <label className='block text-sm font-medium text-gray-700 mb-2'>License Plate</label>
                    <input
                      type="text"
                      name="plate"
                      value={formData.plate}
                      onChange={handleInputChange}
                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                        disabled={uploading}
                      required
                    />
                  </div>
                </div>
                  </div>

                {/* Separate Save and Cancel buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 px-4 bg-gray-200 cursor-pointer text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#fdc700] cursor-pointer text-gray-800 font-semibold rounded-xl hover:bg-[#fdc700]/90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                        Saving...
                      </div>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Ride History Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Ride History ({rideHistory.length})</h3>
               
              </div>
          </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#fdc700] border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-4">{error}</div>
            ) : rideHistory.length > 0 ? (
              <div className="space-y-4">
                {currentRides.map((ride, index) => (
                  <div
                    key={ride._id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border-l-4 border-[#fdc700]"
                  >
                    {/* Ride Number and Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            Ride #{rideHistory.length - (indexOfFirstRide + index)}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            ride.status === 'completed'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : ride.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : ride.status === 'ongoing'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}>
                            <i className={`mr-1.5 ${
                              ride.status === 'completed'
                                ? 'ri-checkbox-circle-line'
                                : ride.status === 'cancelled'
                                  ? 'ri-close-circle-line'
                                  : ride.status === 'ongoing'
                                    ? 'ri-loader-4-line animate-spin'
                                    : 'ri-question-line'
                            }`}></i>
                            {ride.status ? ride.status.charAt(0).toUpperCase() + ride.status.slice(1) : 'Unknown'}
                          </span>
                          <span className="text-sm text-gray-500">
                            Ride ID: {ride._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(ride.createdAt)}
                        </p>
                    </div>
                    </div>

                    <div className="space-y-4 pl-1">
                      {/* Fare and Payment Details */}
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                            <i className="ri-money-dollar-circle-line mr-2"></i>
                            Fare & Payment Details
                          </h5>
                          {ride.status === 'ongoing' && (
                            <button
                              onClick={() => handleCompleteRide(ride._id)}
                              disabled={completingRide || (ride.paymentMethod === 'online' && ride.paymentStatus !== 'completed')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                                ride.paymentMethod === 'online' && ride.paymentStatus !== 'completed'
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-[#fdc700] text-gray-900 hover:bg-[#fdc700]/90'
                              } transition-colors`}
                            >
                              {completingRide ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent mr-2"></div>
                                  Completing...
                                </>
                              ) : (
                                <>
                                  <i className={`ri-${ride.paymentMethod === 'cash' ? 'money-dollar-circle' : 'check'}-line mr-2`}></i>
                                  {ride.paymentMethod === 'cash' ? 'Complete with Cash' : 'Complete Ride'}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Fare Amount</span>
                            <span className="text-lg font-bold text-gray-900">₹{Number(ride.fare).toFixed(2)}</span>
                          </div>
                          {/* Payment Method - Only show for completed rides */}
                          {ride.status === 'completed' && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Payment Method</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                ride.paymentMethod === 'online'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                <i className={`ri-${ride.paymentMethod === 'online' ? 'bank-card' : 'money-dollar-circle'} line mr-1`}></i>
                                {ride.paymentMethod === 'online' ? 'Online Payment' : 'Cash Payment'}
                              </span>
                            </div>
                          )}
                  </div>
                </div>

                      {/* Location Details */}
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                          <i className="ri-route-line mr-2"></i>
                          Ride Details
                        </h5>
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                            <div className="ml-2 flex-grow">
                              <p className="font-medium text-gray-900">Pickup</p>
                              <p className="text-gray-600">{ride.pickupAddress || 'Pickup location not available'}</p>
                    </div>
                    </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                            <div className="ml-2 flex-grow">
                              <p className="font-medium text-gray-900">Destination</p>
                              <p className="text-gray-600">{ride.destinationAddress || 'Destination not available'}</p>
                </div>
              </div>
          </div>
                      </div>

                      {/* User Details */}
                      {ride.user && (
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                            <i className="ri-user-line mr-2"></i>
                            User Details
                          </h5>
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 mr-3">
                              {ride.user.fullname?.firstname?.charAt(0).toUpperCase() || 'U'}
              </div>
                      <div>
                              <p className="font-medium text-gray-900">
                                {ride.user.fullname?.firstname && ride.user.fullname?.lastname
                                  ? `${ride.user.fullname.firstname} ${ride.user.fullname.lastname}`
                                  : ride.user.name || 'Name not available'}
                        </p>
                              {ride.user?.phone && (
                                <p className="text-gray-600 flex items-center">
                                  <i className="ri-phone-line mr-1"></i>
                                  {ride.user.phone}
                                </p>
                              )}
                      </div>
                    </div>
                          {ride.rating && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <i
                                      key={i}
                                      className={`ri-star-${i < ride.rating ? 'fill' : 'line'} text-yellow-400`}
                                    ></i>
                                  ))}
                                </div>
                                {ride.feedback && (
                                  <p className="text-gray-600 ml-2 italic">"{ride.feedback}"</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <PaginationControls />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <i className="ri-route-line text-4xl"></i>
              </div>
                <p className="text-gray-600">No ride history found.</p>
          </div>
        )}
                </div>
              </div>
                </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {success}
              </div>
      )}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
                </div>
      )}

      {/* Updated Payment Notification */}
      {paymentNotification && (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-lg z-50 animate-slide-in border border-green-200">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <i className="ri-checkbox-circle-line text-xl text-green-600"></i>
              </div>
                <div>
                <p className="font-semibold text-gray-900">Payment Received!</p>
                <p className="text-sm text-gray-600">
                  ₹{paymentNotification.amount.toFixed(2)} for Ride #{paymentNotification.rideId.slice(-6).toUpperCase()}
                </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Cash Payment Confirmation Modal */}
      {showCashPaymentModal && selectedRideForCash && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Cash Payment</h3>
            <p className="text-gray-600 mb-4">
              Please confirm that you have received the cash payment of ₹{selectedRideForCash.fare.toFixed(2)} from the user.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCashPaymentModal(false);
                  setSelectedRideForCash(null);
                }}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCashPaymentConfirm(selectedRideForCash._id)}
                disabled={completingRide}
                className="flex-1 py-2 px-4 bg-[#fdc700] text-gray-900 rounded-lg font-medium hover:bg-[#fdc700]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {completingRide ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="ri-money-dollar-circle-line mr-2"></i>
                    Confirm Cash Payment
                  </>
                )}
              </button>
      </div>
          </div>
      </div>
      )}

      {/* Add styles for notification animation */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CaptainProfile; 