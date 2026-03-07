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
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Parse department IDs from JWT claims (can be multiple)
      let departmentIds = [];
      if (payload.departmentId) {
        // Single claim (string or number)
        if (Array.isArray(payload.departmentId)) {
          departmentIds = payload.departmentId.map(id => parseInt(id, 10));
        } else {
          departmentIds = [parseInt(payload.departmentId, 10)];
        }
      }
      
      // Backend JWT includes: sub (userId), unique_name (username), email, isAdmin (as string), departmentId (array)
      const userData = {
        userId: payload.sub,
        username: payload.unique_name || credentials.username,
        email: payload.email || credentials.username,
        firstName: '', // Will need to fetch from API if needed
        lastName: '',  // Will need to fetch from API if needed
        isAdmin: payload.isAdmin === 'true' || payload.isAdmin === true,
        departmentIds: departmentIds,
        departmentId: departmentIds[0] || null, // Legacy: keep first department for backward compatibility
      };
      
      // Try to fetch full user details if userId is available
      if (userData.userId) {
        try {
          const fullUser = await apiService.getUser(userData.userId);
          userData.firstName = fullUser.firstName || '';
          userData.lastName = fullUser.lastName || '';
          userData.departmentIds = fullUser.departmentIds || userData.departmentIds;
          userData.departmentId = fullUser.departmentId || userData.departmentIds[0] || null;
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeDepartmentId');
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasAccessToDepartment = (departmentId) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.departmentIds?.includes(parseInt(departmentId, 10)) || false;
  };

  const hasAccessToDepartmentCode = async (departmentCode) => {
    if (!user || !departmentCode) return false;
    if (user.isAdmin) return true;
    
    try {
      // Fetch department by code to get its ID
      const dept = await apiService.getDepartmentByCode(departmentCode);
      return hasAccessToDepartment(dept.id);
    } catch (error) {
      console.error('Error checking department access:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin: user?.isAdmin || false,
    allowedDepartments: user?.departmentIds || [],
    hasAccessToDepartment,
    hasAccessToDepartmentCode,
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
