import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io'; // <-- Socket.io type import karo

const JWT_SECRET = process.env.JWT_SECRET!;

// Hum 'user' aur 'io' properties ko Request type mein add kar rahe hain
export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
  io?: SocketIOServer; // <-- YEH HAI FIX (Property add karo)
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token format is incorrect' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    req.user = { userId: decoded.userId };
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authMiddleware;