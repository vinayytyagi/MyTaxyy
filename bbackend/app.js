const dotenv=require('dotenv');
dotenv.config();
// this is the express framework 
const express=require('express');
const cors=require('cors');
const app=express();
const userRoutes=require('./routes/user.routes');
const cookieParser=require('cookie-parser');
const captainRoutes=require('./routes/captain.routes');
const mapRoutes=require('./routes/maps.routes');
const rideRoute=require('./routes/ride.routes');
const paymentRoutes = require('./routes/payment.routes');

// Configure CORS using environment variables
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://mytaxy.vercel.app', 'http://localhost:5173'],
    methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Content-Type', 'Authorization'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
};

app.use(cors(corsOptions));

// this is for parsing 
app.use(express.json());
app.use(express.urlencoded({extended:true}))
// middleware to parse cookie 
app.use(cookieParser());


app.get('/',(req,res)=>{
    res.send('Hello World');
});
app.use('/users',userRoutes);
app.use('/captains',captainRoutes);
app.use('/maps',mapRoutes);
app.use('/rides',rideRoute);
app.use('/api/payment', paymentRoutes);

module.exports=app;