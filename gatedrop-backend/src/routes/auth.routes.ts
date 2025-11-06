import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import OtpVerification from '../models/OtpVerification.model';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import { generateOtp, sendOtpEmail } from '../services/mail.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const COLLEGE_EMAIL_DOMAIN = "@mail.jiit.ac.in";

// --- NEW ROUTE: REQUEST OTP (Phase 1) ---

router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  console.log(`[AUTH] Received request for OTP for email: ${email}`);

  if (!email || !email.endsWith(COLLEGE_EMAIL_DOMAIN)) {
    console.warn(`[AUTH] Invalid email domain for ${email}`);
    return res.status(400).json({ message: `Invalid college email domain. Must end with ${COLLEGE_EMAIL_DOMAIN}` });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[AUTH] Attempted OTP request for existing user: ${email}`);
      return res.status(400).json({ message: 'User already exists. Please log in.' });
    }

    const otpCode = generateOtp();
    // Delete any existing OTP for this email
    await OtpVerification.deleteOne({ email });
    console.log(`[AUTH] Deleted previous OTP for ${email}`);

    const newOtp = new OtpVerification({ email, otp: otpCode });
    await newOtp.save();
    console.log(`[AUTH] New OTP saved for ${email}: ${otpCode}`);

    await sendOtpEmail(email, otpCode);
    console.log(`[AUTH] OTP email sent successfully to: ${email}`);

    res.status(200).json({ message: 'Verification code sent to your email.' });

  } catch (error: any) {
    console.error(`[AUTH] Request OTP Error for ${email}:`, error.message);
    res.status(500).json({ message: error.message || 'Failed to generate and send OTP.' });
  }
});


// --- UPDATED ROUTE: SIGNUP (Phase 2) ---

router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, collegeId, otp } = req.body;
    console.log(`[AUTH] Attempting signup for email: ${email}`);

    if (!otp) {
      console.warn(`[AUTH] Signup failed for ${email}: OTP is missing.`);
      return res.status(400).json({ message: 'Verification OTP is required.' });
    }

    const otpRecord = await OtpVerification.findOne({ email });

    if (!otpRecord) {
      console.warn(`[AUTH] Signup failed for ${email}: OTP record not found (expired or never sent).`);
      return res.status(401).json({ message: 'Verification failed. Please resend the code.' }); // More descriptive message
    }

    if (otpRecord.otp !== otp) {
      console.warn(`[AUTH] Signup failed for ${email}: Invalid OTP provided.`);
      return res.status(401).json({ message: 'Invalid verification code.' });
    }

    // OTP matched, delete it immediately
    await OtpVerification.deleteOne({ email });
    console.log(`[AUTH] OTP verified and deleted for ${email}.`);


    // Check if user already exists by email OR phone
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      console.warn(`[AUTH] Signup failed for ${email}: User already exists with this email or phone.`);
      // If user exists, but tried to sign up again, we tell them to log in.
      return res.status(400).json({ message: 'User already exists. Please log in.' });
    }

    user = new User({ name, email, phone, password, collegeId });
    await user.save();
    console.log(`[AUTH] New user created with _id: ${user._id}`);

    // Fetch the user again to ensure all default Mongoose fields are populated
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
      console.error(`[AUTH] Signup failed for ${email}: User data not found after save.`);
      return res.status(500).json({ message: 'Registration failed: User data not found after save.' });
    }

    const payload = { userId: fullUser._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[AUTH] Token generated for user: ${fullUser._id}`);

    res.status(201).json({
      token,
      user: {
        _id: fullUser._id,
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        profileImageUrl: fullUser.profileImageUrl, // Add this
        walletBalance: fullUser.walletBalance,
        gigsCompletedAsRunner: fullUser.gigsCompletedAsRunner,
        gigsPostedAsRequester: fullUser.gigsPostedAsRequester,
        reportCount: fullUser.reportCount,
        isBanned: fullUser.isBanned,
        totalRatingStars: fullUser.totalRatingStars, // Add this
        totalRatingCount: fullUser.totalRatingCount, // Add this
        upiId: fullUser.upiId, // Add this
        bankAccount: fullUser.bankAccount, // Add this
      }
    });

  } catch (error: any) {
    console.error(`[AUTH] Server error during signup for ${req.body.email || 'N/A'}:`, error.message);
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
});


// --- EXISTING ROUTES ---

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Attempting login for email: ${email}`);

    // Select password to compare it, but don't return it
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.warn(`[AUTH] Login failed for ${email}: User not found.`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`[AUTH] Login failed for ${email}: Incorrect password.`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Fetch the user again without the password field to get all default populated fields
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
      console.error(`[AUTH] Login error for ${email}: User data not found after password check.`);
      return res.status(404).json({ message: 'User data not found.' });
    }

    const payload = { userId: fullUser._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[AUTH] User logged in successfully: ${fullUser._id}`);

    res.status(200).json({
      token,
      user: {
        _id: fullUser._id,
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        profileImageUrl: fullUser.profileImageUrl, // Add this
        walletBalance: fullUser.walletBalance,
        gigsCompletedAsRunner: fullUser.gigsCompletedAsRunner,
        gigsPostedAsRequester: fullUser.gigsPostedAsRequester,
        reportCount: fullUser.reportCount,
        isBanned: fullUser.isBanned,
        totalRatingStars: fullUser.totalRatingStars, // Add this
        totalRatingCount: fullUser.totalRatingCount, // Add this
        upiId: fullUser.upiId, // Add this
        bankAccount: fullUser.bankAccount, // Add this
      }
    });

  } catch (error: any) {
    console.error(`[AUTH] Server error during login for ${req.body.email || 'N/A'}:`, error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log(`[AUTH] Fetching user profile for userId: ${req.user!.userId}`);
    const user = await User.findById(req.user!.userId);
    if (!user) {
      console.warn(`[AUTH] /me failed for userId ${req.user!.userId}: User not found.`);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`[AUTH] User profile fetched successfully for ${user._id}`);
    res.json(user);
  } catch (error: any) {
    console.error(`[AUTH] Server error during /me for userId ${req.user?.userId || 'N/A'}:`, error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;