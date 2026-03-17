import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);
const DEFAULT_DURATION = 4000;
const EXIT_ANIMATION_MS = 250;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  const removeToastNow = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const hideToast = useCallback((id) => {
    const timerId = timersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timersRef.current.delete(id);
    }

    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id && !toast.isLeaving ? { ...toast, isLeaving: true } : toast
      )
    );

    setTimeout(() => {
      removeToastNow(id);
    }, EXIT_ANIMATION_MS);
  }, [removeToastNow]);

  const showToast = useCallback(
    ({ message, type = 'info', duration = DEFAULT_DURATION }) => {
      if (!message) return null;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type, isLeaving: false }]);

      const timeoutId = window.setTimeout(() => {
        hideToast(id);
      }, duration);

      timersRef.current.set(id, timeoutId);
      return id;
    },
    [hideToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            isLeaving={toast.isLeaving}
            onDismiss={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
