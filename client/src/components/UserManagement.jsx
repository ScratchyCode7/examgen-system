import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, ShieldOff, Pencil, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import '../styles/UserManagement.css';

const MASKED_EXISTING_PASSWORD = '********';

const UserManagement = ({ searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasEditedPassword, setHasEditedPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    adminPasswordVerification: '',
    departmentIds: [],
    isAdmin: false
  });

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers(1, 100);
      setUsers(data.items || data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await apiService.getDepartments();
      setDepartments(data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'password') {
      setHasEditedPassword(true);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordFocus = () => {
    if (!editingUser || hasEditedPassword) return;

    // Start with an explicit masked placeholder for existing users;
    // clear on first focus so the admin can type a replacement password.
    setFormData(prev => ({ ...prev, password: '' }));
    setHasEditedPassword(true);
  };

  const handleDepartmentToggle = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const isPasswordChangeRequested = editingUser
      && hasEditedPassword
      && !!formData.password
      && formData.password !== MASKED_EXISTING_PASSWORD;

    if (formData.departmentIds.length === 0) {
      setError('Please select at least one department');
      return;
    }

    if (isPasswordChangeRequested && !formData.adminPasswordVerification) {
      setError('Please enter your current admin password to verify identity before changing user password.');
      return;
    }

    try {
      setLoading(true);
      
      if (editingUser) {
        // Update existing user
        await apiService.updateUser(editingUser.userId, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          departmentIds: formData.departmentIds,
          email: formData.email,
          isAdmin: formData.isAdmin,
          isActive: true,
          ...(isPasswordChangeRequested && {
            password: formData.password,
            adminPasswordVerification: formData.adminPasswordVerification
          })
        });
        setSuccess('User updated successfully');
      } else {
        // Create new user
        if (!formData.password) {
          setError('Password is required for new users');
          return;
        }
        
        await apiService.createUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          password: formData.password,
          departmentIds: formData.departmentIds,
          email: formData.email,
          isAdmin: formData.isAdmin
        });
        setSuccess('User created successfully');
      }

      await loadUsers();
      closeModal();
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err.response?.data?.detail || err.response?.data || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (user) => {
    try {
      setLoading(true);
      // Fetch user's departments
      const userDepts = await apiService.getUserDepartments(user.userId);
      
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        password: MASKED_EXISTING_PASSWORD,
        adminPasswordVerification: '',
        departmentIds: userDepts.map(d => d.id),
        isAdmin: user.isAdmin || false
      });
      setHasEditedPassword(false);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to load user departments:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (userId) => {
    setPendingDeleteUserId(userId);
  };

  const handleToggleAccountLock = async (user) => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      const shouldLock = Boolean(user.isActive);
      const userDepts = await apiService.getUserDepartments(user.userId);
      const departmentIds = Array.isArray(userDepts)
        ? userDepts.map((department) => department?.id).filter((id) => Number.isInteger(id))
        : [];

      if (departmentIds.length === 0) {
        setError('Unable to change lock state because this user has no assigned department.');
        return;
      }

      await apiService.updateUser(user.userId, {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        departmentIds,
        email: user.email || '',
        isAdmin: Boolean(user.isAdmin),
        isActive: !shouldLock,
      });

      setSuccess(shouldLock
        ? `User '${user.username}' has been locked.`
        : `User '${user.username}' has been unlocked.`);

      await loadUsers();
    } catch (err) {
      console.error('Failed to update account lock state:', err);
      setError(err.response?.data?.detail || err.response?.data || 'Failed to update account lock state');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteUserId) return;
    try {
      setIsDeletingUser(true);
      await apiService.deleteUser(pendingDeleteUserId);
      setSuccess('User deleted successfully');
      await loadUsers();
      setPendingDeleteUserId(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const openNewUserModal = () => {
    setEditingUser(null);
    setHasEditedPassword(false);
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      adminPasswordVerification: '',
      departmentIds: [],
      isAdmin: false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
    setShowPassword(false);
    setHasEditedPassword(false);
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      adminPasswordVerification: '',
      departmentIds: [],
      isAdmin: false
    });
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) return true;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(normalizedSearch)
      || username.includes(normalizedSearch)
      || email.includes(normalizedSearch);
  });

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={openNewUserModal}>
          + Add New User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {loading && !showModal ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Departments</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const isCurrentAdminUser = Boolean(currentUser?.isAdmin)
                  && String(currentUser?.userId || '') === String(user.userId || '');

                return (
                <tr key={user.userId}>
                  <td>{`${user.firstName} ${user.lastName}`.trim() || '-'}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.departmentIds?.length > 0 ? (
                      <span className="department-count">
                        {user.departmentIds.length} department{user.departmentIds.length > 1 ? 's' : ''}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`role-badge ${user.isAdmin ? 'admin' : 'user'}`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                    {!user.isActive && (
                      <span className="role-badge locked">Locked</span>
                    )}
                  </td>
                  <td>
                    <div className="user-row-actions">
                      {!isCurrentAdminUser && (
                        <button
                          className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleToggleAccountLock(user)}
                          title={user.isActive ? 'Lock account' : 'Unlock account'}
                          aria-label={user.isActive ? 'Lock account' : 'Unlock account'}
                          disabled={loading}
                        >
                          {user.isActive
                            ? <Lock size={16} strokeWidth={2} />
                            : <ShieldOff size={16} strokeWidth={2} />}
                        </button>
                      )}
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEdit(user)}
                        title="Edit user"
                        aria-label="Edit user"
                        disabled={loading}
                      >
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDelete(user.userId)}
                        title="Delete user"
                        aria-label="Delete user"
                        disabled={loading}
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary, #6c757d)' }}>
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={editingUser}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password {!editingUser && '*'}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={handlePasswordFocus}
                    required={!editingUser}
                    placeholder={editingUser ? 'Type a new password to change it' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {editingUser && hasEditedPassword && formData.password && formData.password !== MASKED_EXISTING_PASSWORD && (
                <div className="form-group">
                  <label>Verify Admin Password *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="adminPasswordVerification"
                      value={formData.adminPasswordVerification}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your current admin password"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Enrolled Departments</label>
                <div className="department-selector">
                  {departments.map(dept => (
                    <label
                      key={dept.id}
                      className={`department-checkbox ${formData.departmentIds.includes(dept.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.departmentIds.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        aria-label={`Select ${dept.name}`}
                      />
                      <span className="dept-info">
                        <strong>{dept.name}</strong>
                        <span className="dept-code">{dept.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isAdmin"
                    checked={formData.isAdmin}
                    onChange={handleInputChange}
                  />
                  <span>Administrator (has access to all departments)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingDeleteUserId !== null}
        title="Confirm Delete"
        message="Are you sure you want to delete this user?"
        onCancel={() => setPendingDeleteUserId(null)}
        onConfirm={confirmDelete}
        cancelText="Cancel"
        confirmText={isDeletingUser ? 'Deleting...' : 'Delete'}
        isLoading={isDeletingUser}
        isDarkMode={isDarkMode}
        isDanger={true}
      />
    </div>
  );
};

export default UserManagement;
