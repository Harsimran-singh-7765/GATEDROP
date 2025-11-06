// API Service Layer
// All API calls to your MongoDB backend should go through this file

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

// Re-usable apiCall function
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
    // Try to parse error message, otherwise throw generic error
    try {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    } catch (e) {
      throw new Error(`API request failed with status ${response.status}`);
    }
  }

  // Handle 204 No Content (for DELETE) or other non-json responses
  if (response.status === 204) {
    return null;
  }

  // Try to parse JSON, if it fails, return a generic success
  try {
    return await response.json();
  } catch (e) {
    return { success: true, message: 'Operation successful' };
  }
}

// --- Authentication APIs ---
export const authApi = {
  login: (email: string, password: string) =>
    apiCall('/api/auth/login', { method: 'POST', body: { email, password } }),

  // For 2-Phase Signup
  requestOtp: (email: string) =>
    apiCall('/api/auth/request-otp', { method: 'POST', body: { email } }),

  signup: (data: any) =>
    apiCall('/api/auth/signup', { method: 'POST', body: data }),

  getMe: (token: string) =>
    apiCall('/api/auth/me', { token }),
};

// --- Job APIs (HEAVILY UPDATED) ---
export const jobApi = {
  getAvailableJobs: (token: string) =>
    apiCall('/api/jobs/available', { token }),

  getMyPostedJobs: (token: string) =>
    apiCall('/api/jobs/my-posted', { token }),

  getMyRunnerJobs: (token: string) =>
    apiCall('/api/jobs/my-runner', { token }),

  getJobHistory: (token: string) =>
    apiCall('/api/jobs/history', { token }),

  getJobById: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}`, { token }),

  createJob: (jobData: any, token: string) =>
    apiCall('/api/jobs', { method: 'POST', body: jobData, token }),

  // --- NEW BIDDING FLOW ---
  applyForJob: (jobId: string, token: string) => // Renamed from acceptJob
    apiCall(`/api/jobs/${jobId}/apply`, { method: 'POST', token }),

  chooseRunner: (jobId: string, runnerId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/choose-runner`, { method: 'POST', body: { runnerId }, token }),

  rateRunner: (jobId: string, rating: number, token: string) =>
    apiCall(`/api/jobs/${jobId}/rate`, { method: 'POST', body: { rating }, token }),

  // --- NEW CANCELLATION FLOW ---
  cancelBid: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/cancel-bid`, { method: 'POST', token }),

  cancelDelivery: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/cancel-delivery`, { method: 'POST', token }),
  // --- END NEW ROUTES ---

  updateJobStatus: (jobId: string, status: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/status`, { method: 'PATCH', body: { status }, token }),

  confirmDelivery: (jobId: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/confirm`, { method: 'POST', token }),

  reportRunner: (jobId: string, reason: string, token: string) =>
    apiCall(`/api/jobs/${jobId}/report`, { method: 'POST', body: { reason }, token }),
};

// --- Payment APIs ---
export const paymentApi = {
  createPaymentOrder: (amount: number, token: string) =>
    apiCall('/api/payment/create-order', { method: 'POST', body: { amount }, token }),

  verifyPayment: (paymentData: any, token: string) =>
    apiCall('/api/payment/verify', { method: 'POST', body: paymentData, token }),
};

// --- Wallet APIs ---
export const walletApi = {
  getBalance: (token: string) =>
    apiCall('/api/wallet/balance', { token }),

  requestCashout: (amount: number, token: string) =>
    apiCall('/api/wallet/cashout', { method: 'POST', body: { amount }, token }),
};

// --- User APIs ---
export const userApi = {
  updateProfile: (data: any, token: string) =>
    apiCall('/api/user/profile', { method: 'PATCH', body: data, token }),

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