import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export const SocketContext = createContext();

const socket = io(`${import.meta.env.VITE_BASE_URL}`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    cors: {
        origin: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            console.log('Socket connected');
        }

        function onDisconnect() {
            setIsConnected(false);
            console.log('Socket disconnected');
        }

        // Payment notification handlers
        function onPaymentReceived(data) {
            toast.success(data.message, {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#4CAF50',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                },
            });
        }

        function onEarningsUpdated(data) {
            toast.success(`Earnings updated! Total: ₹${data.totalEarnings}`, {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#4CAF50',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                },
            });
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('payment_received', onPaymentReceived);
        socket.on('earnings_updated', onEarningsUpdated);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('payment_received', onPaymentReceived);
            socket.off('earnings_updated', onEarningsUpdated);
        };
    }, []);

    const joinUser = (userId) => {
        if (isConnected && userId) {
            socket.emit("join", { userType: "user", userId });
        }
    };

    const joinCaptain = (captainId) => {
        if (isConnected && captainId) {
            socket.emit("join", { userType: "captain", userId: captainId });
        }
    };

    const notifyPaymentSuccess = (data) => {
        if (isConnected) {
            socket.emit('payment_successful', data);
        }
    };

    return (
        <SocketContext.Provider value={{ 
            socket, 
            isConnected, 
            joinUser, 
            joinCaptain,
            notifyPaymentSuccess 
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;