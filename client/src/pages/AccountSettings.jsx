import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/AccountSettings.css';

const MIN_PASSWORD_LENGTH = 8;

const toAbsoluteImageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
};

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileImagePath, setProfileImagePath] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Back button handler
  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    let isDisposed = false;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const profile = await apiService.getMyAccount();
        if (isDisposed) return;

        setFullName(profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim());
        setEmail(profile.email || '');
        setProfileImagePath(profile.profileImagePath || '');
      } catch (error) {
        if (!isDisposed) {
          showToast({
            type: 'error',
            message: error?.response?.data?.message || 'Failed to load account settings.',
          });
        }
      } finally {
        if (!isDisposed) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isDisposed = true;
    };
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview && selectedImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const currentImageSrc = useMemo(() => {
    if (selectedImagePreview) return selectedImagePreview;
    if (profileImagePath) return toAbsoluteImageUrl(profileImagePath);
    return '';
  }, [selectedImagePreview, profileImagePath]);

  const validate = () => {
    const nextErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Name must not be empty.';
    }

    if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Confirm password must match new password.';
    }

    if (!newPassword && confirmPassword) {
      nextErrors.confirmPassword = 'Enter a new password first.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      showToast({ type: 'error', message: 'Please select a valid image file.' });
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setSelectedImagePreview(blobUrl);
  };

  const submitChanges = async () => {
    if (!validate()) {
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    if (newPassword.trim()) {
      formData.append('newPassword', newPassword.trim());
    }
    if (selectedImageFile) {
      formData.append('profilePicture', selectedImageFile);
    }

    try {
      setSavingProfile(true);
      const updated = await apiService.updateMyAccount(formData);

      setProfileImagePath(updated.profileImagePath || profileImagePath);
      setSelectedImageFile(null);
      setSelectedImagePreview('');
      setNewPassword('');
      setConfirmPassword('');

      updateCurrentUser({
        firstName: updated.firstName || user?.firstName || '',
        lastName: updated.lastName || user?.lastName || '',
        email: updated.email || user?.email || '',
        profileImagePath: updated.profileImagePath || null,
      });

      showToast({ type: 'success', message: 'Account updated successfully.' });
    } catch (error) {
      showToast({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to save account changes.',
      });
    } finally {
      setSavingProfile(false);
      setShowConfirmModal(false);
    }
  };

  const handleSaveClick = () => {
    if (!validate()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const displayInitial = (fullName || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="main-container">
        <div className="main-card">
          <button type="button" className="account-back-btn" onClick={handleBack}>
            <ArrowLeft size={16} /> Back
          </button>

          <h2>Account Settings</h2>
          <p className="subtitle">Update your profile picture, name, and password.</p>

          {loadingProfile ? (
            <div className="account-loading">Loading account information...</div>
          ) : (
            <form
              className="account-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveClick();
              }}
            >
              {/* Profile Picture Section */}
              <div className="profile-section">
                <div className="profile-image-wrapper">
                  <div className="profile-image">
                    {currentImageSrc ? (
                      <img src={currentImageSrc} alt="Profile" />
                    ) : (
                      <span>{displayInitial}</span>
                    )}
                  </div>
                  <label className="profile-upload-btn" htmlFor="profile-upload-input">
                    <Upload size={16} /> Change picture
                  </label>
                  <input
                    id="profile-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    hidden
                  />
                </div>
              </div>

              {/* Form Section */}
              <div className="input-section">
                <div className="field-container">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                  />
                  {formErrors.fullName && <p className="field-error">{formErrors.fullName}</p>}
                </div>

                <div className="field-container">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" value={email} disabled readOnly />
                </div>

                <div className="field-container">
                  <label htmlFor="newPassword">New Password (optional)</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.newPassword && <p className="field-error">{formErrors.newPassword}</p>}
                </div>

                <div className="field-container">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="field-error">{formErrors.confirmPassword}</p>}
                </div>
              </div>

              <div className="account-actions">
                <button type="submit" className="action-btn" disabled={savingProfile}>
                  {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Save account changes?"
        message="Your profile updates will be applied immediately."
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={submitChanges}
        confirmText="Save"
        cancelText="Cancel"
        isLoading={savingProfile}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default AccountSettings;
