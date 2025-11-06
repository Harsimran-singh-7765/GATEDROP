// 1. Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Import other dependencies
import express from 'express';
import cors from 'cors';
import dbConnect from './dbConnect';

// IMPORT YOUR ROUTES
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';         // <-- ADD THIS
import paymentRoutes from './routes/payment.routes'; // <-- ADD THIS



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);         // <-- ADD THIS
app.use('/api/payment', paymentRoutes);  // <-- ADD THIS

// ..
// Test route
app.get('/', (req, res) => {
  res.send('Gatedrop Backend API is running! 🚀');
});

// Start the server AFTER connecting to DB
console.log("Connecting to MongoDB Atlas...");
dbConnect().then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas');
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });

}).catch(err => {
  console.error('❌ Connection error', err);
  process.exit(1);
});