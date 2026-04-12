import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';

const PrintRequestNotificationContext = createContext(null);

const normalizeApiArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const PrintRequestNotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [pendingPrintRequestCount, setPendingPrintRequestCount] = useState(0);
  const [isLoadingPrintRequestNotifications, setIsLoadingPrintRequestNotifications] = useState(false);
  const isFetchingRef = useRef(false);
  const pendingCountRef = useRef(0);

  useEffect(() => {
    pendingCountRef.current = pendingPrintRequestCount;
  }, [pendingPrintRequestCount]);

  const fetchPendingPrintRequestCount = useCallback(async () => {
    if (!isAuthenticated || !user?.isAdmin) {
      setPendingPrintRequestCount(0);
      return 0;
    }

    if (isFetchingRef.current) {
      return pendingCountRef.current;
    }

    try {
      isFetchingRef.current = true;
      setIsLoadingPrintRequestNotifications(true);
      const response = await apiService.getPendingPrintRequests();
      const normalized = normalizeApiArray(response);
      const nextCount = normalized.length;
      setPendingPrintRequestCount(nextCount);
      return nextCount;
    } catch (err) {
      console.error('Failed to fetch print request notification count:', err);
      return pendingCountRef.current;
    } finally {
      isFetchingRef.current = false;
      setIsLoadingPrintRequestNotifications(false);
    }
  }, [isAuthenticated, user?.isAdmin]);

  useEffect(() => {
    void fetchPendingPrintRequestCount();
  }, [fetchPendingPrintRequestCount, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) return undefined;

    const intervalId = window.setInterval(() => {
      void fetchPendingPrintRequestCount();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchPendingPrintRequestCount, isAuthenticated, user?.isAdmin]);

  const value = useMemo(
    () => ({
      pendingPrintRequestCount,
      isLoadingPrintRequestNotifications,
      refreshPrintRequestNotifications: fetchPendingPrintRequestCount,
    }),
    [fetchPendingPrintRequestCount, isLoadingPrintRequestNotifications, pendingPrintRequestCount]
  );

  return (
    <PrintRequestNotificationContext.Provider value={value}>
      {children}
    </PrintRequestNotificationContext.Provider>
  );
};

export const usePrintRequestNotifications = () => {
  const context = useContext(PrintRequestNotificationContext);
  if (!context) {
    throw new Error('usePrintRequestNotifications must be used within PrintRequestNotificationProvider');
  }
  return context;
};
