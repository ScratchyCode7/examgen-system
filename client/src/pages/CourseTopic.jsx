// Changes made (Dec 9, 2025):
// - Added navigation for Test Encoding/Test Question Editing in the Data Entry dropdown.
// - Integrated ThemeContext usage and ensured logout modal respects theme.
// See README for full details.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, FileText, Users, HelpCircle, Pencil, Trash2, ChevronRight, ChevronDown, Save, X, UserPlus, Building2, ShieldCheck, Tags } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TransferOwnershipModal from '../components/TransferOwnershipModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { usePrintRequestNotifications } from '../contexts/PrintRequestNotificationContext';
import { apiService } from '../services/api';
import '../styles/CourseTopic.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';
import { HELP_CENTER_URL } from '../constants/helpLinks';
import { getUserDisplayName, getUserProfileImageUrl } from '../utils/userDisplay';
const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];

/** Maps a Subject API record to a CourseTopic history row (JSON description holds form metadata). */
const mapSubjectApiToCourseTopicRow = (s) => {
  if (!s) return null;
  const subjectId = s.id ?? s.Id;
  const courseIdRaw = s.courseId ?? s.CourseId;
  if (subjectId == null) return null;
  if (!s.description && (courseIdRaw == null || courseIdRaw === undefined)) return null;

  try {
    const meta = s.description ? JSON.parse(s.description) : {};
    const courseIdFromMeta = meta.course != null ? Number(meta.course) : null;

    const derivedCourseCode = meta.courseCode || meta.topicCode || s.code || '';
    const derivedCourseTitle = meta.courseTitle || meta.topicTitle || meta.topicDesc || s.name || '';
    const derivedCourseUnits = meta.courseUnits || meta.topicUnits || meta.value || '';
    const derivedCourseHours = meta.courseHours || meta.hours || (s.hours ? Number(s.hours) : '');

    if (!derivedCourseCode || !derivedCourseTitle) return null;

    return {
      subjectId,
      courseId: courseIdRaw != null ? Number(courseIdRaw) : courseIdFromMeta,
      courseCode: derivedCourseCode,
      courseTitle: derivedCourseTitle,
      courseUnits: derivedCourseUnits,
      courseHours: derivedCourseHours,
      createdAt: s.createdAt,
      canEdit: s.canEdit === true,
      canDelete: s.canDelete === true,
    };
  } catch (ex) {
    console.warn('Invalid subject description JSON for subject', subjectId, ex);
    return null;
  }
};

const CourseTopic = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();
  const { pendingPrintRequestCount } = usePrintRequestNotifications();
  const navigate = useNavigate();
  const { departmentCode } = useParams();
  const [activeTab, setActiveTab] = useState('Program - Topic');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const userMenuRef = useRef(null);
  const departmentGridRef = useRef(null);
  const activeDepartmentRef = useRef(null);
  const courseSectionRef = useRef(null);
  const courseFormRef = useRef(null);
  const courseCodeInputRef = useRef(null);
  const historyTableRef = useRef(null);

  const displayName = getUserDisplayName(user, 'User');
  const profileImageUrl = user?.profileImageData || getUserProfileImageUrl(user?.profileImagePath, user?.userId);

  const testGenerationLabel = isAdmin ? "Test Generation" : "Test Creation";
  const reportItems = isAdmin
    ? [testGenerationLabel, "Saved Exam Sets", "Print Requests"]
    : [testGenerationLabel, "Saved Exam Sets"];
  const reportsNotificationCount = isAdmin ? pendingPrintRequestCount : 0;

  // Course topic form states
  const [course, setCourse] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseUnits, setCourseUnits] = useState("");
  const [courseHours, setCourseHours] = useState("");
  // dynamic lists
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [userCourses, setUserCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  // Topic Management states
  const [expandedSubjectsMap, setExpandedSubjectsMap] = useState({});
  const [subjectTopicsMap, setSubjectTopicsMap] = useState({});
  const [topicFormData, setTopicFormData] = useState({ title: '', allocatedHours: '' });
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicCreating, setTopicCreating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [transferTopicModal, setTransferTopicModal] = useState({
    isOpen: false,
    subjectId: null,
    topic: null,
    targetUserId: '',
    transferQuestions: false,
    isSubmitting: false,
  });
  const [transferUsers, setTransferUsers] = useState([]);
  const [isLoadingTransferUsers, setIsLoadingTransferUsers] = useState(false);

  // Program Creation states (for admins)
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [programFormData, setProgramFormData] = useState({ programName: '', programCode: '', programDescription: '' });
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

  // User Enrollment states (for admins)
  const [showUserEnrollmentModal, setShowUserEnrollmentModal] = useState(false);
  const [enrollmentUsers, setEnrollmentUsers] = useState([]);
  const [selectedUserForEnrollment, setSelectedUserForEnrollment] = useState(null);
  const [selectedEnrollmentDepartment, setSelectedEnrollmentDepartment] = useState(null);
  const [selectedEnrollmentDepartmentHasAccess, setSelectedEnrollmentDepartmentHasAccess] = useState(false);
  const [selectedEnrollmentDepartmentExistingAccess, setSelectedEnrollmentDepartmentExistingAccess] = useState(false);
  const [enrollmentCourses, setEnrollmentCourses] = useState([]);
  const [isLoadingEnrollmentCourses, setIsLoadingEnrollmentCourses] = useState(false);
  const [selectedEnrollmentCourse, setSelectedEnrollmentCourse] = useState(null);
  const [selectedEnrollmentSubjectIds, setSelectedEnrollmentSubjectIds] = useState([]);
  const [isCourseSelectorExpanded, setIsCourseSelectorExpanded] = useState(false);
  const [selectedEnrollmentCourseHasAccess, setSelectedEnrollmentCourseHasAccess] = useState(false);
  const [selectedEnrollmentCourseExistingAccess, setSelectedEnrollmentCourseExistingAccess] = useState(false);
  const [selectedEnrollmentTopics, setSelectedEnrollmentTopics] = useState([]);
  const [selectedEnrollmentTopicIds, setSelectedEnrollmentTopicIds] = useState([]);
  const [existingEnrollmentTopicIds, setExistingEnrollmentTopicIds] = useState([]);
  const [isLoadingEnrollmentTopics, setIsLoadingEnrollmentTopics] = useState(false);
  const [isEnrollingUser, setIsEnrollingUser] = useState(false);
  const [isTopicAccessModalOpen, setIsTopicAccessModalOpen] = useState(false);
  const [topicAccessTarget, setTopicAccessTarget] = useState(null);
  const [topicAccessCourseId, setTopicAccessCourseId] = useState(null);
  const [selectedUserForTopicAccess, setSelectedUserForTopicAccess] = useState(null);
  const [topicAccessHasAccess, setTopicAccessHasAccess] = useState(false);
  const [topicAccessExisting, setTopicAccessExisting] = useState(false);
  const [isGrantingTopicAccess, setIsGrantingTopicAccess] = useState(false);

  const [allSubjects, setAllSubjects] = useState([]);

  const availableDataEntryItems = isAdmin ? ['Program - Topic'] : dataEntryItems;
  const isDataEntryActive = availableDataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';
  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredHistory = useMemo(() => {
    if (!normalizedSearchText) return history;

    return history.filter((item) => {
      const topics = subjectTopicsMap[item.subjectId] || [];
      const searchableTopicTitles = topics.map((topic) => topic?.title || '').join(' ');
      const searchableText = [
        item.courseCode,
        item.courseTitle,
        String(item.courseHours ?? ''),
        searchableTopicTitles,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchText);
    });
  }, [history, subjectTopicsMap, normalizedSearchText]);

  const toErrorMessage = useCallback((error, fallbackMessage) => {
    const payload = error?.response?.data;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const fromPayload = payload.message || payload.detail || payload.title;
      if (typeof fromPayload === 'string' && fromPayload.trim()) {
        return fromPayload;
      }
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return fallbackMessage;
  }, []);

  const resolveDepartmentCode = () => {
    if (departmentCode) return departmentCode;
    const fallback = departments.find(d => !['IT', 'ITS'].includes((d.code || '').toUpperCase())) || departments[0];
    return fallback?.code || 'CCS';
  };

  const getCurrentDepartment = () => {
    if (departmentCode) {
      return departments.find(d => d.code === departmentCode);
    }

    if (courses.length > 0) {
      return departments.find(d => d.id === courses[0].departmentId);
    }

    return undefined;
  };

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
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const grid = departmentGridRef.current;
    const activeCard = activeDepartmentRef.current;
    if (!grid || !activeCard) return;

    const gridRect = grid.getBoundingClientRect();
    const activeRect = activeCard.getBoundingClientRect();
    const targetLeft = activeCard.offsetLeft - (gridRect.width / 2) + (activeRect.width / 2);

    grid.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [departmentCode, departments.length]);

  // Subjects for history: loaded per program (course) in the current department — not a global paged list,
  // which previously mixed unrelated programs and broke the department filter.
  useEffect(() => {
    let cancelled = false;

    const loadSubjectsForDepartmentPrograms = async () => {
      if (!departmentCode || !departments.length) {
        if (!cancelled) setAllSubjects([]);
        return;
      }

      const dept = departments.find((d) => d.code === departmentCode);
      if (!dept || !courses.length) {
        if (!cancelled) setAllSubjects([]);
        return;
      }

      try {
        setIsLoading(true);

        const perCourseResults = await Promise.all(
          courses.map(async (c) => {
            const courseId = Number(c.id);
            if (!Number.isFinite(courseId)) return [];

            try {
              const result = await apiService.getSubjects({ courseId, pageSize: 500 });
              const items = Array.isArray(result)
                ? result
                : (result?.items || result?.Items || result?.data || []);
              return (Array.isArray(items) ? items : [])
                .map((s) => mapSubjectApiToCourseTopicRow(s))
                .filter(Boolean);
            } catch (err) {
              console.error('Failed to load subjects for course', courseId, err);
              return [];
            }
          })
        );

        if (!cancelled) {
          setAllSubjects(perCourseResults.flat());
        }
      } catch (err) {
        console.error('Failed to load subjects for CourseTopic history:', err);
        if (!cancelled) setAllSubjects([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadSubjectsForDepartmentPrograms();
    return () => {
      cancelled = true;
    };
  }, [departmentCode, departments, courses]);

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
      if (!match) console.debug(`Excluding subject ${s.courseCode} course:${subjCourseId}`);
      return match;
    });

    console.log('Filtered subjects for this department:', filtered);
    setHistory(filtered);
  }, [departments, departmentCode, courses, allSubjects]);

  useEffect(() => {
    const loadDepartments = async () => {
      if (!user?.userId) return;
      
      try {
        setIsLoadingDepartments(true);
        // Admin sees all departments, non-admin sees only assigned departments
        const data = isAdmin 
          ? await apiService.getDepartments()
          : await apiService.getUserDepartments(user.userId);
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
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user?.userId || isAdmin) return;

    const loadUserCourses = async () => {
      try {
        const data = await apiService.getUserCourses(user.userId);
        const list = Array.isArray(data) ? data : [];
        setUserCourses(list);
      } catch (err) {
        console.error('Failed to load user courses for CourseTopic:', err);
        setUserCourses([]);
      }
    };

    void loadUserCourses();
  }, [user, isAdmin]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!departmentCode) return setCourses([]);
      const dept = departments.find(d => d.code === departmentCode);
      console.log('CourseTopic: departmentCode', departmentCode, 'matched dept', dept);
      if (!dept) return setCourses([]);

      if (!isAdmin) {
        const scopedCourses = userCourses.filter(course => course.departmentId === dept.id);
        setCourses(scopedCourses);
        return;
      }

      try {
        setIsLoadingCourses(true);
        const data = await apiService.getCourses(dept.id, { pageSize: 500 });
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
  }, [departmentCode, departments, isAdmin, userCourses]);

  const loadTransferUsers = useCallback(async () => {
    if (!isAdmin) {
      setTransferUsers([]);
      return;
    }

    try {
      setIsLoadingTransferUsers(true);
      const result = await apiService.getUsers(1, 500);
      const rawUsers = Array.isArray(result)
        ? result
        : (Array.isArray(result?.items) ? result.items : (Array.isArray(result?.data) ? result.data : []));

      const normalizedUsers = rawUsers
        .filter((item) => item && item.userId)
        .filter((item) => item.isActive !== false)
        .sort((a, b) => {
          const left = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const right = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          return left.localeCompare(right);
        });

      setTransferUsers(normalizedUsers);
    } catch (err) {
      console.error('Failed to load users for transfer modal:', err);
      setTransferUsers([]);
      showToast({ message: 'Failed to load users for transfer.', type: 'error' });
    } finally {
      setIsLoadingTransferUsers(false);
    }
  }, [isAdmin, showToast]);

  const loadEnrollmentUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const data = await apiService.getUsers(1, 100); // Load more users for enrollment
      setEnrollmentUsers(data.items || data || []);
    } catch (err) {
      console.error('Failed to load users for enrollment:', err);
      setEnrollmentUsers([]);
      showToast({ message: 'Failed to load users for enrollment.', type: 'error' });
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadTransferUsers();
  }, [isAdmin, loadTransferUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadEnrollmentUsers();
  }, [isAdmin, loadEnrollmentUsers]);

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
    if (!course) {
      showToast({ message: 'Please select a Course.', type: 'error' });
      return;
    }
    if (!courseCode) {
      showToast({ message: 'Course Code is required.', type: 'error' });
      return;
    }
    if (!courseTitle) {
      showToast({ message: 'Course Title is required.', type: 'error' });
      return;
    }
    if (!courseUnits) {
      showToast({ message: 'Course Units is required.', type: 'error' });
      return;
    }
    if (!courseHours) {
      showToast({ message: 'Course Hours is required.', type: 'error' });
      return;
    }

    const saveAsync = async () => {
      try {
        setIsLoading(true);

        // Pack the extra metadata into the Subject.Description field as JSON
        const description = JSON.stringify({
          course,
          courseCode,
          courseTitle,
          courseUnits,
          courseHours,
          // Backward compatibility fields
          topicCode: courseCode,
          topicTitle: courseTitle,
          topicDesc: courseTitle,
          topicUnits: courseUnits,
          value: courseUnits,
          hours: courseHours,
        });

        const subjectPayload = {
          courseId: Number(course),
          code: courseCode,
          name: courseTitle,
          description,
        };

        if (editingSubjectId) {
          const updatedSubject = await apiService.updateSubject(editingSubjectId, subjectPayload);
          console.log('Subject updated:', updatedSubject);

          const mapped = mapSubjectApiToCourseTopicRow(updatedSubject);
          if (mapped) {
            setAllSubjects((prev) => prev.map((entry) => (
              entry.subjectId === editingSubjectId ? mapped : entry
            )));
          }

          showToast({ message: 'Course entry updated successfully.', type: 'success' });
          setEditingSubjectId(null);
        } else {
          const createdSubject = await apiService.createSubject(subjectPayload);
          console.log('Subject created:', createdSubject);

          const mapped = mapSubjectApiToCourseTopicRow(createdSubject);
          if (mapped) {
            setAllSubjects((prev) => [...prev, mapped]);
          }

          showToast({ message: 'Course entry created successfully.', type: 'success' });
        }

        setCourse("");
        setCourseCode("");
        setCourseTitle("");
        setCourseUnits("");
        setCourseHours("");
      } catch (err) {
        console.error('Failed to save program topic:', err);
        const message = toErrorMessage(err, 'Failed to save program topic. Please verify your department access and try again.');
        showToast({ message, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    void saveAsync();
  };

  const handleEditSubjectRow = (item) => {
    if (!item.canEdit) {
      showToast({ message: 'You do not have permission to edit this course entry.', type: 'error' });
      return;
    }

    setEditingSubjectId(item.subjectId);
    setCourse(String(item.courseId || ''));
    setCourseCode(item.courseCode || '');
    setCourseTitle(item.courseTitle || '');
    setCourseUnits(String(item.courseUnits || ''));
    setCourseHours(String(item.courseHours || ''));

    requestAnimationFrame(() => {
      if (courseSectionRef.current) {
        const sectionTop = courseSectionRef.current.getBoundingClientRect().top + window.scrollY;
        const topOffset = 84;
        window.scrollTo({
          top: Math.max(0, sectionTop - topOffset),
          behavior: 'smooth',
        });
      }

      setTimeout(() => {
        if (courseCodeInputRef.current) {
          courseCodeInputRef.current.focus({ preventScroll: true });
        }
      }, 250);
    });
  };

  const handleDeleteSubjectRow = async (item) => {
    if (!item.canDelete) {
      showToast({ message: 'You do not have permission to delete this course entry.', type: 'error' });
      return;
    }

    setDeleteConfirmation({
      type: 'course',
      subjectId: item.subjectId,
      courseTitle: item.courseTitle,
    });
  };

  const closeDeleteConfirmation = () => {
    if (isDeleteSubmitting) return;
    setDeleteConfirmation(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      setIsDeleteSubmitting(true);

      if (deleteConfirmation.type === 'course') {
        await apiService.deleteSubject(deleteConfirmation.subjectId);
        setAllSubjects((prev) => prev.filter((entry) => entry.subjectId !== deleteConfirmation.subjectId));
        if (editingSubjectId === deleteConfirmation.subjectId) {
          setEditingSubjectId(null);
          setCourse("");
          setCourseCode("");
          setCourseTitle("");
          setCourseUnits("");
          setCourseHours("");
        }
        showToast({ message: 'Course entry deleted successfully.', type: 'success' });
      } else if (deleteConfirmation.type === 'topic') {
        await apiService.deleteTopic(deleteConfirmation.topicId);
        await refreshSubjectTopics(deleteConfirmation.subjectId);
        showToast({ message: 'Topic deleted successfully.', type: 'success' });
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
      const fallbackMessage = deleteConfirmation.type === 'course'
        ? 'Failed to delete course entry.'
        : 'Failed to delete topic.';
      const message = toErrorMessage(err, fallbackMessage);
      showToast({ message, type: 'error' });
    } finally {
      setIsDeleteSubmitting(false);
      setDeleteConfirmation(null);
    }
  };

  const handleCancelSubjectEdit = () => {
    setEditingSubjectId(null);
    setCourse("");
    setCourseCode("");
    setCourseTitle("");
    setCourseUnits("");
    setCourseHours("");
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

      if (selectedSubjectForTopic === subjectId) {
        setSelectedSubjectForTopic(null);
        setEditingTopic(null);
        setTopicFormData({ title: '', allocatedHours: '' });
      }
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
      setEditingTopic(null);
      setTopicFormData({ title: '', allocatedHours: '' });

      // Scroll the subject-topics-container to center of screen after expanding
      requestAnimationFrame(() => {
        const subjectRow = document.querySelector(`[data-subject-id="${subjectId}"]`);
        if (subjectRow) {
          const nextSibling = subjectRow.nextElementSibling;
          if (nextSibling && nextSibling.classList.contains('subject-topics-container')) {
            nextSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }
  };

  const handleSearchNavigate = async () => {
    if (!normalizedSearchText) return;

    const firstMatch = filteredHistory[0];
    if (!firstMatch) return;

    if (!expandedSubjectsMap[firstMatch.subjectId]) {
      await toggleSubjectExpansion(firstMatch.subjectId);
    }

    requestAnimationFrame(() => {
      const targetRow = document.querySelector(`[data-subject-id="${firstMatch.subjectId}"]`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const scrollToHistoryTable = () => {
    if (!historyTableRef.current) return;
    historyTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Create new topic for selected subject
  const handleAddTopic = async () => {
    if (!selectedSubjectForTopic) {
      showToast({ message: 'Please select a Subject first.', type: 'error' });
      return;
    }
    if (!topicFormData.title || !topicFormData.title.trim()) {
      showToast({ message: 'Topic Title is required.', type: 'error' });
      return;
    }
    if (!topicFormData.allocatedHours) {
      showToast({ message: 'Allocated Hours is required.', type: 'error' });
      return;
    }

    try {
      setTopicCreating(true);

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
      setTopicFormData({ title: '', allocatedHours: '' });
    } catch (err) {
      console.error('Failed to create topic:', err);
      const message = toErrorMessage(err, 'Failed to create topic.');
      showToast({ message, type: 'error' });
    } finally {
      setTopicCreating(false);
    }
  };

  const refreshSubjectTopics = async (subjectId) => {
    try {
      const topics = await apiService.getTopics(subjectId);
      const topicList = Array.isArray(topics) ? topics : topics.items || topics.data || [];
      setSubjectTopicsMap(prev => ({
        ...prev,
        [subjectId]: topicList,
      }));
    } catch (err) {
      console.error('Failed to refresh topics:', err);
    }
  };

  const handleEditTopic = (subjectId, topic) => {
    if (!topic.canEdit) {
      showToast({ message: 'You do not have permission to edit this topic.', type: 'error' });
      return;
    }

    setSelectedSubjectForTopic(subjectId);
    setEditingTopic(topic);
    setTopicFormData({
      title: topic.title || '',
      allocatedHours: String(topic.allocatedHours ?? ''),
    });
  };

  const handleUpdateTopic = async () => {
    if (!selectedSubjectForTopic || !editingTopic) {
      return;
    }

    const trimmedTitle = topicFormData.title.trim();
    if (!trimmedTitle) {
      showToast({ message: 'Topic title is required.', type: 'error' });
      return;
    }

    const nextHours = Number(topicFormData.allocatedHours);
    if (!Number.isFinite(nextHours) || nextHours < 0) {
      showToast({ message: 'Allocated hours must be a valid non-negative number.', type: 'error' });
      return;
    }

    try {
      setTopicCreating(true);

      await apiService.updateTopic(editingTopic.id, {
        title: trimmedTitle,
        description: editingTopic.description || '',
        sequenceOrder: parseInt(topicFormData.sequenceOrder) || editingTopic.sequenceOrder || 1,
        allocatedHours: nextHours,
        isActive: editingTopic.isActive,
      });

      await refreshSubjectTopics(selectedSubjectForTopic);
      setEditingTopic(null);
      setTopicFormData({ title: '', sequenceOrder: '', allocatedHours: '' });
      showToast({ message: 'Topic updated successfully.', type: 'success' });
    } catch (err) {
      console.error('Failed to update topic:', err);
      const message = toErrorMessage(err, 'Failed to update topic.');
      showToast({ message, type: 'error' });
    } finally {
      setTopicCreating(false);
    }
  };

  const handleCancelTopicEdit = () => {
    setEditingTopic(null);
    setTopicFormData({ title: '', allocatedHours: '' });
  };

  const preventNumberInputWheel = (event) => {
    event.currentTarget.blur();
  };

  const handleDeleteTopic = async (subjectId, topic) => {
    if (!topic.canDelete) {
      showToast({ message: 'You do not have permission to delete this topic.', type: 'error' });
      return;
    }

    setDeleteConfirmation({
      type: 'topic',
      subjectId,
      topicId: topic.id,
      topicTitle: topic.title,
    });
  };

  const closeTransferTopicOwnershipModal = () => {
    if (transferTopicModal.isSubmitting) return;
    setTransferTopicModal({
      isOpen: false,
      subjectId: null,
      topic: null,
      targetUserId: '',
      transferQuestions: false,
      isSubmitting: false,
    });
  };

  const submitTransferTopicOwnership = async () => {
    const targetUserId = transferTopicModal.targetUserId.trim();
    if (!targetUserId) {
      showToast({ message: 'Please select a user.', type: 'error' });
      return;
    }

    if (!transferTopicModal.topic || !transferTopicModal.subjectId) {
      return;
    }

    setTransferTopicModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const result = await apiService.transferTopicOwnership(
        transferTopicModal.topic.id,
        targetUserId,
        transferTopicModal.transferQuestions,
        `Ownership transferred by admin ${user?.userId || 'unknown'}`
      );

      await refreshSubjectTopics(transferTopicModal.subjectId);

      const questionsTransferred = Number(result?.questionsTransferred || 0);
      showToast({
        message: transferTopicModal.transferQuestions
          ? `Topic ownership transferred. ${questionsTransferred} question(s) also transferred.`
          : 'Topic ownership transferred successfully.',
        type: 'success',
      });
      closeTransferTopicOwnershipModal();
    } catch (err) {
      console.error('Failed to transfer topic ownership:', err);
      const message = toErrorMessage(err, 'Failed to transfer topic ownership.');
      showToast({ message, type: 'error' });
      setTransferTopicModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleSubmitTopicForm = async () => {
    if (editingTopic) {
      await handleUpdateTopic();
      return;
    }

    await handleAddTopic();
  };

  // Create new program for current department (admin only)
  const handleAddProgram = () => {
    if (!programFormData.programName || !programFormData.programCode) {
      showToast({ message: 'Please fill in Program Name and Code.', type: 'error' });
      return;
    }

    const selectedCode = departmentCode || resolveDepartmentCode();
    const selectedDepartment = departments.find((d) => d.code === selectedCode);
    if (!selectedDepartment) {
      showToast({ message: 'Department not found.', type: 'error' });
      return;
    }

    const createProgramAsync = async () => {
      try {
        setIsCreatingProgram(true);

        const coursePayload = {
          departmentId: selectedDepartment.id,
          name: programFormData.programName,
          code: programFormData.programCode,
          description: programFormData.programDescription || null,
        };

        const createdCourse = await apiService.createCourse(coursePayload);
        console.log('Program created:', createdCourse);

        // Update local courses list
        setCourses(prev => [...prev, createdCourse]);

        // Reset form
        setProgramFormData({ programName: '', programCode: '', programDescription: '' });
        setShowProgramForm(false);

        showToast({ 
          message: `Program "${programFormData.programName}" created successfully.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Failed to create program:', err);
        const message = toErrorMessage(err, 'Failed to create program.');
        showToast({ message, type: 'error' });
      } finally {
        setIsCreatingProgram(false);
      }
    };

    void createProgramAsync();
  };

  const loadEnrollmentCoursesForDepartment = useCallback(async (departmentId) => {
    if (!departmentId) {
      setEnrollmentCourses([]);
      return;
    }

    try {
      setIsLoadingEnrollmentCourses(true);
      const data = await apiService.getCourses(departmentId, { pageSize: 500 });
      const list = Array.isArray(data) ? data : [];
      setEnrollmentCourses(list);
    } catch (err) {
      console.error('Failed to load courses for enrollment:', err);
      setEnrollmentCourses([]);
    } finally {
      setIsLoadingEnrollmentCourses(false);
    }
  }, []);

  const loadEnrollmentAccessForUser = useCallback(async (userId, courseId, subjectId = null) => {
    if (!userId || !courseId) {
      setSelectedEnrollmentCourseHasAccess(false);
      setSelectedEnrollmentCourseExistingAccess(false);
      return;
    }

    try {
      const userCourseList = await apiService.getUserCourses(userId);

      const hasAccess = Array.isArray(userCourseList)
        ? userCourseList.some((course) => Number(course.id) === Number(courseId))
        : false;

      setSelectedEnrollmentCourseHasAccess(hasAccess);
      setSelectedEnrollmentCourseExistingAccess(hasAccess);
    } catch (err) {
      console.error('Failed to load user access for enrollment:', err);
      setSelectedEnrollmentCourseHasAccess(false);
      setSelectedEnrollmentCourseExistingAccess(false);
    }
  }, []);

  const handleEnrollUser = async () => {
    if (!selectedUserForEnrollment) {
      showToast({ message: 'Please select a user.', type: 'error' });
      return;
    }

    if (!selectedEnrollmentDepartment?.id) {
      showToast({ message: 'Please select a department.', type: 'error' });
      return;
    }

    if (!selectedEnrollmentCourse?.id) {
      showToast({ message: 'Please select a program to enroll the user in.', type: 'error' });
      return;
    }

    if (!selectedEnrollmentDepartmentHasAccess && selectedEnrollmentCourseHasAccess) {
      showToast({ message: 'Grant department access before assigning programs.', type: 'error' });
      return;
    }

    if (!selectedEnrollmentDepartmentHasAccess && selectedEnrollmentTopicIds.length > 0) {
      showToast({ message: 'Grant department access before assigning topics.', type: 'error' });
      return;
    }

    if (selectedEnrollmentTopicIds.length > 0 && !selectedEnrollmentCourseHasAccess) {
      showToast({ message: 'Grant program access before assigning topics.', type: 'error' });
      return;
    }

    try {
      setIsEnrollingUser(true);

      if (selectedEnrollmentDepartmentHasAccess && !selectedEnrollmentDepartmentExistingAccess) {
        await apiService.addUserDepartment(selectedUserForEnrollment.userId, selectedEnrollmentDepartment.id);
      } else if (!selectedEnrollmentDepartmentHasAccess && selectedEnrollmentDepartmentExistingAccess) {
        await apiService.removeUserDepartment(selectedUserForEnrollment.userId, selectedEnrollmentDepartment.id);
      }

      if (selectedEnrollmentCourseHasAccess && !selectedEnrollmentCourseExistingAccess) {
        await apiService.addUserCourse(selectedUserForEnrollment.userId, selectedEnrollmentCourse.id);
      } else if (!selectedEnrollmentCourseHasAccess && selectedEnrollmentCourseExistingAccess) {
        await apiService.removeUserCourse(selectedUserForEnrollment.userId, selectedEnrollmentCourse.id);
      }

      const topicsToAdd = selectedEnrollmentTopicIds.filter(
        (topicId) => !existingEnrollmentTopicIds.includes(topicId)
      );
      const topicsToRemove = existingEnrollmentTopicIds.filter(
        (topicId) => !selectedEnrollmentTopicIds.includes(topicId)
      );

      for (const topicId of topicsToAdd) {
        await apiService.addUserTopic(selectedUserForEnrollment.userId, topicId);
      }

      for (const topicId of topicsToRemove) {
        await apiService.removeUserTopic(selectedUserForEnrollment.userId, topicId);
      }

      showToast({
        message: `Assignments updated for "${selectedUserForEnrollment.firstName} ${selectedUserForEnrollment.lastName}".`,
        type: 'success'
      });

      await loadEnrollmentUsers();

      setSelectedEnrollmentCourse(null);
      setSelectedEnrollmentSubjectIds([]);
      setSelectedEnrollmentDepartment(null);
      setSelectedUserForEnrollment(null);
      setSelectedEnrollmentCourseHasAccess(false);
      setSelectedEnrollmentCourseExistingAccess(false);
      setSelectedEnrollmentTopicIds([]);
      setExistingEnrollmentTopicIds([]);
      setShowUserEnrollmentModal(false);
    } catch (err) {
      console.error('Failed to update user assignments:', err);
      const message = toErrorMessage(err, 'Failed to update user assignments.');
      showToast({ message, type: 'error' });
    } finally {
      setIsEnrollingUser(false);
    }
  };

  const openCourseEnrollmentForSelected = () => {
    if (!isAdmin) {
      showToast({ message: 'Only admins can add users to courses.', type: 'error' });
      return;
    }

    const currentDept = getCurrentDepartment();

    setSelectedEnrollmentDepartment(currentDept || null);
    setEnrollmentCourses(courses);
    setSelectedEnrollmentCourse(null);
    setSelectedEnrollmentSubjectIds([]);
    setIsCourseSelectorExpanded(false);
    setSelectedEnrollmentTopics([]);
    setSelectedEnrollmentTopicIds([]);
    setExistingEnrollmentTopicIds([]);
    setSelectedUserForEnrollment(null);
    setSelectedEnrollmentCourseHasAccess(false);
    setSelectedEnrollmentCourseExistingAccess(false);
    setSelectedEnrollmentDepartmentHasAccess(false);
    setSelectedEnrollmentDepartmentExistingAccess(false);
    setShowUserEnrollmentModal(true);

    if (currentDept?.id) {
      void loadEnrollmentCoursesForDepartment(currentDept.id);
    }
  };

  const loadSelectedCourseAccessForEnrollment = useCallback(async (userId, courseId, departmentId, subjectId = null) => {
    if (!userId || !departmentId) {
      setSelectedEnrollmentDepartmentHasAccess(false);
      setSelectedEnrollmentDepartmentExistingAccess(false);
    }

    try {
      const userDepartmentList = await apiService.getUserDepartments(userId);
      const hasDepartmentAccess = Array.isArray(userDepartmentList)
        ? userDepartmentList.some((dept) => Number(dept.id) === Number(departmentId))
        : false;

      setSelectedEnrollmentDepartmentHasAccess(hasDepartmentAccess);
      setSelectedEnrollmentDepartmentExistingAccess(hasDepartmentAccess);

      if (!courseId) {
        setSelectedEnrollmentCourseHasAccess(false);
        setSelectedEnrollmentCourseExistingAccess(false);
        setSelectedEnrollmentSubjectIds([]);
        setSelectedEnrollmentTopics([]);
        setSelectedEnrollmentTopicIds([]);
        setExistingEnrollmentTopicIds([]);
        return;
      }

      await loadEnrollmentAccessForUser(userId, courseId, subjectId);

      const availableSubjectIds = Array.from(new Set(
        history
          .filter((item) => Number(item.courseId) === Number(courseId))
          .map((item) => Number(item.subjectId))
          .filter(Number.isFinite)
      ));

      if (availableSubjectIds.length === 0) {
        setSelectedEnrollmentSubjectIds([]);
        setSelectedEnrollmentTopics([]);
        setSelectedEnrollmentTopicIds([]);
        setExistingEnrollmentTopicIds([]);
        return;
      }

      const userTopicList = await apiService.getUserTopics(userId);
      const existingTopicIds = Array.isArray(userTopicList)
        ? userTopicList
            .filter((topic) => availableSubjectIds.includes(Number(topic.subjectId)))
            .map((topic) => Number(topic.id))
        : [];

      const existingSubjectIds = availableSubjectIds.filter((id) =>
        Array.isArray(userTopicList)
          ? userTopicList.some((topic) => Number(topic.subjectId) === id)
          : false
      );

      setSelectedEnrollmentSubjectIds(existingSubjectIds);
      setExistingEnrollmentTopicIds(existingTopicIds);
      void applyEnrollmentSubjects(existingSubjectIds, existingTopicIds);
    } catch (err) {
      console.error('Failed to load user departments for enrollment:', err);
      setSelectedEnrollmentDepartmentHasAccess(false);
      setSelectedEnrollmentDepartmentExistingAccess(false);
      setSelectedEnrollmentCourseHasAccess(false);
      setSelectedEnrollmentCourseExistingAccess(false);
      setSelectedEnrollmentSubjectIds([]);
      setSelectedEnrollmentTopics([]);
      setSelectedEnrollmentTopicIds([]);
      setExistingEnrollmentTopicIds([]);
    }
  }, [applyEnrollmentSubjects, history, loadEnrollmentAccessForUser]);

  const applyEnrollmentSubjects = useCallback(async (subjectIds, preselectedTopicIds = null) => {
    const normalizedSubjectIds = Array.from(new Set(subjectIds.map((id) => Number(id)).filter(Number.isFinite)));

    if (normalizedSubjectIds.length === 0) {
      setSelectedEnrollmentTopics([]);
      setSelectedEnrollmentTopicIds([]);
      return;
    }

    try {
      setIsLoadingEnrollmentTopics(true);
      const topicLists = await Promise.all(
        normalizedSubjectIds.map((subjectId) => apiService.getTopics(subjectId))
      );

      const mergedTopics = [];
      const seenTopicIds = new Set();
      for (const list of topicLists) {
        const topicArray = Array.isArray(list) ? list : [];
        for (const topic of topicArray) {
          const topicId = Number(topic?.id);
          if (!Number.isFinite(topicId) || seenTopicIds.has(topicId)) continue;
          seenTopicIds.add(topicId);
          mergedTopics.push(topic);
        }
      }

      setSelectedEnrollmentTopics(mergedTopics);
      if (Array.isArray(preselectedTopicIds)) {
        const allowedTopicIds = new Set(mergedTopics.map((topic) => Number(topic.id)));
        setSelectedEnrollmentTopicIds(
          preselectedTopicIds
            .map((id) => Number(id))
            .filter((id) => allowedTopicIds.has(id))
        );
      } else {
        setSelectedEnrollmentTopicIds(mergedTopics.map((topic) => Number(topic.id)));
      }
    } catch (err) {
      console.error('Failed to load topics for selected subjects:', err);
      setSelectedEnrollmentTopics([]);
      setSelectedEnrollmentTopicIds([]);
    } finally {
      setIsLoadingEnrollmentTopics(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUserForEnrollment?.userId || !selectedEnrollmentDepartment?.id) {
      return;
    }

    void loadSelectedCourseAccessForEnrollment(
      selectedUserForEnrollment.userId,
      selectedEnrollmentCourse?.id,
      selectedEnrollmentDepartment.id,
      null
    );
  }, [
    selectedUserForEnrollment,
    selectedEnrollmentDepartment,
    selectedEnrollmentCourse,
    loadSelectedCourseAccessForEnrollment,
  ]);

  const closeTopicAccessModal = () => {
    if (isGrantingTopicAccess) return;
    setIsTopicAccessModalOpen(false);
    setTopicAccessTarget(null);
    setTopicAccessCourseId(null);
    setSelectedUserForTopicAccess(null);
    setTopicAccessHasAccess(false);
    setTopicAccessExisting(false);
  };

  useEffect(() => {
    let isMounted = true;

    const loadTopicAccess = async () => {
      if (!topicAccessTarget?.id || !selectedUserForTopicAccess?.userId) {
        if (isMounted) {
          setTopicAccessExisting(false);
          setTopicAccessHasAccess(false);
        }
        return;
      }

      try {
        const userTopics = await apiService.getUserTopics(selectedUserForTopicAccess.userId);
        const hasAccess = Array.isArray(userTopics)
          ? userTopics.some((topic) => Number(topic.id) === Number(topicAccessTarget.id))
          : false;

        if (isMounted) {
          setTopicAccessExisting(hasAccess);
          setTopicAccessHasAccess(hasAccess);
        }
      } catch (err) {
        console.error('Failed to load topic access for user:', err);
        if (isMounted) {
          setTopicAccessExisting(false);
          setTopicAccessHasAccess(false);
        }
      }
    };

    void loadTopicAccess();
    return () => {
      isMounted = false;
    };
  }, [topicAccessTarget, selectedUserForTopicAccess]);

  const submitTopicAccess = async () => {
    if (!topicAccessTarget?.id || !selectedUserForTopicAccess?.userId) {
      showToast({ message: 'Please select a topic and a user.', type: 'error' });
      return;
    }

    try {
      setIsGrantingTopicAccess(true);

      if (topicAccessHasAccess) {
        if (!topicAccessExisting) {
          await apiService.addUserTopic(
            selectedUserForTopicAccess.userId,
            topicAccessTarget.id
          );
          showToast({ message: 'Topic access granted successfully.', type: 'success' });
        } else {
          showToast({ message: 'User already has access to this topic.', type: 'info' });
        }
      } else if (topicAccessExisting) {
        await apiService.removeUserTopic(
          selectedUserForTopicAccess.userId,
          topicAccessTarget.id
        );
        showToast({ message: 'Topic access revoked.', type: 'success' });
      } else {
        showToast({ message: 'No topic access changes to apply.', type: 'info' });
      }

      if (topicAccessTarget.subjectId) {
        await refreshSubjectTopics(topicAccessTarget.subjectId);
      }
      closeTopicAccessModal();
    } catch (err) {
      console.error('Failed to update topic access:', err);
      const message = toErrorMessage(err, 'Failed to update topic access.');
      showToast({ message, type: 'error' });
    } finally {
      setIsGrantingTopicAccess(false);
    }
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        {/* Role-aware navbar: matches admin/user entry points from dashboards */}
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button
              className={`navbar-menu-toggle ${isMobileNavOpen ? 'open' : ''}`}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileNavOpen}
              aria-controls="primary-navigation"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>

            <button onClick={() => { setActiveTab('Home'); navigate(isAdmin ? '/admin' : '/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div id="primary-navigation" className={`nav-center ${isMobileNavOpen ? 'mobile-open' : ''}`}>
            <NavItem icon={Home} label="Home" isActive={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); navigate(isAdmin ? '/admin' : '/'); }} />
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
                const targetCode = resolveDepartmentCode();
                setActiveTab(item);
                if (item === 'Program - Topic') {
                  navigate(`/course-topic/${targetCode}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                  const targetTab = item === 'Test Encoding' ? 'Test Question Encoding' : item;
                  navigate(`/test-encoding/${targetCode}`, { state: { activeTab: targetTab } });
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
                const targetCode = resolveDepartmentCode();
                if (item === testGenerationLabel) {
                  navigate(`/test-generation/${targetCode}`);
                } else if (item === 'Saved Exam Sets') {
                  navigate(`/reports/saved-exams/${targetCode}`);
                } else if (item === 'Print Requests') {
                  navigate(`/test-generation/${targetCode}?view=printrequests`);
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
                {user?.isAdmin && (
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

        {/* Search bar for all users */}
        <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
          <div className="search-bar">
            <Search className="search-icon" onClick={() => void handleSearchNavigate()} />
            <input
              type="text"
              placeholder="Search Course/Topics"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  scrollToHistoryTable();
                  void handleSearchNavigate();
                }
              }}
            />
          </div>
        </div>

        {/* Course & Topic Container */}
        <div className="course-topic-container" ref={courseSectionRef}>
          <h2>Program & Topic Management</h2>

          <div className="program-header-line">
            {isLoadingDepartments ? (
              <p>Loading department...</p>
            ) : (() => {
              const selectedCode = departmentCode || resolveDepartmentCode();
              const selectedDepartment = departments.find((d) => d.code === selectedCode);
              if (!selectedDepartment) {
                return <p>Department not found ({selectedCode})</p>;
              }

              const visibleDepartments = departments
                .filter((dept) => (dept.code || '').toUpperCase() !== 'ITS');
              const isScrollable = visibleDepartments.length > 5;

              return (
                <div className="program-header-content">
                  <div
                    className={`program-grid department-selector-grid${isScrollable ? ' is-scrollable' : ''}`}
                    ref={departmentGridRef}
                  >
                    {visibleDepartments
                      .map((dept) => {
                      const logo = dept.code ? (DEPARTMENT_LOGOS?.[dept.code] ?? null) : null;
                      const isActive = dept.code === selectedCode;

                      return (
                        <button
                          key={dept.id}
                          type="button"
                          className={`program-card department-selector-card ${isActive ? 'active-department-card' : ''}`}
                          ref={isActive ? activeDepartmentRef : null}
                          onClick={() => navigate(`/course-topic/${dept.code}`)}
                          title={`${dept.code} - ${dept.name}`}
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={dept.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/64x64/FFFFFF/1C4DA1?text=LOGO';
                              }}
                            />
                          ) : (
                            <div className="dept-icon">{dept.code?.charAt(0) ?? dept.name.charAt(0)}</div>
                          )}
                          <p>{dept.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {isAdmin ? (
            <div className="field-container" ref={courseFormRef}>
              <label>Program</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <select 
                  value={course} 
                  onChange={(e) => setCourse(e.target.value)}
                  style={{ flex: 1 }}
                >
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
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button"
                      className="add-program-btn"
                      onClick={() => setShowProgramForm(!showProgramForm)}
                      title="Add a new program to this department"
                    >
                      + Add Program
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {isAdmin && showProgramForm && (
            <div className="program-form-section">
              <div className="program-form-card">
                <div className="program-form-header">
                  <div>
                    <p className="program-form-eyebrow">Add New Program</p>
                    <h5>Create a program for this department</h5>
                    <span className="program-form-subtext">Programs are the foundation for organizing course topics and questions.</span>
                  </div>
                  <button 
                    type="button"
                    className="close-program-form"
                    onClick={() => setShowProgramForm(false)}
                    title="Close form"
                  >
                    ✕
                  </button>
                </div>

                <div className="program-form-grid">
                  <div className="program-input-group span-2">
                    <label>Program Name</label>
                    <input 
                      type="text"
                      value={programFormData.programName}
                      onChange={(e) => setProgramFormData({...programFormData, programName: e.target.value})}
                      placeholder="e.g., Data Structures"
                    />
                    <span className="input-hint">The full name of the program.</span>
                  </div>
                  <div className="program-input-group">
                    <label>Program Code</label>
                    <input 
                      type="text"
                      value={programFormData.programCode}
                      onChange={(e) => setProgramFormData({...programFormData, programCode: e.target.value})}
                      placeholder="e.g., CS201"
                    />
                    <span className="input-hint">Unique code for this program.</span>
                  </div>
                  <div className="program-input-group span-2">
                    <label>Description (optional)</label>
                    <textarea 
                      value={programFormData.programDescription}
                      onChange={(e) => setProgramFormData({...programFormData, programDescription: e.target.value})}
                      placeholder="Optional description of the program"
                      rows="3"
                    />
                    <span className="input-hint">Add details about this program if needed.</span>
                  </div>
                </div>

                <div className="program-form-footer">
                  <button 
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowProgramForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="program-submit-btn"
                    onClick={handleAddProgram}
                    disabled={isCreatingProgram}
                  >
                    {isCreatingProgram ? 'Creating…' : 'Create Program'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isAdmin ? (
            <>
              <div className="row-fields">
                <div className="field-container half-width">
                  <label>Course ID</label>
                  <input
                    ref={courseCodeInputRef}
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="Enter course ID (e.g., FCL100)"
                  />
                </div>
                <div className="field-container half-width">
                  <label>Course Title</label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Enter course title"
                  />
                </div>
              </div>

              <div className="row-fields">
                <div className="field-container flex-2">
                  <label>Units</label>
                  <input type="text" value={courseUnits} onChange={(e) => setCourseUnits(e.target.value)} placeholder="Enter units (e.g., 3)" />
                </div>
                <div className="field-container flex-1">
                  <label>Allotted Hours</label>
                  <input type="number" value={courseHours} onChange={(e) => setCourseHours(e.target.value)} onWheel={preventNumberInputWheel} placeholder="Enter hours" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {editingSubjectId && (
                  <button className="save-btn" onClick={handleCancelSubjectEdit}>Cancel</button>
                )}
                <button className="save-btn" onClick={handleSave}>{editingSubjectId ? 'Save Changes' : 'Save'}</button>
              </div>
            </>
          ) : null}

          {/* History Table - Subject and Topic */}
          {isAdmin ? (
            <p className="history-table-note">To add topics, click an encoded course row below.</p>
          ) : null}
          {isAdmin ? (
            <div className="history-table-toolbar">
              <button
                type="button"
                className="add-course-user-btn"
                onClick={openCourseEnrollmentForSelected}
              >
                <UserPlus size={16} />
                Add User to Course
              </button>
            </div>
          ) : null}
          <div className="history-table" ref={historyTableRef}>
            <div className="history-row header">
              <span className="history-cell index">#</span>
              <span className="history-cell course-id">Course ID</span>
              <span className="history-cell course-title">Course Title</span>
              <span className="history-cell hours">Course Hours</span>
              <span className="history-cell actions">Actions</span>
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
            {history.length > 0 && filteredHistory.length === 0 && (
              <div className="history-row">
                <span colSpan={5}>No programs or topics match your search.</span>
              </div>
            )}
            {filteredHistory.map((item, index) => (
              <React.Fragment key={item.subjectId}>
                {/* Subject Row with Manage Topics button */}
                <div
                  className={`history-row subject-row ${expandedSubjectsMap[item.subjectId] ? 'selected-subject-row' : ''}`}
                  data-subject-id={item.subjectId}
                  onClick={() => toggleSubjectExpansion(item.subjectId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleSubjectExpansion(item.subjectId);
                    }
                  }}
                  aria-expanded={Boolean(expandedSubjectsMap[item.subjectId])}
                  aria-label={`${expandedSubjectsMap[item.subjectId] ? 'Collapse' : 'Expand'} topics for ${item.courseTitle}`}
                >
                  <span className="history-cell index">{index + 1}</span>
                  <span className="history-cell course-id">{item.courseCode}</span>
                  <span className="history-cell course-title"><strong>{item.courseTitle}</strong></span>
                  <span className="history-cell hours">{item.courseHours}</span>
                  <span className="history-cell actions">
                    <div className="subject-row-actions">
                      <button 
                        className={`expand-btn ${expandedSubjectsMap[item.subjectId] ? 'expanded' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSubjectExpansion(item.subjectId);
                        }}
                        title={expandedSubjectsMap[item.subjectId] ? 'Collapse topics' : 'Manage topics'}
                        aria-label={expandedSubjectsMap[item.subjectId] ? 'Collapse topics' : 'Expand topics'}
                      >
                        {expandedSubjectsMap[item.subjectId] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </span>
                </div>
                
                {/* Expanded Topics Section */}
                {expandedSubjectsMap[item.subjectId] && (
                  <div className="subject-topics-container">
                    {/* Existing Topics List */}
                    <div className="topics-list-section">
                      <div className="topics-list-header">
                        <h4>Topics for {item.courseTitle}</h4>
                        {isAdmin && (
                          <div className="subject-row-actions topic-header-actions">
                            <button
                              className="topic-action-btn"
                              onClick={() => handleEditSubjectRow(item)}
                              title="Edit course"
                              aria-label="Edit course"
                            >
                              <Pencil size={14} />
                            </button>
                            {item.canDelete && (
                              <button
                                className="topic-action-btn danger"
                                onClick={() => handleDeleteSubjectRow(item)}
                                title="Delete course"
                                aria-label="Delete course"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Form to Add/Edit Topic (placed directly under header for faster encoding flow) */}
                      {selectedSubjectForTopic === item.subjectId && (
                        <div className="topic-form-section">
                          <div className="topic-form-card">
                            <div className="topic-form-header">
                              <div>
                                <p className="topic-form-eyebrow">{editingTopic ? 'Edit Topic' : 'Add Topic'}</p>
                                <h5>{item.courseTitle}</h5>
                                <span className="topic-form-subtext">Outline the lesson and pacing for this course.</span>
                              </div>
                              <span className="course-chip">{item.courseCode}</span>
                            </div>

                            <div className="topic-form-grid">
                              <div className="topic-input-group span-2">
                                <label>Topic Title</label>
                                <input 
                                  type="text"
                                  value={topicFormData.title}
                                  onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})}
                                  placeholder="Enter Topic Title"
                                />
                                <span className="input-hint">Use descriptive titles so students immediately know the focus.</span>
                              </div>
                              <div className="topic-input-group">
                                <label>Allocated Hours</label>
                                <input 
                                  type="number"
                                  min="0"
                                  value={topicFormData.allocatedHours}
                                  onChange={(e) => setTopicFormData({...topicFormData, allocatedHours: e.target.value})}
                                  onWheel={preventNumberInputWheel}
                                  placeholder="0"
                                />
                                <span className="input-hint">Total contact time reserved for this lesson.</span>
                              </div>
                            </div>

                            <div className="topic-form-footer">
                              <p className="helper-text">
                                {editingTopic
                                  ? 'Update the topic details below and save your changes.'
                                  : 'Enter a descriptive topic title and allocate the appropriate hours for this lesson.'}
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {editingTopic && (
                                  <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={handleCancelTopicEdit}
                                    disabled={topicCreating}
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button 
                                  className="topic-submit-btn"
                                  onClick={handleSubmitTopicForm}
                                  disabled={topicCreating}
                                >
                                  {topicCreating
                                    ? (editingTopic ? 'Saving…' : 'Creating…')
                                    : (editingTopic ? 'Save Changes' : 'Add Topic')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {subjectTopicsMap[item.subjectId] && subjectTopicsMap[item.subjectId].length > 0 ? (
                        <div className="topics-list">
                          {subjectTopicsMap[item.subjectId].map((topic, topicIdx) => (
                            <div key={topic.id} className="history-row topic-item-row">
                              <span className="history-cell index">{topicIdx + 1}</span>
                              <span className="history-cell course-id">{item.courseCode}</span>
                              <span className="history-cell course-title">• {topic.title}</span>
                              <span className="history-cell hours hours-cell">{topic.allocatedHours}</span>
                              <span className="history-cell actions topic-row-actions">
                                {topic.canEdit && (
                                  <button
                                    className="topic-action-btn"
                                    onClick={() => handleEditTopic(item.subjectId, topic)}
                                    title="Edit topic"
                                    aria-label="Edit topic"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                                {topic.canDelete && (
                                  <button
                                    className="topic-action-btn danger"
                                    onClick={() => handleDeleteTopic(item.subjectId, topic)}
                                    title="Delete topic"
                                    aria-label="Delete topic"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-topics-msg">No additional topics created yet</p>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>

      {/* Logout Modal */}
      {/* User Enrollment Modal */}
      {showUserEnrollmentModal && (() => {
        const availableDepartments = departments
          .filter((dept) => (dept.code || '').toUpperCase() !== 'ITS');
        const departmentUsers = enrollmentUsers;
        const availablePrograms = selectedEnrollmentDepartment
          ? enrollmentCourses
          : [];
        const availableSubjects = selectedEnrollmentCourse?.id
          ? history.filter((item) => Number(item.courseId) === Number(selectedEnrollmentCourse.id))
          : [];

        return (
          <div className="app-confirmation-overlay" onClick={() => {
            setSelectedEnrollmentCourse(null);
            setSelectedEnrollmentSubjectIds([]);
            setIsCourseSelectorExpanded(false);
            setSelectedEnrollmentDepartment(null);
            setSelectedUserForEnrollment(null);
            setSelectedEnrollmentCourseHasAccess(false);
            setSelectedEnrollmentCourseExistingAccess(false);
            setSelectedEnrollmentDepartmentHasAccess(false);
            setSelectedEnrollmentDepartmentExistingAccess(false);
            setSelectedEnrollmentTopicIds([]);
            setExistingEnrollmentTopicIds([]);
            setShowUserEnrollmentModal(false);
          }}>
            <div className={`app-confirmation-modal enrollment-modal ${isDarkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
              <h3>
                <span className="label-icon" aria-hidden="true">
                  <UserPlus size={20} />
                </span>
                Add User to Course
              </h3>
              
              <div className="enrollment-section">
                {/* LEFT COLUMN: Department & User Selection */}
                <div className="enrollment-column">
                  <div className="enrollment-column-header">Organization</div>
                  
                  <div className="enrollment-field">
                    <label>
                      <span className="label-icon" aria-hidden="true">
                        <Building2 size={14} />
                      </span>
                      Select Department
                    </label>
                    <select
                      value={selectedEnrollmentDepartment?.id || ''}
                      onChange={(e) => {
                        const departmentId = Number(e.target.value || 0);
                        const dept = availableDepartments.find((item) => Number(item.id) === departmentId) || null;
                        setSelectedEnrollmentDepartment(dept);
                        setSelectedEnrollmentCourse(null);
                        setSelectedEnrollmentSubjectIds([]);
                        setIsCourseSelectorExpanded(false);
                        setSelectedEnrollmentCourseHasAccess(false);
                        setSelectedEnrollmentCourseExistingAccess(false);
                        setSelectedEnrollmentTopicIds([]);
                        setExistingEnrollmentTopicIds([]);
                        if (dept) {
                          void loadEnrollmentCoursesForDepartment(dept.id);
                        } else {
                          setEnrollmentCourses([]);
                        }
                        if (selectedUserForEnrollment?.userId && dept?.id) {
                          void loadSelectedCourseAccessForEnrollment(
                            selectedUserForEnrollment.userId,
                            selectedEnrollmentCourse?.id,
                            dept.id,
                            null
                          );
                        }
                      }}
                    >
                      <option value="">Choose a department...</option>
                      {availableDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="enrollment-field">
                    <label>
                      <span className="label-icon" aria-hidden="true">
                        <User size={14} />
                      </span>
                      Select User
                    </label>
                    <select
                      value={selectedUserForEnrollment?.userId || ''}
                      onChange={(e) => {
                        const userId = e.target.value;
                        const user = departmentUsers.find(u => u.userId === userId);
                        setSelectedUserForEnrollment(user || null);
                        if (userId && selectedEnrollmentCourse?.id && selectedEnrollmentDepartment?.id) {
                          void loadSelectedCourseAccessForEnrollment(
                            userId,
                            selectedEnrollmentCourse.id,
                            selectedEnrollmentDepartment.id,
                            null
                          );
                        }
                      }}
                    >
                      <option value="">Choose a user...</option>
                      {departmentUsers.map((user) => (
                        <option key={user.userId} value={user.userId}>
                          {user.firstName} {user.lastName} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEnrollmentDepartment && selectedUserForEnrollment && (
                    <div className="enrollment-field">
                      <label>
                        <span className="label-icon" aria-hidden="true">
                          <ShieldCheck size={14} />
                        </span>
                        Department Access
                      </label>
                      <div className="course-checkbox-label" style={{ cursor: 'default' }}>
                        <input
                          type="checkbox"
                          checked={selectedEnrollmentDepartmentHasAccess}
                          onChange={(e) => {
                            const nextValue = e.target.checked;
                            setSelectedEnrollmentDepartmentHasAccess(nextValue);
                            if (!nextValue) {
                              setSelectedEnrollmentCourseHasAccess(false);
                              setSelectedEnrollmentTopicIds([]);
                            }
                          }}
                        />
                        <span>{selectedEnrollmentDepartment.name}</span>
                      </div>
                      <span className="input-hint">Grant or revoke access to this department.</span>
                    </div>
                  )}
                </div>

                {/* CENTER COLUMN: Course Selection & Access */}
                <div className="enrollment-column">
                  <div className="enrollment-column-header">Course Details</div>
                  
                  {selectedEnrollmentDepartment && (
                    <div className="enrollment-field">
                      <label>
                        <span className="label-icon" aria-hidden="true">
                          <BookOpen size={14} />
                        </span>
                        Select Program
                      </label>
                      <select
                        value={selectedEnrollmentCourse?.id || ''}
                        onChange={(e) => {
                          const courseId = Number(e.target.value || 0);
                          const course = availablePrograms.find((item) => Number(item.id) === courseId) || null;
                          setSelectedEnrollmentCourse(course);
                          setSelectedEnrollmentSubjectIds([]);
                          setIsCourseSelectorExpanded(false);
                          setSelectedEnrollmentCourseHasAccess(false);
                          setSelectedEnrollmentCourseExistingAccess(false);
                          setSelectedEnrollmentTopicIds([]);
                          setExistingEnrollmentTopicIds([]);
                          setSelectedEnrollmentTopics([]);
                          if (selectedUserForEnrollment?.userId && course?.id && selectedEnrollmentDepartment?.id) {
                            void loadSelectedCourseAccessForEnrollment(
                              selectedUserForEnrollment.userId,
                              course.id,
                              selectedEnrollmentDepartment.id,
                              null
                            );
                          }
                        }}
                      >
                        <option value="">Choose a program...</option>
                        {isLoadingEnrollmentCourses ? (
                          <option disabled>Loading programs...</option>
                        ) : availablePrograms.length === 0 ? (
                          <option disabled>No programs found</option>
                        ) : (
                          availablePrograms.map((course) => (
                            <option key={course.id} value={course.id}>
                              {(course.code ? `${course.code} - ` : '') + course.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {selectedEnrollmentCourse && (
                    <div className="enrollment-field enrollment-field-scrollable">
                      <label>
                        <span className="label-icon" aria-hidden="true">
                          <FileText size={14} />
                        </span>
                        Select Courses
                      </label>
                      <div className="course-selector-toolbar">
                        <span className="course-selection-count">
                          {selectedEnrollmentSubjectIds.length} selected
                        </span>
                        <div className="course-selector-actions">
                          <button
                            type="button"
                            className="course-selector-link"
                            onClick={() => {
                              const allIds = availableSubjects.map((subject) => Number(subject.subjectId));
                              setSelectedEnrollmentSubjectIds(allIds);
                              void applyEnrollmentSubjects(allIds);
                            }}
                            disabled={availableSubjects.length === 0}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="course-selector-link"
                            onClick={() => {
                              setSelectedEnrollmentSubjectIds([]);
                              void applyEnrollmentSubjects([]);
                            }}
                            disabled={selectedEnrollmentSubjectIds.length === 0}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="course-selector-toggle"
                            onClick={() => setIsCourseSelectorExpanded((prev) => !prev)}
                            disabled={availableSubjects.length === 0}
                          >
                            {isCourseSelectorExpanded ? 'Hide courses' : 'Choose courses'}
                          </button>
                        </div>
                      </div>
                      {availableSubjects.length === 0 ? (
                        <p className="enrollment-loading">No courses found.</p>
                      ) : isCourseSelectorExpanded ? (
                        <div className="topic-assign-list">
                          {availableSubjects.map((subject) => {
                            const subjectId = Number(subject.subjectId);
                            const isChecked = selectedEnrollmentSubjectIds.includes(subjectId);
                            return (
                              <label key={subject.subjectId} className="course-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextIds = e.target.checked
                                      ? [...selectedEnrollmentSubjectIds, subjectId]
                                      : selectedEnrollmentSubjectIds.filter((id) => id !== subjectId);
                                    setSelectedEnrollmentSubjectIds(nextIds);
                                    void applyEnrollmentSubjects(nextIds);
                                  }}
                                />
                                <span>{(subject.courseCode ? `${subject.courseCode} - ` : '') + subject.courseTitle}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="enrollment-loading">Expand to manage course access.</p>
                      )}
                    </div>
                  )}

                  {selectedUserForEnrollment && selectedEnrollmentCourse && (
                    <div className="enrollment-field">
                      <label>
                        <span className="label-icon" aria-hidden="true">
                          <ShieldCheck size={14} />
                        </span>
                        Program Access
                      </label>
                      <div className="course-checkbox-label" style={{ cursor: 'default' }}>
                        <input
                          type="checkbox"
                          checked={selectedEnrollmentCourseHasAccess}
                          onChange={(e) => {
                            const nextValue = e.target.checked;
                            setSelectedEnrollmentCourseHasAccess(nextValue);
                            if (!nextValue) {
                              setSelectedEnrollmentTopicIds([]);
                            }
                          }}
                        />
                        <span>{selectedEnrollmentCourse.name}</span>
                      </div>
                      <span className="input-hint">Check to grant access, uncheck to revoke access for this program only.</span>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Topics Assignment */}
                <div className="enrollment-column">
                  <div className="enrollment-column-header">Topic Access</div>
                  
                  {selectedEnrollmentSubjectIds.length > 0 && (
                    <div className="enrollment-field enrollment-field-scrollable">
                      <label>
                        <span className="label-icon" aria-hidden="true">
                          <Tags size={14} />
                        </span>
                        Assign Topics
                      </label>
                      {isLoadingEnrollmentTopics ? (
                        <p className="enrollment-loading">Loading topics...</p>
                      ) : selectedEnrollmentTopics.length === 0 ? (
                        <p className="enrollment-loading">No topics available.</p>
                      ) : (
                        <div className="topic-assign-list">
                          {selectedEnrollmentTopics.map((topic) => (
                            <label key={topic.id} className="course-checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedEnrollmentTopicIds.includes(topic.id)}
                                onChange={(e) => {
                                  const nextValue = e.target.checked;
                                  setSelectedEnrollmentTopicIds((prev) => {
                                    if (nextValue) {
                                      return prev.includes(topic.id) ? prev : [...prev, topic.id];
                                    }
                                    return prev.filter((id) => id !== topic.id);
                                  });
                                }}
                              />
                              <span>{topic.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <span className="input-hint">Topics are filtered by the selected course.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="enrollment-actions">
                <button
                  type="button"
                  className="enrollment-cancel-btn"
                  onClick={() => {
                    setSelectedEnrollmentCourse(null);
                    setSelectedEnrollmentSubjectIds([]);
                    setIsCourseSelectorExpanded(false);
                    setSelectedEnrollmentDepartment(null);
                    setSelectedUserForEnrollment(null);
                    setSelectedEnrollmentCourseHasAccess(false);
                    setSelectedEnrollmentCourseExistingAccess(false);
                    setSelectedEnrollmentDepartmentHasAccess(false);
                    setSelectedEnrollmentDepartmentExistingAccess(false);
                    setSelectedEnrollmentTopicIds([]);
                    setExistingEnrollmentTopicIds([]);
                    setShowUserEnrollmentModal(false);
                  }}
                >
                  <span className="enrollment-action-icon" aria-hidden="true">
                    <X size={16} />
                  </span>
                  Cancel
                </button>
                <button
                  type="button"
                  className="enrollment-confirm-btn"
                  onClick={handleEnrollUser}
                  disabled={!selectedUserForEnrollment || !selectedEnrollmentDepartment || !selectedEnrollmentCourse || isEnrollingUser}
                >
                  <span className="enrollment-action-icon" aria-hidden="true">
                    <Save size={16} />
                  </span>
                  {isEnrollingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isTopicAccessModalOpen && (() => {
        const selectedDept = getCurrentDepartment();
        const departmentUsers = selectedDept
          ? enrollmentUsers.filter(user => Array.isArray(user.departmentIds) && user.departmentIds.includes(selectedDept.id))
          : [];
        const topicAccessUsers = topicAccessCourseId
          ? departmentUsers.filter(user => Array.isArray(user.courseIds) && user.courseIds.includes(topicAccessCourseId))
          : departmentUsers;

        return (
          <div className="app-confirmation-overlay" onClick={closeTopicAccessModal}>
            <div className={`app-confirmation-modal enrollment-modal ${isDarkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
              <h3>Add User to Topic</h3>

              <div className="enrollment-section">
                <div className="enrollment-field">
                  <label>Topic</label>
                  <div className="course-checkbox-label" style={{ cursor: 'default' }}>
                    <span>{topicAccessTarget?.title || 'Selected topic'}</span>
                  </div>
                </div>
                <div className="enrollment-field">
                  <label>Select User</label>
                  <select
                    value={selectedUserForTopicAccess?.userId || ''}
                    onChange={(e) => {
                      const userId = e.target.value;
                      const user = topicAccessUsers.find(u => u.userId === userId);
                      setSelectedUserForTopicAccess(user || null);
                    }}
                  >
                    <option value="">Choose a user...</option>
                    {topicAccessUsers.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.firstName} {user.lastName} ({user.username})
                      </option>
                    ))}
                  </select>
                  <span className="input-hint">Only users already enrolled in this course are shown.</span>
                </div>
                <div className="enrollment-field">
                  <label>Access</label>
                  <label className="course-checkbox-label">
                    <input
                      type="checkbox"
                      checked={topicAccessHasAccess}
                      onChange={(e) => {
                        setTopicAccessHasAccess(e.target.checked);
                      }}
                    />
                    <span>Grant topic access</span>
                  </label>
                  {topicAccessExisting && (
                    <span className="input-hint">User already has access. Uncheck to revoke.</span>
                  )}
                </div>
              </div>

              <div className="enrollment-actions">
                <button
                  type="button"
                  className="enrollment-cancel-btn"
                  onClick={closeTopicAccessModal}
                  disabled={isGrantingTopicAccess}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="enrollment-confirm-btn"
                  onClick={submitTopicAccess}
                  disabled={!selectedUserForTopicAccess || isGrantingTopicAccess}
                >
                  {isGrantingTopicAccess ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isDarkMode={isDarkMode}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteConfirmation)}
        title={deleteConfirmation?.type === 'course' ? 'Delete course entry?' : 'Delete topic?'}
        message={
          deleteConfirmation?.type === 'course'
            ? `Delete course entry "${deleteConfirmation?.courseTitle || ''}"? This action cannot be undone.`
            : `Delete topic "${deleteConfirmation?.topicTitle || ''}"? Deleting this topic will also delete all related test questions in this topic. This action cannot be undone.`
        }
        onCancel={closeDeleteConfirmation}
        onConfirm={confirmDelete}
        confirmText={isDeleteSubmitting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        isLoading={isDeleteSubmitting}
        isDarkMode={isDarkMode}
        isDanger
      />

      <TransferOwnershipModal
        isOpen={transferTopicModal.isOpen}
        title="Transfer Topic Ownership"
        description={`Transfer ownership of topic "${transferTopicModal.topic?.title || ''}" to another user.`}
        entityLabel="questions"
        targetUserId={transferTopicModal.targetUserId}
        onTargetUserIdChange={(value) => setTransferTopicModal((prev) => ({ ...prev, targetUserId: value }))}
        users={transferUsers}
        usersLoading={isLoadingTransferUsers}
        onClose={closeTransferTopicOwnershipModal}
        onConfirm={submitTransferTopicOwnership}
        confirmText="Transfer Topic"
        isLoading={transferTopicModal.isSubmitting}
        isDarkMode={isDarkMode}
        showTransferChildrenOption
        transferChildren={transferTopicModal.transferQuestions}
        onTransferChildrenChange={(checked) => setTransferTopicModal((prev) => ({ ...prev, transferQuestions: checked }))}
      />
    </div>
  );
};

export default CourseTopic;
