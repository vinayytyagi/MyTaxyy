import React from 'react'
const VehiclePanel = (props) => {
  return (
    <div className="p-2">
      <h5 className='p-1 cursor-pointer text-center w-[93%] absolute top-0' 
          onClick={() => {
              props.setVehiclePanel(false);
          }}>
          <i className="text-3xl text-gray-200 ri-arrow-down-wide-line cursor-pointer"></i>
      </h5>
      <h3 className='text-2xl font-semibold mb-5'>Choose a vehicle</h3>
      <div className='space-y-4'>
        <div onClick={() => {
            props.setConfirmRidePanel(true)
            props.selectVehicle('car');
        }} 
        className='flex w-full border-2 border-transparent hover:border-black active:border-black rounded-xl p-4 items-center justify-between bg-white cursor-pointer shadow-sm'>
            <img className='h-11' src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_538,w_956/v1688398971/assets/29/fbb8b0-75b1-4e2a-8533-3a364e7042fa/original/UberSelect-White.png" alt="Car" />
            <div className='ml-2 w-1/2'>
                <h4 className='font-medium text-base'>UberGo <span><i className="ri-user-3-fill"></i>4</span> </h4>
                <h5 className='font-medium text-sm'>2 mins away</h5>
                <p className='font-normal text-xs text-gray-600'>Affordable, compact rides</p>
            </div>
            <h2 className='text-lg font-semibold'>₹{props.fare.car}</h2>
        </div>

        <div onClick={() => {
            props.setConfirmRidePanel(true)
            props.selectVehicle('moto');
        }} 
        className='flex w-full border-2 border-transparent hover:border-black active:border-black rounded-xl p-4 items-center justify-between bg-white cursor-pointer shadow-sm'>
            <img className='h-12' src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1649231091/assets/2c/7fa194-c954-49b2-9c6d-a3b8601370f5/original/Uber_Moto_Orange_312x208_pixels_Mobile.png" alt="Moto" />
            <div className='ml-2 w-1/2'>
                <h4 className='font-medium text-base'>Moto <span><i className="ri-user-3-fill"></i>1</span> </h4>
                <h5 className='font-medium text-sm'>3 mins away</h5>
                <p className='font-normal text-xs text-gray-600'>Affordable motorcycle rides</p>
            </div>
            <h2 className='text-lg font-semibold'>₹{props.fare.moto}</h2>
        </div>

        <div onClick={() => {
            props.selectVehicle('auto');
            props.setConfirmRidePanel(true)
        }} 
        className='flex w-full border-2 border-transparent hover:border-black active:border-black rounded-xl p-4 items-center justify-between bg-white cursor-pointer shadow-sm'>
            <img className='h-12' src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648431773/assets/1d/db8c56-0204-4ce4-81ce-56a11a07fe98/original/Uber_Auto_558x372_pixels_Desktop.png" alt="Auto" />
            <div className='ml-2 w-1/2'>
                <h4 className='font-medium text-base'>UberAuto <span><i className="ri-user-3-fill"></i>3</span> </h4>
                <h5 className='font-medium text-sm'>2 mins away</h5>
                <p className='font-normal text-xs text-gray-600'>Affordable auto rides</p>
            </div>
            <h2 className='text-lg font-semibold'>₹{props.fare.auto}</h2>
        </div>
      </div>
    </div>
  )
}

export default VehiclePanel