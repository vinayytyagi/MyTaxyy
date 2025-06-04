import React from 'react';
import { FaUser, FaMapMarkerAlt, FaMoneyBillWave } from 'react-icons/fa';

const RidePopUp = ({ ride, onAccept, onReject }) => {
  if (!ride) return null;

  const userFullName = ride.user?.fullname ? 
    `${ride.user.fullname.firstname || ''} ${ride.user.fullname.lastname || ''}`.trim() : 
    'User';

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm w-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-gray-100 p-2 rounded-full">
          <FaUser className="text-gray-600 text-xl" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{userFullName}</h3>
          <p className="text-sm text-gray-500">Ride Request</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <FaMapMarkerAlt className="text-[#fdc700] mt-1" />
          <div>
            <p className="text-sm font-medium text-gray-900">Pickup</p>
            <p className="text-sm text-gray-600">{ride.pickupAddress || 'Location not specified'}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <FaMapMarkerAlt className="text-red-500 mt-1" />
          <div>
            <p className="text-sm font-medium text-gray-900">Destination</p>
            <p className="text-sm text-gray-600">{ride.destinationAddress || 'Location not specified'}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <FaMoneyBillWave className="text-green-500 mt-1" />
          <div>
            <p className="text-sm font-medium text-gray-900">Fare</p>
            <p className="text-sm text-gray-600">₹{ride.fare || 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex space-x-3">
        <button
          onClick={() => onAccept(ride)}
          className="flex-1 bg-[#fdc700] text-gray-900 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(ride)}
          className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default RidePopUp; 