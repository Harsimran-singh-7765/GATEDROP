import { Router } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/payment/create-order
 * @desc    Creates a (placeholder) payment order
 * @access  Private
 */
router.post('/create-order', authMiddleware, async (req: AuthRequest, res) => {
  const { amount } = req.body;

  console.log(`[Payment] Received request to create order for: ₹${amount}`);

  // --- PENDING LOGIC ---
  // Here you would call Razorpay:
  // const instance = new Razorpay(...)
  // const order = await instance.orders.create({ amount: amount * 100, currency: "INR" })
  // res.json(order)
  // --- END PENDING ---

  // For now, send back a fake order
  res.json({
    id: `fake_order_${Date.now()}`,
    amount: amount * 100, // Razorpay works in paise
    currency: 'INR',
    message: 'This is a placeholder payment order. No real payment was created.',
  });
});

/**
 * @route   POST /api/payment/verify
 * @desc    Verifies a (placeholder) payment
 * @access  Private
 */
router.post('/verify', authMiddleware, async (req: AuthRequest, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  console.log(`[Payment] Received payment verification for: ${razorpay_payment_id}`);

  // --- PENDING LOGIC ---
  // Here you would verify the Razorpay signature:
  // const body = razorpay_order_id + "|" + razorpay_payment_id;
  // const expectedSignature = crypto.createHmac(...)
  // if (expectedSignature === razorpay_signature) { ... }
  // --- END PENDING ---

  // For now, just pretend it's successful
  res.json({
    success: true,
    paymentId: razorpay_payment_id || `fake_pay_id_${Date.now()}`,
    message: 'This is a placeholder verification. Payment accepted.',
  });
});

export default router;