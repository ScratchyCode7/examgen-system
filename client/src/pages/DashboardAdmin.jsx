import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, Grid, List, Users, FileText, HelpCircle } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import UserManagement from '../components/UserManagement';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePrintRequestNotifications } from '../contexts/PrintRequestNotificationContext';
import '../styles/Dashboard.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import { apiService } from '../services/api';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';
import { HELP_CENTER_URL } from '../constants/helpLinks';
import { getUserDisplayName, getUserProfileImageUrl } from '../utils/userDisplay';

const DashboardAdmin = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { pendingPrintRequestCount } = usePrintRequestNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Home');
  const [activeView, setActiveView] = useState('home'); // 'home' or 'users'
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [programView, setProgramView] = useState('grid');
  const [searchText, setSearchText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const userMenuRef = useRef(null);

  const displayName = getUserDisplayName(user, 'Admin User');
  const profileImageUrl = user?.profileImageData || getUserProfileImageUrl(user?.profileImagePath, user?.userId);

  // departments are loaded from API and used directly
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const data = await apiService.getDepartments();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setIsLoadingDepartments(false);
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

  useEffect(() => {
    if (!location.state?.openUsers) {
      return;
    }

    openUserManagementView();
    navigate('/admin', { replace: true });
  }, [location.state, navigate]);

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'User Management') {
      handleOpenUserManagement();
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

  const openUserManagementView = () => {
    setActiveView('users');
    setActiveTab('User Management');
  };

  const handleOpenUserManagement = () => {
    if (activeView === 'users') {
      return;
    }
    openUserManagementView();
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  const dataEntryItems = ["Program - Topic"];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  
  const reportItems = ["Test Generation", "Saved Exam Sets", "Print Requests"];
  const reportsNotificationCount = pendingPrintRequestCount;
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  const visibleDepartments = departments.filter((department) => {
    const code = (department.code || '').toString().trim().toUpperCase();
    const name = (department.name || '').toString().trim().toLowerCase();
    return code !== 'IT' && !name.includes('information technology');
  });

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredDepartments = visibleDepartments.filter((department) => {
    if (!normalizedSearchText) return true;
    const departmentName = (department.name || '').toLowerCase();
    const departmentCode = (department.code || '').toLowerCase();
    return departmentName.includes(normalizedSearchText) || departmentCode.includes(normalizedSearchText);
  });

  const handleSearchNavigate = () => {
    if (!normalizedSearchText) return;
    const firstMatch = filteredDepartments[0];
    if (firstMatch?.code) {
      navigate(`/course-topic/${firstMatch.code}`);
    }
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate('/admin'); }} className="logo-btn">
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
                setActiveView('home');
              }} 
            />
            <NavItem 
              icon={Users} 
              label="Users" 
              isActive={activeTab === 'User Management'} 
              onClick={() => { 
                handleOpenUserManagement();
              }} 
            />
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                setActiveView('home');
                  if (item === 'Program - Topic') {
                    // Navigate to first non-admin department if available
                    const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                    const code = firstDept?.code || 'IT';
                    navigate(`/course-topic/${code}`);
                  }
              }}
            />
            <DropdownNavItem
              icon={BookOpen}
              label="Reports"
              isActive={isReportsActive}
              dropdownItems={reportItems}
              parentNotificationCount={reportsNotificationCount}
              itemNotificationCounts={{ 'Print Requests': reportsNotificationCount }}
              onSelect={(item) => {
                setActiveTab(item);
                if (item === 'Test Generation') {
                  setActiveView('home');
                  navigate('/test-generation');
                } else if (item === 'Saved Exam Sets') {
                  setActiveView('home');
                  const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                  const code = firstDept?.code || 'CCS';
                  navigate(`/reports/saved-exams/${code}`);
                } else if (item === 'Print Requests') {
                  setActiveView('home');
                  navigate('/test-generation?view=printrequests');
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
                <button onClick={() => handleUserAction('User Management')}><Settings /> User Management</button>
                <button onClick={() => handleUserAction('Activity Logs')}><FileText /> Activity Logs</button>
                <button onClick={() => handleUserAction('Need Help')}><HelpCircle /> Need Help</button>
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="spacer" />

        {activeView === 'home' ? (
          <>
            <div className="search-region">
              <div className="search-bar">
                <Search className="search-icon" onClick={handleSearchNavigate} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearchNavigate();
                    }
                  }}
                />
              </div>
            </div>

            <div className="spacer" />
          </>
        ) : (
          <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
            <div className="search-bar">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearchText}
                onChange={(event) => setUserSearchText(event.target.value)}
              />
            </div>
          </div>
        )}

        <div className={`main-card ${activeView === 'home' ? 'home-card' : ''}`} style={activeView === 'users' ? { marginTop: '-40px' } : undefined}>
          {activeView === 'home' ? (
            <>
              <div className="welcome-card">
                <h2>Welcome {displayName},</h2>
                <p>To the new and improved Test Data Bank System 2.0! You are now logged in. This updated version offers a faster, more organized, and user-friendly experience for managing exams and test items.</p>
              </div>

              <div className="program-header">
                <h3>Your Programs</h3>
                <div className="view-toggle">
                  <button className={programView === 'grid' ? 'active' : ''} onClick={() => setProgramView('grid')} title="Logo View">
                    <Grid />
                  </button>
                  <button className={programView === 'list' ? 'active' : ''} onClick={() => setProgramView('list')} title="Text View">
                    <List />
                  </button>
                </div>
              </div>

              {programView === 'grid' ? (
                <div className="program-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {isLoadingDepartments ? (
                    <p>Loading departments...</p>
                  ) : filteredDepartments.length ? (
                    filteredDepartments.map((d) => {
                        const logo = DEPARTMENT_LOGOS[d.code] || null;
                        return (
                          <div
                            key={d.id}
                            className="program-card"
                            style={{ flex: '0 0 calc(25% - 1rem)', cursor: 'pointer' }} // 4 per row
                            onClick={() => navigate(`/course-topic/${d.code}`)}
                          >
                            {logo ? (
                              <img src={logo} alt={d.name} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/96x96/FFFFFF/1C4DA1?text=LOGO'; }} />
                            ) : (
                              <div className="dept-icon">{d.code?.charAt(0) ?? 'D'}</div>
                            )}
                            <p>{d.name}</p>
                          </div>
                        );
                      })
                  ) : normalizedSearchText ? (
                    <p>No matching programs found.</p>
                  ) : (
                    <p>No departments available.</p>
                  )}
                </div>
              ) : (
                <div className="program-list">
                  {isLoadingDepartments ? (
                    <p>Loading departments...</p>
                  ) : filteredDepartments.length ? (
                    filteredDepartments.map(d => (
                      <div key={d.id} className="program-list-item" style={{cursor: 'pointer'}} onClick={() => navigate(`/course-topic/${d.code}`)}>
                        <p>{d.name}</p>
                      </div>
                    ))
                  ) : normalizedSearchText ? (
                    <p>No matching programs found.</p>
                  ) : (
                    <p>No departments available.</p>
                  )}
                </div>
              )}
            </>
          ) : activeView === 'users' ? (
            <UserManagement searchQuery={userSearchText} />
          ) : null}
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isDarkMode={isDarkMode}
      />

      {/* security modal removed */}
    </div>
  );
};

export default DashboardAdmin;
