import axios from 'axios';

const API_URL = import.meta.env.VITE_BASE_URL;

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add response interceptor for handling common errors
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Clear tokens and user data on unauthorized
            removeToken('user');
            removeToken('captain');
            localStorage.removeItem('user');
            localStorage.removeItem('captainData');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Token management
export const setToken = (token, userType = 'user') => {
    try {
        const tokenKey = userType === 'user' ? 'token' : 'captainToken';
        localStorage.setItem(tokenKey, token);
        // Set default authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
        console.error('Error setting token:', error);
        throw new Error('Failed to set authentication token');
    }
};

export const getToken = (userType = 'user') => {
    try {
        const tokenKey = userType === 'user' ? 'token' : 'captainToken';
        return localStorage.getItem(tokenKey);
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const removeToken = (userType = 'user') => {
    try {
        const tokenKey = userType === 'user' ? 'token' : 'captainToken';
        localStorage.removeItem(tokenKey);
        delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
        console.error('Error removing token:', error);
    }
};

// User authentication
export const userLogin = async (email, password) => {
    try {
        const response = await axios.post('/users/login', { email, password });
        if (response.data.token) {
            setToken(response.data.token, 'user');
            // Store user data
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        if (error.response?.status === 0) {
            throw new Error('Network error - request was blocked. This might be caused by an ad blocker.');
        }
        throw error.response?.data || { message: 'Login failed. Please try again.' };
    }
};

export const userLogout = async () => {
    try {
        const token = getToken('user');
        if (token) {
            await axios.get('/users/logout', {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        removeToken('user');
        localStorage.removeItem('user');
    }
};

export const userRegister = async (userData) => {
    try {
        const response = await axios.post('/users/register', userData);
        if (response.data.token) {
            setToken(response.data.token, 'user');
            // Store user data
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        if (error.response?.status === 0) {
            throw new Error('Network error - request was blocked. This might be caused by an ad blocker.');
        }
        throw error.response?.data || { message: 'Registration failed. Please try again.' };
    }
};

// Captain authentication
export const captainLogin = async (email, password) => {
    try {
        const response = await axios.post('/captains/login', { email, password });
        if (response.data.token) {
            setToken(response.data.token, 'captain');
            // Store captain data
            const captainData = {
                ...response.data.captain,
                fullname: {
                    ...response.data.captain.fullname
                },
                vehicle: {
                    ...response.data.captain.vehicle
                },
                email: response.data.captain.email,
                phone: response.data.captain.phone || '',
                _id: response.data.captain._id
            };
            localStorage.setItem('captainData', JSON.stringify(captainData));
            return { ...response.data, captain: captainData };
        }
        return response.data;
    } catch (error) {
        if (error.response?.status === 0) {
            throw new Error('Network error - request was blocked. This might be caused by an ad blocker.');
        }
        throw error.response?.data || { message: 'Login failed. Please try again.' };
    }
};

export const captainLogout = async () => {
    try {
        const token = getToken('captain');
        if (token) {
            await axios.get('/captains/logout', {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        removeToken('captain');
        localStorage.removeItem('captainData');
    }
};

export const captainRegister = async (captainData) => {
    try {
        const response = await axios.post('/captains/register', captainData);
        console.log('Registration response:', response.data); // Debug log
        if (response.data.token) {
            setToken(response.data.token, 'captain');
            // Ensure the captain data includes all necessary fields
            const processedCaptainData = {
                ...response.data.captain,
                fullname: {
                    ...response.data.captain.fullname
                },
                vehicle: {
                    ...response.data.captain.vehicle
                },
                phone: response.data.captain.phone || captainData.phone
            };
            console.log('Processed registration data:', processedCaptainData); // Debug log
            return { ...response.data, captain: processedCaptainData };
        }
        return response.data;
    } catch (error) {
        console.error('Registration error:', error.response?.data); // Debug log
        throw error.response?.data || { message: 'Registration failed' };
    }
};

// Token verification
export const verifyToken = async (userType = 'user') => {
    try {
        const token = getToken(userType);
        if (!token) return null;

        const endpoint = userType === 'user' ? '/users/profile' : '/captains/profile';
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        removeToken(userType);
        if (userType === 'user') {
            localStorage.removeItem('user');
        } else {
            localStorage.removeItem('captainData');
        }
        return null;
    }
}; 