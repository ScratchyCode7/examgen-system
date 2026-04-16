import React, { useEffect, useMemo, useState } from 'react';
import '../styles/TransferOwnershipModal.css';

const getUserOptionLabel = (user) => {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const username = (user?.username || '').trim();
  const email = (user?.email || '').trim();

  if (fullName && username) return `${fullName} (${username})`;
  if (fullName && email) return `${fullName} (${email})`;
  if (fullName) return fullName;
  if (username && email) return `${username} (${email})`;
  if (username) return username;
  if (email) return email;
  return String(user?.userId || 'Unknown User');
};

const TransferOwnershipModal = ({
  isOpen,
  title,
  description,
  entityLabel,
  targetUserId,
  onTargetUserIdChange,
  users = [],
  usersLoading = false,
  onClose,
  onConfirm,
  confirmText = 'Transfer',
  cancelText = 'Cancel',
  isLoading = false,
  isDarkMode = false,
  showTransferChildrenOption = false,
  transferChildren = false,
  onTransferChildrenChange,
}) => {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const source = Array.isArray(users) ? users : [];

    if (!normalizedSearch) return source;

    return source.filter((user) => {
      const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toLowerCase();
      const username = String(user?.username || '').toLowerCase();
      const email = String(user?.email || '').toLowerCase();
      return fullName.includes(normalizedSearch)
        || username.includes(normalizedSearch)
        || email.includes(normalizedSearch);
    });
  }, [users, searchText]);

  if (!isOpen) return null;

  return (
    <div className="app-confirmation-overlay" onClick={isLoading ? undefined : onClose}>
      <div
        className={`app-confirmation-modal transfer-ownership-modal ${isDarkMode ? 'dark' : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}

        <div className="transfer-ownership-field">
          <label htmlFor="transfer-target-user-search">Search User</label>
          <input
            id="transfer-target-user-search"
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name, username, or email"
            disabled={isLoading || usersLoading}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="transfer-ownership-field">
          <label htmlFor="transfer-target-user-id">Select User</label>
          <select
            id="transfer-target-user-id"
            value={targetUserId}
            onChange={(event) => onTargetUserIdChange(event.target.value)}
            disabled={isLoading || usersLoading}
          >
            <option value="">
              {usersLoading
                ? 'Loading users...'
                : filteredUsers.length > 0
                  ? 'Select a user'
                  : 'No matching users found'}
            </option>
            {filteredUsers.map((user) => (
              <option key={user.userId} value={user.userId}>
                {getUserOptionLabel(user)}
              </option>
            ))}
          </select>
        </div>

        {showTransferChildrenOption && typeof onTransferChildrenChange === 'function' ? (
          <label className="transfer-ownership-checkbox" htmlFor="transfer-owned-children">
            <input
              id="transfer-owned-children"
              type="checkbox"
              checked={transferChildren}
              onChange={(event) => onTransferChildrenChange(event.target.checked)}
              disabled={isLoading}
            />
            Transfer all {entityLabel || 'child'} items owned under this record
          </label>
        ) : null}

        <div className="app-confirmation-actions">
          <button
            type="button"
            className="app-confirmation-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="app-confirmation-confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Transferring...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipModal;
