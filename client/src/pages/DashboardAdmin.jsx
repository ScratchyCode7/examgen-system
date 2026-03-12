import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, Grid, List, Users, FileText } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import UserManagement from '../components/UserManagement';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Dashboard.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import { apiService } from '../services/api';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';

const DashboardAdmin = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Home');
  const [activeView, setActiveView] = useState('home'); // 'home' or 'users'
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [programView, setProgramView] = useState('grid');
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Admin User';

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

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'User Management') {
      setActiveView('users');
      setActiveTab('User Management');
    } else if (action === 'Activity Logs') {
      navigate('/activity-logs');
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  
  const reportItems = ["Test Generation", "Saved Exam Sets"];
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

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
                setActiveTab('User Management'); 
                setActiveView('users');
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
                  } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                    const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                    const code = firstDept?.code || 'CCS';
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
                if (item === 'Test Generation') {
                  setActiveView('home');
                  navigate('/test-generation');
                } else if (item === 'Saved Exam Sets') {
                  setActiveView('home');
                  const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                  const code = firstDept?.code || 'CCS';
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
                <button onClick={() => handleUserAction('User Management')}><Settings /> User Management</button>
                <button onClick={() => handleUserAction('Activity Logs')}><FileText /> Activity Logs</button>
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="main-card">
          {activeView === 'home' ? (
            <>
              <div className="welcome-card">
                <h2>Welcome {displayName},</h2>
                <p>To the new and improved Test Data Bank System 2.0! You are now logged in. This updated version offers a faster, more organized, and user-friendly experience for managing exams and test items.</p>
              </div>

              <div className="search-and-view">
                <div className="search-bar">
                  <Search className="search-icon" />
                  <input type="text" placeholder="Search Programs..." />
                </div>

                <div className="view-toggle">
                  <button className={programView === 'grid' ? 'active' : ''} onClick={() => setProgramView('grid')} title="Logo View">
                    <Grid />
                  </button>
                  <button className={programView === 'list' ? 'active' : ''} onClick={() => setProgramView('list')} title="Text View">
                    <List />
                  </button>
                </div>
              </div>

              <h3>Your Programs</h3>

              {programView === 'grid' ? (
                <div className="program-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {isLoadingDepartments ? (
                    <p>Loading departments...</p>
                  ) : departments.length ? (
                    departments
                      .filter(d => {
                        const code = (d.code || '').toString().trim().toUpperCase();
                        const name = (d.name || '').toString().trim().toLowerCase();
                        return code !== 'IT' && !name.includes('information technology');
                      })
                      .map((d) => {
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
                  ) : (
                    <p>No departments available.</p>
                  )}
                </div>
              ) : (
                <div className="program-list">
                  {isLoadingDepartments ? (
                    <p>Loading departments...</p>
                  ) : departments.length ? (
                    departments.map(d => (
                      <div key={d.id} className="program-list-item" style={{cursor: 'pointer'}} onClick={() => navigate(`/course-topic/${d.code}`)}>
                        <p>{d.name}</p>
                      </div>
                    ))
                  ) : (
                    <p>No departments available.</p>
                  )}
                </div>
              )}
            </>
          ) : activeView === 'users' ? (
            <UserManagement />
          ) : null}
        </div>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="logout-overlay">
          <div className={`logout-modal ${isDarkMode ? 'dark' : ''}`}>
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out?</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setIsLogoutModalOpen(false)}>No</button>
              <button className="btn-confirm" onClick={handleConfirmLogout}>Yes, logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;
