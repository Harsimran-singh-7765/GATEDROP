import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';

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
        // add any other fields frontend needs
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
        // add any other fields
      } 
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;