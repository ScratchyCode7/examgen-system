import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Upload, Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, FileText, HelpCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmationModal from '../components/ConfirmationModal';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import { HELP_CENTER_URL } from '../constants/helpLinks';
import { getUserDisplayName, getUserProfileImageUrl } from '../utils/userDisplay';
import '../styles/AccountSettings.css';

const MIN_PASSWORD_LENGTH = 8;

const toAbsoluteImageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
};

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, isAdmin, updateCurrentUser, logout } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState('Edit Account');
  const [departments, setDepartments] = useState([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const displayName = getUserDisplayName(user, 'User');
  const profileImageUrl = user?.profileImageData || getUserProfileImageUrl(user?.profileImagePath, user?.userId);
  const userMenuRef = React.useRef(null);

  const dataEntryItems = ['Program - Topic', 'Test Encoding', 'Test Question Editing'];
  const availableDataEntryItems = isAdmin ? ['Program - Topic'] : dataEntryItems;
  const reportItems = ['Test Generation', 'Saved Exam Sets'];
  const isDataEntryActive = availableDataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  const resolveDepartmentCode = () => {
    const fallback = departments.find((d) => (d.code || '').toUpperCase() !== 'IT') || departments[0];
    return fallback?.code || 'CCS';
  };

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileImagePath, setProfileImagePath] = useState('');
  const [profileImageData, setProfileImageData] = useState('');
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
        setUsername(profile.username || '');
        setEmail(profile.email || '');
        setProfileImagePath(profile.profileImagePath || '');
        setProfileImageData(profile.profileImageData || '');
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
    const loadDepartments = async () => {
      if (!user?.userId) return;

      try {
        const data = isAdmin
          ? await apiService.getDepartments()
          : await apiService.getUserDepartments(user.userId);
        setDepartments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load departments for AccountSettings navbar:', error);
      }
    };

    void loadDepartments();
  }, [isAdmin, user?.userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (selectedImagePreview && selectedImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const currentImageSrc = useMemo(() => {
    if (selectedImagePreview) return selectedImagePreview;
    if (profileImageData) return profileImageData;
    if (profileImagePath) return toAbsoluteImageUrl(profileImagePath);
    return '';
  }, [selectedImagePreview, profileImageData, profileImagePath]);

  const validate = () => {
    const nextErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Name must not be empty.';
    }

    if (!username.trim()) {
      nextErrors.username = 'Username must not be empty.';
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
    formData.append('username', username.trim());
    if (newPassword.trim()) {
      formData.append('newPassword', newPassword.trim());
    }
    if (selectedImageFile) {
      formData.append('profilePicture', selectedImageFile);
    }

    try {
      setSavingProfile(true);
      const updated = await apiService.updateMyAccount(formData);
      let persistedProfile = null;

      try {
        persistedProfile = await apiService.getMyAccount();
      } catch {
        // Fall back to immediate update response when profile refresh is temporarily unavailable.
      }

      const nextProfile = persistedProfile || updated;

      setProfileImagePath(nextProfile.profileImagePath || profileImagePath);
      setProfileImageData(nextProfile.profileImageData || '');
      setSelectedImageFile(null);
      setSelectedImagePreview('');
      setNewPassword('');
      setConfirmPassword('');

      updateCurrentUser({
        firstName: nextProfile.firstName || user?.firstName || '',
        lastName: nextProfile.lastName || user?.lastName || '',
        username: nextProfile.username || user?.username || '',
        email: nextProfile.email || user?.email || '',
        profileImagePath: nextProfile.profileImagePath || null,
        profileImageData: nextProfile.profileImageData || null,
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

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'User Management') {
      navigate('/admin', { state: { openUsers: true } });
    } else if (action === 'Activity Logs') {
      navigate('/activity-logs');
    } else if (action === 'Need Help') {
      if (typeof window !== 'undefined') {
        window.open(HELP_CENTER_URL, '_blank', 'noopener,noreferrer');
      }
    } else if (action === 'Edit Account') {
      navigate('/account/settings');
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate(isAdmin ? '/admin' : '/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
            <NavItem
              icon={Home}
              label="Home"
              isActive={activeTab === 'Home'}
              onClick={() => {
                setActiveTab('Home');
                navigate(isAdmin ? '/admin' : '/');
              }}
            />
            {isAdmin && (
              <NavItem
                icon={Users}
                label="Users"
                isActive={activeTab === 'User Management'}
                onClick={() => {
                  setActiveTab('User Management');
                  navigate('/admin', { state: { openUsers: true } });
                }}
              />
            )}
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={availableDataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                const code = resolveDepartmentCode();
                if (item === 'Program - Topic') {
                  navigate(`/course-topic/${code}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                  const targetTab = item === 'Test Encoding' ? 'Test Question Encoding' : item;
                  navigate(`/test-encoding/${code}`, { state: { activeTab: targetTab } });
                }
              }}
            />
            <DropdownNavItem
              icon={BookOpen}
              label="Reports"
              isActive={isReportsActive}
              dropdownItems={reportItems}
              onSelect={(item) => {
                setActiveTab(item);
                const code = resolveDepartmentCode();
                if (item === 'Test Generation') {
                  navigate(`/test-generation/${code}`);
                } else if (item === 'Saved Exam Sets') {
                  navigate(`/reports/saved-exams/${code}`);
                }
              }}
            />
          </div>

          <div className="nav-right" ref={userMenuRef}>
            <button onClick={toggleDarkMode} className={`mode-switch ${isDarkMode ? 'dark' : ''}`}>
              <div className="circle">{isDarkMode ? <Moon /> : <Sun />}</div>
            </button>

            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`user-btn ${isUserMenuOpen ? 'active' : ''}`}>
              <div className="user-pic">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="User profile" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="user-name">{displayName}</span>
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown show">
                {isAdmin && (
                  <>
                    <button onClick={() => handleUserAction('User Management')}><Settings /> User Management</button>
                    <button onClick={() => handleUserAction('Activity Logs')}><FileText /> Activity Logs</button>
                  </>
                )}
                <button onClick={() => handleUserAction('Need Help')}><HelpCircle /> Need Help</button>
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="main-card account-main-card">
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
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter your username"
                  />
                  {formErrors.username && <p className="field-error">{formErrors.username}</p>}
                </div>

                <div className="field-container field-container-full-width">
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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

      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />

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
