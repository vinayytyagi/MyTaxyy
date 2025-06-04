// /**
//  * @typedef {Object} RazorpayOptions
//  * @property {string} key - Razorpay API key
//  * @property {number} amount - Amount in smallest currency unit (e.g., paise for INR)
//  * @property {string} currency - Currency code (e.g., 'INR')
//  * @property {string} name - Your company/brand name
//  * @property {string} description - Payment description
//  * @property {string} order_id - Razorpay order ID
//  * @property {function(RazorpayResponse): void} handler - Callback function after payment
//  * @property {Object} [prefill] - Pre-fill customer details
//  * @property {string} [prefill.name] - Customer name
//  * @property {string} [prefill.email] - Customer email
//  * @property {string} [prefill.contact] - Customer contact number
//  * @property {Object} [theme] - Customize Razorpay checkout theme
//  * @property {string} [theme.color] - Theme color
//  */

// /**
//  * @typedef {Object} RazorpayResponse
//  * @property {string} razorpay_payment_id - Razorpay payment ID
//  * @property {string} razorpay_order_id - Razorpay order ID
//  * @property {string} razorpay_signature - Payment signature for verification
//  */

// /**
//  * @typedef {Object} RazorpayInstance
//  * @property {function(): void} open - Opens the Razorpay payment modal
//  */

// // Example usage:
// /**
//  * @example
//  * const options = {
//  *   key: 'YOUR_KEY',
//  *   amount: 1000,
//  *   currency: 'INR',
//  *   name: 'MyTaxy',
//  *   description: 'Payment for ride',
//  *   order_id: 'order_id',
//  *   handler: function(response) {
//  *     console.log(response.razorpay_payment_id);
//  *   }
//  * };
//  * 
//  * const razorpay = new window.Razorpay(options);
//  * razorpay.open();
//  */

// declare global {
//     interface Window {
//         Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
//     }
// }

