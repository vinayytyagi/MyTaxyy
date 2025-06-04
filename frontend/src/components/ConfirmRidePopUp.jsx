                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                                <i className="ri-map-pin-line mr-1"></i>
                                {typeof rideData?.distance === 'number' ? `${(rideData.distance / 1000).toFixed(1)} KM` : 'N/A'}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-gray-900">
                                <i className="ri-money-rupee-circle-line mr-1"></i>
                                ₹{rideData?.fare || '0'}
                            </span>
                        </div> 