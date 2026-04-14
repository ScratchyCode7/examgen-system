// Changes made (Dec 9, 2025):
// - Added navigation for Test Encoding/Test Question Editing in the Data Entry dropdown.
// - Integrated ThemeContext usage and ensured logout modal respects theme.
// See README for full details.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, FileText, Users, HelpCircle, Send, Check, X, ShieldOff, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
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

  const reportItems = isAdmin
    ? ["Test Generation", "Saved Exam Sets", "Print Requests"]
    : ["Test Generation", "Saved Exam Sets"];
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
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [isSubjectEditRequestModalOpen, setIsSubjectEditRequestModalOpen] = useState(false);
  const [subjectEditRequestTarget, setSubjectEditRequestTarget] = useState(null);
  const [subjectEditRequestMessage, setSubjectEditRequestMessage] = useState('');
  const [isSubmittingSubjectEditRequest, setIsSubmittingSubjectEditRequest] = useState(false);
  const [isTopicEditRequestModalOpen, setIsTopicEditRequestModalOpen] = useState(false);
  const [topicEditRequestTarget, setTopicEditRequestTarget] = useState(null);
  const [topicEditRequestMessage, setTopicEditRequestMessage] = useState('');
  const [isSubmittingTopicEditRequest, setIsSubmittingTopicEditRequest] = useState(false);

  // Topic Management states
  const [expandedSubjectsMap, setExpandedSubjectsMap] = useState({});
  const [subjectTopicsMap, setSubjectTopicsMap] = useState({});
  const [topicFormData, setTopicFormData] = useState({ title: '', allocatedHours: '' });
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicCreating, setTopicCreating] = useState(false);
  const [topicRequestScope, setTopicRequestScope] = useState('inbox');
  const [topicEditRequests, setTopicEditRequests] = useState([]);
  const [topicRequestsLoading, setTopicRequestsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Program Creation states (for admins)
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [programFormData, setProgramFormData] = useState({ programName: '', programCode: '', programDescription: '' });
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

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

  const resolveDepartmentCode = () => {
    if (departmentCode) return departmentCode;
    const fallback = departments.find(d => !['IT', 'ITS'].includes((d.code || '').toUpperCase())) || departments[0];
    return fallback?.code || 'CCS';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Load existing subjects that were created via this page (identified by JSON description)
  const [allSubjects, setAllSubjects] = useState([]);

  useEffect(() => {
    const loadExistingSubjects = async () => {
      try {
        setIsLoading(true);
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

              const derivedCourseCode = meta.courseCode || meta.topicCode || s.code || '';
              const derivedCourseTitle = meta.courseTitle || meta.topicTitle || meta.topicDesc || s.name || '';
              const derivedCourseUnits = meta.courseUnits || meta.topicUnits || meta.value || '';
              const derivedCourseHours = meta.courseHours || meta.hours || (s.hours ? Number(s.hours) : '');

              if (!derivedCourseCode || !derivedCourseTitle) return null;

              return {
                subjectId: s.id,
                courseId: s.courseId != null ? Number(s.courseId) : courseIdFromMeta,
                courseCode: derivedCourseCode,
                courseTitle: derivedCourseTitle,
                courseUnits: derivedCourseUnits,
                courseHours: derivedCourseHours,
                createdAt: s.createdAt,
                canEdit: s.canEdit === true,
                canDelete: s.canDelete === true,
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

  const refreshAccessRequests = useCallback(async (scope = topicRequestScope) => {
    try {
      setTopicRequestsLoading(true);

      const [topicRequestsRaw, subjectRequestsRaw] = await Promise.all([
        apiService.getTopicEditRequests(scope),
        apiService.getSubjectEditRequests(scope),
      ]);

      const topicRequests = (Array.isArray(topicRequestsRaw) ? topicRequestsRaw : []).map((request) => ({
        ...request,
        requestType: 'Topic',
        entityId: request.topicId,
      }));

      const subjectRequests = (Array.isArray(subjectRequestsRaw) ? subjectRequestsRaw : []).map((request) => ({
        ...request,
        requestType: 'Course',
        entityId: request.subjectId,
      }));

      const merged = [...topicRequests, ...subjectRequests]
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

      setTopicEditRequests(merged);
    } catch (err) {
      console.error('Failed to load access requests:', err);
      setTopicEditRequests([]);
    } finally {
      setTopicRequestsLoading(false);
    }
  }, [topicRequestScope]);

  useEffect(() => {
    void refreshAccessRequests(topicRequestScope);
  }, [refreshAccessRequests, topicRequestScope]);

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

          setHistory((prev) => prev.map((entry) => (
            entry.subjectId === editingSubjectId
              ? {
                  ...entry,
                  courseId: updatedSubject.courseId || Number(course),
                  courseCode,
                  courseTitle,
                  courseUnits,
                  courseHours,
                }
              : entry
          )));

          showToast({ message: 'Course entry updated successfully.', type: 'success' });
          setEditingSubjectId(null);
        } else {
          const createdSubject = await apiService.createSubject(subjectPayload);
          console.log('Subject created:', createdSubject);

          // Update local history table
          setHistory((prev) => [
            ...prev,
            {
              subjectId: createdSubject.id,
              courseId: createdSubject.courseId || Number(course),
              courseCode,
              courseTitle,
              courseUnits,
              courseHours,
              createdAt: createdSubject.createdAt,
              canEdit: createdSubject.canEdit === true,
              canDelete: createdSubject.canDelete === true,
            },
          ]);

          showToast({ message: 'Course entry created successfully.', type: 'success' });
        }

        setCourse("");
        setCourseCode("");
        setCourseTitle("");
        setCourseUnits("");
        setCourseHours("");
      } catch (err) {
        console.error('Failed to save program topic:', err);
        const message =
          err.response?.data?.message ||
          err.response?.data ||
          'Failed to save program topic. Please verify your department access and try again.';
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
        setHistory((prev) => prev.filter((entry) => entry.subjectId !== deleteConfirmation.subjectId));
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
      const message = err.response?.data?.message || err.response?.data || fallbackMessage;
      showToast({ message, type: 'error' });
    } finally {
      setIsDeleteSubmitting(false);
      setDeleteConfirmation(null);
    }
  };

  const closeSubjectEditRequestModal = () => {
    if (isSubmittingSubjectEditRequest) return;

    setIsSubjectEditRequestModalOpen(false);
    setSubjectEditRequestTarget(null);
    setSubjectEditRequestMessage('');
  };

  const submitSubjectEditRequest = async () => {
    if (!subjectEditRequestTarget?.subjectId) return;

    try {
      setIsSubmittingSubjectEditRequest(true);
      await apiService.createSubjectEditRequest(subjectEditRequestTarget.subjectId, subjectEditRequestMessage);
      await refreshAccessRequests();
      showToast({ message: 'Access request submitted.', type: 'success' });
      closeSubjectEditRequestModal();
    } catch (err) {
      console.error('Failed to request course access:', err);
      const errorMessage = err.response?.data?.message || err.response?.data || 'Failed to submit request.';
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsSubmittingSubjectEditRequest(false);
    }
  };

  const openTopicEditRequestModal = (topic) => {
    if (!topic?.id) return;
    setTopicEditRequestTarget(topic);
    setTopicEditRequestMessage('');
    setIsTopicEditRequestModalOpen(true);
  };

  const closeTopicEditRequestModal = () => {
    if (isSubmittingTopicEditRequest) return;

    setIsTopicEditRequestModalOpen(false);
    setTopicEditRequestTarget(null);
    setTopicEditRequestMessage('');
  };

  const submitTopicEditRequest = async () => {
    if (!topicEditRequestTarget?.id) return;

    try {
      setIsSubmittingTopicEditRequest(true);
      await apiService.createTopicEditRequest(topicEditRequestTarget.id, topicEditRequestMessage);
      await refreshAccessRequests();
      showToast({ message: 'Access request submitted.', type: 'success' });
      closeTopicEditRequestModal();
    } catch (err) {
      console.error('Failed to request topic access:', err);
      const errorMessage = err.response?.data?.message || err.response?.data || 'Failed to submit request.';
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsSubmittingTopicEditRequest(false);
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
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        'Failed to create topic.';
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
      const message = err.response?.data?.message || err.response?.data || 'Failed to update topic.';
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

  const handleSubmitTopicForm = async () => {
    if (editingTopic) {
      await handleUpdateTopic();
      return;
    }

    await handleAddTopic();
  };

  const handleRequestTopicAccess = (topic) => {
    openTopicEditRequestModal(topic);
  };

  const getRequestMessageText = (request) => {
    const raw = String(request?.message || '').trim();
    if (!raw) return 'No message provided.';

    const normalized = raw.toLowerCase();
    if (normalized === 'edit access requested') {
      return 'No message provided.';
    }

    const prefix = 'edit access requested:';
    if (normalized.startsWith(prefix)) {
      const stripped = raw.slice(prefix.length).trim();
      return stripped || 'No message provided.';
    }

    return raw;
  };

  const handleResolveTopicRequest = async (request, approve, canDelete = false) => {
    try {
      if (request.requestType === 'Course') {
        await apiService.resolveSubjectEditRequest(request.requestId, approve, canDelete, '');
      } else {
        await apiService.resolveTopicEditRequest(request.requestId, approve, canDelete, '');
      }

      await refreshAccessRequests();

      const expandedSubjectIds = Object.keys(expandedSubjectsMap)
        .filter(key => expandedSubjectsMap[key])
        .map(key => Number(key));
      await Promise.all(expandedSubjectIds.map(subjectId => refreshSubjectTopics(subjectId)));

      showToast({
        message: approve ? (canDelete ? 'Approved with edit + delete access.' : 'Approved with edit access.') : 'Request rejected.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to resolve topic request:', err);
      const message = err.response?.data?.message || err.response?.data || 'Failed to resolve request.';
      showToast({ message, type: 'error' });
    }
  };

  const handleRevokeTopicRequest = async (request) => {
    try {
      if (request.requestType === 'Course') {
        await apiService.revokeSubjectEditPermission(request.requestId, '');
      } else {
        await apiService.revokeTopicEditPermission(request.requestId, '');
      }

      await refreshAccessRequests();
      showToast({ message: 'Permission revoked.', type: 'success' });
    } catch (err) {
      console.error('Failed to revoke topic permission:', err);
      const message = err.response?.data?.message || err.response?.data || 'Failed to revoke permission.';
      showToast({ message, type: 'error' });
    }
  };

  const handleDismissTopicRequest = async (request) => {
    try {
      if (request.requestType === 'Course') {
        await apiService.dismissSubjectEditRequest(request.requestId);
      } else {
        await apiService.dismissTopicEditRequest(request.requestId);
      }

      await refreshAccessRequests();
    } catch (err) {
      console.error('Failed to dismiss topic request:', err);
      const message = err.response?.data?.message || err.response?.data || 'Failed to dismiss request.';
      showToast({ message, type: 'error' });
    }
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
        const message =
          err.response?.data?.message ||
          err.response?.data ||
          'Failed to create program.';
        showToast({ message, type: 'error' });
      } finally {
        setIsCreatingProgram(false);
      }
    };

    void createProgramAsync();
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        {/* Role-aware navbar: matches admin/user entry points from dashboards */}
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate(isAdmin ? '/admin' : '/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
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
                if (item === 'Test Generation') {
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

        {/* Search bar (same as Dashboard.jsx) */}
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

          {/* Program Header */}
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

          {/* Fields */}
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
                <button 
                  type="button"
                  className="add-program-btn"
                  onClick={() => setShowProgramForm(!showProgramForm)}
                  title="Add a new program to this department"
                >
                  + Add Program
                </button>
              )}
            </div>
          </div>

          {/* Program Creation Form (admin only) */}
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

          {/* History Table - Subject and Topic */}
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
                <div className={`history-row subject-row ${expandedSubjectsMap[item.subjectId] ? 'selected-subject-row' : ''}`} data-subject-id={item.subjectId}>
                  <span className="history-cell index">{index + 1}</span>
                  <span className="history-cell course-id">{item.courseCode}</span>
                  <span className="history-cell course-title"><strong>{item.courseTitle}</strong></span>
                  <span className="history-cell hours">{item.courseHours}</span>
                  <span className="history-cell actions">
                    <div className="subject-row-actions">
                      <button 
                        className={`expand-btn ${expandedSubjectsMap[item.subjectId] ? 'expanded' : ''}`}
                        onClick={() => toggleSubjectExpansion(item.subjectId)}
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
                                  placeholder="3"
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
                                {topic.canEdit ? (
                                  <button
                                    className="topic-action-btn"
                                    onClick={() => handleEditTopic(item.subjectId, topic)}
                                    title="Edit topic"
                                    aria-label="Edit topic"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="topic-action-btn request"
                                    onClick={() => handleRequestTopicAccess(topic)}
                                    title="Request topic access"
                                    aria-label="Request topic access"
                                  >
                                    <Send size={14} className="btn-icon" />
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

          <div className="topic-requests-panel">
            <div className="topic-requests-header">
              <h4>Course & Topic Access Requests</h4>
              <div className="topic-request-scope">
                <button
                  type="button"
                  className={topicRequestScope === 'inbox' ? 'active' : ''}
                  onClick={() => setTopicRequestScope('inbox')}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  className={topicRequestScope === 'sent' ? 'active' : ''}
                  onClick={() => setTopicRequestScope('sent')}
                >
                  Sent
                </button>
                <button
                  type="button"
                  className={topicRequestScope === 'all' ? 'active' : ''}
                  onClick={() => setTopicRequestScope('all')}
                >
                  All
                </button>
              </div>
            </div>

            {topicRequestsLoading ? (
              <p>Loading access requests...</p>
            ) : topicEditRequests.length === 0 ? (
              <p>No access requests found.</p>
            ) : (
              <div className="topic-request-list">
                {topicEditRequests.map((request) => {
                  const isOwnerOfRequest = String(request.ownerUserId || '').toLowerCase() === String(user?.userId || '').toLowerCase();

                  return (
                  <div key={`${request.requestType}-${request.requestId}`} className="topic-request-item">
                    <div className="topic-request-main">
                      <strong>{request.requesterName}</strong> requested access to {request.requestType.toLowerCase()} #{request.entityId}
                      <div className="topic-request-main-actions">
                        <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
                        <button
                          type="button"
                          className="request-card-close-btn"
                          onClick={() => handleDismissTopicRequest(request)}
                          title="Close card"
                          aria-label="Close card"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p className="topic-request-message">
                      <strong>Message:</strong> {getRequestMessageText(request)}
                    </p>
                    <div className="topic-request-meta">
                      <span>Type: {request.requestType}</span>
                      <span>Permission: {request.permissionLevel}</span>
                    </div>
                    <div className="topic-request-actions">
                      {isOwnerOfRequest && request.status !== 'Revoked' && (
                        <button type="button" className="danger" onClick={() => handleRevokeTopicRequest(request)}>
                          <ShieldOff size={14} className="btn-icon" /> Revoke Access
                        </button>
                      )}
                      {request.status === 'Pending' && !request.isMine && (
                        <>
                          <button type="button" onClick={() => handleResolveTopicRequest(request, true, false)}>
                            <Check size={14} className="btn-icon" /> Approve Edit
                          </button>
                          <button type="button" onClick={() => handleResolveTopicRequest(request, true, true)}>
                            <Check size={14} className="btn-icon" /> Approve Edit+Delete
                          </button>
                          <button type="button" className="danger" onClick={() => handleResolveTopicRequest(request, false, false)}>
                            <X size={14} className="btn-icon" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {isTopicEditRequestModalOpen && (
        <div className="edit-request-modal-overlay" onClick={closeTopicEditRequestModal}>
          <div className={`edit-request-modal ${isDarkMode ? 'dark' : ''}`} onClick={(event) => event.stopPropagation()}>
            <h3>Request Edit Permission</h3>
            <p>
              Send a request to the topic owner for Topic ID <strong>{topicEditRequestTarget?.id}</strong>.
            </p>
            <label htmlFor="topic-edit-request-message">Message (optional)</label>
            <textarea
              id="topic-edit-request-message"
              value={topicEditRequestMessage}
              onChange={(event) => setTopicEditRequestMessage(event.target.value)}
              placeholder="Write why you need to edit this topic..."
              maxLength={1000}
            />
            <div className="edit-request-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeTopicEditRequestModal}
                disabled={isSubmittingTopicEditRequest}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={submitTopicEditRequest}
                disabled={isSubmittingTopicEditRequest}
              >
                {isSubmittingTopicEditRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubjectEditRequestModalOpen && (
        <div className="edit-request-modal-overlay" onClick={closeSubjectEditRequestModal}>
          <div className={`edit-request-modal ${isDarkMode ? 'dark' : ''}`} onClick={(event) => event.stopPropagation()}>
            <h3>Request Edit Permission</h3>
            <p>
              Send a request to the course owner for Course ID <strong>{subjectEditRequestTarget?.subjectId}</strong>.
            </p>
            <label htmlFor="course-edit-request-message">Message (optional)</label>
            <textarea
              id="course-edit-request-message"
              value={subjectEditRequestMessage}
              onChange={(event) => setSubjectEditRequestMessage(event.target.value)}
              placeholder="Write why you need to edit this course entry..."
              maxLength={1000}
            />
            <div className="edit-request-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeSubjectEditRequestModal}
                disabled={isSubmittingSubjectEditRequest}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={submitSubjectEditRequest}
                disabled={isSubmittingSubjectEditRequest}
              >
                {isSubmittingSubjectEditRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default CourseTopic;
