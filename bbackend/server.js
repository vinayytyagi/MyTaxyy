const http=require('http');
const app=require('./app');
const {initializeSocket}=require('./socket');
const connecttoDB=require('./db/db');
const port=process.env.PORT||3000;

// iinitiante the db 
connecttoDB();

const server=http.createServer(app);

initializeSocket(server);
server.listen(port,()=>{
    console.log(`Server is running at port no. ${port}`);

});
