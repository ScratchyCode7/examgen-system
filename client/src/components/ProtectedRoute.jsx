import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading, hasAccessToDepartmentCode, user } = useAuth();
  const { departmentCode } = useParams();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const checkDepartmentAccess = async () => {
      if (!departmentCode || !isAuthenticated) {
        setHasAccess(true);
        return;
      }

      setCheckingAccess(true);
      try {
        const access = await hasAccessToDepartmentCode(departmentCode);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking department access:', error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkDepartmentAccess();
  }, [departmentCode, isAuthenticated, hasAccessToDepartmentCode]);

  if (loading || checkingAccess) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: 'var(--text-secondary, #6c757d)'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (departmentCode && !hasAccess) {
    // Redirect to user's primary department or dashboard
    const primaryDeptId = user?.departmentIds?.[0];
    if (primaryDeptId) {
      // Try to redirect to the same page but with user's primary department
      // This would require fetching the department code, so for now redirect to dashboard
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
