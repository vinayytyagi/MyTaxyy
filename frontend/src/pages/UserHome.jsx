                    <div className="flex items-center space-x-3">
                        {/* Map Type Toggle Button */}
                        <button 
                            onClick={() => setMapType(prev => prev === 'hybrid' ? 'roadmap' : 'hybrid')}
                            className='h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer'
                            title={mapType === 'hybrid' ? 'Switch to Map View' : 'Switch to Satellite View'}
                        >
                            <i className={`text-xl ri-${mapType === 'hybrid' ? 'map-2-line' : 'earth-line'}`}></i>
                        </button>
                    </div> 