import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import '../styles/Toast.css';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const LABELS = {
  success: 'Success',
  error: 'Error',
  info: 'Heads up',
};

const Toast = ({ message, type = 'info', isLeaving = false, onDismiss }) => {
  const Icon = ICONS[type] || ICONS.info;
  const label = LABELS[type] || LABELS.info;

  return (
    <div className={`toast ${type} ${isLeaving ? 'leaving' : ''}`} role="status" aria-live="polite">
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <div className="toast-body">
        <p className="toast-label">{label}</p>
        <p className="toast-message">{message}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
