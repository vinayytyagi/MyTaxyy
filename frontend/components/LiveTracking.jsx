import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { GoogleMap, Marker, Polyline, Circle, useLoadScript } from '@react-google-maps/api';
import { SocketContext } from '../src/context/SocketContext';
import axios from 'axios'; // Required for fetching route
import { getToken } from '../src/services/auth.service';

const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    top: 0,
    left: 0
};

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };

// Validates coordinates
const isValidCoordinate = (coord) => {
    return coord &&
        typeof coord.lat === 'number' &&
        typeof coord.lng === 'number' &&
        !isNaN(coord.lat) &&
        !isNaN(coord.lng) &&
        coord.lat >= -90 &&
        coord.lat <= 90 &&
        coord.lng >= -180 &&
        coord.lng <= 180;
};

const LiveTracking = ({ rideData, onRouteDetails, mapType = 'hybrid', onMapTypeChange }) => {
    const [currentPosition, setCurrentPosition] = useState(null);
    const [driverPosition, setDriverPosition] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [routeDetails, setRouteDetails] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { socket } = useContext(SocketContext);
    const mapRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Add resize listener to check for mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get current location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setCurrentPosition({ lat: latitude, lng: longitude });
            });

            const watchId = navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude } = position.coords;
                setCurrentPosition({ lat: latitude, lng: longitude });
            });

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Listen for driver's real-time updates
    useEffect(() => {
        if (socket && rideData?._id) {
            socket.emit('join-ride', { rideId: rideData._id });

            socket.on(`driverLocation:${rideData._id}`, (location) => {
                if (location && location.latitude && location.longitude) {
                    setDriverPosition({
                        lat: location.latitude,
                        lng: location.longitude,
                    });
                }
            });

            return () => {
                socket.off(`driverLocation:${rideData._id}`);
            };
        }
    }, [socket, rideData]);

    // Fetch route from Google Directions API
    useEffect(() => {
        const fetchRoute = () => {
            if (!rideData?.pickup || !rideData?.destination) {
                console.log('Missing pickup or destination coordinates');
                return;
            }

            const directionsService = new window.google.maps.DirectionsService();

            directionsService.route(
                {
                    origin: rideData.pickup,
                    destination: rideData.destination,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        if (!result.routes || result.routes.length === 0) {
                            console.error('No routes found in the response');
                            return;
                        }

                        const route = result.routes[0];
                        
                        if (!route.overview_polyline) {
                            console.error('No overview_polyline in the route');
                            return;
                        }

                        const encodedPolyline = route.overview_polyline;

                        if (!encodedPolyline) {
                            console.error('Encoded polyline is undefined or empty');
                            return;
                        }

                        if (window.google?.maps?.geometry?.encoding) {
                            try {
                                const decodedPath = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
                                
                                if (decodedPath && decodedPath.length > 0) {
                                    setRoutePath(decodedPath);
                                    
                                    // Calculate and set route details
                                    const distance = route.legs[0].distance.text;
                                    const duration = route.legs[0].duration.text;
                                    const details = { distance, duration };
                                    setRouteDetails(details);
                                    
                                    // Pass route details to parent component
                                    if (onRouteDetails) {
                                        onRouteDetails(details);
                                    }
                                } else {
                                    console.error('Decoded path is empty');
                                }
                            } catch (error) {
                                console.error('Error decoding polyline:', error);
                            }
                        } else {
                            console.warn('Google geometry library not loaded.');
                        }
                    } else {
                        console.error('Directions request failed with status:', status);
                    }
                }
            );
        };

        if (window.google) {
            fetchRoute();
        } else {
            console.error('Google Maps API not loaded');
        }
    }, [rideData, onRouteDetails]);

    useEffect(() => {
        if (routePath.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            routePath.forEach((point) => bounds.extend(point));
            setTimeout(() => mapRef.current?.fitBounds(bounds), 500); // using ref
        }
    }, [routePath]);

    const getMapCenter = () => {
        if (driverPosition && isValidCoordinate(driverPosition)) return driverPosition;
        if (currentPosition && isValidCoordinate(currentPosition)) return currentPosition;
        if (rideData?.pickup && isValidCoordinate(rideData.pickup)) return rideData.pickup;
        return DEFAULT_CENTER;
    };

    const recenterMap = () => {
        if (mapInstance && currentPosition) {
            mapInstance.setCenter(currentPosition);
            mapInstance.setZoom(15);
        }
    };

    // Add fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const mapOptions = {
                    disableDefaultUI: true,
        zoomControl: false,
        streetViewControl: true,
        mapTypeControl: false,
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
            }
        ],
        mapTypeId: mapType
    };

    // Add custom styles to position the street view control
    useEffect(() => {
        // Wait for the street view control to be added to the DOM
        const checkForStreetViewControl = setInterval(() => {
            const streetViewControl = document.querySelector('.gm-svpc');
            if (streetViewControl) {
                // Get the map container's position
                const mapContainer = document.querySelector('.gm-style');
                if (mapContainer) {
                    // Position the street view control relative to the map container
                    streetViewControl.style.position = 'fixed';
                    streetViewControl.style.top = '80px';
                    streetViewControl.style.left = '20px';
                    streetViewControl.style.transform = 'none';
                    streetViewControl.style.margin = '0';
                    streetViewControl.style.zIndex = '9999';
                    streetViewControl.style.pointerEvents = 'auto';
                    
                    // Force the control to stay on top
                    const observer = new MutationObserver(() => {
                        if (streetViewControl.style.top !== '80px') {
                            streetViewControl.style.top = '80px';
                            streetViewControl.style.left = '20px';
                        }
                    });
                    
                    observer.observe(streetViewControl, { 
                        attributes: true, 
                        attributeFilter: ['style'] 
                    });

                    // Remove any other controls that might have appeared
                    const otherControls = document.querySelectorAll('.gm-control-active, .gm-fullscreen-control');
                    otherControls.forEach(control => control.remove());
                    
                    clearInterval(checkForStreetViewControl);
                }
            }
        }, 100);

        return () => clearInterval(checkForStreetViewControl);
    }, []);

    const onMapLoad = (map) => {
                    setMapInstance(map);
                    mapRef.current = map;
                    if (routePath.length > 0) {
                        const bounds = new window.google.maps.LatLngBounds();
                        routePath.forEach((point) => bounds.extend(point));
                        map.fitBounds(bounds);
                    }
    };

    const onMapUnmount = () => {
                    mapRef.current = null;
                    setMapInstance(null);
    };

    return (
        <div style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            overflow: 'hidden' // Prevent any scrolling issues
        }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={getMapCenter()}
                zoom={15}
                options={mapOptions}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
            >
                {currentPosition && (
                    <>
                        <Circle
                            center={currentPosition}
                            radius={500}
                            options={{
                                fillColor: "#fdc700",
                                fillOpacity: 0.15,
                                strokeColor: "#fdc700",
                                strokeOpacity: 0.3,
                                strokeWeight: 2,
                            }}
                        />
                        <Marker
                            position={currentPosition}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 15,
                                fillColor: "#fdc700",
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 3,
                            }}
                        />
                    </>
                )}

                {driverPosition && (
                    <>
                    <Circle
                            center={driverPosition}
                            radius={500}
                            options={{
                                fillColor: "#fdc700",
                                fillOpacity: 0.15,
                                strokeColor: "#fdc700",
                                strokeOpacity: 0.3,
                                strokeWeight: 2,
                            }}
                        />
                    
                    <Marker
                        position={driverPosition}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: "#fdc700",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 3,
                        }}
                    />
                    </>
                )}

                {rideData?.pickup && (
                    <Marker
                        position={rideData.pickup}
                        icon={{
                            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fdc700"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>',
                            scaledSize: new window.google.maps.Size(45, 45),
                            anchor: new window.google.maps.Point(22.5, 22.5)
                        }}
                    />
                )}

                {rideData?.destination && (
                    <Marker
                        position={rideData.destination}
                        icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 40)
                        }}
                    />
                )}

                {/* Route line with gradient effect */}
                {routePath.length > 0 && (
                    <Polyline
                        path={routePath}
                        options={{
                            strokeColor: '#fdc700',
                            strokeOpacity: 0.8,
                            strokeWeight: 5,
                            icons: [{
                                icon: {
                                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                    scale: 3,
                                    fillColor: '#fdc700',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 1,
                                },
                                offset: '50%',
                                repeat: '100px'
                            }]
                        }}
                    />
                )}
            </GoogleMap>

            {/* Minimize Button with pulse effect */}
            {isFullscreen && (
                <button
                    onClick={() => document.exitFullscreen()}
                    style={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        background: '#fdc700',
                        border: 'none',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'all 0.3s ease'
                    }}
                    className="hover:bg-[#fdc700]/90 hover:scale-110 active:scale-95"
                    title="Minimize"
                >
                    <i className="ri-fullscreen-exit-line" style={{ fontSize: 20, color: '#ffffff' }}></i>
                </button>
            )}

            {/* Custom Controls Container with new layout */}
            <div style={{
                position: 'absolute',
                right: 20,
                top: 80,
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                zIndex: 10
            }}>
                {/* Fullscreen Button */}
                <button
                    onClick={() => {
                        const mapElement = document.querySelector('.gm-style');
                        if (mapElement) {
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            } else {
                                mapElement.requestFullscreen();
                            }
                        }
                    }}
                    style={{
                        background: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        right: 0,
                        transition: 'all 0.3s ease'
                    }}
                    className="hover:bg-[#fdc700]/90 hover:scale-110 active:scale-95"
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                    <i className={isFullscreen ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"} 
                       style={{ fontSize: 22, color: '#fdc700' }}></i>
                </button>

                {/* Zoom Controls Container */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(253, 199, 0, 0.2)',
                }}>
                {/* Zoom In Button */}
                <button
                    onClick={() => {
                        if (mapInstance) {
                            const currentZoom = mapInstance.getZoom();
                            mapInstance.setZoom(currentZoom + 1);
                        }
                    }}
                    style={{
                            border: '2px solid #fdc700',
                            color: 'gray',
                        borderRadius: '50%',
                        cursor: 'pointer',
                            width: 36,
                            height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                            transition: 'all 0.3s ease'
                    }}
                        className="hover:color-[#fdc700]/90 hover:scale-110 active:scale-95"
                    title="Zoom in"
                >
                        <i className="ri-add-line" style={{ fontSize: 18, color: '#fdc700' }}></i>
                </button>

                {/* Zoom Out Button */}
                <button
                    onClick={() => {
                        if (mapInstance) {
                            const currentZoom = mapInstance.getZoom();
                            mapInstance.setZoom(currentZoom - 1);
                        }
                    }}
                    style={{
                            border: '2px solid #fdc700',
                            color: 'gray',                            borderRadius: '50%',
                        cursor: 'pointer',
                            width: 36,
                            height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                            transition: 'all 0.3s ease'
                    }}
                        className="hover:color-[#fdc700]/90 hover:scale-110 active:scale-95"
                    title="Zoom out"
                >
                        <i className="ri-subtract-line" style={{ fontSize: 18, color: '#fdc700' }}></i>
                </button>
                </div>
            </div>

            {/* My Location Button with pulse animation */}
            <button
                onClick={recenterMap}
                style={{
                    position: 'absolute',
                    right: 20,
                    top: 280,
                    background: '#fdc700',
                    border: 'none',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.3s ease'
                }}
                className="hover:bg-[#fdc700]/90 hover:scale-110 active:scale-95"
                title="Go to my location"
            >
                <i className="ri-crosshair-2-line" style={{ fontSize: 22, color: '#ffffff' }}></i>
            </button>
        </div>
    );
};

export default LiveTracking;
