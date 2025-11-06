import mongoose from 'mongoose';
import { Router } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import Job from '../models/Job.model';
import User from '../models/User.model';

const router = Router();

/**
 * @route   POST /api/jobs
 * @desc    Create a new job post
 * @access  Private
 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { 
      pickupLocation, 
      dropLocation, 
      itemDescription, 
      fee, 
      paymentId 
    } = req.body;
    
    const requesterId = req.user!.userId;

    const requester = await User.findById(requesterId).select('name phone');
    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newJob = new Job({
      requesterId,
      pickupLocation,
      dropLocation,
      itemDescription,
      fee,
      paymentId, 
      paymentStatus: 'successful', 
      status: 'pending', 
      requesterDetailsCache: {
        name: requester.name,
        phone: requester.phone,
      }
    });

    await newJob.save();
    
    // --- 🚀 SOCKET EMIT ---
    // Emits a 'new_job' event to all connected clients (except the sender)
    // This updates the 'Available Jobs' list for everyone else in real-time.
    req.io!.emit('new_job_available', newJob);
    // --- END EMIT ---

    res.status(201).json(newJob);

  } catch (error: any) {
    console.error('[POST /api/jobs] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- IMPORTANT: Specific GET routes must come BEFORE dynamic /:id ---

/**
 * @route   GET /api/jobs/available
 * @desc    Get all available jobs for runners
 * @access  Private
 */
router.get('/available', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const availableJobs = await Job.find({ 
      status: 'pending', 
      paymentStatus: 'successful',
      requesterId: { $ne: req.user!.userId } 
    }).sort({ createdAt: -1 }); 

    res.json(availableJobs);
  } catch (error: any) {
    console.error('[GET /api/jobs/available] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/jobs/my-posted
 * @desc    Get all jobs posted by the current user (as Requester)
 * @access  Private
 */
router.get('/my-posted', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const myJobs = await Job.find({ 
      requesterId: req.user!.userId 
    }).sort({ createdAt: -1 });

    res.json(myJobs);
  } catch (error: any) {
    console.error('[GET /api/jobs/my-posted] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/jobs/my-runner
 * @desc    Get all jobs accepted by the current user (as Runner)
 * @access  Private
 */
router.get('/my-runner', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const myRunningJobs = await Job.find({ 
      runnerId: req.user!.userId 
    }).sort({ createdAt: -1 });

    res.json(myRunningJobs);
  } catch (error: any) {
    console.error('[GET /api/jobs/my-runner] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/jobs/history
 * @desc    Get completed/cancelled jobs for the user
 * @access  Private
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const jobHistory = await Job.find({
      $and: [
        { $or: [{ status: 'completed' }, { status: 'cancelled' }] },
        { $or: [{ requesterId: userId }, { runnerId: userId }] }
      ]
    }).sort({ createdAt: -1 });

    res.json(jobHistory);
  } catch (error: any) {
    console.error('[GET /api/jobs/history] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/accept
 * @desc    Accept a job as a runner
 * @access  Private
 */
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const runnerId = req.user!.userId;

    const runner = await User.findById(runnerId).select('name phone');
    if (!runner) {
      return res.status(404).json({ message: 'Runner user not found' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ message: 'Job is no longer available' });
    }

    if (job.requesterId.toString() === runnerId) {
      return res.status(400).json({ message: 'You cannot accept your own job' });
    }

    job.runnerId = new mongoose.Types.ObjectId(runnerId);
    job.status = 'accepted';
    job.runnerDetailsCache = {
      name: runner.name,
      phone: runner.phone
    };

    await job.save();

    // --- 🚀 SOCKET EMIT ---
    // Emits the updated job data to the room named after the job's ID
    req.io!.to(jobId).emit('job_updated', job);
    // Also emit to the public feed that this job is gone
    req.io!.emit('job_taken', { _id: jobId });
    // --- END EMIT ---

    res.json(job);

  } catch (error: any) {
    console.error('[POST /api/jobs/:id/accept] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status (Runner: picked_up, delivered)
 * @access  Private
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body; // 'picked_up' or 'delivered_by_runner'
    const jobId = req.params.id;
    const runnerId = req.user!.userId;

    if (!['picked_up', 'delivered_by_runner'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.runnerId?.toString() !== runnerId) {
      return res.status(403).json({ message: 'You are not the runner for this job' });
    }

    if (status === 'picked_up' && job.status !== 'accepted') {
       return res.status(400).json({ message: 'Job must be in "accepted" state to be picked up' });
    }
    if (status === 'delivered_by_runner' && job.status !== 'picked_up') {
       return res.status(400).json({ message: 'Job must be in "picked_up" state to be delivered' });
    }

    job.status = status;
    await job.save();

    // --- 🚀 SOCKET EMIT ---
    // Emits the updated job data to the room named after the job's ID
    req.io!.to(jobId).emit('job_updated', job);
    // --- END EMIT ---

    res.json(job);

  } catch (error: any)
{
    console.error('[PATCH /api/jobs/:id/status] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   POST /api/jobs/:id/confirm
 * @desc    Confirm delivery (Requester) & pay runner
 * @access  Private
 */
router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const requesterId = req.user!.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.requesterId.toString() !== requesterId) {
      return res.status(403).json({ message: 'You are not the requester for this job' });
    }

    if (job.status !== 'delivered_by_runner') {
      return res.status(400).json({ message: 'Job has not been marked as delivered by the runner yet' });
    }

    const runner = await User.findById(job.runnerId);
    if (!runner) {
      return res.status(404).json({ message: 'Runner user not found. Cannot process payment.' });
    }
    const requester = await User.findById(requesterId);
    if (!requester) {
      return res.status(404).json({ message: 'Requester user not found.' });
    }

    runner.walletBalance += job.fee;
    runner.gigsCompletedAsRunner += 1;
    requester.gigsPostedAsRequester += 1;
    job.status = 'completed';

    await job.save();
    await runner.save();
    await requester.save();

    // --- 🚀 SOCKET EMIT ---
    // Emits the final 'completed' job data to the room
    req.io!.to(jobId).emit('job_updated', job);
    // --- END EMIT ---

    console.log(`[Job ${jobId}] Confirmed! Paid ₹${job.fee} to runner ${runner.email}`);
    res.json(job); 

  } catch (error: any) {
    console.error('[POST /api/jobs/:id/confirm] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job by its ID (Must be LAST)
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      // Corrected the 4404 typo to 404
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const isRequester = job.requesterId.toString() === req.user!.userId;
    const isRunner = job.runnerId?.toString() === req.user!.userId;

    if (!isRequester && !isRunner) {
      if (job.status !== 'pending') {
         return res.status(403).json({ message: 'Not authorized to view this job' });
      }
    }

    res.json(job);
  } catch (error: any) {
    console.error('[GET /api/jobs/:id] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
/**
 * @route   POST /api/jobs/:id/report
 * @desc    NEW ROUTE: Report a runner (Requester)
 * @access  Private
 */
router.post('/:id/report', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const jobId = req.params.id;
    const requesterId = req.user!.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.requesterId.toString() !== requesterId) {
      return res.status(403).json({ message: 'You are not the requester for this job' });
    }

    const runner = await User.findById(job.runnerId);
    if (!runner) {
      return res.status(404).json({ message: 'Runner user not found.' });
    }

    runner.reportCount += 1;
    if (runner.reportCount > 2) {
      runner.isBanned = true;
      console.log(`[Report] User ${runner.email} has been BANNED.`);
    }

    await runner.save();

    // --- 🚀 SOCKET EMIT ---
    // You can let the runner know they've been reported (or just the requester)
    // Emitting the updated runner status to the room.
    req.io!.to(jobId).emit('runner_reported', { 
      reportCount: runner.reportCount, 
      isBanned: runner.isBanned 
    });
    // --- END EMIT ---

    console.log(`[Report] Runner ${runner.email} reported for job ${jobId}. Reason: ${reason}`);
    res.json({ success: true, message: 'Report submitted', runnerStatus: {
      reportCount: runner.reportCount,
      isBanned: runner.isBanned
    }});

  } catch (error: any) {
    console.error('[POST /api/jobs/:id/report] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;