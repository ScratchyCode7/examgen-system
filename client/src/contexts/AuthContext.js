import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inactivityTimerRef = useRef(null);
  const { showToast } = useToast();

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
        profileImagePath: null,
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
          userData.profileImagePath = fullUser.profileImagePath || null;
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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeDepartmentId');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const nextUser = {
        ...previousUser,
        ...updates,
      };

      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const scheduleInactivityLogout = useCallback(() => {
    if (!isAuthenticated) return;
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      showToast({
        message: 'You were signed out after 10 minutes of inactivity. Please log in again to continue.',
        type: 'info',
      });
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, isAuthenticated, logout, showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearInactivityTimer();
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, scheduleInactivityLogout));
      return undefined;
    }

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, scheduleInactivityLogout));
    scheduleInactivityLogout();

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, scheduleInactivityLogout));
      clearInactivityTimer();
    };
  }, [clearInactivityTimer, isAuthenticated, scheduleInactivityLogout]);

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
    updateCurrentUser,
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
