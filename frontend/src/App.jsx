/**
 * Main App Component
 * 
 * This is the root component of your application that:
 * 1. Sets up routing for all pages
 * 2. Initializes Google Maps
 * 3. Handles authentication and protected routes
 * 4. Manages toast notifications
 * 
 * The app has two main user types:
 * - Regular users (passengers)
 * - Captains (drivers)
 * Each has their own set of protected routes and authentication flow
 */

// Import React and necessary hooks
import React, { useContext } from 'react'

// Import routing components from react-router-dom
// Route: Defines a route in your application
// Routes: Container for all routes
// Navigate: Component for programmatic navigation
import { Route, Routes, Navigate } from 'react-router-dom'

// Import all page components
// User (Passenger) pages
import UserLogin from './pages/UserLogin'
import UserSignup from './pages/UserSignup'
import Home from './pages/Home'
import UserLogout from './pages/UserLogout'
import Riding from './pages/Riding'
import UserProfile from './pages/UserProfile'
import Profile from './pages/Profile'

// Captain (Driver) pages
import CaptainSignup from './pages/CaptainSignup'
import CaptainLogin from './pages/CaptainLogin'
import CaptainHome from './pages/CaptainHome'
import CaptainLogout from './pages/CaptainLogout'
import CaptainRiding from './pages/CaptainRiding'
import CaptainProfile from './pages/CaptainProfile'

// Import route protection wrappers
// These components check if the user is authenticated
import UserProtectedWrapper from './pages/UserProtectedWrapper'
import CaptainProtectWrapper from './pages/CaptainProtectWrapper'

// Import Google Maps components
// LoadScript loads the Google Maps JavaScript API
import { LoadScript } from '@react-google-maps/api'

// Import toast notification components
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CustomToast from './components/CustomToast'

// Import context and services
import { UserDataContext } from './context/UserContext'
import { getToken } from './services/auth.service'

// Define which Google Maps libraries to load
// 'places': For places autocomplete and search
// 'geometry': For distance and location calculations
const libraries = ['places', 'geometry']

const App = () => {
  // Get user data from context
  const { user } = useContext(UserDataContext)
  
  // Check for authentication tokens in localStorage
  const userToken = localStorage.getItem('token')        // For regular users
  const captainToken = localStorage.getItem('captainToken') // For captains

  return (
    // LoadScript wraps the entire app to provide Google Maps functionality
    <LoadScript 
      // Google Maps API key from environment variables
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      // Loading spinner while Google Maps loads
      loadingElement={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
      // Error handler for Google Maps loading
      onError={(error) => console.error('Error loading Google Maps:', error)}
    >
      {/* Main app container */}
      <div className="min-h-screen bg-gray-50">
        {/* Toast notification container */}
        <ToastContainer 
          position="top-center" 
          autoClose={3000}
          className="mt-16"
          toastClassName="bg-white rounded-lg shadow-lg"
        />
        <CustomToast />

        {/* Main content area */}
        <main>
          <Routes>
            {/* Root route - redirects based on authentication */}
            <Route path='/' element={
              userToken ? <Navigate to="/home" /> :           // If user is logged in, go to home
              captainToken ? <Navigate to="/captain-home" /> : // If captain is logged in, go to captain home
              <UserLogin />                                   // Otherwise, show login page
            }/>

            {/* Public routes - accessible without authentication */}
            <Route path='/login' element={<UserLogin/>}/>
            <Route path='/signup' element={<UserSignup/>}/>
            <Route path='/captain-login' element={<CaptainLogin/>}/>
            <Route path='/captain-signup' element={<CaptainSignup/>}/>
            <Route path='/riding' element={<Riding/>} />
            <Route path='/captain-riding' element={<CaptainRiding/>}/>
            
            {/* Protected Routes - require authentication */}
            {/* User (Passenger) protected routes */}
            <Route path='/home' element={
              <UserProtectedWrapper>
                <Home/>
              </UserProtectedWrapper>
            } />
            <Route path='/user/logout' element={
              <UserProtectedWrapper>
                <UserLogout/>
              </UserProtectedWrapper>
            } />
            <Route path='/user/profile' element={
              <UserProtectedWrapper>
                <UserProfile/>
              </UserProtectedWrapper>
            } />
            <Route path='/profile' element={
              <UserProtectedWrapper>
                <Profile />
              </UserProtectedWrapper>
            } />

            {/* Captain protected routes */}
            <Route path='/captain-home' element={
              <CaptainProtectWrapper>
                <CaptainHome/>
              </CaptainProtectWrapper>
            }/>
            <Route path='/captain/logout' element={
              <CaptainProtectWrapper>
                <CaptainLogout/>
              </CaptainProtectWrapper>
            }/>
            <Route path='/captain-profile' element={
              <CaptainProtectWrapper>
                <CaptainProfile/>
              </CaptainProtectWrapper>
            }/>
          </Routes>
        </main>
      </div>
    </LoadScript>
  )
}

export default App
