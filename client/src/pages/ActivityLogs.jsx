import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Download, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import '../styles/Dashboard.css';
import '../styles/ActivityLogs.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';

const ActivityLogs = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Activity Logs');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Admin User';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    departmentId: '',
    category: '',
    action: '',
    entityType: '',
    severity: '',
    startDate: '',
    endDate: '',
  });

  const categories = ['Questions', 'Tests', 'Users', 'Departments', 'Courses', 'Subjects', 'Topics', 'System'];
  const actions = ['Created', 'Updated', 'Deleted', 'Generated', 'Saved', 'Image Uploaded', 'Exported'];
  const severities = ['Info', 'Warning', 'Error'];

  const [departments, setDepartments] = useState([]);

  // Navigation items
  const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  
  const reportItems = ["Test Generation", "Saved Exam Sets"];
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await apiService.getDepartments();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    void loadDepartments();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'User Management') {
      navigate('/admin');
    } else if (action === 'Activity Logs') {
      navigate('/activity-logs');
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };

      const response = await apiService.getActivityLogs(params);
      
      setLogs(response.items || []);
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      setError('Failed to load activity logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      departmentId: '',
      category: '',
      action: '',
      entityType: '',
      severity: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const blob = await apiService.exportActivityLogs(params);
      
      // Create download link
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      setError('Failed to export logs');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityClass = (severity) => {
    switch(severity) {
      case 'Error': return 'severity-error';
      case 'Warning': return 'severity-warning';
      default: return 'severity-info';
    }
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate(user?.isAdmin ? '/admin' : '/'); }} className="logo-btn">
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
                navigate(user?.isAdmin ? '/admin' : '/');
              }} 
            />
            {user?.isAdmin && (
              <NavItem 
                icon={FileText} 
                label="Activity Logs" 
                isActive={activeTab === 'Activity Logs'} 
                onClick={() => { 
                  setActiveTab('Activity Logs'); 
                  navigate('/activity-logs');
                }} 
              />
            )}
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                const code = firstDept?.code || 'CCS';
                if (item === 'Program - Topic') {
                  navigate(`/course-topic/${code}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                  navigate(`/test-encoding/${code}`);
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
                const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                const code = firstDept?.code || 'CCS';
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
              <div className="user-pic">{displayName.charAt(0).toUpperCase()}</div>
              <span className="user-name">{displayName}</span>
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown show">
                {user?.isAdmin && (
                  <>
                    <button onClick={() => handleUserAction('User Management')}><Settings /> User Management</button>
                    <button onClick={() => handleUserAction('Activity Logs')}><FileText /> Activity Logs</button>
                  </>
                )}
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="main-card">
          <div className="activity-logs-container">
            <div className="logs-header">
              <h2>Activity Logs</h2>
              <div className="header-actions">
                <button onClick={fetchLogs} disabled={loading} className="btn-secondary">
                  <RefreshCw className={loading ? 'spinning' : ''} />
                  Refresh
                </button>
                <button onClick={handleExport} disabled={exporting || loading} className="btn-primary">
                  <Download />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            <div className="filters-section">
              <h3>Filters</h3>
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Category</label>
                  <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Action</label>
                  <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)}>
                    <option value="">All Actions</option>
                    {actions.map(act => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Severity</label>
                  <select value={filters.severity} onChange={(e) => handleFilterChange('severity', e.target.value)}>
                    <option value="">All Severities</option>
                    {severities.map(sev => (
                      <option key={sev} value={sev}>{sev}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="filter-actions">
                <button onClick={handleApplyFilters} className="btn-primary">Apply Filters</button>
                <button onClick={handleClearFilters} className="btn-secondary">Clear Filters</button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
              <div className="loading">Loading logs...</div>
            ) : (
              <>
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Department</th>
                        <th>Category</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Details</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="no-results">No activity logs found</td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id}>
                            <td>{formatDate(log.createdAt)}</td>
                            <td>{log.userName || 'System'}</td>
                            <td>{log.departmentName}</td>
                            <td>{log.category}</td>
                            <td>{log.action}</td>
                            <td>
                              {log.entityType && log.entityId ? `${log.entityType} #${log.entityId}` : '-'}
                            </td>
                            <td className="details-cell">{log.details || '-'}</td>
                            <td>
                              <span className={`severity-badge ${getSeverityClass(log.severity)}`}>
                                {log.severity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-secondary"
                    >
                      <ChevronLeft /> Previous
                    </button>
                    <span className="page-info">
                      Page {page} of {totalPages} ({totalCount} total)
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn-secondary"
                    >
                      Next <ChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isLogoutModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button onClick={() => setIsLogoutModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleConfirmLogout} className="btn-primary">Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
