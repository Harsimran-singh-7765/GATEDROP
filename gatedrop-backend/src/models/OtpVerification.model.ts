import mongoose from 'mongoose';

const OtpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Only one active OTP per email
  },
  otp: {
    type: String,
    required: true,
  },
  // Automatically expires the document after 600 seconds (10 minutes)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, 
  },
});

export default mongoose.models.OtpVerification || mongoose.model('OtpVerification', OtpVerificationSchema);