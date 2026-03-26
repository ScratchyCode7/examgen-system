import React from 'react';

const LogoutModal = ({ isOpen, onClose, onConfirm, isDarkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-overlay">
      <div className={`logout-modal ${isDarkMode ? 'dark' : ''}`}>
        <h2>Confirm Logout</h2>
        <p>Are you sure you want to log out?</p>

        <div className="logout-actions">
          <button className="btn-cancel" onClick={onClose}>No</button>
          <button className="btn-confirm" onClick={onConfirm}>Yes, logout</button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
