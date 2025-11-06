import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // 'select: false' hides it by default
  collegeId: { type: String },
  profileImageUrl: { type: String },
  
  // From your docs
  walletBalance: { type: Number, default: 0 },
  gigsCompletedAsRunner: { type: Number, default: 0 },
  gigsPostedAsRequester: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

// Middleware to hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);