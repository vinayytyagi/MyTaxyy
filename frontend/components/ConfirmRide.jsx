import React from 'react'

const ConfirmRide = (props) => {
  return (
    <div className="p-2">
      <h5 className='p-1 text-center w-[93%] absolute top-0 cursor-pointer' onClick={() => {
          props.setConfirmRidePanel(false)
      }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>
      <h3 className='text-2xl font-semibold'>Confirm your Ride</h3>

      <div className='flex gap-2 justify-between flex-col items-center'>
          {/* <img className='h-20 rounded-lg shadow-sm' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg" alt="Vehicle" /> */}
          <div className='w-full mt-2 rounded-lg shadow-sm p-4'>
              <div className='flex items-center gap-5 px-1 py-3 border-b-2'>
                  <i className="ri-map-pin-user-fill text-3xl text-[#fdc700]"></i>
                  <div>
                      <h3 className='text-lg font-semibold'>Pickup</h3>
                      <p className='text-sm -mt-1 text-gray-600'>{props.pickup}</p>
                  </div>
              </div>
              <div className='flex items-center gap-5 px-1 py-3 border-b-2'>
                  <i className="ri-map-pin-2-fill text-3xl text-red-500"></i>
                  <div>
                      <h3 className='text-lg font-semibold'>Destination</h3>
                      <p className='text-sm -mt-1 text-gray-600'>{props.destination}</p>
                  </div>
              </div>
              <div className='flex items-center gap-5 px-1 py-3'>
                  <i className="ri-currency-line text-3xl text-green-500"></i>
                  <div>
                      <h3 className='text-lg font-semibold'>₹{props.fare[props.vehicleType]}</h3>
                      <p className='text-sm -mt-1 text-gray-600'>Cash</p>
                  </div>
              </div>
          </div>
          <button onClick={() => {
              props.setVehicleFound(true)
              props.setConfirmRidePanel(false)
              props.createRide()
          }} className='w-full mt-5 bg-[#fdc700] text-gray-900 font-semibold p-3 rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors'>Confirm Ride</button>
      </div>
    </div>
  )
}

export default ConfirmRide