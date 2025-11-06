// API Service Layer
// All API calls to your MongoDB backend should go through this file

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, token } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  
  return response.json();
}

// Auth APIs
export const authApi = {
  login: (email: string, password: string) =>
    apiCall('/api/auth/login', { method: 'POST', body: { email, password } }),
  
  signup: (data: any) =>
    apiCall('/api/auth/signup', { method: 'POST', body: data }),
  
  getMe: (token: string) =>
    apiCall('/api/auth/me', { token }),
};

// Job APIs
export const jobApi = {
  // Get all available jobs (status: pending, paymentStatus: successful)
  getAvailableJobs: (token: string) =>
    apiCall('/api/jobs/available', { token }),
  
  // Get jobs posted by current user (as Requester)
  getMyPostedJobs: (token: string) =>
    apiCall('/api/jobs/my-posted', { token }),
  
  // Get jobs accepted by current user (as Runner)
  getMyRunnerJobs: (token: string) =>
    apiCall('/api/jobs/my-runner', { token }),
  
  // Get job history (status: completed or cancelled)
  getJobHistory: (token: string) =>
    apiCall('/api/jobs/history', { token }),
  
  // Get single job details
  getJobById: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}`, { token }),
  
  // Create new job
  createJob: (jobData: any, token: string) =>
    apiCall('/api/jobs', { method: 'POST', body: jobData, token }),
  
  // Accept job as Runner
  acceptJob: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/accept`, { method: 'POST', token }),
  
  // Update job status
  updateJobStatus: (jobId: string, status: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/status`, { method: 'PATCH', body: { status }, token }),
  
  // Confirm delivery (Requester action - completes job and pays runner)
  confirmDelivery: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/confirm`, { method: 'POST', token }),
  
  // Report runner
  reportRunner: (jobId: string, reason: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/report`, { method: 'POST', body: { reason }, token }),
};

// Payment APIs
export const paymentApi = {
  // Create payment order
  createPaymentOrder: (amount: number, token: string) =>
    apiCall('/api/payment/create-order', { method: 'POST', body: { amount }, token }),
  
  // Verify payment
  verifyPayment: (paymentData: any, token: string) =>
    apiCall('/api/payment/verify', { method: 'POST', body: paymentData, token }),
};

// Wallet APIs
export const walletApi = {
  // Get wallet balance
  getBalance: (token: string) =>
    apiCall('/api/wallet/balance', { token }),
  
  // Request cashout
  requestCashout: (amount: number, token: string) =>
    apiCall('/api/wallet/cashout', { method: 'POST', body: { amount }, token }),
};

// User APIs
export const userApi = {
  // Update profile
  updateProfile: (data: any, token: string) =>
    apiCall('/api/user/profile', { method: 'PATCH', body: data, token }),
  
  // Upload profile image
  uploadProfileImage: (formData: FormData, token: string) => {
    return fetch(`${API_URL}/api/user/profile-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(res => res.json());
  },
};
