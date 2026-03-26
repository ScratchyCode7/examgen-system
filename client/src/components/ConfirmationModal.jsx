import React from 'react';
import '../styles/ConfirmationModal.css';

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  isDarkMode = false,
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="app-confirmation-overlay" onClick={isLoading ? undefined : onCancel}>
      <div
        className={`app-confirmation-modal ${isDarkMode ? 'dark' : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        {typeof message === 'string' ? <p>{message}</p> : message}
        <div className="app-confirmation-actions">
          <button type="button" className="app-confirmation-cancel" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`app-confirmation-confirm ${isDanger ? 'danger' : ''}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;