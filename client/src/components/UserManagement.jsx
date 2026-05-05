import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Lock, ShieldOff, Pencil, Crown } from 'lucide-react';
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
  const [coursesByDepartment, setCoursesByDepartment] = useState({});
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pendingStatusChangeUser, setPendingStatusChangeUser] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deanModal, setDeanModal] = useState({
    isOpen: false,
    user: null,
    departments: []
  });
  const [isUpdatingDean, setIsUpdatingDean] = useState(false);
  const [emailConflictModal, setEmailConflictModal] = useState({
    isOpen: false,
    conflictingUser: null,
    ownershipSummary: null,
    pendingUpdatePayload: null,
  });
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
    courseIds: [],
    isAdmin: false
  });

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (departments.length === 0) return;
    void loadCoursesForDepartments(departments);
  }, [departments]);

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

  const loadCoursesForDepartments = async (departmentList) => {
    try {
      setIsLoadingCourses(true);
      const entries = await Promise.all(
        departmentList.map(async (dept) => {
          const courses = await apiService.getCourses(dept.id);
          return [dept.id, Array.isArray(courses) ? courses : []];
        })
      );

      const nextMap = entries.reduce((acc, [deptId, courses]) => {
        acc[deptId] = courses;
        return acc;
      }, {});

      setCoursesByDepartment(nextMap);
    } catch (err) {
      console.error('Failed to load courses for departments:', err);
      setCoursesByDepartment({});
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const getCoursesForDepartments = (departmentIds) => {
    if (!Array.isArray(departmentIds) || departmentIds.length === 0) return [];
    const courses = [];
    departmentIds.forEach((deptId) => {
      const list = coursesByDepartment[deptId] || [];
      courses.push(...list);
    });
    return courses;
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
    setFormData(prev => {
      const nextDepartmentIds = prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId];

      const allowedCourseIds = new Set(
        getCoursesForDepartments(nextDepartmentIds).map((course) => course.id)
      );

      const nextCourseIds = prev.courseIds.filter((courseId) => allowedCourseIds.has(courseId));

      return {
        ...prev,
        departmentIds: nextDepartmentIds,
        courseIds: nextCourseIds,
      };
    });
  };

  const handleCourseToggle = (courseId) => {
    setFormData(prev => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId]
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
        const updatePayload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          departmentIds: formData.departmentIds,
          courseIds: formData.courseIds,
          email: formData.email,
          isAdmin: formData.isAdmin,
          isActive: true,
          ...(isPasswordChangeRequested && {
            password: formData.password,
            adminPasswordVerification: formData.adminPasswordVerification
          })
        };

        // Update existing user
        await apiService.updateUser(editingUser.userId, updatePayload);
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
          courseIds: formData.courseIds,
          email: formData.email,
          isAdmin: formData.isAdmin
        });
        setSuccess('User created successfully');
      }

      await loadUsers();
      closeModal();
    } catch (err) {
      console.error('Failed to save user:', err);
      const conflictData = err.response?.data;
      if (editingUser && err.response?.status === 409 && conflictData?.code === 'EMAIL_CONFLICT_TRANSFER_AVAILABLE') {
        setEmailConflictModal({
          isOpen: true,
          conflictingUser: conflictData.conflictingUser,
          ownershipSummary: conflictData.ownershipSummary,
          pendingUpdatePayload: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            departmentIds: formData.departmentIds,
            courseIds: formData.courseIds,
            email: formData.email,
            isAdmin: formData.isAdmin,
            isActive: true,
            ...(isPasswordChangeRequested && {
              password: formData.password,
              adminPasswordVerification: formData.adminPasswordVerification
            })
          },
        });
        return;
      }

      setError(conflictData?.message || conflictData?.detail || conflictData || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (user) => {
    try {
      setLoading(true);
      // Fetch user's departments
      const userDepts = await apiService.getUserDepartments(user.userId);
      const userCourses = await apiService.getUserCourses(user.userId);
      
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        password: MASKED_EXISTING_PASSWORD,
        adminPasswordVerification: '',
        departmentIds: userDepts.map(d => d.id),
        courseIds: userCourses.map(c => c.id),
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

  const handleStatusChangePrompt = (user) => {
    setPendingStatusChangeUser(user);
  };

  const handleOpenDeanModal = async (user) => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      const assignedDepartments = await apiService.getUserDepartments(user.userId);
      const normalizedDepartments = Array.isArray(assignedDepartments) ? assignedDepartments : [];

      if (normalizedDepartments.length === 0) {
        setError('Cannot assign dean status because this user has no department assignment.');
        return;
      }

      setDeanModal({
        isOpen: true,
        user,
        departments: normalizedDepartments
      });
    } catch (err) {
      console.error('Failed to load user dean departments:', err);
      setError('Failed to load user department dean status');
    } finally {
      setLoading(false);
    }
  };

  const closeDeanModal = () => {
    if (isUpdatingDean) return;
    setDeanModal({ isOpen: false, user: null, departments: [] });
  };

  const handleAssignDean = async (departmentId) => {
    if (!deanModal.user?.userId || !departmentId) return;

    try {
      setIsUpdatingDean(true);
      await apiService.assignDeanStatus(deanModal.user.userId, departmentId);
      setSuccess('Dean status assigned successfully.');

      // Single dean per department is enforced server-side; reflect selected department as dean in this modal.
      setDeanModal((prev) => ({
        ...prev,
        departments: prev.departments.map((dept) => ({
          ...dept,
          isDean: Number(dept.id) === Number(departmentId)
        }))
      }));
    } catch (err) {
      console.error('Failed to assign dean status:', err);
      setError(err.response?.data?.detail || err.response?.data || 'Failed to assign dean status');
    } finally {
      setIsUpdatingDean(false);
    }
  };

  const handleRemoveDean = async (departmentId) => {
    if (!deanModal.user?.userId || !departmentId) return;

    try {
      setIsUpdatingDean(true);
      await apiService.removeDeanStatus(deanModal.user.userId, departmentId);
      setSuccess('Dean status removed successfully.');
      setDeanModal((prev) => ({
        ...prev,
        departments: prev.departments.map((dept) => (
          Number(dept.id) === Number(departmentId)
            ? { ...dept, isDean: false }
            : dept
        ))
      }));
    } catch (err) {
      console.error('Failed to remove dean status:', err);
      setError(err.response?.data?.detail || err.response?.data || 'Failed to remove dean status');
    } finally {
      setIsUpdatingDean(false);
    }
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
        username: user.username || '',
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

  const confirmStatusChange = async () => {
    if (!pendingStatusChangeUser) return;
    try {
      setIsUpdatingStatus(true);
      await handleToggleAccountLock(pendingStatusChangeUser);
      setPendingStatusChangeUser(null);
    } catch (err) {
      console.error('Failed to update account status:', err);
      setError('Failed to update account status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const closeEmailConflictModal = () => {
    if (loading) return;
    setEmailConflictModal({
      isOpen: false,
      conflictingUser: null,
      ownershipSummary: null,
      pendingUpdatePayload: null,
    });
  };

  const handleConfirmOwnershipTransfer = async () => {
    if (!editingUser?.userId || !emailConflictModal.pendingUpdatePayload || !emailConflictModal.conflictingUser?.userId) {
      return;
    }

    try {
      setLoading(true);
      await apiService.updateUser(editingUser.userId, {
        ...emailConflictModal.pendingUpdatePayload,
        transferOwnershipFromUserId: emailConflictModal.conflictingUser.userId,
        deactivateTransferredUser: true,
      });

      setSuccess('User updated and ownership transferred successfully.');
      closeEmailConflictModal();
      await loadUsers();
      closeModal();
    } catch (err) {
      console.error('Failed to transfer ownership during update:', err);
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to transfer ownership.');
    } finally {
      setLoading(false);
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
      courseIds: [],
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
      courseIds: [],
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

  const availableCourses = useMemo(() => {
    const courses = getCoursesForDepartments(formData.departmentIds);
    return [...courses].sort((left, right) => {
      const leftLabel = `${left.code || ''} ${left.name || ''}`.trim().toLowerCase();
      const rightLabel = `${right.code || ''} ${right.name || ''}`.trim().toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });
  }, [formData.departmentIds, coursesByDepartment, getCoursesForDepartments]);

  return (
    <div className={`user-management ${isDarkMode ? 'dark' : ''}`}>
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
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEdit(user)}
                        title="Edit user"
                        aria-label="Edit user"
                        disabled={loading}
                      >
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                      {!user.isAdmin && (
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleOpenDeanModal(user)}
                          title="Manage dean access"
                          aria-label="Manage dean access"
                          disabled={loading}
                        >
                          <Crown size={16} strokeWidth={2} />
                        </button>
                      )}
                      {!isCurrentAdminUser && (
                        <button
                          className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleStatusChangePrompt(user)}
                          title={user.isActive ? 'Deactivate account' : 'Reactivate account'}
                          aria-label={user.isActive ? 'Deactivate account' : 'Reactivate account'}
                          disabled={loading}
                        >
                          {user.isActive
                            ? <Lock size={16} strokeWidth={2} />
                            : <ShieldOff size={16} strokeWidth={2} />}
                        </button>
                      )}
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
                <label>Enrolled Courses</label>
                {isLoadingCourses ? (
                  <p className="helper-text">Loading courses...</p>
                ) : availableCourses.length === 0 ? (
                  <p className="helper-text">Select at least one department to load courses.</p>
                ) : (
                  <div className="department-selector">
                    {availableCourses.map(course => (
                      <label
                        key={course.id}
                        className={`department-checkbox ${formData.courseIds.includes(course.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.courseIds.includes(course.id)}
                          onChange={() => handleCourseToggle(course.id)}
                          aria-label={`Select ${course.code || course.name}`}
                        />
                        <span className="dept-info">
                          <strong>{course.name}</strong>
                          <span className="dept-code">{course.code}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
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

      {deanModal.isOpen && (
        <div className="modal-overlay" onClick={closeDeanModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Dean Access</h3>
              <button className="modal-close" onClick={closeDeanModal}>×</button>
            </div>

            <div className="user-form">
              <p style={{ marginTop: 0, marginBottom: '1rem' }}>
                Set dean authority for <strong>{deanModal.user?.firstName} {deanModal.user?.lastName}</strong>.
              </p>

              <div className="department-selector">
                {deanModal.departments.map((dept) => (
                  <div key={dept.id} className={`department-checkbox ${dept.isDean ? 'selected' : ''}`}>
                    <span className="dept-info">
                      <strong>{dept.name}</strong>
                      <span className="dept-code">{dept.code}</span>
                      {dept.isDean && <span className="role-badge admin">Dean</span>}
                    </span>

                    <div className="user-row-actions dean-action-cell">
                      {!dept.isDean ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAssignDean(dept.id)}
                          disabled={isUpdatingDean}
                          title="Set as dean"
                          aria-label="Set as dean"
                        >
                          <Crown size={16} strokeWidth={2} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning"
                          onClick={() => handleRemoveDean(dept.id)}
                          disabled={isUpdatingDean}
                          title="Remove dean"
                          aria-label="Remove dean"
                        >
                          <ShieldOff size={16} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeDeanModal}
                  disabled={isUpdatingDean}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingStatusChangeUser !== null}
        title={pendingStatusChangeUser?.isActive ? 'Confirm Deactivate' : 'Confirm Reactivate'}
        message={pendingStatusChangeUser?.isActive
          ? 'Deactivate this account? The user can no longer log in until reactivated.'
          : 'Reactivate this account so the user can log in again?'}
        onCancel={() => setPendingStatusChangeUser(null)}
        onConfirm={confirmStatusChange}
        cancelText="Cancel"
        confirmText={isUpdatingStatus ? 'Updating...' : (pendingStatusChangeUser?.isActive ? 'Deactivate' : 'Reactivate')}
        isLoading={isUpdatingStatus}
        isDarkMode={isDarkMode}
        isDanger={Boolean(pendingStatusChangeUser?.isActive)}
      />

      <ConfirmationModal
        isOpen={emailConflictModal.isOpen}
        title="Email Already Used"
        message={
          <div>
            <p>This email is already assigned to another account.</p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Account:</strong> {emailConflictModal.conflictingUser?.fullName || '-'} ({emailConflictModal.conflictingUser?.username || '-'})
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Transfer ownership before reusing this email?
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Courses: {emailConflictModal.ownershipSummary?.courses || 0}, Subjects: {emailConflictModal.ownershipSummary?.subjects || 0}, Topics: {emailConflictModal.ownershipSummary?.topics || 0}, Questions: {emailConflictModal.ownershipSummary?.questions || 0}
            </p>
          </div>
        }
        onCancel={closeEmailConflictModal}
        onConfirm={handleConfirmOwnershipTransfer}
        cancelText="Cancel"
        confirmText={loading ? 'Transferring...' : 'Transfer & Continue'}
        isLoading={loading}
        isDarkMode={isDarkMode}
        isDanger={false}
      />
    </div>
  );
};

export default UserManagement;
