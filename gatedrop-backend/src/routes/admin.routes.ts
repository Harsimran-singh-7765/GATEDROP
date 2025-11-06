import { Router, Request, Response, NextFunction } from 'express';
import Job from '../models/Job.model';

const router = Router();

// This is a simple middleware to protect our admin route
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.header('x-admin-secret');

  if (!process.env.ADMIN_SECRET_KEY) {
    return res.status(500).json({ message: 'Admin secret is not configured' });
  }

  if (secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid or missing admin secret' });
  }
  
  // If secret is correct, continue
  next();
};

/**
 * @route   DELETE /api/admin/clear-all-jobs
 * @desc    Deletes ALL jobs (current and history) from the database
 * @access  Private (Admin Only)
 */
router.delete('/clear-all-jobs', adminAuth, async (req: Request, res: Response) => {
  try {
    // This command deletes every single document in the 'jobs' collection
    const result = await Job.deleteMany({});

    console.log(`[ADMIN] All job records cleared. Count: ${result.deletedCount}`);
    
    res.status(200).json({
      message: 'Successfully deleted all job records.',
      deletedCount: result.deletedCount,
    });

  } catch (error: any) {
    console.error('[ADMIN /clear-all-jobs] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;