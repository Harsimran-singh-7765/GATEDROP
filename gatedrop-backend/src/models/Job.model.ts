import mongoose from 'mongoose';

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
  pickupLocation: { type: String, required: true },
  dropLocation: { type: String, required: true },
  itemDescription: { type: String, required: true },
  jobDeadline: { type: Date },
  fee: { type: Number, required: true, min: 30 },
  paymentId: { type: String, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'successful'], 
    default: 'pending' 
  },
  status: {
    type: String,
    enum: [
      'pending', 
      'accepted', 
      'picked_up', 
      'delivered_by_runner', 
      'completed', 
      'cancelled'
    ],
    default: 'pending',
  },
  requesterDetailsCache: UserDetailsCacheSchema,
  runnerDetailsCache: UserDetailsCacheSchema,
}, { timestamps: true });

export default mongoose.models.Job || mongoose.model('Job', JobSchema);