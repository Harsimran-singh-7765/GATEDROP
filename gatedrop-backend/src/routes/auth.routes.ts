import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
// 1. ADD THIS IMPORT
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, collegeId } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    // Create new user (password will be hashed by the pre-save hook)
    user = new User({ name, email, phone, password, collegeId });
    await user.save();

    // Generate token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // As per docs: return token and user
    res.status(201).json({ 
      token, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      } 
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email and explicitly select password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    // As per docs: return token and user
    res.status(200).json({ 
      token, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isBanned: user.isBanned // Frontend needs this
      } 
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// 2. ADD THIS ENTIRE ROUTE
/**
 * @route   GET /api/auth/me
 * @desc    Get current user data from token
 * @access  Private
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // authMiddleware already verified token and attached req.user
    const user = await User.findById(req.user!.userId).select('-password');
    if (!user) {
      return res.status(4.04).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    console.error('[GET /api/auth/me] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;