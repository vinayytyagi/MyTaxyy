import React, { useContext, useEffect, useState, useRef } from 'react'
import { CaptainDataContext } from '../src/context/CaptainContext'
import axios from 'axios'
import { getToken } from '../src/services/auth.service'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const CaptainDetails = () => {
    const { captain } = useContext(CaptainDataContext);
    const [dailyEarnings, setDailyEarnings] = useState(0);
    const [rideCount, setRideCount] = useState(0);
    const [onlineTime, setOnlineTime] = useState(0);
    const [acceptanceRate, setAcceptanceRate] = useState(0);
    const [lastResetDate, setLastResetDate] = useState(null);
    const [error, setError] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const panelRef = useRef(null);
    const contentRef = useRef(null);
    const isFirstRender = useRef(true);

    // Set initial state on mount
    useEffect(() => {
        if (isFirstRender.current) {
            gsap.set(contentRef.current, { 
                height: 'auto',
                opacity: 1,
                display: 'block'
            });
            gsap.set(panelRef.current, {
                padding: '0.75rem 0.75rem'
            });
            isFirstRender.current = false;
        }
    }, []);

    // Animation for minimize/maximize
    useGSAP(() => {
        if (!isFirstRender.current) {  // Only animate if not first render
            if (isMinimized) {
                gsap.to(contentRef.current, {
                    height: 0,
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.inOut",
                    onComplete: () => {
                        gsap.set(contentRef.current, { display: 'none' });
                    }
                });
                gsap.to(panelRef.current, {
                    padding: '0.75rem 0.75rem',
                    duration: 0.3,
                    ease: "power2.inOut"
                });
            } else {
                gsap.set(contentRef.current, { display: 'block' });
                gsap.to(contentRef.current, {
                    height: 'auto',
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.inOut"
                });
                gsap.to(panelRef.current, {
                    padding: '0.75rem 0.75rem',
                    duration: 0.3,
                    ease: "power2.inOut"
                });
            }
        }
    }, [isMinimized]);

    useEffect(() => {
        const fetchCaptainStats = async () => {
            try {
                const token = getToken('captain');
                if (!token) {
                    console.error('No captain token found');
                    return;
                }

                // Get current date in YYYY-MM-DD format
                const today = new Date().toISOString().split('T')[0];
                console.log('Fetching stats for date:', today);

                // Check if we need to reset stats
                const storedResetDate = localStorage.getItem('lastStatsReset');
                console.log('Stored reset date:', storedResetDate);
                
                if (storedResetDate !== today) {
                    console.log('Resetting stats for new day');
                    try {
                        const resetResponse = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/reset-daily-stats`, {}, {
                            headers: { Authorization: `Bearer ${token}` }
                });
                        console.log('Reset stats response:', resetResponse.data);
                        localStorage.setItem('lastStatsReset', today);
                        setLastResetDate(today);
                    } catch (resetError) {
                        console.error('Error resetting stats:', resetError.response?.data || resetError.message);
                    }
                }

                // Fetch daily stats
                console.log('Fetching daily stats...');
                const statsResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/daily-stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Stats response:', statsResponse.data);

                const { earnings, rides, rideTime, acceptance } = statsResponse.data;
                setDailyEarnings(earnings);
                setRideCount(rides);
                setOnlineTime(rideTime);
                setAcceptanceRate(acceptance);
                setError(null);

            } catch (error) {
                console.error('Error fetching captain stats:', error.response?.data || error.message);
                setError('Failed to fetch stats');
            }
        };

        fetchCaptainStats();
        // Refresh stats every minute
        const interval = setInterval(fetchCaptainStats, 60000);
        return () => clearInterval(interval);
    }, []);

    // Format time display
    const formatTime = (hours) => {
        if (hours < 1) {
            return `${Math.round(hours * 60)}m`;
        }
        return `${hours.toFixed(1)}h`;
    };

    if (!captain) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500 text-center mt-4">{error}</div>;
    }

    return (
        <div ref={panelRef} className='bg-white rounded-2xl mb-2 shadow-lg border border-[#fdc700]'>
            {/* Header */}
            <div 
                onClick={() => setIsMinimized(!isMinimized)}
                className='flex justify-between items-center cursor-pointer transition-colors px-4 border-b border-gray-100'
            >
                <h3 className='text-lg font-semibold text-gray-800'>Stats</h3>
                <div className='text-gray-500 hover:text-gray-700 transition-colors'>
                    <i className={`ri-arrow-${isMinimized ? 'up' : 'down'}-s-line text-xl`}></i>
                </div>
            </div>

            {/* Stats Content */}
            <div ref={contentRef} className='overflow-hidden'>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pt-4 g-red-400'>
                    {/* Earnings Card */}
                    <div className='bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-300 flex flex-col h-full'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='h-11 w-11 bg-green-100 rounded-lg flex items-center justify-center shadow-sm'>
                                <i className="text-2xl text-green-600 ri-money-rupee-circle-line"></i>
                            </div>
                            <span className='text-xs font-medium text-green-600 bg-green-100/80 px-2.5 py-1 rounded-full'>
                                Earnings
                            </span>
                        </div>
                        <div className='mt-auto'>
                            <h5 className='text-2xl text-center font-bold text-gray-800 mb-1'>₹{dailyEarnings}</h5>
                            <p className='text-xs text-gray-600 text-center'>Today's Earnings</p>
                        </div>
                    </div>

                    {/* Rides Card */}
                    <div className='bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-300 flex flex-col h-full'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='h-11 w-11 bg-blue-100 rounded-lg flex items-center justify-center shadow-sm'>
                                <i className="text-2xl text-blue-600 ri-route-line"></i>
                            </div>
                            <span className='text-xs font-medium text-blue-600 bg-blue-100/80 px-2.5 py-1 rounded-full'>
                                Rides
                            </span>
                        </div>
                        <div className='mt-auto'>
                            <h5 className='text-2xl text-center font-bold text-gray-800 mb-1'>{rideCount}</h5>
                            <p className='text-xs text-gray-600 text-center'>Completed Rides</p>
                        </div>
                    </div>

                    {/* Ride Time Card */}
                    <div className='bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl p-4 border border-yellow-300 flex flex-col h-full'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='h-11 w-11 bg-yellow-100 rounded-lg flex items-center justify-center shadow-sm'>
                                <i className="text-2xl text-yellow-600 ri-timer-line"></i>
                            </div>
                            <span className='text-xs font-medium text-yellow-600 bg-yellow-100/80 px-2.5 py-1 rounded-full'>
                                Time
                            </span>
                        </div>
                        <div className='mt-auto'>
                            <h5 className='text-2xl text-center font-bold text-gray-800 mb-1'>{formatTime(onlineTime)}</h5>
                            <p className='text-xs text-gray-600 text-center'>Total Ride Time</p>
                        </div>
                    </div>

                    {/* Acceptance Rate Card */}
                    <div className='bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-300 flex flex-col h-full'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='h-11 w-11 bg-purple-100 rounded-lg flex items-center justify-center shadow-sm'>
                                <i className="text-2xl text-purple-600 ri-check-double-line"></i>
                            </div>
                            <span className='text-xs font-medium text-purple-600 bg-purple-100/80 px-2.5 py-1 rounded-full'>
                                Rate
                            </span>
                        </div>
                        <div className='mt-auto'>
                            <h5 className='text-2xl text-center font-bold text-gray-800 mb-1'>{acceptanceRate}%</h5>
                            <p className='text-xs text-gray-600 text-center'>Acceptance Rate</p>
                        </div>
                </div>
                </div>

                {/* Last Updated Time */}
                <div className='px-4 text-center border-t border-gray-100'>
                    <p className='text-xs text-gray-500 pt-2'>
                        Last updated: {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CaptainDetails;