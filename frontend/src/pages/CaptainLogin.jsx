import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { CaptainDataContext } from '../context/CaptainContext';
import { captainLogin, setToken } from '../services/auth.service';
import { toast } from 'react-toastify';
import axios from 'axios';
import myTaxyLogo from '../assets/MyTaxy.png';

const CaptainLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGuest, setIsLoadingGuest] = useState(false);
    const { setCaptain } = useContext(CaptainDataContext);
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
    
        try {
            const data = await captainLogin(email, password);
            console.log('Login response:', data); // Debug log
            if (data.token) {
                setToken(data.token, 'captain');
                console.log('Setting captain data after login:', data.captain); // Debug log
                setCaptain(data.captain);
                toast.success('Logged in successfully');
                navigate('/captain-home');
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Login error:', error.response?.data); // Debug log
            const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please try again.';
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setError('');
        setIsLoadingGuest(true);

        try {
            const data = await captainLogin('testcaptain@gmail.com', 'testcaptain');
            console.log('Guest login response:', data); // Debug log
            if (data.token) {
                setToken(data.token, 'captain');
                console.log('Setting captain data after guest login:', data.captain); // Debug log
                setCaptain(data.captain);
                toast.success('Guest login successful');
                navigate('/captain-home');
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Guest login error:', error.response?.data); // Debug log
            // If login fails with 401, try to create the test account
            if (error.response?.status === 401) {
                try {
                    // Create test captain account
                    const createResponse = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, {
                        fullname: {
                            firstname: 'Test',
                            lastname: 'Captain'
                        },
                        email: 'testcaptain@gmail.com',
                        password: 'testcaptain',
                        vehicle: {
                            color: 'Black',
                            plate: 'TEST123',
                            capacity: 4,
                            vehicleType: 'car'
                        }
                    });

                    if (createResponse.status === 201) {
                        // Now try to login again
                        toast.info('Guest captain account created, logging in...');
                        const loginData = await captainLogin('testcaptain@gmail.com', 'testcaptain');
                        if (loginData.token) {
                            setToken(loginData.token, 'captain');
                            setCaptain(loginData.captain);
                            toast.success('Logged in as guest captain');
                            navigate('/captain-home');
                        }
                    }
                } catch (createError) {
                    const errorMessage = createError.response?.data?.message || 'Failed to create guest captain account';
                    toast.error(errorMessage);
                    setError(errorMessage);
                }
            } else {
            const errorMessage = error.response?.data?.message || error.message || 'Guest login failed. Please try again.';
            toast.error(errorMessage);
            setError(errorMessage);
            }
        } finally {
            setIsLoadingGuest(false);
        }
    };

    return (
        <div className='min-h-screen bg-gray-50 flex flex-col'>
            {/* Header */}
            <div className='fixed px-6 py-2 top-0 flex items-center justify-between w-screen z-50 bg-white/10 backdrop-blur-xs shadow-sm'>
                <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate('/login')}
                >
                    <img className='w-12 h-12' src={myTaxyLogo} alt="MyTaxy Logo"/>
                    <span className="text-2xl font-bold text-gray-900">MyTaxy</span>
                </div>
            </div>

            {/* Main Content */}
            <div className='flex-1 flex items-center justify-center p-6 mt-20'>
                <div className='w-full max-w-md'>
                    <div className='bg-white rounded-2xl shadow-lg p-8'>
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <i className="ri-steering-2-line text-4xl text-[#fdc700]"></i>
                            <h2 className='text-2xl font-bold text-gray-800 text-center'>Captain Login</h2>
                        </div>
                        
                        <form onSubmit={submitHandler} className='space-y-6'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Email Address <span className="text-gray-400">*</span>
                                </label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                    type="email" 
                                    placeholder='example@gmail.com'
                                    disabled={isLoading || isLoadingGuest}
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Password <span className="text-gray-400">*</span>
                                </label>
                                <input 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                    type="password"
                                    placeholder='Enter your password'
                                    disabled={isLoading || isLoadingGuest}
                                    autoComplete="current-password"
                                />
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className='bg-[#fdc700] text-gray-800 font-semibold px-4 py-3 rounded-xl w-full text-lg transition-all shadow-sm hover:bg-[#fdc700]/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                disabled={isLoading || isLoadingGuest}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                        Logging in...
                                    </div>
                                ) : 'Login'}
                            </button>

                            <button
                                type="button"
                                onClick={handleGuestLogin}
                                className='bg-gray-100 text-gray-700 font-semibold px-4 py-3 rounded-xl w-full text-lg transition-all shadow-sm hover:bg-gray-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 cursor-pointer'
                                disabled={isLoading || isLoadingGuest}
                            >
                                {isLoadingGuest ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700 border-t-transparent mr-2"></div>
                                        Logging in...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <i className="ri-user-line mr-2"></i>
                                        Continue as Guest Captain
                                    </div>
                                )}
                            </button>

                            <p className='text-center text-gray-600'>
                                Join our fleet? <Link to='/captain-signup' className='text-[#fdc700] font-semibold hover:text-[#fdc700]/90 cursor-pointer'>Register as Captain</Link>
                            </p>
                        </form>
                    </div>

                    <div className='mt-6'>
                        <Link to='/login'
                            className='bg-orange-700 text-white font-semibold px-4 py-3 rounded-xl w-full text-lg transition-all shadow-sm hover:bg-orange-700 hover:shadow-md active:scale-[0.98] flex items-center justify-center cursor-pointer'
                        >
                            <i className="ri-user-line mr-2"></i>
                            Sign in as User
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CaptainLogin