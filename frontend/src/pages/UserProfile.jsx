import React, { useContext, useState, useEffect } from 'react';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import 'remixicon/fonts/remixicon.css';
import PaymentReceipt from '../components/PaymentReceipt';
import { showToast } from '../components/CustomToast';

const UserProfile = () => {
    const { user, setUser } = useContext(UserDataContext);
    const [rideHistory, setRideHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        totalPages: 1,
        totalRides: 0,
        ridesPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false
    });
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: ''
    });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, rideId: null });
    const navigate = useNavigate();

    // Add long press timer state
    const [longPressTimer, setLongPressTimer] = useState(null);

    // Add receipt functionality
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedPaymentId, setSelectedPaymentId] = useState(null);

    useEffect(() => {
        // Initialize form data with user data
        if (user) {
            setFormData({
                firstname: user.fullname?.firstname || '',
                lastname: user.fullname?.lastname || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }

        // Fetch user's ride history
        const fetchRideHistory = async () => {
            const token = localStorage.getItem('token');
            if (!user || !token) {
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/history`, {
                    params: { page: currentPage },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setRideHistory(response.data.rides || []);
                setPagination(response.data.pagination);
                console.log('Fetched ride history:', response.data);
            } catch (error) {
                console.error('Error fetching ride history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRideHistory();
    }, [user, currentPage]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif', 'image/heif', 'image/avif'];
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
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/users/profile/photo`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.data.profilePhoto) {
                setUser({ ...user, profilePhoto: response.data.profilePhoto });
                setSuccess('Profile photo updated successfully!');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setError(error.response?.data?.message || 'Failed to upload profile photo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setUploading(true);

        try {
            const response = await axios.put(
                `${import.meta.env.VITE_BASE_URL}/users/profile`,
                {
                    fullname: {
                        firstname: formData.firstname,
                        lastname: formData.lastname
                    },
                    email: formData.email,
                    phone: formData.phone
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            setUser(response.data.data);
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setUploading(false);
        }
    };

    // Function to handle ride deletion
    const handleDeleteRide = async (rideId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_BASE_URL}/rides/${rideId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Update ride history by removing the deleted ride
            setRideHistory(prevRides => prevRides.filter(ride => ride._id !== rideId));
            showToast.success('Ride deleted successfully');
        } catch (error) {
            console.error('Error deleting ride:', error);
            showToast.error('Failed to delete ride');
        }
        setContextMenu({ show: false, x: 0, y: 0, rideId: null });
    };

    // Handle context menu (right-click)
    const handleContextMenu = (e, rideId) => {
        e.preventDefault();
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            rideId
        });
    };

    // Handle long press start
    const handleLongPressStart = (e, rideId) => {
        e.preventDefault();
        const timer = setTimeout(() => {
            const touch = e.touches[0];
            setContextMenu({
                show: true,
                x: touch.clientX,
                y: touch.clientY,
                rideId
            });
        }, 500); // 500ms for long press
        setLongPressTimer(timer);
    };

    // Handle long press end
    const handleLongPressEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu({ show: false, x: 0, y: 0, rideId: null });
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Add function to handle page changes
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Add pagination controls component with limited page buttons
    const PaginationControls = () => {
      const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5; // Show max 5 page buttons
        
        if (pagination.totalPages <= maxVisiblePages) {
          // If total pages are less than max visible, show all
          for (let i = 1; i <= pagination.totalPages; i++) {
            pageNumbers.push(i);
          }
        } else {
          // Always show first page
          pageNumbers.push(1);
          
          // Calculate start and end of visible pages
          let startPage = Math.max(2, currentPage - 1);
          let endPage = Math.min(pagination.totalPages - 1, currentPage + 1);
          
          // Adjust if at the start
          if (currentPage <= 2) {
            endPage = 4;
          }
          // Adjust if at the end
          if (currentPage >= pagination.totalPages - 1) {
            startPage = pagination.totalPages - 3;
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
          if (endPage < pagination.totalPages - 1) {
            pageNumbers.push('...');
          }
          
          // Always show last page
          pageNumbers.push(pagination.totalPages);
        }
        
        return pageNumbers;
      };

      return (
        <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-4">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * pagination.ridesPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * pagination.ridesPerPage, pagination.totalRides)}
              </span>{' '}
              of <span className="font-medium">{pagination.totalRides}</span> rides
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
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
                  onClick={() => handlePageChange(number)}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>
        </div>
      );
    };

    // Update the handleViewReceipt function
    const handleViewReceipt = async (ride) => {
        try {
            if (!ride.payment?.paymentId) {
                showToast.error('No payment record found for this ride');
                return;
            }
            setSelectedPaymentId(ride.payment.paymentId);
            setShowReceipt(true);
        } catch (error) {
            console.error('Error viewing receipt:', error);
            showToast.error('Failed to load receipt');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header - Consistent with Home page */}
            <div className='fixed px-6 py-2 top-0 left-0 right-0 flex items-center justify-between z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate('/')} // Navigate to home on logo click
                >
                    {/* Assuming myTaxyLogo is imported in Home.jsx and can be reused or use a placeholder */}
                    {/* Replace with actual logo import if available */}
                    <div className='w-12 h-12 bg-[#fdc700] rounded-full flex items-center justify-center text-white font-bold text-2xl'>M</div> {/* Placeholder Logo */}
                    <span className="text-2xl font-bold text-gray-900">MyTaxy</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => navigate(-1)} // Back button
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
                                {user?.profilePhoto ? (
                                    <img
                                        src={user.profilePhoto}
                                        alt="Profile"
                                        className="w-24 h-24 rounded-full object-cover border-2 border-[#fdc700]"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center text-4xl font-bold text-gray-600 border-2 border-[#fdc700]">
                                        {user?.fullname?.firstname?.charAt(0).toUpperCase() || 'U'}
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
                                    {user?.fullname?.firstname && user?.fullname?.lastname
                                        ? `${user.fullname.firstname} ${user.fullname.lastname}`
                                        : user?.name || 'User'}
                                </h2>
                                <p className="text-gray-600">{user?.email || 'user@example.com'}</p>
                                {user?.phone && <p className="text-gray-600">{user.phone}</p>}
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
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>First Name</label>
                                    <input
                                        type="text"
                                        name="firstname"
                                        value={formData.firstname}
                                        onChange={handleInputChange}
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                        disabled={uploading}
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
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                        disabled={true} // Email usually cannot be changed directly via profile edit
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
                                    />
                                </div>
                                {/* Separate Save and Cancel buttons */}
                                <div className="flex gap-4">
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
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Ride History ({pagination.totalRides})</h3>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center text-gray-600">Loading ride history...</div>
                            ) : rideHistory.length > 0 ? (
                                <>
                                    {rideHistory.map((ride, index) => (
                                        <div 
                                            key={ride._id} 
                                            className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-[#fdc700] relative"
                                            onContextMenu={(e) => handleContextMenu(e, ride._id)}
                                            onTouchStart={(e) => handleLongPressStart(e, ride._id)}
                                            onTouchEnd={handleLongPressEnd}
                                            onTouchCancel={handleLongPressEnd}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                            Ride #{pagination.totalRides - ((currentPage - 1) * pagination.ridesPerPage + index)}
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
                                                </div>
                                                {ride.fare && (
                                                    <p className="text-lg font-bold text-gray-800">₹{ride.fare.toFixed(2)}</p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap -mx-2 border-t-2 border-gray-200 pt-4">
                                                {/* Ride Details */}
                                                <div className="w-full md:w-1/2 px-2 mb-4 md:mb-0">
                                                    <h5 className="text-sm font-semibold text-gray-800 mb-2">Ride Details</h5>
                                                    <div className="text-sm text-gray-700 space-y-2">
                                                        <p className="flex items-start">
                                                            <span className="font-medium text-gray-900 mr-2 flex-shrink-0">
                                                                <i className="ri-flag-line"></i> From:
                                                            </span>
                                                            <span className="flex-grow whitespace-nowrap overflow-hidden text-ellipsis">
                                                                {ride.pickupAddress || 'Location not specified'}
                                                            </span>
                                                        </p>
                                                        <p className="flex items-start">
                                                            <span className="font-medium text-gray-900 mr-2 flex-shrink-0">
                                                                <i className="ri-map-pin-2-line"></i> To:
                                                            </span>
                                                            <span className="flex-grow whitespace-nowrap overflow-hidden text-ellipsis">
                                                                {ride.destinationAddress || 'Location not specified'}
                                                            </span>
                                                        </p>
                                                        <p className="flex items-center">
                                                            <span className="font-medium text-gray-900 mr-2">
                                                                <i className="ri-calendar-line"></i> Date:
                                                            </span>
                                                            {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : 'Date not available'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Captain Details */}
                                                {ride.captain && (
                                                    <div className="w-full md:w-1/2 px-2 border-t-2 md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-4">
                                                        <h5 className="text-sm font-semibold text-gray-800 mb-2">Captain Details</h5>
                                                        <div className="text-sm text-gray-700 space-y-2">
                                                            <p className="flex items-center">
                                                                <span className="font-medium text-gray-900 mr-2 flex-shrink-0">
                                                                    <i className="ri-user-line"></i> Name:
                                                                </span>
                                                                <span className="flex-grow">
                                                                    {ride.captain.fullname?.firstname && ride.captain.fullname?.lastname
                                                                        ? `${ride.captain.fullname.firstname} ${ride.captain.fullname.lastname}`
                                                                        : ride.captain.name || 'Name not available'}
                                                                </span>
                                                            </p>
                                                            <p className="flex items-center">
                                                                <span className="font-medium text-gray-900 mr-2 flex-shrink-0">
                                                                    <i className="ri-phone-line"></i> Phone:
                                                                </span>
                                                                <span className="flex-grow">
                                                                    {ride.captain?.phone || '9876543210'}
                                                                </span>
                                                            </p>
                                                            {ride.captain.vehicle && (
                                                                <p className="flex items-center">
                                                                    <span className="font-medium text-gray-900 mr-2 flex-shrink-0">
                                                                        <i className="ri-car-line"></i> Vehicle:
                                                                    </span>
                                                                    <span className="flex-grow">
                                                                        {[
                                                                            ride.captain.vehicle.plate,
                                                                            ride.captain.vehicle.color && `(${ride.captain.vehicle.color})`,
                                                                            ride.captain.vehicle.vehicleType && `${ride.captain.vehicle.vehicleType}`
                                                                        ].filter(Boolean).join(' ') || 'Vehicle details not available'}
                                                                    </span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Update the receipt button condition */}
                                            {ride.status === 'completed' && ride.payment?.status === 'completed' && (
                                                <button
                                                    onClick={() => handleViewReceipt(ride)}
                                                    className="mt-4 flex items-center text-sm text-yellow-600 hover:text-yellow-700"
                                                >
                                                    <i className="ri-receipt-line mr-2"></i>
                                                    View Payment Receipt
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <PaginationControls />
                                </>
                            ) : (
                                <div className="text-center text-gray-600">No ride history found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.show && (
                <div 
                    className="fixed bg-white rounded-lg shadow-lg py-2 z-50"
                    style={{
                        top: contextMenu.y,
                        left: contextMenu.x,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <button
                        onClick={() => handleDeleteRide(contextMenu.rideId)}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center"
                    >
                        <i className="ri-delete-bin-line mr-2"></i>
                        Delete Ride
                    </button>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && selectedPaymentId && (
                <PaymentReceipt
                    paymentId={selectedPaymentId}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedPaymentId(null);
                    }}
                />
            )}

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
        </div>
    )
}

export default UserProfile 