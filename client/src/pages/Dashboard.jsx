import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, Grid, List } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Dashboard.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import { apiService } from '../services/api';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Home');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [programView, setProgramView] = useState('grid');
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentsError, setDepartmentsError] = useState('');
  const userMenuRef = useRef(null);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }

    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const data = await apiService.getDepartments();
        const deptList = Array.isArray(data) ? data : [];
        console.log('Loaded departments:', deptList);
        setDepartments(deptList);
      } catch (err) {
        console.error('Failed to load departments:', err);
        setDepartmentsError('Failed to load departments.');
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, [isAdmin, navigate]);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') setIsLogoutModalOpen(true);
    else console.log('Navigate to', action);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  const dataEntryItems = ["Course - Topic", "Test Encoding", "Test Question Editing"];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate('/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
            <NavItem icon={Home} label="Home" isActive={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); navigate('/'); }} />
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                if (item === 'Course - Topic') {
                  const firstDept = departments?.find(d => d.code !== 'IT') || departments?.[0];
                  const code = firstDept?.code || 'IT';
                  navigate(`/course-topic/${code}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing' || item === 'Test Question Encoding') {
                  navigate('/test-encoding');
                }
              }}
            />
            <NavItem icon={BookOpen} label="Reports" isActive={activeTab === 'Reports'} onClick={() => setActiveTab('Reports')} />
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
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="main-card">
          <div className="welcome-card">
            <h2>Welcome {displayName},</h2>
            <p>To the new and improved Test Data Bank System 2.0! You are now logged in. This updated version offers a faster, more organized, and user-friendly experience for managing exams and test items.</p>
          </div>

          <div className="search-and-view">
            <div className="search-bar">
              <Search className="search-icon" />
              <input type="text" placeholder="Search Program/Course..." />
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
            <div className="program-grid">
              {isLoadingDepartments ? (
                <p>Loading departments...</p>
              ) : departments.length === 0 ? (
                <p>{departmentsError || 'No departments available.'}</p>
              ) : (
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
                        onClick={() => navigate(`/course-topic/${d.code}`)}
                        style={{ cursor: 'pointer' }}
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
              )}
            </div>
          ) : (
            <div className="program-list">
              {isLoadingDepartments ? (
                <p>Loading departments...</p>
              ) : departments.length === 0 ? (
                <p>{departmentsError || 'No departments available.'}</p>
              ) : (
                departments
                  .filter(d => d.code !== 'IT')
                  .map((d) => (
                    <div key={d.id} className="program-list-item" onClick={() => navigate(`/course-topic/${d.code}`)} style={{cursor: 'pointer'}}>
                      <p>{d.name}</p>
                    </div>
                  ))
              )}
            </div>
          )}
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

export default Dashboard;
