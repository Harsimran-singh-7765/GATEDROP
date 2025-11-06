import mongoose from 'mongoose';

// This is the structure for the cached details
const UserDetailsCacheSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true }
}, { _id: false });

const JobSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  runnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  title: { type: String, required: true },
  description: { type: String, required: true },

  pickupLocation: { type: String, required: true },
  dropLocation: { type: String, required: true },
  jobDeadline: { type: Date },
  fee: { type: Number, required: true, min: 30 },

  paymentId: { type: String, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'successful'],
    default: 'successful' // Assuming payment is done upfront
  },

  // --- UPDATED STATUS ---
  status: {
    type: String,
    enum: [
      'pending_bids', // 'pending' ko replace kiya
      'accepted',
      'picked_up',
      'delivered_by_runner',
      'completed',
      'cancelled'
    ],
    default: 'pending_bids', // Naya default status
  },
  // --- END UPDATE ---

  // --- NEW FIELDS FOR BIDDING & RATING ---
  applicants: [{ // Runners jo apply karenge
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ratingGiven: { type: Boolean, default: false }, // Requester ne rate kiya ya nahi
  // --- END NEW FIELDS ---

  requesterDetailsCache: UserDetailsCacheSchema,
  runnerDetailsCache: UserDetailsCacheSchema,

}, { timestamps: true }); // Adds createdAt and updatedAt

export default mongoose.models.Job || mongoose.model('Job', JobSchema);