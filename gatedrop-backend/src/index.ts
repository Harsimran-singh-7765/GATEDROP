// 1. Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Import other dependencies
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dbConnect from './dbConnect';
import { createServer } from 'http'; // <-- 1. Import http
import { Server } from 'socket.io';   // <-- 2. Import socket.io Server

// Import routes
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import paymentRoutes from './routes/payment.routes';
import { AuthRequest } from './middleware/auth.middleware';

// Check if JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. Create HTTP Server and Socket.io Server ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:8080", // Your frontend URL
    methods: ["GET", "POST", "PATCH"],
  },
});

// --- 4. Socket.io Connection Logic ---
io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // This is our Room logic
  // When frontend connects, it will emit 'join_job_room'
  socket.on("join_job_room", (jobId: string) => {
    console.log(`[Socket] User ${socket.id} joined room: ${jobId}`);
    socket.join(jobId); // The user joins a "room" named after the job's ID
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// --- 5. Middleware to make 'io' available to routes ---
// This attaches the 'io' server to every request object
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as AuthRequest).io = io; // We use our custom AuthRequest type
  next();
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payment', paymentRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Gatedrop Backend API is running! 🚀');
});

// Start the server AFTER connecting to DB
console.log("Connecting to MongoDB Atlas...");
dbConnect().then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas');
  
  // --- 6. Start the httpServer, NOT the 'app' ---
  httpServer.listen(PORT, () => {
    console.log(`✅ Server (with Sockets) running on http://localhost:${PORT}`);
  });

}).catch(err => {
  console.error('❌ Connection error', err);
  process.exit(1);
});