import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// --- NEW: Payout Details Sub-schema ---
const BankAccountSchema = new mongoose.Schema({
  accountNumber: { type: String, default: null },
  ifsc: { type: String, default: null },
  beneficiaryName: { type: String, default: null },
}, { _id: false });
// --- END NEW ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  collegeId: { type: String },
  profileImageUrl: { type: String },

  walletBalance: { type: Number, default: 0 },
  gigsCompletedAsRunner: { type: Number, default: 0 },
  gigsPostedAsRequester: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },

  // --- NEW FIELDS FOR RATING & PAYOUTS ---
  totalRatingStars: { type: Number, default: 0 }, // Sabhi ratings ka total sum
  totalRatingCount: { type: Number, default: 0 }, // Kitni ratings mili hain

  upiId: { type: String, trim: true, default: null },
  bankAccount: { type: BankAccountSchema, default: () => ({}) }
  // --- END NEW FIELDS ---

}, { timestamps: true });

// Password hash karne ka middleware
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password compare karne ka method
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);