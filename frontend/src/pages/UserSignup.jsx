import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';
import { toast } from 'react-toastify';
import myTaxyLogo from '../assets/MyTaxy.png';

const UserSignup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const { setUser } = useContext(UserDataContext);

    const submitHandler = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        // Validation
        if (!email || !password || !firstName || !lastName || !phone) {
            toast.error('All fields are required');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        if (phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            setIsLoading(false);
            return;
        }
    
        const newUser = {
            fullname: {
                firstname: firstName.trim(),
                lastname: lastName.trim(),
            },
            email: email.trim().toLowerCase(),
            password,
            phone,
        };
    
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/users/register`, newUser);
    
            if (response.status === 201) {
                const data = response.data;
                setUser(data.user);
                localStorage.setItem('token', data.token);
                toast.success('Account created successfully! Welcome to MyTaxy');
                navigate('/home');
            }
        } catch (error) {
            console.error('Signup error:', error);
            let errorMessage = 'Something went wrong during signup';

            if (error.response?.status === 0) {
                errorMessage = 'Network error - request was blocked. This might be caused by an ad blocker.';
            } else if (error.response?.data?.message === 'User Already Exists') {
                errorMessage = 'An account with this email already exists';
            } else if (error.response?.data?.errors) {
                errorMessage = error.response.data.errors[0].msg;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) {
            setPhone(value);
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
                            <i className="ri-user-add-line text-4xl text-[#fdc700]"></i>
                            <h2 className='text-2xl font-bold text-gray-800 text-center'>Create Account</h2>
                        </div>
                        
                        <form onSubmit={submitHandler} className='space-y-6'>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        First Name <span className="text-gray-400">*</span>
                                    </label>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                        type="text"
                                        placeholder='John'
                                        disabled={isLoading}
                                        autoComplete="given-name"
                                        name="firstName"
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Last Name <span className="text-gray-400">*</span>
                                    </label>
                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                        type="text"
                                        placeholder='Doe'
                                        disabled={isLoading}
                                        autoComplete="family-name"
                                        name="lastName"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Email Address <span className="text-gray-400">*</span>
                                </label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                    type="email"
                                    placeholder='example@gmail.com'
                                    disabled={isLoading}
                                    autoComplete="email"
                                    name="email"
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Phone Number <span className="text-gray-400">*</span>
                                </label>
                                <input
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    required
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                    type="tel"
                                    placeholder='9876543210'
                                    disabled={isLoading}
                                    autoComplete="tel"
                                    name="phone"
                                    maxLength={10}
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
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm'
                                    type="password"
                                    placeholder='Enter your password'
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    name="password"
                                    minLength={6}
                                />
                                <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters long</p>
                            </div>

                            <button
                                type="submit"
                                className='bg-[#fdc700] text-gray-800 font-semibold px-4 py-3 rounded-xl w-full text-lg transition-all shadow-sm hover:bg-[#fdc700]/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                        Creating Account...
                                    </div>
                                ) : 'Create Account'}
                            </button>

                            <p className='text-center text-gray-600'>
                                Already have an account? <Link to='/login' className='text-[#fdc700] font-semibold hover:text-[#fdc700]/90'>Login</Link>
                            </p>
                        </form>
                    </div>

                    <p className='mt-6 text-xs text-gray-500 text-center'>
                        This site is protected by reCAPTCHA and the{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className='underline hover:text-gray-700'>Google Privacy Policy</a>
                        {' '}and{' '}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className='underline hover:text-gray-700'>Terms of Service</a>
                        {' '}apply.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default UserSignup