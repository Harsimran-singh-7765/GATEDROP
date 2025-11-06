// 1. Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Import other dependencies
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dbConnect from './dbConnect';
import { createServer } from 'http';
import { Server } from 'socket.io';   

// Import routes
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes'; 
import { AuthRequest } from './middleware/auth.middleware';
import walletRoutes from './routes/wallet.routes';
// Check if JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- YEH HAI FIX ---
// 1. Apne Vercel URL ko yahaan daalein
const VERCEL_FRONTEND_URL = "https://gatedrop.vercel.app"; // <-- APNA VERCEL URL YAHAN DAALEIN

// 2. Localhost ports aur Vercel URL ko allow karein
const allowedOrigins = [
  "http://localhost:5173", // Vite default
  "http://localhost:8080", // Aapke docs waala port
  VERCEL_FRONTEND_URL,     // Production frontend
  // '0.0.0.0' or '*' is not used here for better security control
];
// --- END FIX ---


// --- Socket.io CORS ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins, 
    methods: ["GET", "POST", "PATCH", "DELETE"], // DELETE bhi add karein
  },
});
// --- END Socket.io FIX ---

// Socket.io Connection Logic
io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on("join_job_room", (jobId: string) => {
    console.log(`[Socket] User ${socket.id} joined room: ${jobId}`);
    socket.join(jobId);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// --- Express CORS ---
app.use(cors({ origin: allowedOrigins })); // Sirf in URLs ko allow karo
// --- END Express CORS ---

app.use(express.json()); // Parse JSON bodies

// Middleware to make 'io' available to routes
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as AuthRequest).io = io; 
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
// Test route
app.get('/', (req, res) => {
  res.send('Gatedrop Backend API is running! 🚀');
});

// Start the server AFTER connecting to DB
console.log("Connecting to MongoDB Atlas...");
dbConnect().then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas');
  
  httpServer.listen(PORT, () => {
    console.log(`✅ Server (with Sockets) running on http://localhost:${PORT}`);
  });

}).catch(err => {
  console.error('❌ Connection error', err);
  process.exit(1);
});