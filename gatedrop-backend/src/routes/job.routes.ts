import mongoose from 'mongoose';
import { Router } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import Job from '../models/Job.model';
import User from '../models/User.model';

const router = Router();

/**
 * @route   POST /api/jobs
 * @desc    Create a new job post (Status is now 'pending_bids')
 * @access  Private
 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      pickupLocation,
      dropLocation,
      title,
      description,
      fee,
      paymentId,
      jobDeadline
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
      title,
      description,
      fee,
      paymentId,
      jobDeadline,
      paymentStatus: 'successful',
      status: 'pending_bids', // <-- UPDATED status
      requesterDetailsCache: {
        name: requester.name,
        phone: requester.phone,
      }
    });

    await newJob.save();

    // Sabko batao naya job aaya hai
    req.io!.emit('new_job_available', newJob);

    res.status(201).json(newJob);

  } catch (error: any) {
    console.error('[POST /api/jobs] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- UPDATED GET ROUTES ---

/**
 * @route   GET /api/jobs/available
 * @desc    Get all available jobs (Now 'pending_bids')
 * @access  Private
 */
router.get('/available', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const availableJobs = await Job.find({
      status: 'pending_bids', // <-- UPDATED status
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

// --- NEW BIDDING & RATING ROUTES ---

/**
 * @route   POST /api/jobs/:id/apply
 * @desc    Runner applies for a job
 * @access  Private (Runner)
 */
router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const runnerId = req.user!.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.status !== 'pending_bids') {
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }
    if (job.requesterId.toString() === runnerId) {
      return res.status(400).json({ message: 'You cannot apply to your own job' });
    }
    if (job.applicants.includes(new mongoose.Types.ObjectId(runnerId))) {
      return res.status(400).json({ message: 'You have already applied' });
    }

    // Add runner to applicants list
    job.applicants.push(new mongoose.Types.ObjectId(runnerId));
    await job.save();

    // Get applicant data to send to Requester
    const runner = await User.findById(runnerId).select('name reportCount totalRatingStars totalRatingCount');

    // Send update to Requester (room = jobId)
    req.io!.to(jobId).emit('new_applicant', runner);

    res.json({ message: 'Application successful' });

  } catch (error: any) {
    console.error('[POST /apply] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/choose-runner
 * @desc    Requester chooses a runner from applicants
 * @access  Private (Requester)
 */
router.post('/:id/choose-runner', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const requesterId = req.user!.userId;
    const { runnerId } = req.body; // Requester sends the ID of the runner they chose

    if (!runnerId) {
      return res.status(400).json({ message: 'Runner ID is required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.requesterId.toString() !== requesterId) {
      return res.status(403).json({ message: 'You are not authorized to manage this job' });
    }
    if (job.status !== 'pending_bids') {
      return res.status(400).json({ message: 'Job is not pending bids' });
    }

    // Check if the chosen runner actually applied
    const hasApplied = job.applicants.some(appId => appId.toString() === runnerId);
    if (!hasApplied) {
      return res.status(400).json({ message: 'This runner did not apply for the job' });
    }

    const runner = await User.findById(runnerId).select('name phone');
    if (!runner) {
      return res.status(404).json({ message: 'Chosen runner not found' });
    }

    // Assign job
    job.runnerId = new mongoose.Types.ObjectId(runnerId);
    job.status = 'accepted';
    job.runnerDetailsCache = {
      name: runner.name,
      phone: runner.phone
    };
    job.applicants = []; // Clear applicants list

    await job.save();

    // Tell everyone this job is now 'accepted'
    req.io!.to(jobId).emit('job_updated', job);
    // Tell the public feed this job is gone
    req.io!.emit('job_taken', { _id: jobId });

    res.json(job);

  } catch (error: any) {
    console.error('[POST /choose-runner] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/rate
 * @desc    Requester rates the runner after job completion
 * @access  Private (Requester)
 */
router.post('/:id/rate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const requesterId = req.user!.userId;
    const { rating } = req.body; // Rating (1-5)

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.requesterId.toString() !== requesterId) {
      return res.status(403).json({ message: 'You are not the requester of this job' });
    }
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Job must be completed to be rated' });
    }
    if (job.ratingGiven) {
      return res.status(400).json({ message: 'You have already rated this job' });
    }
    if (!job.runnerId) {
      return res.status(400).json({ message: 'Cannot rate, job has no runner.' });
    }

    const runner = await User.findById(job.runnerId);
    if (!runner) {
      return res.status(404).json({ message: 'Runner not found' });
    }

    // Update runner's rating
    runner.totalRatingStars += rating;
    runner.totalRatingCount += 1;
    await runner.save();

    // Mark job as rated
    job.ratingGiven = true;
    await job.save();

    res.json({ message: 'Thank you for your feedback!' });

  } catch (error: any) {
    console.error('[POST /rate] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/cancel-bid
 * @desc    Runner cancels their application
 * @access  Private (Runner)
 */
router.post('/:id/cancel-bid', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const runnerId = req.user!.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.status !== 'pending_bids') {
      return res.status(400).json({ message: 'Cannot cancel bid, job is no longer pending' });
    }

    // Remove runner from applicants list
    job.applicants = job.applicants.filter(appId => appId.toString() !== runnerId);
    await job.save();

    // Tell Requester this applicant is gone
    req.io!.to(jobId).emit('applicant_removed', { runnerId });

    res.json({ message: 'Application cancelled' });

  } catch (error: any) {
    console.error('[POST /cancel-bid] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/cancel-delivery
 * @desc    Runner cancels an accepted delivery
 * @access  Private (Runner)
 */
router.post('/:id/cancel-delivery', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const runnerId = req.user!.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.runnerId?.toString() !== runnerId) {
      return res.status(403).json({ message: 'You are not the runner for this job' });
    }
    if (job.status !== 'accepted' && job.status !== 'picked_up') {
      return res.status(400).json({ message: 'Job is not in a cancellable state' });
    }

    // Set job as cancelled
    job.status = 'cancelled';

    // (Optional: Add strike to runner logic here)
    // (Optional: Refund Requester logic here, or reset job to 'pending_bids')

    await job.save();

    // Tell Requester the job was cancelled
    req.io!.to(jobId).emit('job_updated', job);

    res.json({ message: 'Delivery cancelled' });

  } catch (error: any) {
    console.error('[POST /cancel-delivery] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// --- EXISTING ROUTES (No changes needed) ---

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status (Runner: picked_up, delivered)
 * @access  Private
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
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

    req.io!.to(jobId).emit('job_updated', job);

    res.json(job);

  } catch (error: any) {
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

    if (!job.runnerId) {
      return res.status(400).json({ message: 'Cannot confirm job: Runner ID is missing.' });
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

    req.io!.to(jobId).emit('job_updated', job);
    req.io!.emit('user_balance_updated', {
      userId: runner._id.toString(),
      newBalance: runner.walletBalance
    });

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
      return res.status(404).json({ message: 'Job not found' });
    }

    // With the new bidding system, we need to populate applicants
    if (job.status === 'pending_bids') {
      await job.populate({
        path: 'applicants',
        select: 'name reportCount totalRatingStars totalRatingCount' // Sirf yeh data bhejo
      });
    }

    const isRequester = job.requesterId.toString() === req.user!.userId;
    const isRunner = job.runnerId?.toString() === req.user!.userId;
    const isApplicant = job.applicants.some(app => (app as any)._id.toString() === req.user!.userId);

    if (!isRequester && !isRunner && !isApplicant) {
      return res.status(403).json({ message: 'Not authorized to view this job' });
    }

    res.json(job);
  } catch (error: any) {
    console.error('[GET /api/jobs/:id] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jobs/:id/report
 * @desc    Report a runner (Requester)
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

    if (!job.runnerId) {
      return res.status(400).json({ message: 'Cannot report: Runner ID is missing.' });
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

    req.io!.to(jobId).emit('runner_reported', {
      reportCount: runner.reportCount,
      isBanned: runner.isBanned
    });

    console.log(`[Report] Runner ${runner.email} reported for job ${jobId}. Reason: ${reason}`);
    res.json({
      success: true, message: 'Report submitted', runnerStatus: {
        reportCount: runner.reportCount,
        isBanned: runner.isBanned
      }
    });

  } catch (error: any) {
    console.error('[POST /api/jobs/:id/report] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;