import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import OtpVerification from '../models/OtpVerification.model';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import { generateOtp, sendOtpEmail } from '../services/mail.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
// FIX: Domain check ke liye @ se shuru kiya
const COLLEGE_EMAIL_DOMAIN = "@mail.jiit.ac.in"; 

// --- NEW ROUTE: REQUEST OTP (Phase 1) ---

router.post('/request-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.endsWith(COLLEGE_EMAIL_DOMAIN)) {
    return res.status(400).json({ message: `Invalid college email domain. Must end with ${COLLEGE_EMAIL_DOMAIN}` });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists. Please log in.' });
    }

    const otpCode = generateOtp();
    await OtpVerification.deleteOne({ email }); 

    const newOtp = new OtpVerification({ email, otp: otpCode });
    await newOtp.save();

    await sendOtpEmail(email, otpCode);

    res.status(200).json({ message: 'Verification code sent to your email.' });

  } catch (error: any) {
    console.error('[Request OTP Error]:', error);
    res.status(500).json({ message: error.message || 'Failed to generate and send OTP.' });
  }
});


// --- UPDATED ROUTE: SIGNUP (Phase 2) ---

router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, collegeId, otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: 'Verification OTP is required.' });
    }
    
    const otpRecord = await OtpVerification.findOne({ email });

    if (!otpRecord || otpRecord.otp !== otp) {
        return res.status(401).json({ message: 'Invalid verification code.' });
    }
    
    await OtpVerification.deleteOne({ email });

    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists. You can now log in.' });
    }

    user = new User({ name, email, phone, password, collegeId });
    await user.save();

    // FIX 1: User ko dobara fetch karo taaki saare default fields aur stats aa jaayen
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
        return res.status(500).json({ message: 'Registration failed: User data not found after save.' });
    }
    
    const payload = { userId: fullUser._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // FIX: Saare fields return kiye
    res.status(201).json({ 
      token, 
      user: {
        _id: fullUser._id,
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        isBanned: fullUser.isBanned || false,
        walletBalance: fullUser.walletBalance,
        gigsCompletedAsRunner: fullUser.gigsCompletedAsRunner,
        gigsPostedAsRequester: fullUser.gigsPostedAsRequester,
        reportCount: fullUser.reportCount
      } 
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
});


// --- EXISTING ROUTES ---

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // FIX 2: User ko password select kiye bina dobara fetch karo taaki default fields milen
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
        return res.status(404).json({ message: 'User data not found.' });
    }

    const payload = { userId: fullUser._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    // FIX: Saare fields return kiye
    res.status(200).json({ 
      token, 
      user: {
        _id: fullUser._id,
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        isBanned: fullUser.isBanned,
        walletBalance: fullUser.walletBalance,
        gigsCompletedAsRunner: fullUser.gigsCompletedAsRunner,
        gigsPostedAsRequester: fullUser.gigsPostedAsRequester,
        reportCount: fullUser.reportCount
      } 
    });

  } catch (error: any) {
    console.error('[LOGIN ERROR]:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // FIX 3: User ko simple findById se fetch kiya (Mongoose default fields de dega)
    const user = await User.findById(req.user!.userId); 
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // FIX: Poora user object return kiya (ismein saare stats aur wallet balance hain)
    res.json(user); 
  } catch (error: any) {
    console.error('[GET /api/auth/me] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;