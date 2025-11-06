# Gatedrop Frontend Documentation

## Overview
This is the complete frontend application for **Gatedrop** - a P2P college delivery platform. The frontend is built with React, TypeScript, Tailwind CSS, and shadcn/ui components.

---

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000
```

Replace `http://localhost:5000` with your MongoDB backend API URL.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx    # Main dashboard wrapper with navigation
│   ├── ui/                        # shadcn/ui components
│   └── ProtectedRoute.tsx         # Route guard for authentication
├── contexts/
│   └── AuthContext.tsx            # Authentication state management
├── lib/
│   ├── api.ts                     # All API calls to backend
│   └── utils.ts                   # Utility functions
├── pages/
│   ├── Landing.tsx                # Public landing page
│   ├── Login.tsx                  # Login page
│   ├── Signup.tsx                 # Registration page
│   ├── Jobs.tsx                   # Available jobs (Jobs tab)
│   ├── CurrentJobs.tsx            # Jobs posted by user (as Requester)
│   ├── MyRunnerJobs.tsx           # Jobs accepted by user (as Runner)
│   ├── PostJob.tsx                # Create new delivery job
│   ├── OrderDetailsRequester.tsx  # Job details for Requester
│   ├── OrderDetailsRunner.tsx     # Job details for Runner
│   ├── History.tsx                # Completed jobs history
│   ├── Profile.tsx                # User profile & wallet
│   └── NotFound.tsx               # 404 page
├── App.tsx                        # Route configuration
├── index.css                      # Design system & Tailwind styles
└── main.tsx                       # App entry point
```

---

## 🔐 Authentication Flow

### How It Works
1. User logs in via `/login` or signs up via `/signup`
2. Backend returns a JWT token and user data
3. Token is stored in `localStorage` and React Context
4. All API calls include `Authorization: Bearer <token>` header
5. Protected routes check for valid token

### Files Involved
- **`src/contexts/AuthContext.tsx`** - Manages auth state
- **`src/components/ProtectedRoute.tsx`** - Guards protected routes
- **`src/pages/Login.tsx` & `src/pages/Signup.tsx`** - Auth pages

### API Integration Required
Your backend must implement these endpoints:

```typescript
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: User }

POST /api/auth/signup
Body: { name, email, phone, password, collegeId? }
Response: { token: string, user: User }

GET /api/auth/me
Headers: { Authorization: "Bearer <token>" }
Response: User (updated user data)
```

---

## 🛠 API Integration Guide

### API Service Layer
All API calls are centralized in **`src/lib/api.ts`**. This file contains:

#### Authentication APIs
```typescript
authApi.login(email, password)
authApi.signup(data)
authApi.getMe(token)
```

#### Job APIs
```typescript
jobApi.getAvailableJobs(token)        // GET /api/jobs/available
jobApi.getMyPostedJobs(token)         // GET /api/jobs/my-posted
jobApi.getMyRunnerJobs(token)         // GET /api/jobs/my-runner
jobApi.getJobHistory(token)           // GET /api/jobs/history
jobApi.getJobById(jobId, token)       // GET /api/jobs/:id
jobApi.createJob(jobData, token)      // POST /api/jobs
jobApi.acceptJob(jobId, token)        // POST /api/jobs/:id/accept
jobApi.updateJobStatus(jobId, status, token) // PATCH /api/jobs/:id/status
jobApi.confirmDelivery(jobId, token)  // POST /api/jobs/:id/confirm
jobApi.reportRunner(jobId, reason, token) // POST /api/jobs/:id/report
```

#### Payment APIs
```typescript
paymentApi.createPaymentOrder(amount, token)    // POST /api/payment/create-order
paymentApi.verifyPayment(paymentData, token)    // POST /api/payment/verify
```

#### Wallet APIs
```typescript
walletApi.getBalance(token)               // GET /api/wallet/balance
walletApi.requestCashout(amount, token)   // POST /api/wallet/cashout
```

#### User APIs
```typescript
userApi.updateProfile(data, token)                  // PATCH /api/user/profile
userApi.uploadProfileImage(formData, token)         // POST /api/user/profile-image
```

---

## 📊 Job Status Flow

The job lifecycle follows this state machine:

```
pending → accepted → picked_up → delivered_by_runner → completed
```

### Status Definitions

| Status | Description | Visible In | Actions Available |
|--------|-------------|------------|-------------------|
| `pending` | Job posted, payment successful, waiting for runner | Jobs tab | Accept Job (Runner) |
| `accepted` | Runner assigned | Current Jobs (Requester), My Runner Jobs (Runner) | Mark Picked Up (Runner) |
| `picked_up` | Runner has picked up item | Both | Mark Delivered (Runner) |
| `delivered_by_runner` | Runner marked as delivered, waiting for confirmation | Both | Confirm Delivery (Requester), Report Runner (Requester) |
| `completed` | Requester confirmed delivery, payment released | History | None (final state) |

### Backend Requirements
Your backend must:
1. **Filter jobs by status** for different tabs
2. **Validate status transitions** (e.g., can't go from `pending` to `picked_up`)
3. **Handle payment release** when status changes to `completed`
4. **Update wallet balances** automatically
5. **Increment `gigsCompletedAsRunner`** for runner when job completes
6. **Cache requester/runner details** in job document

---

## 💳 Payment Integration

### Current Implementation
The frontend includes a **placeholder** for payment integration in `src/pages/PostJob.tsx`.

### How to Integrate Razorpay/Stripe

#### 1. Install Payment SDK
```bash
npm install razorpay  # or stripe
```

#### 2. Update `PostJob.tsx`
Replace the dummy payment logic:

```typescript
// After creating payment order
const paymentOrder = await paymentApi.createPaymentOrder(fee, token!);

// Initialize Razorpay
const options = {
  key: 'YOUR_RAZORPAY_KEY',
  amount: paymentOrder.amount,
  currency: 'INR',
  order_id: paymentOrder.orderId,
  handler: async (response: any) => {
    // Verify payment on backend
    const verification = await paymentApi.verifyPayment({
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    }, token!);
    
    // Create job with verified payment ID
    await jobApi.createJob({
      ...formData,
      fee,
      paymentId: response.razorpay_payment_id,
    }, token!);
  },
};

const razorpay = new window.Razorpay(options);
razorpay.open();
```

#### 3. Backend Requirements
```typescript
POST /api/payment/create-order
Body: { amount: number }
Response: { orderId: string, amount: number }

POST /api/payment/verify
Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
Response: { success: boolean, paymentId: string }
```

---

## 🚨 Report & Ban System

### How It Works
1. Requester can report a runner from the job details page
2. Backend increments `reportCount` in User collection
3. If `reportCount > 2`, set `isBanned = true`
4. Banned users cannot accept new jobs (checked on frontend and backend)

### Files Involved
- **`src/pages/OrderDetailsRequester.tsx`** - Report UI
- **`src/pages/Jobs.tsx`** - Ban check before accepting jobs
- **`src/pages/Profile.tsx`** - Shows report count & ban status

### Backend Requirements
```typescript
POST /api/jobs/:id/report
Body: { reason: string }
Response: { success: boolean }

// On report submission:
1. Increment runner's reportCount
2. If reportCount > 2, set isBanned = true
3. Return updated user data
```

---

## 💰 Wallet System

### How It Works
1. When job is created, Requester pays via Razorpay/Stripe
2. Money is held by platform (not in wallet yet)
3. When Requester confirms delivery (`status: completed`):
   - Backend adds `job.fee` to Runner's `walletBalance`
   - Updates `gigsCompletedAsRunner` counter
4. Runner can request cashout (minimum ₹100)

### Backend Requirements
```typescript
// On job completion (status → completed)
1. Find runner user by runnerId
2. Increment: user.walletBalance += job.fee
3. Increment: user.gigsCompletedAsRunner += 1
4. Update requester: user.gigsPostedAsRequester += 1

POST /api/wallet/cashout
Body: { amount: number }
Response: { success: boolean, newBalance: number }

// Cashout logic:
1. Verify amount <= user.walletBalance
2. Verify amount >= 100 (minimum)
3. Deduct from wallet
4. Process payout via bank transfer/UPI
```

---

## 🎨 Design System

The app uses a **semantic token system** defined in `src/index.css`:

### Color Tokens
- `--primary`: Green (#22c55e) - Brand color
- `--secondary`: Light gray - Subtle elements
- `--accent`: Same as primary - Call-to-action
- `--destructive`: Red - Errors & warnings
- `--muted`: Light gray - Backgrounds

### Usage in Components
Always use semantic tokens, never hardcode colors:

```tsx
// ✅ Correct
<div className="bg-primary text-primary-foreground">
<Badge className="text-primary">

// ❌ Wrong
<div className="bg-green-500 text-white">
```

### Customization
Edit `src/index.css` to change colors:

```css
:root {
  --primary: 142 76% 36%;  /* HSL format */
  --primary-foreground: 0 0% 100%;
}
```

---

## 📱 Pages Breakdown

### 1. Landing Page (`/`)
- **Purpose**: Public marketing page
- **Features**: Hero section, how it works, CTA buttons
- **Redirects to**: `/login` if not authenticated

### 2. Login (`/login`)
- **Purpose**: User authentication
- **API Call**: `authApi.login(email, password)`
- **On Success**: Redirects to `/jobs`

### 3. Signup (`/signup`)
- **Purpose**: User registration
- **Fields**: name, email, phone, password, collegeId (optional)
- **API Call**: `authApi.signup(data)`
- **On Success**: Redirects to `/jobs`

### 4. Jobs Tab (`/jobs`)
- **Purpose**: Show all available jobs (status: pending, paymentStatus: successful)
- **Who Sees**: All authenticated users
- **Actions**: Accept job (changes status to accepted, sets runnerId)
- **Ban Check**: Banned users cannot accept jobs

### 5. Current Jobs (`/current-jobs`)
- **Purpose**: Show jobs posted by current user (as Requester)
- **Filter**: `requesterId === currentUser.id`
- **Shows**: Job status, runner details (if accepted)
- **Actions**: View details → `/order/:id/requester`

### 6. My Runner Jobs (`/my-runner-jobs`)
- **Purpose**: Show jobs accepted by current user (as Runner)
- **Filter**: `runnerId === currentUser.id`
- **Shows**: Job status, requester details, earnings
- **Actions**: View details → `/order/:id/runner`

### 7. Post Job (`/post-job`)
- **Purpose**: Create new delivery job
- **Flow**:
  1. User fills form
  2. Frontend initiates payment (Razorpay/Stripe)
  3. On payment success, create job with `paymentId`
  4. Backend sets `paymentStatus: successful` after verification
- **Minimum Fee**: ₹30

### 8. Order Details - Requester View (`/order/:id/requester`)
- **Purpose**: Manage job from Requester perspective
- **Shows**: Job details, runner contact info, status
- **Actions**:
  - **Confirm Delivery** (if status: delivered_by_runner) → completes job, pays runner
  - **Report Runner** → increments reportCount

### 9. Order Details - Runner View (`/order/:id/runner`)
- **Purpose**: Manage job from Runner perspective
- **Shows**: Job details, requester contact info, earnings
- **Actions**:
  - **Mark Picked Up** (if status: accepted) → status: picked_up
  - **Mark Delivered** (if status: picked_up) → status: delivered_by_runner
  - Wait for Requester confirmation → status: completed

### 10. History (`/history`)
- **Purpose**: Show completed/cancelled jobs
- **Tabs**: As Requester, As Runner
- **Filter**: `status === 'completed' OR status === 'cancelled'`

### 11. Profile (`/profile`)
- **Purpose**: User profile, wallet, stats
- **Shows**:
  - Wallet balance
  - Jobs posted count
  - Deliveries completed count
  - Report count
  - Ban status
- **Actions**: Request cashout (if balance >= ₹100)

---

## 🔒 Security Considerations

### Frontend Security
1. **Never store sensitive data** in localStorage (passwords, full payment info)
2. **Token expiration**: Implement token refresh or re-login
3. **Input validation**: Validate all forms before API calls
4. **XSS protection**: React handles this by default, but be careful with `dangerouslySetInnerHTML`

### Backend Security (Your Responsibility)
1. **Hash passwords** with bcrypt (never store plaintext)
2. **Validate JWT tokens** on every protected route
3. **Rate limiting** to prevent spam/abuse
4. **Payment verification** must happen server-side
5. **Ban check** must be enforced on backend, not just frontend

---

## 🧪 Testing Your Backend Integration

### Step-by-Step Testing

1. **Test Authentication**
   ```bash
   # Signup
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@test.com","phone":"9876543210","password":"test123"}'
   
   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test123"}'
   ```

2. **Test Job Creation**
   ```bash
   curl -X POST http://localhost:5000/api/jobs \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "pickupLocation":"Gate 2",
       "dropLocation":"H4 Room 101",
       "itemDescription":"Blue Charger",
       "fee":50,
       "paymentId":"pay_test123"
     }'
   ```

3. **Test Job Acceptance**
   ```bash
   curl -X POST http://localhost:5000/api/jobs/JOB_ID/accept \
     -H "Authorization: Bearer RUNNER_TOKEN"
   ```

4. **Test Status Updates**
   ```bash
   curl -X PATCH http://localhost:5000/api/jobs/JOB_ID/status \
     -H "Authorization: Bearer RUNNER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status":"picked_up"}'
   ```

---

## 🚀 Deployment

### Frontend Deployment
1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to:
   - **Vercel** (recommended for Vite apps)
   - **Netlify**
   - **AWS S3 + CloudFront**

3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend-api.com
   ```

### Backend Requirements
Your MongoDB backend must be deployed with:
- Public HTTPS endpoint
- CORS enabled for your frontend domain
- Environment variables for:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `RAZORPAY_KEY_ID` / `STRIPE_SECRET_KEY`

---

## 📞 Support & Troubleshooting

### Common Issues

#### 1. "API call failed" errors
- Check `VITE_API_URL` in `.env`
- Verify backend is running
- Check network tab in browser DevTools

#### 2. "Unauthorized" errors
- Token might be expired
- Check `Authorization` header format: `Bearer <token>`
- Verify JWT secret matches between frontend/backend

#### 3. Jobs not showing up
- Check MongoDB query filters in backend
- Verify `paymentStatus === 'successful'`
- Check user authentication

#### 4. Wallet not updating
- Verify backend triggers wallet update on job completion
- Check MongoDB transaction logs
- Test `jobApi.confirmDelivery()` manually

### Debug Mode
Add this to `src/lib/api.ts` for detailed logs:

```typescript
async function apiCall(endpoint: string, options: ApiOptions = {}) {
  console.log('API Call:', endpoint, options);
  const response = await fetch(...)
  console.log('API Response:', await response.clone().json());
  return response.json();
}
```

---

## 📋 Backend Checklist

Use this to verify your MongoDB backend is ready:

### User Collection
- [ ] Password hashing (bcrypt)
- [ ] JWT token generation on login/signup
- [ ] `/api/auth/login` endpoint
- [ ] `/api/auth/signup` endpoint
- [ ] `/api/auth/me` endpoint (with JWT verification)

### Job Collection
- [ ] Create job endpoint with payment verification
- [ ] Filter available jobs (status: pending, paymentStatus: successful)
- [ ] Filter jobs by requesterId for Current Jobs
- [ ] Filter jobs by runnerId for My Runner Jobs
- [ ] Accept job endpoint (set runnerId, change status)
- [ ] Update job status endpoint with validation
- [ ] Confirm delivery endpoint (trigger wallet update)
- [ ] Report runner endpoint (increment reportCount)
- [ ] Cache requester/runner details on job acceptance

### Wallet & Payments
- [ ] Payment order creation (Razorpay/Stripe)
- [ ] Payment verification webhook/endpoint
- [ ] Wallet balance update on job completion
- [ ] Cashout request endpoint
- [ ] Ban check (reportCount > 2 → isBanned = true)
- [ ] Prevent banned users from accepting jobs

### Middleware
- [ ] JWT authentication middleware
- [ ] Error handling middleware
- [ ] CORS configuration
- [ ] Rate limiting

---

## 🎯 Next Steps

1. **Set up your MongoDB backend** using the schemas provided
2. **Implement authentication endpoints** (login, signup)
3. **Create job CRUD endpoints** with status validation
4. **Integrate payment gateway** (Razorpay/Stripe)
5. **Test the complete flow** using the frontend
6. **Deploy both** frontend and backend

---

## 📝 API Contract Summary

Your backend must implement these exact endpoints for the frontend to work:

```
Authentication:
POST   /api/auth/login
POST   /api/auth/signup
GET    /api/auth/me

Jobs:
GET    /api/jobs/available
GET    /api/jobs/my-posted
GET    /api/jobs/my-runner
GET    /api/jobs/history
GET    /api/jobs/:id
POST   /api/jobs
POST   /api/jobs/:id/accept
PATCH  /api/jobs/:id/status
POST   /api/jobs/:id/confirm
POST   /api/jobs/:id/report

Payments:
POST   /api/payment/create-order
POST   /api/payment/verify

Wallet:
GET    /api/wallet/balance
POST   /api/wallet/cashout

User:
PATCH  /api/user/profile
POST   /api/user/profile-image
```

All protected endpoints require:
```
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
```

---

## 📄 License
This frontend is part of the Gatedrop project. Modify as needed for your use case.

---

**Happy coding! 🚀**
If you need help with backend integration, refer to your MongoDB/Mongoose documentation and this guide.
