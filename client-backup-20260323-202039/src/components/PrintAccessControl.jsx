import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PrintAccessControl = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && !user.isAdmin) {
      document.body.classList.add('no-print-access');
    } else {
      document.body.classList.remove('no-print-access');
    }

    // Cleanup on unmount or user change
    return () => {
      document.body.classList.remove('no-print-access');
    };
  }, [user]);

  return null; // This component doesn't render anything
};

export default PrintAccessControl;
