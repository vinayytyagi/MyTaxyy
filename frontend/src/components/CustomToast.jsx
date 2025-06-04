import React, { useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill, RiCloseLine } from 'react-icons/ri';

// Custom toast styles with improved design
const toastStyles = {
    success: {
        style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '320px',
            maxWidth: '400px',
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateY(0)',
            transition: 'all 0.3s ease-in-out',
            opacity: 1,
        },
        icon: <RiCheckboxCircleFill className="text-green-600 text-xl flex-shrink-0" />,
        progressBar: 'bg-green-500'
    },
    error: {
        style: {
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '320px',
            maxWidth: '400px',
            position: 'relative',
            overflow: 'hidden',
            marginTop: '16px',
            transform: 'translateY(0)',
            transition: 'all 0.3s ease-in-out',
            opacity: 1,
        },
        icon: <RiErrorWarningFill className="text-red-600 text-xl flex-shrink-0" />,
        progressBar: 'bg-red-500'
    },
    info: {
        style: {
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '320px',
            maxWidth: '400px',
            position: 'relative',
            overflow: 'hidden',
            marginTop: '16px',
            transform: 'translateY(0)',
            transition: 'all 0.3s ease-in-out',
            opacity: 1,
        },
        icon: <RiInformationFill className="text-blue-600 text-xl flex-shrink-0" />,
        progressBar: 'bg-blue-500'
    }
};

// Custom toast component with progress bar
const CustomToast = ({ children }) => {
    return (
        <Toaster
            position="top-center"
            containerStyle={{
                top: '80px', // Position below navbar
                left: '50%',
                transform: 'translateX(-50%)',
            }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#fff',
                    color: '#333',
                },
                success: {
                    ...toastStyles.success,
                    duration: 3000,
                    className: 'toast-success',
                },
                error: {
                    ...toastStyles.error,
                    duration: 4000,
                    className: 'toast-error',
                },
                custom: {
                    ...toastStyles.info,
                    duration: 3000,
                    className: 'toast-info',
                }
            }}
        >
            {children}
        </Toaster>
    );
};

// Custom toast component with progress bar
const ToastWithProgress = ({ message, type, onClose }) => {
    const progressRef = useRef(null);
    const style = toastStyles[type];

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.width = '100%';
            progressRef.current.style.transition = `width ${type === 'error' ? 4 : 3}s linear`;
            setTimeout(() => {
                if (progressRef.current) {
                    progressRef.current.style.width = '0%';
                }
            }, 50);
        }
    }, []);

    return (
        <div style={style.style} className="group">
            {style.icon}
            <div className="flex-1">
                <p className="font-medium">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-black/5 rounded-full"
            >
                <RiCloseLine className="text-gray-500" />
            </button>
            <div 
                ref={progressRef}
                className={`absolute bottom-0 left-0 h-1 ${style.progressBar} transition-all duration-300`}
                style={{ width: '100%' }}
            />
        </div>
    );
};

// Custom toast functions with improved animations
export const showToast = {
    success: (message) => {
        toast.custom(
            (t) => (
                <ToastWithProgress
                    message={message}
                    type="success"
                    onClose={() => toast.dismiss(t.id)}
                />
            ),
            {
                ...toastStyles.success,
                duration: 3000,
            }
        );
    },
    error: (message) => {
        toast.custom(
            (t) => (
                <ToastWithProgress
                    message={message}
                    type="error"
                    onClose={() => toast.dismiss(t.id)}
                />
            ),
            {
                ...toastStyles.error,
                duration: 4000,
            }
        );
    },
    info: (message) => {
        toast.custom(
            (t) => (
                <ToastWithProgress
                    message={message}
                    type="info"
                    onClose={() => toast.dismiss(t.id)}
                />
            ),
            {
                ...toastStyles.info,
                duration: 3000,
            }
        );
    }
};

export default CustomToast; 