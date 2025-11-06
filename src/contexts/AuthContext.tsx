import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { authApi } from '@/lib/api'; // <-- api.ts se import karein

// --- UPDATED USER INTERFACE ---
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  walletBalance: number;
  profileImageUrl: string;
  gigsCompletedAsRunner: number;
  gigsPostedAsRequester: number;
  reportCount: number;
  isBanned: boolean;

  // Naye fields rating aur payout ke liye
  totalRatingStars: number;
  totalRatingCount: number;
  upiId?: string;
  bankAccount?: {
    accountNumber?: string;
    ifsc?: string;
    beneficiaryName?: string;
  };
}
// --- END UPDATE ---

interface AuthContextType {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// SignupData ko OTP ke saath update karein
interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  collegeId?: string;
  otp?: string; // OTP ab signup ka part hai
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 1. LocalStorage se Load karein
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    // 2. Cross-tab logout listener
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken' && event.newValue === null) {
        console.log("Auth token removed from other tab. Logging out.");
        setToken(null);
        setUser(null);
        if (socket) {
          socket.disconnect();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Socket connection effect
  useEffect(() => {
    if (token) {
      const newSocket = io(import.meta.env.VITE_API_URL || '');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to backend:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('[Socket] Disconnected from backend');
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [token]);

  // --- api.ts ko use karne ke liye UPDATED ---
  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password); // api.ts use karein
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  // --- api.ts ko use karne ke liye UPDATED ---
  const signup = async (signupData: SignupData) => {
    const data = await authApi.signup(signupData); // api.ts use karein
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSocket(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  // --- api.ts ko use karne ke liye UPDATED ---
  const refreshUser = async () => {
    if (!token) return;
    const userData = await authApi.getMe(token); // api.ts use karein
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, token, socket, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};