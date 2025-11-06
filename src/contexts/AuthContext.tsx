import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  collegeId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null); 

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (token) {
      // --- YEH HAI FIX ---
      const newSocket = io(import.meta.env.VITE_API_URL);
      
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

  const login = async (email: string, password: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const signup = async (signupData: SignupData) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    
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

  const refreshUser = async () => {
    if (!token) return;
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }
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