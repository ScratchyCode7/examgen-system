import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      const { accessToken } = response;
      
      // Decode JWT to get user info (basic decode, no verification)
      const tokenParts = accessToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Backend JWT includes: sub (userId), unique_name (username), email, isAdmin (as string)
      const userData = {
        userId: payload.sub,
        username: payload.unique_name || credentials.username,
        email: payload.email || credentials.username,
        firstName: '', // Will need to fetch from API if needed
        lastName: '',  // Will need to fetch from API if needed
        isAdmin: payload.isAdmin === 'true' || payload.isAdmin === true,
      };
      
      // Try to fetch full user details if userId is available
      if (userData.userId) {
        try {
          const fullUser = await apiService.getUser(userData.userId);
          userData.firstName = fullUser.firstName || '';
          userData.lastName = fullUser.lastName || '';
        } catch (err) {
          console.warn('Could not fetch user details:', err);
          // Continue with basic user data from token
        }
      }
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin: user?.isAdmin || false,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
