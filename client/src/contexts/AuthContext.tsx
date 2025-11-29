import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiService } from '../services/api';
import type { LoginRequest, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally validate token by fetching user info
      // For now, we'll just check if token exists
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiService.login(credentials);
      // Handle both camelCase and PascalCase response
      const token = response.accessToken || (response as any).AccessToken;
      if (!token) {
        throw new Error('No token received from server');
      }
      localStorage.setItem('token', token);
      // Optionally fetch user info here
      setUser({ isAdmin: false } as User); // Placeholder - should fetch actual user
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!localStorage.getItem('token'),
    isAdmin: user?.isAdmin ?? false,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

