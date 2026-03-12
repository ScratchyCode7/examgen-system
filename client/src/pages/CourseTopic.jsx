// Changes made (Dec 9, 2025):
// - Added navigation for Test Encoding/Test Question Editing in the Data Entry dropdown.
// - Integrated ThemeContext usage and ensured logout modal respects theme.
// See README for full details.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, FileText } from 'lucide-react';
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
const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];

const CourseTopic = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const { departmentCode } = useParams();
  const [activeTab, setActiveTab] = useState('Program - Topic');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User';

  const reportItems = ["Test Generation", "Saved Exam Sets"];

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

  // Topic Management states
  const [expandedSubjectsMap, setExpandedSubjectsMap] = useState({});
  const [subjectTopicsMap, setSubjectTopicsMap] = useState({});
  const [topicFormData, setTopicFormData] = useState({ title: '', sequenceOrder: '', allocatedHours: '' });
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState(null);
  const [topicCreating, setTopicCreating] = useState(false);

  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  const resolveDepartmentCode = () => {
    if (departmentCode) return departmentCode;
    const fallback = departments.find(d => (d.code || '').toUpperCase() !== 'IT') || departments[0];
    return fallback?.code || 'CCS';
  };

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
        // Call getSubjects with proper params object
        const result = await apiService.getSubjects({ pageNumber: 1, pageSize: 100 });
        const items = Array.isArray(result) ? result : (result?.items || result?.Items || []);

        console.log('Raw API response for subjects:', result);
        console.log('Items extracted:', items);

        const mapped = items
          .map((s) => {
            // prefer strongly-typed courseId returned by the API, fall back to metadata
            let courseIdFromMeta = null;
            if (!s.description && s.courseId == null) return null;
            try {
              const meta = s.description ? JSON.parse(s.description) : {};
              courseIdFromMeta = meta.course != null ? Number(meta.course) : null;

              if (!meta.topicCode || !meta.topicDesc || !meta.hours) {
                // If important meta fields are missing, still allow if API provides courseId and name/code
                if (!s.courseId && !(meta.topicCode && meta.topicDesc && meta.hours)) return null;
              }

              return {
                subjectId: s.id,
                // use API field if present, otherwise use parsed meta.course
                courseId: s.courseId != null ? Number(s.courseId) : courseIdFromMeta,
                topicCode: meta.topicCode || s.code || '',
                value: meta.value || '',
                topicDesc: meta.topicDesc || s.name || '',
                hours: meta.hours || (s.hours ? Number(s.hours) : ''),
                createdAt: s.createdAt,
                topic: null, // Will be loaded on-demand when expanding
              };
            } catch (ex) {
              console.warn('Invalid subject description JSON for subject', s.id, ex);
              return null;
            }
          })
          .filter(Boolean);
        
        console.log('Loaded subjects:', mapped);
        setAllSubjects(mapped);
      } catch (err) {
        console.error('Failed to load subjects for CourseTopic history:', err);
        setError('Failed to load existing program topics. You can still add new ones.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingSubjects();
  }, []);

  // Filter history to show only subjects from courses in the current department
  useEffect(() => {
    const dept = departments.find(d => d.code === departmentCode);
    if (!dept) {
      console.log('No matching department for code', departmentCode);
      setHistory([]);
      return;
    }

    if (!courses || courses.length === 0) {
      console.log('Courses not loaded yet for department', dept.id);
      setHistory([]);
      return;
    }

    const courseIds = courses.map(c => Number(c.id));
    console.log('Filtering subjects by course IDs for department', dept.code, courseIds);

    const filtered = allSubjects.filter(s => {
      const subjCourseId = Number(s.courseId || s.course || 0);
      const match = courseIds.includes(subjCourseId);
      if (!match) console.debug(`Excluding subject ${s.topicCode} course:${subjCourseId}`);
      return match;
    });

    console.log('Filtered subjects for this department:', filtered);
    setHistory(filtered);
  }, [departments, departmentCode, courses, allSubjects]);

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
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'Activity Logs') {
      navigate('/activity-logs');
    } else {
      console.log('Navigate to', action);
    }
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

        const subjectPayload = {
          courseId: Number(course),
          code: topicCode,
          name: topicCode,
          description,
        };

        // 1. Create Subject
        const createdSubject = await apiService.createSubject(subjectPayload);
        console.log('Subject created:', createdSubject);

        // 2. Create Topic for this Subject with topicDesc as the title
        const topicPayload = {
          subjectId: createdSubject.id,
          title: topicDesc,  // Topic Description becomes Topic.Title
          description: '',
          sequenceOrder: 1,
          allocatedHours: Number(hours),
        };

        const createdTopic = await apiService.createTopic(topicPayload);
        console.log('Topic created:', createdTopic);

        // Update local history table
        setHistory((prev) => [
          ...prev,
          {
            subjectId: createdSubject.id,
            courseId: createdSubject.courseId || Number(course),
            topicCode,
            value,
            topicDesc,
            hours,
            createdAt: createdSubject.createdAt,
            topic: createdTopic, // Include the created topic
          },
        ]);

        setCourse("");
        setTopicCode("");
        setValue("");
        setTopicDesc("");
        setHours("");
      } catch (err) {
        console.error('Failed to save program topic:', err);
        const message =
          err.response?.data?.message ||
          err.response?.data ||
          'Failed to save program topic. Make sure you are logged in as an admin.';
        setError(typeof message === 'string' ? message : 'Failed to save program topic.');
      } finally {
        setIsLoading(false);
      }
    };

    void saveAsync();
  };

  // Toggle subject expansion and load topics
  const toggleSubjectExpansion = async (subjectId) => {
    const isExpanded = expandedSubjectsMap[subjectId];
    
    if (isExpanded) {
      // Collapse
      setExpandedSubjectsMap(prev => ({
        ...prev,
        [subjectId]: false
      }));
    } else {
      // Expand and load topics
      setExpandedSubjectsMap(prev => ({
        ...prev,
        [subjectId]: true
      }));
      
      // Load topics if not already loaded
      if (!subjectTopicsMap[subjectId]) {
        try {
          const topics = await apiService.getTopics(subjectId);
          const topicList = Array.isArray(topics) ? topics : topics.items || topics.data || [];
          setSubjectTopicsMap(prev => ({
            ...prev,
            [subjectId]: topicList
          }));
        } catch (err) {
          console.error('Failed to load topics for subject:', err);
        }
      }
      
      setSelectedSubjectForTopic(subjectId);
      setTopicFormData({ title: '', sequenceOrder: '', allocatedHours: '' });
    }
  };

  // Create new topic for selected subject
  const handleAddTopic = () => {
    if (!selectedSubjectForTopic || !topicFormData.title || !topicFormData.allocatedHours) {
      setError('Please fill in Topic Title and Hours');
      return;
    }

    const createTopicAsync = async () => {
      try {
        setTopicCreating(true);
        setError('');

        const topicPayload = {
          subjectId: selectedSubjectForTopic,
          title: topicFormData.title,
          description: '',
          sequenceOrder: parseInt(topicFormData.sequenceOrder) || 1,
          allocatedHours: Number(topicFormData.allocatedHours),
        };

        const createdTopic = await apiService.createTopic(topicPayload);
        console.log('Topic created:', createdTopic);

        // Update local topics map
        setSubjectTopicsMap(prev => ({
          ...prev,
          [selectedSubjectForTopic]: [
            ...(prev[selectedSubjectForTopic] || []),
            createdTopic
          ]
        }));

        // Reset form
        setTopicFormData({ title: '', sequenceOrder: '', allocatedHours: '' });
      } catch (err) {
        console.error('Failed to create topic:', err);
        const message =
          err.response?.data?.message ||
          err.response?.data ||
          'Failed to create topic.';
        setError(typeof message === 'string' ? message : 'Failed to create topic.');
      } finally {
        setTopicCreating(false);
      }
    };

    void createTopicAsync();
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
                const targetCode = resolveDepartmentCode();
                setActiveTab(item);
                if (item === 'Program - Topic') {
                  navigate(`/course-topic/${targetCode}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                  navigate(`/test-encoding/${targetCode}`);
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
                const targetCode = resolveDepartmentCode();
                if (item === 'Test Generation') {
                  navigate(`/test-generation/${targetCode}`);
                } else if (item === 'Saved Exam Sets') {
                  navigate(`/reports/saved-exams/${targetCode}`);
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

        {/* Search bar (same as Dashboard.jsx) */}
        <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search Program/Topic..." />
          </div>
        </div>

        {/* Course & Topic Container */}
        <div className="course-topic-container">
          <h2>Program & Topic Management</h2>

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
            <label>Program</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">Select Program</option>
              {isLoadingCourses ? (
                <option disabled>Loading programs...</option>
              ) : courses.length === 0 ? (
                <option disabled>No programs found for this department</option>
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

          {/* History Table - Subject and Topic */}
          <div className="history-table">
            <div className="history-row header">
              <span style={{width: '5%'}}>#</span>
              <span style={{width: '20%'}}>Subject Code</span>
              <span style={{width: '50%'}}>Topic</span>
              <span style={{width: '15%'}}>Hrs</span>
              <span style={{width: '10%'}}></span>
            </div>
            {isLoading && history.length === 0 && (
              <div className="history-row">
                <span colSpan={5}>Loading subjects and topics...</span>
              </div>
            )}
            {history.length === 0 && !isLoading && (
              <div className="history-row">
                <span colSpan={5}>No subjects created yet</span>
              </div>
            )}
            {history.map((item, index) => (
              <React.Fragment key={item.subjectId}>
                {/* Subject Row with Manage Topics button */}
                <div className="history-row subject-row">
                  <span style={{width: '5%'}}>{index + 1}</span>
                  <span style={{width: '25%'}}>{item.topicCode}</span>
                  <span style={{width: '50%'}}><strong>{item.topicDesc}</strong></span>
                  <span style={{width: '15%'}}>{item.hours}</span>
                  <span style={{width: '10%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <button 
                      className={`expand-btn ${expandedSubjectsMap[item.subjectId] ? 'expanded' : ''}`}
                      onClick={() => toggleSubjectExpansion(item.subjectId)}
                      title={expandedSubjectsMap[item.subjectId] ? 'Collapse topics' : 'Manage topics'}
                    >
                      {expandedSubjectsMap[item.subjectId] ? '▼' : '▶'}
                    </button>
                  </span>
                </div>
                
                {/* Default Topic Row - automatically created with subject */}
                {item.topic && (
                  <div className="history-row topic-row">
                    <span style={{width: '5%'}}>└</span>
                    <span style={{width: '20%'}}>-</span>
                    <span style={{width: '50%'}}>{item.topic.title} (Topic)</span>
                    <span style={{width: '15%'}}>{item.topic.allocatedHours}</span>
                    <span style={{width: '10%'}}></span>
                  </div>
                )}

                {/* Expanded Topics Section */}
                {expandedSubjectsMap[item.subjectId] && (
                  <div className="subject-topics-container">
                    {/* Existing Topics List */}
                    <div className="topics-list-section">
                      <h4>Topics for {item.topicDesc}</h4>
                      {subjectTopicsMap[item.subjectId] && subjectTopicsMap[item.subjectId].length > 0 ? (
                        <div className="topics-list">
                          {subjectTopicsMap[item.subjectId].map((topic, topicIdx) => (
                            <div key={topic.id} className="history-row topic-item-row">
                              <span style={{width: '5%'}}>{topicIdx + 1}</span>
                              <span style={{width: '20%'}}>{course.code}</span>
                              <span style={{width: '50%'}}>• {topic.title}</span>
                              <span style={{width: '15%'}}>{topic.allocatedHours} hrs</span>
                              <span style={{width: '10%'}}></span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-topics-msg">No additional topics created yet</p>
                      )}
                    </div>

                    {/* Form to Add New Topic */}
                    {selectedSubjectForTopic === item.subjectId && (
                      <div className="topic-form-section">
                        <h4>Add New Topic</h4>
                        <div className="topic-form">
                          <div className="form-row">
                            <div className="form-field">
                              <label>Topic Title</label>
                              <input 
                                type="text"
                                value={topicFormData.title}
                                onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})}
                                placeholder="Enter topic title"
                              />
                            </div>
                            <div className="form-field">
                              <label>Value</label>
                              <input 
                                type="number"
                                value={topicFormData.sequenceOrder}
                                onChange={(e) => setTopicFormData({...topicFormData, sequenceOrder: e.target.value})}
                                placeholder="1"
                              />
                            </div>
                            <div className="form-field">
                              <label>Hours</label>
                              <input 
                                type="number"
                                value={topicFormData.allocatedHours}
                                onChange={(e) => setTopicFormData({...topicFormData, allocatedHours: e.target.value})}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <button 
                            className="add-topic-btn"
                            onClick={handleAddTopic}
                            disabled={topicCreating}
                          >
                            {topicCreating ? 'Creating...' : 'Add Topic'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
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
