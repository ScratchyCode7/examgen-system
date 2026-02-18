// Changes made (Dec 9, 2025):
// - Added navigation for Test Encoding/Test Question Editing in the Data Entry dropdown.
// - Integrated ThemeContext usage and ensured logout modal respects theme.
// See README for full details.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import '../styles/CourseTopic.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';
const dataEntryItems = ["Course - Topic", "Test Encoding", "Test Question Editing"];

const CourseTopic = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const { departmentCode } = useParams();
  const [activeTab, setActiveTab] = useState('Course - Topic');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User';

  // Course topic form states
  const [course, setCourse] = useState("");
  const [topicCode, setTopicCode] = useState("");
  const [value, setValue] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [hours, setHours] = useState("");
  // dynamic lists
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing subjects that were created via this page (identified by JSON description)
  const [allSubjects, setAllSubjects] = useState([]);

  useEffect(() => {
    const loadExistingSubjects = async () => {
      try {
        setIsLoading(true);
        setError('');
        const result = await apiService.getSubjects(1, 100);
        const items = result.items || result.Items || [];

        const mapped = items
          .map((s) => {
            if (!s.description) return null;
            try {
              const meta = JSON.parse(s.description);
              if (!meta.topicCode || !meta.topicDesc || !meta.hours) return null;
              return {
                subjectId: s.id,
                course: meta.course || '',
                topicCode: meta.topicCode,
                value: meta.value || '',
                topicDesc: meta.topicDesc,
                hours: meta.hours,
                createdAt: s.createdAt,
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        setAllSubjects(mapped);
      } catch (err) {
        console.error('Failed to load subjects for CourseTopic history:', err);
        setError('Failed to load existing course topics. You can still add new ones.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingSubjects();
  }, []);

  // Filter history to show only subjects from courses in the current department
  useEffect(() => {
    if (!courses || courses.length === 0) {
      setHistory([]);
      return;
    }
    
    const courseIds = courses.map(c => String(c.id));
    const filtered = allSubjects.filter(s => courseIds.includes(String(s.course)));
    setHistory(filtered);
  }, [courses, allSubjects]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const data = await apiService.getDepartments();
        const list = Array.isArray(data) ? data : [];
        console.log('CourseTopic: loaded departments', list);
        setDepartments(list);
      } catch (err) {
        console.error('Failed to load departments for CourseTopic:', err);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, []);

  useEffect(() => {
    const loadCourses = async () => {
      if (!departmentCode) return setCourses([]);
      const dept = departments.find(d => d.code === departmentCode);
      console.log('CourseTopic: departmentCode', departmentCode, 'matched dept', dept);
      if (!dept) return setCourses([]);
      try {
        setIsLoadingCourses(true);
        const data = await apiService.getCourses(dept.id);
        const list = Array.isArray(data) ? data : [];
        console.log('CourseTopic: loaded courses for', dept.id, list);
        // API returns array
        setCourses(list);
      } catch (err) {
        console.error('Failed to load courses for department', departmentCode, err);
        setCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadCourses();
  }, [departmentCode, departments]);

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

  // Save course/topic mapping as a Subject in the backend
  const handleSave = () => {
    if (!course || !topicCode || !value || !topicDesc || !hours) return;

    const saveAsync = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Pack the extra metadata into the Subject.Description field as JSON
        const description = JSON.stringify({
          course,
          topicCode,
          value,
          topicDesc,
          hours,
        });

        const payload = {
          courseId: Number(course),
          code: topicCode,
          name: topicDesc,
          description,
        };

        const created = await apiService.createSubject(payload);

        // Update local history table
        setHistory((prev) => [
          ...prev,
          {
            subjectId: created.id,
            courseId: created.courseId || Number(course),
            topicCode,
            value,
            topicDesc,
            hours,
            createdAt: created.createdAt,
          },
        ]);

        setCourse("");
        setTopicCode("");
        setValue("");
        setTopicDesc("");
        setHours("");
      } catch (err) {
        console.error('Failed to save course topic:', err);
        const message =
          err.response?.data?.message ||
          err.response?.data ||
          'Failed to save course topic. Make sure you are logged in as an admin.';
        setError(typeof message === 'string' ? message : 'Failed to save course topic.');
      } finally {
        setIsLoading(false);
      }
    };

    void saveAsync();
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        {/* Navbar (same as Dashboard.jsx) */}
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate(user?.isAdmin ? '/admin' : '/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
            <NavItem icon={Home} label="Home" isActive={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); navigate(user?.isAdmin ? '/admin' : '/'); }} />
            <DropdownNavItem
              icon={ClipboardList}
              label="Data Entry"
              isActive={isDataEntryActive}
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                if (item === 'Course - Topic') {
                    navigate('/course-topic/1');
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

        {/* Search bar (same as Dashboard.jsx) */}
        <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search Program/Course..." />
          </div>
        </div>

        {/* Course & Topic Container */}
        <div className="course-topic-container">
          <h2>Course & Topic Management</h2>

          {/* Program Header */}
          <div className="program-header-line">
            {isLoadingDepartments ? (
              <p>Loading department...</p>
            ) : (() => {
              const dept = departments.find(d => d.code === departmentCode);
              if (!dept) {
                return <p>Department not found ({departmentCode})</p>;
              }
              const logo = dept.code ? (DEPARTMENT_LOGOS?.[dept.code] ?? null) : null;
              return (
                <>
                  {logo ? (
                    <img src={logo} alt={dept.name} className="program-logo large-logo" onError={(e)=>{e.target.onerror=null; e.target.src='https://placehold.co/96x96/FFFFFF/1C4DA1?text=LOGO'}} />
                  ) : (
                    <div className="dept-icon large-logo">{dept.code?.charAt(0) ?? dept.name.charAt(0)}</div>
                  )}
                  <span className="program-name large-name">{dept.name}</span>
                </>
              );
            })()}
          </div>

          {/* Fields */}
          <div className="field-container">
            <label>Course</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">Select Course</option>
              {isLoadingCourses ? (
                <option disabled>Loading courses...</option>
              ) : courses.length === 0 ? (
                <option disabled>No courses found for this department</option>
              ) : (
                courses.map(c => (
                  <option key={c.id} value={c.id}>{(c.code ? `${c.code} - ` : '') + c.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="row-fields">
            <div className="field-container half-width">
              <label>Topic Code</label>
              <input
                type="text"
                value={topicCode}
                onChange={(e) => setTopicCode(e.target.value)}
                placeholder="Enter topic code (e.g., T001)"
              />
            </div>
            <div className="field-container half-width">
              <label>Value</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Value"
              />
            </div>
          </div>

          <div className="row-fields">
            <div className="field-container flex-2">
              <label>Topic Description</label>
              <input type="text" value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} />
            </div>
            <div className="field-container flex-1">
              <label>Hours Per Topic</label>
              <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>

          <button className="save-btn" onClick={handleSave}>Save</button>

          {/* History Table */}
          <div className="history-table">
            <div className="history-row header">
              <span>#</span>
              <span>Topic Code</span>
              <span>Topic Description</span>
              <span>Hours Per Topic</span>
            </div>
            {isLoading && history.length === 0 && (
              <div className="history-row">
                <span colSpan={4}>Loading course topics...</span>
              </div>
            )}
            {history.map((item, index) => (
              <div key={item.subjectId ?? index} className="history-row">
                <span>{index + 1}</span>
                <span>{item.topicCode}</span>
                <span>{item.topicDesc}</span>
                <span>{item.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default CourseTopic;
