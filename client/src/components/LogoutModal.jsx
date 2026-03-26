import React from 'react';
import ConfirmationModal from './ConfirmationModal';

const LogoutModal = ({ isOpen, onClose, onConfirm, isDarkMode }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Confirm Logout"
      message="Are you sure you want to log out?"
      onConfirm={onConfirm}
      onCancel={onClose}
      cancelText="No"
      confirmText="Yes, logout"
      isDarkMode={isDarkMode}
      isDanger={true}
    />
  );
};

export default LogoutModal;
