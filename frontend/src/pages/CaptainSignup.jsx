import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios';
import { CaptainDataContext } from '../context/CaptainContext';
import { toast } from 'react-toastify';
import myTaxyLogo from '../assets/MyTaxy.png';

const CaptainSignup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleCapacity, setVehicleCapacity] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const { setCaptain } = useContext(CaptainDataContext);

    const validatePhoneNumber = (phoneNumber) => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        return cleaned.length === 10;
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setPhone(value);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        // Frontend validation
        if (!firstName || firstName.length < 3) {
            toast.error('First name must be at least 3 characters long');
            setIsLoading(false);
            return;
        }

        if (!lastName || lastName.length < 3) {
            toast.error('Last name must be at least 3 characters long');
            setIsLoading(false);
            return;
        }

        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        if (!validatePhoneNumber(phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            setIsLoading(false);
            return;
        }

        if (!vehicleColor || vehicleColor.length < 3) {
            toast.error('Vehicle color must be at least 3 characters long');
            setIsLoading(false);
            return;
        }

        if (!vehiclePlate || vehiclePlate.length < 3) {
            toast.error('Vehicle plate must be at least 3 characters long');
            setIsLoading(false);
            return;
        }

        if (!vehicleCapacity || isNaN(vehicleCapacity) || parseInt(vehicleCapacity) < 1) {
            toast.error('Please enter a valid vehicle capacity (minimum 1)');
            setIsLoading(false);
            return;
        }

        const vehicleTypeMap = {
            'car': 'car',
            'auto': 'auto',
            'motorcycle': 'motorcycle'
        };

        if (!vehicleType || !vehicleTypeMap[vehicleType]) {
            toast.error('Please select a valid vehicle type');
            setIsLoading(false);
            return;
        }
    
        const newCaptain = {
            fullname: {
                firstname: firstName.trim(),
                lastname: lastName.trim(),
            },
            email: email.trim(),
            password,
            phone: phone.trim(),
            vehicle: {
                color: vehicleColor.trim(),
                plate: vehiclePlate.trim(),
                capacity: parseInt(vehicleCapacity),
                vehicleType: vehicleTypeMap[vehicleType]
            },
            location: {
                type: 'Point',
                coordinates: [0, 0]
            }
        };
    
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, newCaptain);
    
            if (response.status === 201) {
                const data = response.data;
                setCaptain(data.captain);
                localStorage.setItem('token', data.token);
                toast.success('Captain registered successfully');
                navigate('/captain-home');
            }
        } catch (error) {
            console.error('Signup error:', error);
            if (error.response?.data?.message === 'Captain Already Exists') {
                toast.error('Captain already exists');
            } else if (error.response?.data?.errors) {
                toast.error(error.response.data.errors[0].msg);
            } else {
                toast.error('Something went wrong during signup');
            }
        } finally {
            setIsLoading(false);
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
                            <h2 className='text-2xl font-bold text-gray-800'>Join Our Fleet</h2>
                        </div>
                        
                        <form onSubmit={submitHandler} className='space-y-6'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Full Name <span className="text-gray-400">*</span>
                                </label>
                                <div className='flex gap-4'>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-1/2 border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                        type="text" 
                                        placeholder='First name'
                                    />

                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-1/2 border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                        type="text" 
                                        placeholder='Last name'
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
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                    type="email" 
                                    placeholder='example@gmail.com'
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
                                    className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                    type="tel"
                                    placeholder='Enter your 10-digit phone number'
                                    maxLength="10"
                                    pattern="[0-9]{10}"
                                    title="Please enter a valid 10-digit phone number"
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
                                    placeholder='Create a password'
                                />
                                <p className='mt-1 text-sm text-gray-500'>Must be at least 6 characters</p>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Vehicle Information <span className="text-gray-400">*</span>
                                </label>
                                <div className='space-y-4'>
                                    <div className='flex gap-4'>
                                        <input
                                            required
                                            className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-1/2 border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                            type="text"
                                            placeholder='Vehicle Color'
                                            value={vehicleColor}
                                            onChange={(e) => setVehicleColor(e.target.value)}
                                        />
                                        <input
                                            required
                                            className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-1/2 border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                            type="text"
                                            placeholder='Vehicle Plate'
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value)}
                                        />
                                    </div>
                                    <div className='flex gap-4'>
                                        <input
                                            required
                                            className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-1/2 border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-text'
                                            type="number"
                                            placeholder='Vehicle Capacity'
                                            value={vehicleCapacity}
                                            onChange={(e) => setVehicleCapacity(e.target.value)}
                                        />
                                        <div className="relative w-1/2">
                                            <select
                                                required
                                                className='bg-gray-50 px-4 py-3 text-lg rounded-xl w-full border border-gray-200 focus:border-[#fdc700] focus:ring-2 focus:ring-[#fdc700]/20 outline-none transition-all shadow-sm cursor-pointer appearance-none pr-10 [&>option]:text-gray-700 [&>option]:bg-white [&>option]:py-2 [&>option:first-child]:text-gray-500 [&>option:hover]:bg-[#fdc700]/10 [&>option:checked]:bg-[#fdc700]/20'
                                                value={vehicleType}
                                                onChange={(e) => setVehicleType(e.target.value)}
                                            >
                                                {/* <option value="" disabled>Select Vehicle Type</option> */}
                                                <option value="car">Car</option>
                                                <option value="auto">Auto</option>
                                                <option value="motorcycle">Motorcycle</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <i className="ri-arrow-down-s-line text-[#fdc700] text-xl"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className='bg-[#fdc700] text-gray-800 font-semibold px-4 py-3 rounded-xl w-full text-lg transition-all shadow-sm hover:bg-[#fdc700]/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent mr-2"></div>
                                        Creating Account...
                                    </div>
                                ) : 'Create Captain Account'}
                            </button>

                            <p className='text-center text-gray-600'>
                                Already have an account? <Link to='/captain-login' className='text-[#fdc700] font-semibold hover:text-[#fdc700]/90 cursor-pointer'>Login here</Link>
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

export default CaptainSignup