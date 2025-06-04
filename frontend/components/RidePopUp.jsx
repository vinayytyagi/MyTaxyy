import React from 'react'

const RidePopUp = (props) => {
  if (!props.ride) return null;

  const userFullName = props.ride?.user?.fullname ? 
    `${props.ride.user.fullname.firstname || ''} ${props.ride.user.fullname.lastname || ''}`.trim() : 
    'User';

  return (
    <div className="fixed top-10 right-96 w-[93%] bg-white rounded-lg shadow-lg z-50">
      <div className="relative p-4">
        {/* Close Button */}
        <button 
          onClick={() => props.setRidePopupPanel(false)}
          className="absolute top-2 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i className="ri-close-line text-2xl"></i>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#fdc700] rounded-full mb-3">
            <i className="ri-notification-3-line text-2xl text-white"></i>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">New Ride Request</h3>
          <p className="text-gray-500 mt-1">You have 30 seconds to accept</p>
        </div>

        {/* User Info Card */}
        <div className="bg-[#fdc700] rounded-xl p-4 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                    {props.ride?.user?.profilePhoto ? (
                        <img 
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md" 
                            src={props.ride.user.profilePhoto} 
                            alt={userFullName}
                        />
                    ) : (
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-xl font-bold text-[#fdc700] border-2 border-white shadow-md">
                            {props.ride?.user?.fullname?.firstname?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{userFullName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                    <i className="ri-map-pin-line mr-1"></i>
                    {props.ride?.distance?.toFixed(1)} KM
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                    <i className="ri-money-rupee-circle-line mr-1"></i>
                    ₹{props.ride?.fare}
                  </span>
                </div>
              </div>
            </div>
                </div> 
        </div>

        {/* Ride Details Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 bg-[#fdc700]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-map-pin-2-fill text-xl text-[#fdc700]"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-500">Pickup Location</h3>
                <p className="text-gray-900 truncate">{props.ride?.pickupAddress || 'N/A'}</p>
                    </div>
                </div>

            {/* Destination Location */}
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 bg-[#fdc700]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-map-pin-2-fill text-xl text-[#fdc700]"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-500">Destination</h3>
                <p className="text-gray-900 truncate">{props.ride?.destinationAddress || 'N/A'}</p>
                    </div>
                </div>

            {/* Payment Info */}
            <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 bg-[#fdc700]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-bank-card-line text-xl text-[#fdc700]"></i>
                    </div>
              {/* <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 font-medium">
                    {props.ride?.paymentMethod === 'online' ? 'Online Payment' : 'Cash Payment'}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fdc700]/10 text-[#fdc700]">
                    <i className="ri-currency-line mr-1"></i>
                    ₹{props.ride?.fare}
                  </span>
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => props.setRidePopupPanel(false)}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <i className="ri-close-line"></i>
            <span>Ignore</span>
          </button>
          <button
            onClick={() => {
              props.setConfirmRidePopupPanel(true);
              props.confirmRide();
            }}
            className="flex-1 py-3 px-4 bg-[#fdc700] text-gray-900 rounded-xl font-medium hover:bg-[#fdc700]/90 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 shadow-lg"
          >
            <i className="ri-check-line"></i>
            <span>Accept Ride</span>
          </button>
            </div>
        </div>
    </div>
  );
};

export default RidePopUp;