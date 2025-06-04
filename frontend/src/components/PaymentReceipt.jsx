import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';
import { FaDownload, FaPrint } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { showToast } from './CustomToast';

const PaymentReceipt = ({ paymentId, onClose }) => {
    const { user } = useContext(UserDataContext);
    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/api/payment/receipt/${paymentId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${user.token}`
                        }
                    }
                );
                setReceipt(response.data);
            } catch (error) {
                console.error('Error fetching receipt:', error);
                showToast.error('Failed to load receipt');
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [paymentId, user.token]);

    const handleDownload = async () => {
        try {
            const receiptElement = document.getElementById('receipt-content');
            const canvas = await html2canvas(receiptElement);
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`receipt-${receipt.receiptNumber}.pdf`);
            
            showToast.success('Receipt downloaded successfully');
        } catch (error) {
            console.error('Error downloading receipt:', error);
            showToast.error('Failed to download receipt');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="p-8 text-center text-red-600">
                Failed to load receipt
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6" id="receipt-content">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">MyTaxy</h1>
                        <p className="text-gray-600">Payment Receipt</p>
                    </div>

                    {/* Receipt Details */}
                    <div className="space-y-6">
                        {/* Receipt Number and Date */}
                        <div className="flex justify-between border-b pb-4">
                            <div>
                                <p className="text-sm text-gray-600">Receipt Number</p>
                                <p className="font-semibold">{receipt.receiptNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Date</p>
                                <p className="font-semibold">
                                    {new Date(receipt.date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-semibold mb-3">Payment Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Amount</p>
                                    <p className="font-semibold">₹{receipt.amount}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Payment Method</p>
                                    <p className="font-semibold capitalize">{receipt.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <p className="font-semibold capitalize text-green-600">{receipt.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Order ID</p>
                                    <p className="font-semibold">{receipt.orderId}</p>
                                </div>
                            </div>
                        </div>

                        {/* Ride Details */}
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-semibold mb-3">Ride Details</h2>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-gray-600">From</p>
                                    <p className="font-semibold">{receipt.ride.pickup}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">To</p>
                                    <p className="font-semibold">{receipt.ride.destination}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Distance</p>
                                        <p className="font-semibold">{receipt.ride.distance} km</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Duration</p>
                                        <p className="font-semibold">{receipt.ride.duration} mins</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Fare</p>
                                        <p className="font-semibold">₹{receipt.ride.fare}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Details */}
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-semibold mb-3">User Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Name</p>
                                    <p className="font-semibold">{receipt.user.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Phone</p>
                                    <p className="font-semibold">{receipt.user.phone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-semibold">{receipt.user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Captain Details */}
                        {receipt.captain && (
                            <div className="border-b pb-4">
                                <h2 className="text-lg font-semibold mb-3">Captain Details</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Name</p>
                                        <p className="font-semibold">{receipt.captain.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Phone</p>
                                        <p className="font-semibold">{receipt.captain.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Vehicle Number</p>
                                        <p className="font-semibold">{receipt.captain.vehicleNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Vehicle Type</p>
                                        <p className="font-semibold capitalize">{receipt.captain.vehicleType}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-sm text-gray-500 mt-8">
                            <p>Thank you for choosing MyTaxy!</p>
                            <p>This is a computer-generated receipt and does not require a signature.</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t p-4 flex justify-end space-x-4">
                    <button
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <FaPrint className="mr-2" />
                        Print
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center px-4 py-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600"
                    >
                        <FaDownload className="mr-2" />
                        Download PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentReceipt; 