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
import BED from '../assets/BED.png';
import CBA from '../assets/CBA.png';
import CIHM from '../assets/CIHM.png';
import CME from '../assets/CME.png';
import COEA from '../assets/COEA.png';
import CRIM from '../assets/CRIM.png';
import EDUC from '../assets/EDUC.png';
import GRAD from '../assets/GRAD.png';
import LJD from '../assets/LJD.png';
import SOA from '../assets/SOA.png';
import CCS from '../assets/CCS.png';
import CAS from '../assets/CAS.png';

const MOCK_PROGRAMS = [
  { id: 1, name: "Basic Education", logo: BED },
  { id: 2, name: "College of Arts and Sciences", logo: CAS },
  { id: 3, name: "College of Business & Accountancy", logo: CBA },
  { id: 4, name: "College of Computer Studies", logo: CCS },
  { id: 5, name: "College of Criminology", logo: CRIM },
  { id: 6, name: "College of International Hospitality Management", logo: CIHM },
  { id: 7, name: "College of Maritime Education", logo: CME },
  { id: 8, name: "College of Teacher Education", logo: EDUC },
  { id: 9, name: "Graduate School", logo: GRAD },
  { id: 10, name: "Law / Juris Doctor", logo: LJD },
  { id: 11, name: "School of Aviation", logo: SOA },
  { id: 12, name: "College of Engineering & Architecture", logo: COEA },
];

const DashboardAdmin = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Home');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [programView, setProgramView] = useState('grid');
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Admin User';

  // Sort programs alphabetically by name
  const sortedPrograms = [...MOCK_PROGRAMS].sort((a, b) => a.name.localeCompare(b.name));

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
            <button onClick={() => { setActiveTab('Home'); navigate('/admin'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
            <NavItem icon={Home} label="Home" isActive={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); navigate('/admin'); }} />
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                if (item === 'Course - Topic') {
                  navigate('/course-topic');
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
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
            <div className="program-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {sortedPrograms.map((program) => (
                <div
                  key={program.id}
                  className="program-card"
                  style={{ flex: '0 0 calc(25% - 1rem)' }} // 4 per row
                >
                  <img
                    src={program.logo}
                    alt={program.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/96x96/FFFFFF/1C4DA1?text=LOGO';
                    }}
                  />
                  <p>{program.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="program-list">
              {sortedPrograms.map(program => (
                <div key={program.id} className="program-list-item">
                  <p>{program.name}</p>
                </div>
              ))}
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

export default DashboardAdmin;
