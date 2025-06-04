import React from 'react'

const LookingForDriver = (props) => {
  return (
    <div className="relative p-4">
      {/* Close Button */}
      <button 
        onClick={() => props.setVehicleFound(false)}
        className="absolute top-2 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {/* <i className="ri-close-line text-2xl"></i> */}
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#fdc700] rounded-full mb-3">
          <i className={`ri-${props.ride?.otp ? 'user-search-line' : 'search-line'} text-2xl text-white`}></i>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900">
          {props.ride?.otp ? 'Driver Found!' : 'Finding a Driver...'}
        </h3>
        <p className="text-gray-500 mt-1">
          {props.ride?.otp ? 'Your driver is on the way' : 'Please wait while we connect you with a driver'}
        </p>
      </div>

      {/* Progress Bar */}
      {!props.ride?.otp && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div className="w-full h-full bg-[#fdc700] animate-loading"></div>
        </div>
      )}

      {/* OTP Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col items-center">
          {/* OTP Icon */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gray-200 rounded-full opacity-20 animate-pulse"></div>
            <div className="relative rounded-full p-4">
              <i className="ri-shield-keyhole-line text-3xl text-[#fdc700]"></i>
            </div>
          </div>

          {/* OTP Status */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {props.ride?.otp ? 'Your Ride OTP' : 'Waiting for Driver'}
          </h3>

          {/* OTP Display */}
          <div className="w-full bg-gray-50 rounded-lg p-4">
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((_, index) => (
                <div 
                  key={index}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                    props.ride?.otp 
                      ? 'bg-[#fdc700] text-black shadow-md' 
                      : 'bg-gray-200 animate-pulse'
                  }`}
                  style={props.ride?.otp ? { animationDelay: `${index * 0.1}s` } : {}}
                >
                  {props.ride?.otp ? props.ride.otp[index] : ''}
                </div>
              ))}
            </div>
          </div>

          {/* OTP Instructions */}
          <p className="text-gray-500 text-sm mt-4 text-center">
            {props.ride?.otp 
              ? 'Share this OTP with your driver to start the ride'
              : 'OTP will be shown when driver accepts your ride'
            }
          </p>
        </div>
      </div>

      {/* Ride Info Card */}
      {/* <div className="bg-[#fdc700] rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-route-line text-2xl text-white"></i>
            </div>
            <div>
              <p className="text-white/90 text-sm">Estimated Arrival</p>
              <p className="text-white font-semibold">2-3 minutes</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/90 text-sm">Ride Fare</p>
            <p className="text-white font-semibold">₹{props.ride?.fare || '0'}</p>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default LookingForDriver;