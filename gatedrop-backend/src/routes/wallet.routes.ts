import { Router } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User.model';
import mongoose from 'mongoose';

const router = Router();
const MIN_CASHOUT_AMOUNT = 100; // Minimum cashout amount, jaise ki aapne pehle discuss kiya tha

/**
 * @route   POST /api/wallet/cashout
 * @desc    Requests a cashout/payout from the user's wallet balance
 * @access  Private
 */
router.post('/cashout', authMiddleware, async (req: AuthRequest, res) => {
  // Transaction aur locking boht zaroori hai paise deduct karte samay!
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user!.userId;
    const { amount } = req.body;
    const cashoutAmount = parseFloat(amount);

    if (isNaN(cashoutAmount) || cashoutAmount <= 0) {
      throw new Error('Invalid cashout amount.');
    }
    if (cashoutAmount < MIN_CASHOUT_AMOUNT) {
      throw new Error(`Minimum cashout amount is ₹${MIN_CASHOUT_AMOUNT}.`);
    }

    // 1. User ko lock karke find karo
    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new Error('User not found.');
    }

    // 2. Balance check karo
    if (user.walletBalance < cashoutAmount) {
      throw new Error(`Insufficient balance. Current balance: ₹${user.walletBalance.toFixed(2)}.`);
    }

    // --- CRITICAL DEDUCTION ---
    // 3. Balance deduct karo
    user.walletBalance -= cashoutAmount;
    
    // NOTE: Real-world mein, hum yahan Razorpay/Payment Gateway ko call karte.
    // Uske baad hi user.walletBalance deduct karte.

    await user.save({ session });
    await session.commitTransaction();

    console.log(`[Wallet] User ${user.email} cashed out ₹${cashoutAmount.toFixed(2)}. New balance: ₹${user.walletBalance.toFixed(2)}`);

    res.status(200).json({
      message: 'Cashout request submitted. Amount deducted and payment will be processed soon.',
      newBalance: user.walletBalance.toFixed(2),
    });

  } catch (error: any) {
    await session.abortTransaction(); // Agar koi error ho toh changes revert karo
    console.error('[Cashout Error]:', error);
    res.status(400).json({ message: error.message || 'Cashout processing failed.' });
  } finally {
    session.endSession();
  }
});

export default router;