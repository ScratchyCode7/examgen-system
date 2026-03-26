import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { apiService, API_BASE_URL } from '../services/api';
import '../styles/Dashboard.css';
import '../styles/TestGeneration.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import UPHSLLogo from '../assets/UPHSL Logo.png';
import { HELP_CENTER_URL } from '../constants/helpLinks';

const DEFAULT_QUESTION_EDIT_STATE = {
  isOpen: false,
  questionIndex: null,
  topicId: null,
  topicName: '',
  level: null,
  currentQuestionId: null,
  levelGroup: null,
  courseId: null,
  subjectId: null,
  selectedAnswer: ''
};

const getQuestionIdentifier = (question) => {
  if (!question) return null;
  return (
    question.id ??
    question.questionId ??
    question.QuestionId ??
    question.testQuestionId ??
    question.TestQuestionId ??
    null
  );
};

const getQuestionTopicId = (question) => {
  if (!question) return null;
  return (
    question.topicId ??
    question.TopicId ??
    question.topic?.id ??
    question.Topic?.Id ??
    question.topic ??
    question.Topic ??
    null
  );
};

const getQuestionSubjectId = (question) => {
  if (!question) return null;
  return (
    question.subjectId ??
    question.SubjectId ??
    question.subject?.id ??
    question.Subject?.Id ??
    question.subject ??
    question.Subject ??
    null
  );
};

const getQuestionCourseId = (question) => {
  if (!question) return null;
  return (
    question.courseId ??
    question.CourseId ??
    question.programId ??
    question.ProgramId ??
    question.course?.id ??
    question.Course?.Id ??
    question.program?.id ??
    question.Program?.Id ??
    question.course ??
    question.Course ??
    question.program ??
    question.Program ??
    null
  );
};

const BLOOM_DISPLAY_LABELS = {
  remembering: 'Remember / Understand',
  applying: 'Apply / Analyze',
  evaluating: 'Evaluate / Create'
};

const BLOOM_KEYS = ['remembering', 'applying', 'evaluating'];

const getBloomGroupKey = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === 'remembering' ||
    normalized.includes('remember') ||
    normalized.includes('understand') ||
    normalized.includes('knowledge') ||
    normalized.includes('comprehension') ||
    normalized.includes('low order') ||
    normalized.includes('low-order')
  ) {
    return 'lower';
  }
  if (
    normalized === 'applying' ||
    normalized.includes('apply') ||
    normalized.includes('analy') ||
    normalized.includes('middle order') ||
    normalized.includes('middle-order')
  ) {
    return 'middle';
  }
  if (
    normalized === 'evaluating' ||
    normalized.includes('evaluate') ||
    normalized.includes('create') ||
    normalized.includes('synth') ||
    normalized.includes('higher order') ||
    normalized.includes('higher-order')
  ) {
    return 'higher';
  }
  return null;
};

const getLevelKeyFromBloom = (value) => {
  const group = getBloomGroupKey(value);
  if (group === 'lower') return 'low';
  if (group === 'middle') return 'middle';
  if (group === 'higher') return 'high';
  return null;
};

const { Home, ClipboardList, BookOpen, Settings, LogOut, User, Users, Sun, Moon, Search, Printer, Save, Eye, Trash2, PlayCircle, CheckCircle, AlertTriangle, FileText, HelpCircle, RefreshCw } = Icons;

const TestGeneration = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { departmentCode } = useParams();
  const [activeTab, setActiveTab] = useState('Reports');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User';

  const createEmptyTopicRow = (id) => ({
    id,
    topicId: '',
    topicName: '',
    topic: '',
    hours: '',
    lowCount: '',
    middleCount: '',
    highCount: '',
    lowPlacements: '',
    middlePlacements: '',
    highPlacements: ''
  });

  const getInitialTopicRows = () => [createEmptyTopicRow(1), createEmptyTopicRow(2)];

  const normalizeApiArray = React.useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.items && Array.isArray(payload.items)) return payload.items;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  }, []);

  const isOptionMarkedCorrect = (option) => {
    if (!option) return false;
    const rawValue = option.isCorrect ?? option.IsCorrect ?? option.correct ?? option.is_correct ?? option.correctOption ?? option.answer ?? option.CorrectOption ?? option.Answer ?? null;

    if (typeof rawValue === 'boolean') return rawValue;
    if (typeof rawValue === 'number') return rawValue === 1;
    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim().toLowerCase();
      if (!normalized) return false;
      if (['true', 't', 'yes', 'y'].includes(normalized)) return true;
      if (['false', 'f', 'no', 'n'].includes(normalized)) return false;
    }
    return false;
  };

  const getCorrectAnswerLetter = (question) => {
    const optionList = question?.options || question?.Options || question?.choices || [];
    const normalizedOptions = Array.isArray(optionList) ? optionList : [];
    const correctIndex = normalizedOptions.findIndex(isOptionMarkedCorrect);
    if (correctIndex >= 0) {
      return String.fromCharCode(65 + correctIndex);
    }

    const fallback = question?.correctAnswer || question?.correctAnswerLetter || question?.answerKey || question?.CorrectAnswer || question?.CorrectAnswerLetter || question?.AnswerKey;
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim().toUpperCase();
    }
    return '-';
  };

  const normalizeAnswerChoice = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).trim().toUpperCase();
    return ['A', 'B', 'C', 'D'].includes(normalized) ? normalized : '';
  };

  const applyCorrectAnswerForGeneratedExam = (question, answerChoice) => {
    if (!question) return question;
    const normalizedChoice = normalizeAnswerChoice(answerChoice);
    if (!normalizedChoice) return question;

    const optionList = question.options || question.Options || question.choices || [];
    const normalizedOptions = Array.isArray(optionList) ? optionList : [];
    if (normalizedOptions.length === 0) return question;

    const targetIndex = normalizedChoice.charCodeAt(0) - 65;
    if (targetIndex < 0 || targetIndex >= normalizedOptions.length) {
      return question;
    }

    let currentCorrectIndex = normalizedOptions.findIndex(isOptionMarkedCorrect);
    if (currentCorrectIndex < 0) {
      const fallbackIndex = normalizeAnswerChoice(getCorrectAnswerLetter(question));
      if (fallbackIndex) {
        currentCorrectIndex = fallbackIndex.charCodeAt(0) - 65;
      }
    }

    if (currentCorrectIndex < 0 || currentCorrectIndex >= normalizedOptions.length) {
      currentCorrectIndex = targetIndex;
    }

    const reorderedOptions = [...normalizedOptions];
    if (currentCorrectIndex !== targetIndex) {
      const temp = reorderedOptions[targetIndex];
      reorderedOptions[targetIndex] = reorderedOptions[currentCorrectIndex];
      reorderedOptions[currentCorrectIndex] = temp;
    }

    const updatedOptions = reorderedOptions.map((option, index) => {
      const isCorrect = index === targetIndex;
      return {
        ...option,
        isCorrect,
        IsCorrect: isCorrect
      };
    });

    return {
      ...question,
      options: updatedOptions,
      correctAnswer: normalizedChoice,
      correctAnswerLetter: normalizedChoice,
      answerKey: normalizedChoice
    };
  };

  // Helper function to convert image URL to base64 data URL - using fetch to avoid CORS
  const convertImageToDataURL = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to fetch image:', error);
      throw error;
    }
  };

  const resolveQuestionImageUrl = React.useCallback((imagePath) => {
    if (!imagePath) return '';
    const normalizedPath = String(imagePath).replace(/\\/g, '/').replace(/^\/?api\//i, '/');
    if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

    const normalizedBase = API_BASE_URL.replace(/\/$/, '');
    const mediaBase = normalizedBase.replace(/\/api$/i, '');
    const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;

    try {
      return new URL(relativePath, `${mediaBase}/`).toString();
    } catch {
      return `${mediaBase}/${relativePath}`;
    }
  }, []);

  const asHtml = React.useCallback((rawContent) => ({
    __html: rawContent === undefined || rawContent === null ? '' : String(rawContent)
  }), []);

  // Helper function to determine semester based on current date
  const getAutoSemester = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 8 || month <= 12) return '1st'; // Aug-Dec
    if (month >= 1 && month <= 5) return '2nd'; // Jan-May
    return 'Summer'; // Jun-Jul
  };

  // Helper function to get school year
  const getAutoSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 8) {
      return `${year}${year + 1}`; // Starting from Aug (next year)
    } else {
      return `${year - 1}${year}`; // Before Aug (previous year)
    }
  };

  // Form states
  const [selectedDepartment, setSelectedDepartment] = useState(''); // Department ID
  const [selectedCourse, setSelectedCourse] = useState(''); // Program ID
  const [selectedSubject, setSelectedSubject] = useState(''); // Subject ID
  const [examType, setExamType] = useState(''); // Midterm, Prelim, Finals
  const [semester, setSemester] = useState(''); // 1st, 2nd, Summer
  const [schoolYear] = useState(getAutoSchoolYear()); // YYYYYYYY format
  const [totalExamItems, setTotalExamItems] = useState(''); // Total exam items
  const [manualTotalItems, setManualTotalItems] = useState(false);
  const [specOverrides, setSpecOverrides] = useState({});
  const [totalExamItemsInput, setTotalExamItemsInput] = useState('');
  const hasCommittedTotalExamItems = React.useMemo(() => {
    const parsed = parseInt(totalExamItems, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }, [totalExamItems]);
  const isTotalExamItemsInputValid = React.useMemo(() => {
    const parsed = parseInt(totalExamItemsInput, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }, [totalExamItemsInput]);
  const isTotalExamItemsDirty = React.useMemo(() => {
    if (!hasCommittedTotalExamItems) return false;
    return String(totalExamItemsInput || '').trim() !== String(totalExamItems || '').trim();
  }, [hasCommittedTotalExamItems, totalExamItemsInput, totalExamItems]);
  const isTableUnlocked = hasCommittedTotalExamItems && !isTotalExamItemsDirty;
  const canConfirmTotalExamItems = React.useMemo(() => {
    if (!selectedSubject) return false;
    if (!isTotalExamItemsInputValid) return false;
    return true;
  }, [selectedSubject, isTotalExamItemsInputValid]);
  const [questionEditModal, setQuestionEditModal] = useState(DEFAULT_QUESTION_EDIT_STATE);
  const [replacementCandidates, setReplacementCandidates] = useState([]);
  const [isLoadingReplacementCandidates, setIsLoadingReplacementCandidates] = useState(false);
  const [replacementError, setReplacementError] = useState('');

  const handleSpecOverrideChange = (overrideKey, field, value) => {
    setSpecOverrides(prev => ({
      ...prev,
      [overrideKey]: {
        ...(prev[overrideKey] || {}),
        [field]: value
      }
    }));
  };

  React.useEffect(() => {
    setTotalExamItemsInput(totalExamItems);
  }, [totalExamItems]);

  const resetGeneratedArtifacts = React.useCallback(() => {
    setGeneratedSpec(null);
    setSampleExam(null);
    setActiveExamMeta(null);
    setIsSampleExamVisible(false);
    setShowAnswerSheet(false);
    setSaveConfirmation(null);
    setGenerationWarnings([]);
    setInsufficientItemsWarning('');
    setExcessItemsWarning('');
    setLastSavedSignature('');
    setQuestionEditModal(DEFAULT_QUESTION_EDIT_STATE);
    setReplacementCandidates([]);
    setReplacementError('');
    setIsLoadingReplacementCandidates(false);
  }, []);

  useEffect(() => {
    if (isTotalExamItemsDirty && hasCommittedTotalExamItems && !totalItemsDirtyRef.current) {
      resetGeneratedArtifacts();
    }
    if (!isTotalExamItemsDirty) {
      totalItemsDirtyRef.current = false;
      return;
    }
    totalItemsDirtyRef.current = true;
  }, [isTotalExamItemsDirty, hasCommittedTotalExamItems, resetGeneratedArtifacts]);

  const handleTotalExamItemsCommit = React.useCallback(() => {
    const parsed = parseInt(totalExamItemsInput, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
    setTotalExamItems(normalized);
    setManualTotalItems(true);
  }, [totalExamItemsInput]);

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    setSelectedCourse('');
    setSelectedSubject('');
    setTopics([]);
    setQuestionsByTopic({});

    const dept = departments.find(d => d.id === Number(deptId));
    if (dept?.code) {
      navigate(`/test-generation/${dept.code}`);
    }
  };
  const [error, setError] = useState('');
  const [insufficientItemsWarning, setInsufficientItemsWarning] = useState('');
  const [excessItemsWarning, setExcessItemsWarning] = useState('');
  const [generationWarnings, setGenerationWarnings] = useState([]);
  const [topicRows, setTopicRows] = useState(() => getInitialTopicRows());
  const [generatedSpec, setGeneratedSpec] = useState(null);
  const [sampleExam, setSampleExam] = useState(null);
  const [activeExamMeta, setActiveExamMeta] = useState(null);
  const [isSampleExamVisible, setIsSampleExamVisible] = useState(false);
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questionsByTopic, setQuestionsByTopic] = useState({}); // Store questions by topicId
  const fetchQuestionsForTopic = React.useCallback(async (topicId) => {
    if (!topicId) return [];
    const topicKey = String(topicId);
    const cached = questionsByTopic[topicKey];
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    try {
      const response = await apiService.getQuestionsByTopic(topicId);
      const normalized = normalizeApiArray(response);
      setQuestionsByTopic((prev) => ({
        ...prev,
        [topicKey]: normalized
      }));
      return normalized;
    } catch (err) {
      console.error('Failed to load questions for topic:', err);
      setError('Failed to load questions for the selected topic.');
      return [];
    }
  }, [questionsByTopic, normalizeApiArray]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customSetLabel, setCustomSetLabel] = useState('');
  const [saveNameError, setSaveNameError] = useState('');
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, rowId: null });
  const [cancelReviewConfirmation, setCancelReviewConfirmation] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintRequestModal, setShowPrintRequestModal] = useState(false);
  const [printRequestCopies, setPrintRequestCopies] = useState(1);
  const [printRequestNotes, setPrintRequestNotes] = useState('');
  const [printOption, setPrintOption] = useState('specification');
  const [savedExamSets, setSavedExamSets] = useState([]);
  const [isLoadingSavedSets, setIsLoadingSavedSets] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState('');
  const [saveConfirmation, setSaveConfirmation] = useState(null);

  const closeSaveModal = React.useCallback(() => {
    if (isSavingExam) return;
    setShowSaveModal(false);
    setSaveNameError('');
    setCustomSetLabel('');
  }, [isSavingExam]);

  // Print Requests (Admin)
  const [viewMode, setViewMode] = useState('generation'); // 'generation' or 'printrequests'
  const [printRequests, setPrintRequests] = useState([]);
  const [isLoadingPrintRequests, setIsLoadingPrintRequests] = useState(false);
  const [activePrintRequest, setActivePrintRequest] = useState(null); // Currently loaded request for review
  const [isHydratingRequest, setIsHydratingRequest] = useState(false);
  const requestSyncRef = useRef(false);
  const skipSpecRecalcRef = useRef(false);
  const autoReadyRef = useRef({ requestId: null, marked: false });
  const totalItemsDirtyRef = useRef(false);
  const [myPrintRequests, setMyPrintRequests] = useState([]);
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState('');
  const coursesCacheRef = useRef(new Map());
  const subjectsCacheRef = useRef(new Map());
  const topicsCacheRef = useRef(new Map());
  const subjectQuestionCacheRef = useRef(new Map());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      if (!user?.userId) return;
      
      try {
        setIsLoadingDepartments(true);
        // Admin sees all departments, non-admin sees only assigned departments
        const data = isAdmin 
          ? await apiService.getDepartments()
          : await apiService.getUserDepartments(user.userId);
        console.log('Departments loaded:', data);
        const list = Array.isArray(data) ? data : [];
        setDepartments(list);
      } catch (err) {
        console.error('Failed to load departments:', err);
        setError('Failed to load departments. Please try again.');
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, [user, isAdmin]);

  const applySubjectQuestionsFromCache = React.useCallback((subjectId, topicList) => {
    if (!subjectId || !Array.isArray(topicList)) return false;
    const cached = subjectQuestionCacheRef.current.get(String(subjectId));
    if (!cached) return false;

    if (topicList.length === 0) {
      setQuestionsByTopic({});
      return true;
    }

    const questionMap = {};
    topicList.forEach((topic) => {
      const topicKey = String(topic.id);
      const cachedQuestions = cached[topicKey];
      questionMap[topic.id] = Array.isArray(cachedQuestions) ? [...cachedQuestions] : [];
    });
    setQuestionsByTopic(questionMap);
    return true;
  }, []);

  const ensureSubjectQuestionPools = React.useCallback(async (subjectId, topicList, options = {}) => {
    const { forceRefresh = false } = options;
    if (!subjectId || !Array.isArray(topicList)) {
      setQuestionsByTopic({});
      return;
    }

    const subjectKey = String(subjectId);
    if (!forceRefresh) {
      const applied = applySubjectQuestionsFromCache(subjectKey, topicList);
      if (applied) {
        return;
      }
    }

    try {
      const response = await apiService.getQuestions({ subjectId: parseInt(subjectId, 10), pageSize: 5000 });
      const normalized = normalizeApiArray(response);
      const grouped = {};
      topicList.forEach((topic) => {
        grouped[String(topic.id)] = [];
      });

      normalized.forEach((question) => {
        const rawTopicId = question.topicId ?? question.TopicId ?? question.topic?.id ?? question.Topic?.Id ?? question.topic ?? question.Topic;
        if (!rawTopicId) return;
        const topicKey = String(rawTopicId);
        if (!grouped[topicKey]) {
          grouped[topicKey] = [];
        }
        grouped[topicKey].push(question);
      });

      subjectQuestionCacheRef.current.set(subjectKey, grouped);
      const questionMap = {};
      topicList.forEach((topic) => {
        const topicKey = String(topic.id);
        questionMap[topic.id] = Array.isArray(grouped[topicKey]) ? grouped[topicKey] : [];
      });
      setQuestionsByTopic(questionMap);
    } catch (err) {
      console.error('Failed to load questions for subject:', err);
      setError('Failed to load questions for this course.');
      const emptyMap = {};
      topicList.forEach((topic) => {
        emptyMap[topic.id] = [];
      });
      setQuestionsByTopic(emptyMap);
    }
  }, [applySubjectQuestionsFromCache, normalizeApiArray]);

  useEffect(() => {
    if (!departments.length) return;

    if (departmentCode) {
      const matched = departments.find(d => d.code === departmentCode);
      if (matched && String(matched.id) !== selectedDepartment) {
        setSelectedDepartment(String(matched.id));
        return;
      }
    }

    if (!selectedDepartment) {
      const fallback = departments.find(d => (d.code || '').toUpperCase() !== 'IT') || departments[0];
      if (fallback) {
        setSelectedDepartment(String(fallback.id));
      }
    }
  }, [departmentCode, departments, selectedDepartment]);

  // Load programs for selected department
  useEffect(() => {
    const loadCourses = async () => {
      if (!selectedDepartment) {
        setCourses([]);
        setSubjects([]);
        setTopics([]);
        setQuestionsByTopic({});
        return;
      }

      if (requestSyncRef.current) {
        return;
      }

      const departmentId = parseInt(selectedDepartment, 10);
      if (!Number.isFinite(departmentId)) {
        setCourses([]);
        return;
      }

      const cachedCourses = coursesCacheRef.current.get(departmentId);
      if (cachedCourses) {
        setCourses(cachedCourses);
        setSelectedCourse((prev) => {
          if (!prev) return prev;
          const exists = cachedCourses.some(course => String(course.id) === String(prev));
          return exists ? prev : '';
        });
        setSelectedSubject((prev) => {
          if (!prev) return prev;
          // Subject cache is course-specific. Keep existing value only when course selection stays valid.
          const hasValidCourse = selectedCourse && cachedCourses.some(course => String(course.id) === String(selectedCourse));
          return hasValidCourse ? prev : '';
        });
        return;
      }

      try {
        setIsLoadingCourses(true);
        console.log('Loading courses for departmentId:', departmentId);
        const dept = departments.find(d => d.id === departmentId);
        if (!dept) {
          console.warn('Department not found:', selectedDepartment);
          setCourses([]);
          return;
        }

        const data = await apiService.getCourses(dept.id);
        console.log('Courses loaded for dept', dept.id, ':', data);
        const list = Array.isArray(data) ? data : [];
        coursesCacheRef.current.set(dept.id, list);
        setCourses(list);
        setSelectedCourse((prev) => {
          if (!prev) return prev;
          const exists = list.some(course => String(course.id) === String(prev));
          return exists ? prev : '';
        });
        setSelectedSubject((prev) => {
          if (!prev) return prev;
          const hasValidCourse = selectedCourse && list.some(course => String(course.id) === String(selectedCourse));
          return hasValidCourse ? prev : '';
        });
      } catch (err) {
        console.error('Failed to load courses:', err);
        setError(`Failed to load programs: ${err.message || 'Unknown error'}`);
        setCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadCourses();
  }, [selectedDepartment, departments, selectedCourse]);

  // Load subjects for selected program
  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedCourse) {
        setSubjects([]);
        setTopics([]);
        setQuestionsByTopic({});
        return;
      }

      if (requestSyncRef.current) {
        return;
      }

      const courseId = parseInt(selectedCourse, 10);
      if (!Number.isFinite(courseId)) {
        setSubjects([]);
        return;
      }

      const cachedSubjects = subjectsCacheRef.current.get(courseId);
      if (cachedSubjects) {
        setSubjects(cachedSubjects);
        setSelectedSubject((prev) => {
          if (!prev) return prev;
          const exists = cachedSubjects.some(subject => String(subject.id) === String(prev));
          return exists ? prev : '';
        });
        return;
      }

      try {
        setIsLoadingSubjects(true);
        console.log('Loading subjects for courseId:', courseId);
        const subjectsList = await apiService.getSubjects({ courseId, pageSize: 500 });
        console.log('Subjects loaded:', subjectsList);
        
        const list = Array.isArray(subjectsList) ? subjectsList : [];
        subjectsCacheRef.current.set(courseId, list);
        setSubjects(list);
        setSelectedSubject((prev) => {
          if (!prev) return prev;
          const exists = list.some(subject => String(subject.id) === String(prev));
          return exists ? prev : '';
        });
        
        if (list.length === 0) {
          console.warn('No subjects found for courseId:', courseId);
          setError('No courses found for this program.');
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
        setError(`Failed to load courses: ${err.message || 'Unknown error'}`);
        setSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    void loadSubjects();
  }, [selectedCourse]);


  // Load topics for selected subject
  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedSubject) {
        setTopics([]);
        setQuestionsByTopic({});
        return;
      }

      if (requestSyncRef.current) {
        return;
      }

      const subjectId = parseInt(selectedSubject, 10);
      if (!Number.isFinite(subjectId)) {
        setTopics([]);
        setQuestionsByTopic({});
        return;
      }

      const cachedTopics = topicsCacheRef.current.get(subjectId);
      if (cachedTopics) {
        setTopics(cachedTopics);
        await ensureSubjectQuestionPools(subjectId, cachedTopics);
        return;
      }

      try {
        setIsLoadingTopics(true);
        console.log('Loading topics for subjectId:', subjectId);
        
        const topicsList = await apiService.getTopics(subjectId);
        console.log('Raw topics response from API:', topicsList);
        console.log('Topics type:', typeof topicsList, 'Is array:', Array.isArray(topicsList));
        
        const list = Array.isArray(topicsList) ? topicsList : [];
        console.log('Processed topics list:', list);
        topicsCacheRef.current.set(subjectId, list);
        setTopics(list);

        if (list.length === 0) {
          console.warn('No topics found for subjectId:', subjectId);
          setError('No topics found for this course. Please check that topics have been created and linked to this course.');
          setQuestionsByTopic({});
        } else {
          console.log('Found', list.length, 'topics');
          await ensureSubjectQuestionPools(subjectId, list);
        }
      } catch (error) {
        console.error('Error loading topics:', error);
        setError('Failed to load topics. Please try again.');
      } finally {
        setIsLoadingTopics(false);
      }
    };

    void loadTopics();
  }, [selectedSubject, ensureSubjectQuestionPools]);

  const handleUserAction = (action) => {
    setIsUserMenuOpen(false);
    if (action === 'Logout') {
      setIsLogoutModalOpen(true);
    } else if (action === 'Activity Logs') {
      navigate('/activity-logs');
    } else if (action === 'Need Help') {
      if (typeof window !== 'undefined') {
        window.open(HELP_CENTER_URL, '_blank', 'noopener,noreferrer');
      }
    } else {
      console.log('Navigate to', action);
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  // Handle topic row change
  const handleTopicRowChange = (id, field, value) => {
    console.log(`handleTopicRowChange: id=${id}, field=${field}, value=${value}`);
    setTopicRows(prev => {
      // Update the specific row
      const updated = prev.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      );
      console.log('Updated topicRows after change:', updated);
      
      // Check if last row is now filled, if so add a new empty row
      const lastRow = updated[updated.length - 1];
      if (lastRow.topic && lastRow.hours) {
        // Check if there's already an empty row after (there shouldn't be if this was the last row)
        if (lastRow.id === id) {
          // The updated row is the last one - add a new empty row
          const newRowId = Math.max(...prev.map(r => r.id)) + 1;
          return [...updated, { id: newRowId, topicId: '', topicName: '', topic: '', hours: '', lowCount: '', middleCount: '', highCount: '', lowPlacements: '', middlePlacements: '', highPlacements: '' }];
        }
      }
      
      return updated;
    });
  };

  const isTopicSelectedInOtherRow = (rowId, topicId) => {
    if (!topicId) return false;
    return topicRows.some(row => row.id !== rowId && String(row.topicId) === String(topicId));
  };

  const getSelectedTopicIdsForOtherRows = (rowId) => {
    return new Set(
      topicRows
        .filter(row => row.id !== rowId && row.topicId)
        .map(row => String(row.topicId))
    );
  };

  const handleTopicSelection = (rowId, topicId, topicName) => {
    if (!topicId) return;

    if (isTopicSelectedInOtherRow(rowId, topicId)) {
      showToast({ message: 'This topic is already selected in another row. Please choose a different topic.', type: 'error' });
      setError('Duplicate topic selection is not allowed.');
      return;
    }

    const selectedTopicObj = topics.find(t => String(t.id) === String(topicId));
    console.log('[TOPIC SELECT] Selected topic object:', selectedTopicObj);
    const hours = selectedTopicObj?.allocatedHours || 0;
    console.log('[TOPIC SELECT] Extracted hours:', hours);

    handleTopicRowChange(rowId, 'topicId', topicId);
    handleTopicRowChange(rowId, 'topicName', topicName);
    handleTopicRowChange(rowId, 'topic', topicName);
    handleTopicRowChange(rowId, 'hours', String(hours));
    setError('');
  };

// Handle delete row - show confirmation first
  const handleDeleteRowClick = (rowId) => {
    setDeleteConfirmation({ show: true, rowId });
  };

  const confirmDeleteRow = () => {
    const rowId = deleteConfirmation.rowId;
    setDeleteConfirmation({ show: false, rowId: null });

    setTopicRows(prev => {
      // Don't allow deletion if only 1 row remains
      if (prev.length <= 1) {
        setError('Cannot delete the only row. Please keep at least one row.');
        return prev;
      }
      
      // Filter out the row to delete
      const updated = prev.filter(row => row.id !== rowId);
      
      // If the last row is filled, add an empty row
      const lastRow = updated[updated.length - 1];
      if (lastRow && lastRow.topic && lastRow.hours && !lastRow.lowPlacements) {
        const newRowId = Math.max(...updated.map(r => r.id)) + 1;
        return [...updated, { id: newRowId, topicId: '', topicName: '', topic: '', hours: '', lowCount: '', middleCount: '', highCount: '', lowPlacements: '', middlePlacements: '', highPlacements: '' }];
      }
      
      // If the last row is empty, we're good
      if (!lastRow || (!lastRow.topic && !lastRow.hours)) {
        return updated;
      }

      return updated;
    });
    setError('');
  };

  const cancelDeleteRow = () => {
    setDeleteConfirmation({ show: false, rowId: null });
  };

  // Calculate total hours
  const calculateTotalHours = React.useCallback(() => {
    return topicRows
      .filter(row => row.topic && row.hours)
      .reduce((sum, row) => sum + (parseInt(row.hours) || 0), 0);
  }, [topicRows]);

  // Calculate cognitive level distribution
  const calculateDistribution = React.useCallback(() => {
    const totalItems = parseInt(totalExamItems) || 0;
    if (totalItems <= 0) return { low: 0, middle: 0, high: 0 };

    const low = Math.floor(totalItems * 0.30);
    const middle = Math.floor(totalItems * 0.30);
    const high = totalItems - low - middle; // Ensure sum equals totalItems

    return { low, middle, high };
  }, [totalExamItems]);

  // Calculate specification in real-time as user enters data
  const calculateSpecification = React.useCallback(() => {
    const completedRows = topicRows.filter(row => row.topic && row.hours);
    console.log('calculateSpecification called - completedRows:', completedRows.length, completedRows);
    console.log('totalExamItems:', totalExamItems, 'questionsByTopic keys:', Object.keys(questionsByTopic));
    
    if (completedRows.length === 0 || !totalExamItems) {
      console.log('Returning null - no completed rows or no total exam items');
      return null;
    }

    const totalItems = parseInt(totalExamItems);
    const totalHours = calculateTotalHours();
    if (totalHours === 0) return null;

    // Track all placements to ensure uniqueness
    const usedPlacements = new Set();
    
    // Generate all unique placements upfront
    const generateUniquePlacements = (count, total, used) => {
      const placements = [];
      while (placements.length < Math.min(count, total)) {
        const random = Math.floor(Math.random() * total) + 1;
        if (!used.has(random)) {
          placements.push(random);
          used.add(random);
        }
      }
      return placements.sort((a, b) => a - b);
    };

    // Helper function to get questions for a topic and cognitive level
    const getQuestionsForTopicAndLevel = (topicId, level) => {
      const topicQuestions = questionsByTopic[topicId] || [];
      
      // Map cognitive level groups to BloomLevel enum values
      let bloomLevelsToMatch = [];
      if (level === 'low') {
        // Remembering & Understanding (30%)
        bloomLevelsToMatch = ['Remember', 'Understand', 'Remembering', 'Understanding', '1', '2', 1, 2];
      } else if (level === 'middle') {
        // Applying & Analyzing (30%)
        bloomLevelsToMatch = ['Apply', 'Analyze', 'Applying', 'Analyzing', '3', '4', 3, 4];
      } else if (level === 'high') {
        // Evaluating & Creating (40%)
        bloomLevelsToMatch = ['Evaluate', 'Create', 'Evaluating', 'Creating', '5', '6', 5, 6];
      }
      
      const result = topicQuestions.filter(q => {
        if (!q.bloomLevel && q.bloomLevel !== 0) {
          if (topicId === 8) console.warn('[Q' + q.id + '] Question missing bloomLevel:', q);
          return false;
        }
        const match = bloomLevelsToMatch.includes(q.bloomLevel);
        if (topicId === 8 && !match) {
          console.log(`[Q${q.id}] bloomLevel=${q.bloomLevel} (${typeof q.bloomLevel}), NOT in:`, bloomLevelsToMatch);
        }
        return match;
      });
      
      console.log(`[Topic ${topicId}/${level}] Found ${result.length}/${topicQuestions.length} matching questions`);
      if (result.length === 0 && topicQuestions.length > 0) {
        console.log(`Sample questions for topic ${topicId}:`, topicQuestions.slice(0, 2).map(q => `id=${q.id}, bloomLevel=${q.bloomLevel} (${typeof q.bloomLevel})`));
      }
      
      return result;
    };

    // Calculate items per topic and select questions
    const specData = completedRows.map(row => {
      const topicId = parseInt(row.topicId) || parseInt(row.topic);
      const topicHours = parseFloat(row.hours);
      const percentage = (topicHours / totalHours) * 100;
      const itemsForTopic = Math.round(totalItems * (percentage / 100));

      // Build override key from topic and hours
      const overrideKey = `${topicId}-${row.hours}`;
      const override = specOverrides[overrideKey] || {};

      // Check if user has manually edited the counts (from overrides or topicRows)
      const userEditedLowCount = override.lowCount !== undefined && override.lowCount !== '' ? parseInt(override.lowCount) : (row.lowCount !== undefined && row.lowCount !== '' ? parseInt(row.lowCount) : null);
      const userEditedMiddleCount = override.middleCount !== undefined && override.middleCount !== '' ? parseInt(override.middleCount) : (row.middleCount !== undefined && row.middleCount !== '' ? parseInt(row.middleCount) : null);
      const userEditedHighCount = override.highCount !== undefined && override.highCount !== '' ? parseInt(override.highCount) : (row.highCount !== undefined && row.highCount !== '' ? parseInt(row.highCount) : null);

      // Calculate distribution for this topic (30-30-40) or use user-edited values
      const autoLowCount = Math.floor(itemsForTopic * 0.30);
      const autoMiddleCount = Math.floor(itemsForTopic * 0.30);
      const autoHighCount = itemsForTopic - autoLowCount - autoMiddleCount;

      const lowCount = userEditedLowCount !== null ? userEditedLowCount : autoLowCount;
      const middleCount = userEditedMiddleCount !== null ? userEditedMiddleCount : autoMiddleCount;
      const highCount = userEditedHighCount !== null ? userEditedHighCount : autoHighCount;

      // Get questions for each cognitive level - Remembering, Analyzing, Evaluating
      const rememberingQuestions = getQuestionsForTopicAndLevel(topicId, 'low');
      const analyzingQuestions = getQuestionsForTopicAndLevel(topicId, 'middle');
      const evaluatingQuestions = getQuestionsForTopicAndLevel(topicId, 'high');
      
      console.log(`Topic ${topicId} - Low questions: ${rememberingQuestions.length}, Middle: ${analyzingQuestions.length}, High: ${evaluatingQuestions.length}`);
      if (rememberingQuestions.length > 0) {
        console.log('Sample low question bloom levels:', rememberingQuestions.slice(0, 3).map(q => q.bloomLevel));
      }

      // Combine questions for each level group
      const lowerOrderQuestions = rememberingQuestions; // 30%
      const middleOrderQuestions = analyzingQuestions; // 30%
      const higherOrderQuestions = evaluatingQuestions; // 40%

      // Select random questions for each level
      const selectRandomFromArray = (arr, count) => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, arr.length));
      };

      const selectedLow = selectRandomFromArray(lowerOrderQuestions, lowCount);
      const selectedMiddle = selectRandomFromArray(middleOrderQuestions, middleCount);
      const selectedHigh = selectRandomFromArray(higherOrderQuestions, highCount);

      // Generate random placements for this topic
      const placementsLow = generateUniquePlacements(selectedLow.length, totalItems, usedPlacements);
      const placementsMiddle = generateUniquePlacements(selectedMiddle.length, totalItems, usedPlacements);
      const placementsHigh = generateUniquePlacements(selectedHigh.length, totalItems, usedPlacements);

      // Save override key into returned spec for easy matching in UI

      return {
        topicId,
        topicName: row.topicName || `Topic ${topicId}`,
        topic: row.topic,
        hours: row.hours,
        percentage: percentage.toFixed(1),
        overrideKey,
        cognitive: {
          low: { 
            count: lowCount, 
            placements: placementsLow,
            questions: selectedLow.map((q, idx) => ({
              ...q,
              placement: placementsLow[idx]
            }))
          },
          middle: { 
            count: middleCount, 
            placements: placementsMiddle,
            questions: selectedMiddle.map((q, idx) => ({
              ...q,
              placement: placementsMiddle[idx]
            }))
          },
          high: { 
            count: highCount, 
            placements: placementsHigh,
            questions: selectedHigh.map((q, idx) => ({
              ...q,
              placement: placementsHigh[idx]
            }))
          }
        },
        total: lowCount + middleCount + highCount
      };
    });

    const totals = {
      low: specData.reduce((sum, spec) => sum + spec.cognitive.low.count, 0),
      middle: specData.reduce((sum, spec) => sum + spec.cognitive.middle.count, 0),
      high: specData.reduce((sum, spec) => sum + spec.cognitive.high.count, 0)
    };
    totals.grand = totals.low + totals.middle + totals.high;

    // Check if total items generated is less than requested (insufficient)
    let insufficientWarning = '';
    let excessWarning = '';
    
    // Ensure totalHours is defined before use
    const safeTotalHours = totalHours || 0;
    if (totals.grand < totalItems) {
      const shortfall = totalItems - totals.grand;
      let suggestedHoursText = '';
      if (safeTotalHours > 0) {
        const availablePerHour = totals.grand / safeTotalHours; // questions per hour
        const suggestedHours = Math.ceil(shortfall / (availablePerHour || 1));
        suggestedHoursText = ` Suggested: add ~${suggestedHours} hour(s) across topics or add more topics with questions.`;
      } else {
        suggestedHoursText = ' Add at least one topic and specify hours to generate items.';
      }
      insufficientWarning = `Warning: Only ${totals.grand} items can be generated from selected topics. You need ${shortfall} more items.` + suggestedHoursText;
    } else if (totals.grand > totalItems) {
      const excess = totals.grand - totalItems;
      let suggestedReduceText = '';
      if (safeTotalHours > 0) {
        const availablePerHour = totals.grand / safeTotalHours;
        const hoursToRemove = Math.ceil(excess / (availablePerHour || 1));
        suggestedReduceText = ` Suggestion: reduce topic hours by ~${hoursToRemove} hour(s), or increase Total Exam Items by ${excess} to use available questions.`;
      } else {
        suggestedReduceText = ` Consider removing some topics or lowering hours, or increase Total Exam Items by ${excess}.`;
      }
      excessWarning = `You have ${excess} extra questions available.` + suggestedReduceText;
    }

    return { specs: specData, totals, totalItems, insufficientWarning, excessWarning };
  }, [topicRows, totalExamItems, questionsByTopic, specOverrides, calculateTotalHours]);

  // Compute and cache the generated specification so placements remain stable
  React.useEffect(() => {
    if (skipSpecRecalcRef.current) {
      skipSpecRecalcRef.current = false;
      return;
    }

    console.log('=== SPEC GENERATION EFFECT ===');
    console.log('topicRows:', topicRows);
    console.log('totalExamItems:', totalExamItems);
    console.log('topics count:', topics.length);
    console.log('questionsByTopic keys:', Object.keys(questionsByTopic));
    
    const spec = calculateSpecification();
    console.log('Generated spec:', spec);
    setGeneratedSpec(spec);
  }, [topicRows, specOverrides, totalExamItems, topics, questionsByTopic, calculateSpecification]);

  // Update insufficient and excess items warnings based on the cached spec
  React.useEffect(() => {
    const spec = generatedSpec;
    if (spec && spec.insufficientWarning) {
      setInsufficientItemsWarning(spec.insufficientWarning);
    } else {
      setInsufficientItemsWarning('');
    }

    if (spec && spec.excessWarning) {
      setExcessItemsWarning(spec.excessWarning);
    } else {
      setExcessItemsWarning('');
    }
    // Auto-update total exam items when not manually overridden
    if (!manualTotalItems && spec && spec.totals) {
      const autoTotal = spec.totals.grand || 0;
      if (parseInt(totalExamItems) !== parseInt(autoTotal)) {
        setTotalExamItems(String(autoTotal));
      }
    }
  }, [generatedSpec, manualTotalItems, totalExamItems]);

  const deriveSetLabel = React.useCallback((index) => {
    let value = Math.max(index, 0) + 1;
    let label = '';
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return `Set ${label}`;
  }, []);

  const buildQuestionsPayload = React.useCallback(() => {
    const sampleQuestions = sampleExam?.questions;
    if (Array.isArray(sampleQuestions) && sampleQuestions.length > 0) {
      const orderedFromSample = sampleQuestions
        .map((question, index) => {
          const rawQuestionId = question?.id ?? question?.questionId ?? question?.QuestionId;
          const questionId = Number(rawQuestionId);
          if (!Number.isInteger(questionId)) return null;

          const normalizedCorrectAnswer = normalizeAnswerChoice(getCorrectAnswerLetter(question));
          const options = (question.options || question.Options || question.choices || [])
            .map((option, optIdx) => {
              const rawOptionId = option?.optionId ?? option?.OptionId ?? option?.id ?? option?.Id;
              const optionId = Number(rawOptionId);
              if (!Number.isInteger(optionId)) return null;
              const optionLetter = String.fromCharCode(65 + optIdx);
              const isCorrect = normalizedCorrectAnswer
                ? optionLetter === normalizedCorrectAnswer
                : isOptionMarkedCorrect(option);
              return {
                optionId,
                displayOrder: optIdx,
                isCorrect
              };
            })
            .filter(Boolean);

          return {
            questionId,
            displayOrder: index,
            options
          };
        })
        .filter(Boolean);

      const signature = orderedFromSample
        .map(item => `${item.displayOrder}:${item.questionId}`)
        .join('|');

      return { ordered: orderedFromSample, signature };
    }

    if (!generatedSpec?.specs) {
      return { ordered: [], signature: '' };
    }

    const flat = [];
    generatedSpec.specs.forEach(topicSpec => {
      ['low', 'middle', 'high'].forEach(levelKey => {
        const levelQuestions = topicSpec?.cognitive?.[levelKey]?.questions || [];
        levelQuestions.forEach(question => {
          if (!question?.id) return;
          const placement = Number(question.placement);
          flat.push({
            questionId: question.id,
            placement: Number.isNaN(placement) ? null : placement,
            fallbackOrder: flat.length
          });
        });
      });
    });

    if (flat.length === 0) {
      return { ordered: [], signature: '' };
    }

    const ordered = flat
      .sort((a, b) => {
        const placeA = a.placement ?? a.fallbackOrder;
        const placeB = b.placement ?? b.fallbackOrder;
        if (placeA === placeB) {
          return a.fallbackOrder - b.fallbackOrder;
        }
        return placeA - placeB;
      })
      .map((entry, index) => ({
        questionId: entry.questionId,
        displayOrder: index
      }));

    const signature = ordered
      .map(item => `${item.displayOrder}:${item.questionId}`)
      .join('|');

    return { ordered, signature };
  }, [sampleExam, generatedSpec]);

  const questionsPayload = React.useMemo(() => buildQuestionsPayload(), [buildQuestionsPayload]);
  const questionSignature = questionsPayload.signature;
  const canSaveExam = Boolean(generatedSpec && questionSignature && questionSignature !== lastSavedSignature);
  const selectedCourseDetails = React.useMemo(() => {
    if (!selectedCourse) return null;
    return courses.find(c => c.id === parseInt(selectedCourse, 10)) || null;
  }, [courses, selectedCourse]);
  const handledRequestStatuses = ['ReadyForPickup', 'Completed', 'Rejected'];
  const activeRequestStatus = activePrintRequest?.status || 'Pending';
  const isActiveRequestHandled = activePrintRequest ? handledRequestStatuses.includes(activeRequestStatus) : false;
  const isViewSwitchLocked = Boolean(activePrintRequest && !isActiveRequestHandled);
  const statusColorMap = {
    Pending: '#f59e0b',
    ReadyForPickup: '#16a34a',
    Completed: '#0f172a',
    Rejected: '#dc2626'
  };
  const selectedSubjectDetails = React.useMemo(() => {
    if (!selectedSubject) return null;
    return subjects.find(s => s.id === parseInt(selectedSubject, 10)) || null;
  }, [selectedSubject, subjects]);

  const buildDraftPrintRequestExamData = React.useCallback(() => {
    const departmentId = Number(selectedDepartment);
    const courseId = Number(selectedCourse);
    const subjectId = Number(selectedSubject);

    if (!Number.isInteger(departmentId) || !Number.isInteger(courseId) || !Number.isInteger(subjectId)) {
      return null;
    }

    const { ordered } = questionsPayload;
    if (!Array.isArray(ordered) || ordered.length === 0) {
      return null;
    }

    const sampleQuestions = Array.isArray(sampleExam?.questions) ? sampleExam.questions : [];
    const sampleById = new Map(
      sampleQuestions
        .map((question) => {
          const questionId = Number(getQuestionIdentifier(question));
          if (!Number.isInteger(questionId)) return null;
          return [questionId, question];
        })
        .filter(Boolean)
    );

    const questions = ordered.map((entry, index) => {
      const questionId = Number(entry?.questionId);
      const sourceQuestion = sampleById.get(questionId);
      const sourceOptions = Array.isArray(sourceQuestion?.options)
        ? sourceQuestion.options
        : Array.isArray(sourceQuestion?.Options)
          ? sourceQuestion.Options
          : [];
      const sourceImage = sourceQuestion?.image || sourceQuestion?.Image || null;

      const options = (entry?.options || [])
        .map((option, optIdx) => {
          const optionId = Number(option?.optionId);
          if (!Number.isInteger(optionId)) return null;

          const sourceOption = sourceOptions.find((candidate) => {
            const candidateId = Number(candidate?.optionId ?? candidate?.OptionId ?? candidate?.id ?? candidate?.Id);
            return Number.isInteger(candidateId) && candidateId === optionId;
          });

          const isCorrect = typeof option?.isCorrect === 'boolean'
            ? option.isCorrect
            : isOptionMarkedCorrect(sourceOption);

          return {
            optionId,
            displayOrder: Number.isInteger(option?.displayOrder) ? option.displayOrder : optIdx,
            content: sourceOption?.content || sourceOption?.Content || sourceOption?.optionText || sourceOption?.text || '',
            isCorrect,
          };
        })
        .filter(Boolean);

      const imagePath = sourceImage?.imagePath || sourceImage?.ImagePath || null;
      const widthPercentage = Number(sourceImage?.widthPercentage ?? sourceImage?.WidthPercentage);

      return {
        questionId,
        displayOrder: Number.isInteger(entry?.displayOrder) ? entry.displayOrder : index,
        content: sourceQuestion?.content || sourceQuestion?.Content || null,
        bloomLevel: (() => {
          const raw = sourceQuestion?.bloomLevel ?? sourceQuestion?.BloomLevel;
          const numeric = Number(raw);
          return Number.isNaN(numeric) ? null : numeric;
        })(),
        points: (() => {
          const raw = sourceQuestion?.points ?? sourceQuestion?.Points;
          const numeric = Number(raw);
          return Number.isNaN(numeric) ? null : numeric;
        })(),
        image: imagePath
          ? {
              imagePath,
              widthPercentage: Number.isNaN(widthPercentage) ? null : widthPercentage,
              alignment: sourceImage?.alignment || sourceImage?.Alignment || null,
            }
          : null,
        options,
      };
    });

    return {
      departmentId,
      courseId,
      subjectId,
      title: activeExamMeta?.setLabel || `${examType} ${semester} ${schoolYear} Draft`,
      description: `${examType} Exam - ${semester} ${schoolYear}`,
      instructions: null,
      examType,
      semester,
      schoolYear,
      durationMinutes: 60,
      totalPoints: ordered.length,
      specificationSnapshot: generatedSpec ? JSON.stringify(generatedSpec) : null,
      generationNotes: generationWarnings?.join('\n') || null,
      questions,
    };
  }, [
    selectedDepartment,
    selectedCourse,
    selectedSubject,
    questionsPayload,
    sampleExam,
    activeExamMeta,
    examType,
    semester,
    schoolYear,
    generatedSpec,
    generationWarnings,
  ]);

  const loadSavedExamSets = React.useCallback(async () => {
    if (!selectedSubject) {
      setSavedExamSets([]);
      return;
    }

    try {
      setIsLoadingSavedSets(true);
      const subjectId = parseInt(selectedSubject);
      const saved = await apiService.getExams({
        subjectId,
        examType,
        semester,
        schoolYear,
        pageSize: 50
      });
      setSavedExamSets(Array.isArray(saved) ? saved : saved?.items || []);
    } catch (err) {
      console.error('Failed to load saved exam sets:', err);
    } finally {
      setIsLoadingSavedSets(false);
    }
  }, [selectedSubject, examType, semester, schoolYear]);

  React.useEffect(() => {
    setLastSavedSignature('');
    void loadSavedExamSets();
  }, [loadSavedExamSets]);

  React.useEffect(() => {
    setSaveConfirmation(null);
  }, [selectedSubject, examType, semester, schoolYear]);

  const nextSetLabel = React.useMemo(() => deriveSetLabel(savedExamSets.length), [deriveSetLabel, savedExamSets.length]);
  const saveAssetStatus = React.useMemo(() => {
    if (!saveConfirmation) return [];
    return [
      { key: 'examPaper', label: 'Exam Paper', saved: Boolean(saveConfirmation.examPaperSaved) },
      { key: 'tos', label: 'Table of Specification', saved: Boolean(saveConfirmation.tableOfSpecificationSaved) },
      { key: 'answerKey', label: 'Answer Key', saved: Boolean(saveConfirmation.answerKeySaved) }
    ];
  }, [saveConfirmation]);

  // Helpers for exam generation
  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const sampleRandom = (arr, n) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    if (n >= arr.length) return [...arr];
    const copy = [...arr];
    shuffleArray(copy);
    return copy.slice(0, n);
  };

  const bloomCategoryFromQuestion = (q = {}) => {
    const coarseMatchFromString = (value) => {
      if (value === undefined || value === null) return null;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized) return null;
      if (normalized.includes('remember') || normalized.includes('understand')) return 'remembering';
      if (normalized.includes('apply') || normalized.includes('analy')) return 'applying';
      if (normalized.includes('evaluate') || normalized.includes('create') || normalized.includes('synthesize')) return 'evaluating';
      return null;
    };

    const directLevel = coarseMatchFromString(
      q.level ??
      q.Level ??
      q.bloomCategory ??
      q.BloomCategory ??
      q.cognitiveLevel ??
      q.CognitiveLevel ??
      q.cognitiveCategory ??
      q.CognitiveCategory ??
      q.cognitive ??
      q.Cognitive ??
      null
    );
    if (directLevel) return directLevel;

    const bloom = q.BloomLevel ?? q.bloomLevel ?? q.bloom ?? null;
    if (bloom != null) {
      const b = Number(bloom);
      if (!Number.isNaN(b)) {
        if (b <= 2) return 'remembering';
        if (b <= 4) return 'applying';
        return 'evaluating';
      }
      const coarse = coarseMatchFromString(bloom);
      if (coarse) return coarse;
    }

    const type = (q.type || q.questionType || '').toString().toLowerCase();
    if (type.includes('remember') || type.includes('understand')) return 'remembering';
    if (type.includes('apply') || type.includes('analy')) return 'applying';
    if (type.includes('evaluate') || type.includes('create') || type.includes('synth')) return 'evaluating';

    return 'evaluating';
  };

  const formatBloomDisplayLabel = (question) => {
    const keyFromQuestion = (() => {
      const raw = question?.level ?? question?.Level ?? null;
      if (raw !== null && raw !== undefined) {
        const normalized = String(raw).trim().toLowerCase();
        if (normalized) return normalized;
      }
      return bloomCategoryFromQuestion(question || {});
    })();

    if (keyFromQuestion && BLOOM_DISPLAY_LABELS[keyFromQuestion]) {
      return BLOOM_DISPLAY_LABELS[keyFromQuestion];
    }

    const fallbackRaw = question?.bloomLevel ?? question?.BloomLevel ?? question?.bloom ?? question?.Bloom ?? null;
    if (fallbackRaw !== null && fallbackRaw !== undefined && String(fallbackRaw).trim()) {
      return String(fallbackRaw).trim();
    }

    return '—';
  };

  const validateBloomDistribution = React.useCallback((questions, expectedCounts) => {
    const counts = { remembering: 0, applying: 0, evaluating: 0 };
    const mismatches = [];

    questions.forEach((question, index) => {
      const category = bloomCategoryFromQuestion(question);
      if (!BLOOM_KEYS.includes(category)) {
        mismatches.push({ index, category: category ?? 'unclassified', questionId: getQuestionIdentifier(question) });
        return;
      }
      counts[category] += 1;
    });

    const missingLevels = BLOOM_KEYS.filter((key) => counts[key] !== (expectedCounts[key] || 0));
    const isValid = mismatches.length === 0 && missingLevels.length === 0;

    return { isValid, counts, mismatches, missingLevels };
  }, [bloomCategoryFromQuestion]);

  const normalizeQuestionForSampleExam = React.useCallback((question, overrides = {}) => {
    if (!question) return null;
    const topicId = overrides.topicId ?? getQuestionTopicId(question);
    const topicFromQuestion = overrides.topicName
      ?? question.topicName
      ?? question.TopicName
      ?? question.topic?.name
      ?? question.Topic?.Name
      ?? question.topicTitle
      ?? question.TopicTitle;
    const topicObj = topics.find((t) => String(t.id) === String(topicId));
    const resolvedTopicName = topicFromQuestion || topicObj?.title || topicObj?.name || (topicId ? `Topic ${topicId}` : 'Topic');
    return {
      ...question,
      topicId,
      topicName: resolvedTopicName,
      level: bloomCategoryFromQuestion(question),
      correctAnswer: getCorrectAnswerLetter(question)
    };
  }, [topics]);

  const questionBankSummary = React.useMemo(() => {
    if (!selectedSubject) return null;

    const flattened = Object.values(questionsByTopic || {}).reduce((acc, list) => {
      if (Array.isArray(list) && list.length) {
        acc.push(...list);
      }
      return acc;
    }, []);

    const counts = { lower: 0, middle: 0, higher: 0 };
    flattened.forEach((question) => {
      const category = bloomCategoryFromQuestion(question);
      if (category === 'remembering') counts.lower += 1;
      else if (category === 'applying') counts.middle += 1;
      else if (category === 'evaluating') counts.higher += 1;
    });

    const total = flattened.length;
    const bloomData = [
      { key: 'remember', title: 'Remember / Understand', descriptor: 'Lower Order Skills', count: counts.lower },
      { key: 'apply', title: 'Apply / Analyze', descriptor: 'Middle Order Skills', count: counts.middle },
      { key: 'evaluate', title: 'Evaluate / Create', descriptor: 'Higher Order Skills', count: counts.higher }
    ];
    const loadedTopicCount = Object.values(questionsByTopic || {}).filter((list) => Array.isArray(list) && list.length > 0).length;

    return { totalQuestions: total, bloomData, loadedTopicCount };
  }, [questionsByTopic, selectedSubject]);

  const syncSpecWithExamQuestions = React.useCallback((questions) => {
    if (!Array.isArray(questions) || questions.length === 0) return;

    setGeneratedSpec((prevSpec) => {
      const createBucket = () => ({ count: 0, placements: [], questions: [] });
      const baseSpec = prevSpec && prevSpec.specs
        ? JSON.parse(JSON.stringify(prevSpec))
        : { specs: [], totals: { low: 0, middle: 0, high: 0, grand: 0 }, totalItems: 0 };

      const specMap = new Map();
      const specOrder = [];

      if (Array.isArray(baseSpec.specs)) {
        baseSpec.specs.forEach((spec) => {
          const key = String(spec.topicId ?? spec.topic ?? '');
          if (!key) return;
          spec.cognitive = spec.cognitive || {};
          ['low', 'middle', 'high'].forEach((levelKey) => {
            if (!spec.cognitive[levelKey]) {
              spec.cognitive[levelKey] = createBucket();
            } else {
              spec.cognitive[levelKey].placements = [];
              spec.cognitive[levelKey].questions = [];
              spec.cognitive[levelKey].count = 0;
            }
          });
          specOrder.push(key);
          specMap.set(key, spec);
        });
      } else {
        baseSpec.specs = [];
      }

      topicRows.forEach((row) => {
        const topicId = parseInt(row.topicId) || parseInt(row.topic);
        if (!topicId) return;
        const key = String(topicId);
        if (!specMap.has(key)) {
          const entry = {
            topicId,
            topicName: row.topicName || row.topic || `Topic ${topicId}`,
            topic: row.topic,
            hours: row.hours,
            percentage: row.percentage || '0',
            overrideKey: `${topicId}-${row.hours || ''}`,
            cognitive: {
              low: createBucket(),
              middle: createBucket(),
              high: createBucket()
            },
            total: 0
          };
          specOrder.push(key);
          specMap.set(key, entry);
        }
      });

      questions.forEach((question, index) => {
        const topicId = getQuestionTopicId(question);
        if (!topicId) return;
        const specEntry = specMap.get(String(topicId));
        if (!specEntry) return;
        const bloom = question.level || bloomCategoryFromQuestion(question);
        const levelKey = getLevelKeyFromBloom(bloom);
        if (!levelKey) return;
        const bucket = specEntry.cognitive[levelKey] || createBucket();
        specEntry.cognitive[levelKey] = bucket;
        const placementNumber = index + 1;
        bucket.placements.push(placementNumber);
        bucket.questions.push({
          ...question,
          placement: placementNumber
        });
      });

      const totals = { low: 0, middle: 0, high: 0 };
      const nextSpecs = specOrder
        .map((key) => specMap.get(key))
        .filter(Boolean)
        .map((specEntry) => {
          ['low', 'middle', 'high'].forEach((levelKey) => {
            const bucket = specEntry.cognitive[levelKey];
            bucket.placements.sort((a, b) => a - b);
            bucket.count = bucket.questions.length;
          });
          specEntry.total = specEntry.cognitive.low.count + specEntry.cognitive.middle.count + specEntry.cognitive.high.count;
          totals.low += specEntry.cognitive.low.count;
          totals.middle += specEntry.cognitive.middle.count;
          totals.high += specEntry.cognitive.high.count;
          return specEntry;
        });

      totals.grand = totals.low + totals.middle + totals.high;

      return {
        ...baseSpec,
        specs: nextSpecs,
        totals,
        totalItems: questions.length,
        insufficientWarning: '',
        excessWarning: ''
      };
    });
  }, [topicRows, bloomCategoryFromQuestion, setGeneratedSpec]);

  // New exam generation: distribute Bloom levels across selected topics and fetch per-topic questions
  const handleGenerateSample = async () => {
    try {
      setError('');
      setGenerationWarnings([]);

      const total = parseInt(totalExamItems, 10);
      if (!total || total <= 0) {
        setError('Enter a valid total number of exam items');
        return;
      }

      // Collect selected topic ids from topicRows (rows with topicId)
      const selectedTopicIds = topicRows.map(r => r.topicId).filter(Boolean);
      if (!selectedTopicIds || selectedTopicIds.length === 0) {
        setError('Select at least one topic before generating the exam');
        return;
      }

      // STEP 1: global Bloom totals
      const rememberTotal = Math.floor(total * 0.30);
      const applyTotal = Math.floor(total * 0.30);
      const evaluateTotal = total - rememberTotal - applyTotal; // ensure exact total
      const expectedBloomTotals = {
        remembering: rememberTotal,
        applying: applyTotal,
        evaluating: evaluateTotal
      };

      const topicsCount = selectedTopicIds.length;

      // STEP 2: distribute each bloom evenly across topics
      const distributeEvenly = (count) => {
        const base = Math.floor(count / topicsCount);
        let rem = count % topicsCount;
        const arr = Array(topicsCount).fill(base);
        let i = 0;
        while (rem > 0) {
          arr[i % topicsCount] += 1;
          rem -= 1;
          i += 1;
        }
        return arr; // length == topicsCount
      };

      const rememberAlloc = distributeEvenly(rememberTotal);
      const applyAlloc = distributeEvenly(applyTotal);
      const evaluateAlloc = distributeEvenly(evaluateTotal);

      // STEP 3: For each topic, pick per-level counts using cached pools when available
      const topicPools = await Promise.all(selectedTopicIds.map(async (topicId) => {
        try {
          let list = Array.isArray(questionsByTopic[topicId]) ? questionsByTopic[topicId] : null;
          if (!list || list.length === 0) {
            const data = await apiService.getQuestionsByTopic(topicId);
            list = normalizeApiArray(data);
          }
          const pools = { remembering: [], applying: [], evaluating: [] };
          list.forEach(q => {
            const cat = bloomCategoryFromQuestion(q);
            pools[cat].push(q);
          });
          return { topicId, pools };
        } catch (err) {
          console.error('Failed to load questions for topic', topicId, err);
          return { topicId, pools: { remembering: [], applying: [], evaluating: [] } };
        }
      }));

      // Allocate and sample per topic, with robust fallback
      const finalQuestions = [];
      const warnings = [];

      // helper to take n items from a pool and remove them from that pool
      const takeFromPool = (pool, n) => {
        const taken = sampleRandom(pool, n);
        // remove taken ids from pool
        const takenIds = new Set(taken.map(q => String(q.id)));
        for (let i = pool.length - 1; i >= 0; i--) {
          if (takenIds.has(String(pool[i].id))) pool.splice(i, 1);
        }
        return taken;
      };

      // Track deficits per topic per level
      const deficits = selectedTopicIds.map(() => ({ remembering: 0, applying: 0, evaluating: 0 }));

      // Initial allocation: take from own topic pools
      for (let t = 0; t < topicsCount; t++) {
        const topicId = selectedTopicIds[t];
        const poolObj = topicPools.find(p => String(p.topicId) === String(topicId));
        const pools = poolObj?.pools || { remembering: [], applying: [], evaluating: [] };

        const needRemember = rememberAlloc[t] || 0;
        const needApply = applyAlloc[t] || 0;
        const needEvaluate = evaluateAlloc[t] || 0;

        const pickRemember = takeFromPool(pools.remembering, needRemember);
        const pickApply = takeFromPool(pools.applying, needApply);
        const pickEvaluate = takeFromPool(pools.evaluating, needEvaluate);

        if (pickRemember.length < needRemember) deficits[t].remembering = needRemember - pickRemember.length;
        if (pickApply.length < needApply) deficits[t].applying = needApply - pickApply.length;
        if (pickEvaluate.length < needEvaluate) deficits[t].evaluating = needEvaluate - pickEvaluate.length;

        finalQuestions.push(...pickRemember, ...pickApply, ...pickEvaluate);
      }

      // SECOND FALLBACK: inter-topic same-level - borrow from other topics' pools for that level
      for (let t = 0; t < topicsCount; t++) {
        for (const level of ['remembering','applying','evaluating']) {
          let need = deficits[t][level];
          if (!need) continue;
          // go through other topics sorted by most available in this level
          const others = topicPools
            .filter(p => String(p.topicId) !== String(selectedTopicIds[t]))
            .map(p => ({ topicId: p.topicId, available: p.pools[level].length, pools: p.pools }));
          others.sort((a,b) => b.available - a.available);
          for (const o of others) {
            if (need <= 0) break;
            if (!o.pools[level] || o.pools[level].length === 0) continue;
            const take = Math.min(need, o.pools[level].length);
            const taken = takeFromPool(o.pools[level], take);
            finalQuestions.push(...taken);
            need -= taken.length;
            warnings.push(`Borrowed ${taken.length} items for topic ${selectedTopicIds[t]} (level ${level}) from topic ${o.topicId}`);
          }
          deficits[t][level] = need;
        }
      }

      // Recompute currentCount and missing before subject-level fill
      let currentCount2 = finalQuestions.length;
      let missing2 = total - currentCount2;

      // STEP 3b: If deficits still exist, try to fill from subject-level pools per bloom (excluding already-used ids)
      if (missing2 > 0) {
        // Build subject-level pools excluding already selected question ids
        const subjectData = await apiService.getQuestions({ subjectId: selectedSubject, pageSize: 1000 });
        const subjectList = Array.isArray(subjectData) ? subjectData : (subjectData?.items && Array.isArray(subjectData.items) ? subjectData.items : (subjectData?.data && Array.isArray(subjectData.data) ? subjectData.data : []));
        const usedIds = new Set(finalQuestions.map(q => String(q.id)));
        const subjectPools = { remembering: [], applying: [], evaluating: [], any: [] };
        subjectList.forEach(q => {
          if (usedIds.has(String(q.id))) return;
          const cat = bloomCategoryFromQuestion(q);
          subjectPools[cat].push(q);
          subjectPools.any.push(q);
        });

        // Compute remaining needed per bloom based on original allocations vs current picks
        const totalAllocRemember = rememberAlloc.reduce((s, v) => s + v, 0);
        const totalAllocApply = applyAlloc.reduce((s, v) => s + v, 0);
        const totalAllocEvaluate = evaluateAlloc.reduce((s, v) => s + v, 0);

        const currentByBloom = { remembering: 0, applying: 0, evaluating: 0 };
        finalQuestions.forEach(q => {
          const cat = bloomCategoryFromQuestion(q);
          currentByBloom[cat] += 1;
        });

        const needByBloom = {
          remembering: Math.max(0, totalAllocRemember - currentByBloom.remembering),
          applying: Math.max(0, totalAllocApply - currentByBloom.applying),
          evaluating: Math.max(0, totalAllocEvaluate - currentByBloom.evaluating),
        };

        // Try to fill per bloom from subjectPools
        for (const level of ['remembering','applying','evaluating']) {
          if (needByBloom[level] > 0 && subjectPools[level].length > 0) {
            const take = Math.min(needByBloom[level], subjectPools[level].length);
            const sampled = takeFromPool(subjectPools[level], take);
            sampled.forEach(q => finalQuestions.push(q));
            missing2 -= sampled.length;
            warnings.push(`Filled ${sampled.length} items for level ${level} from subject pool`);
          }
        }
      }

      if (finalQuestions.length > total) {
        setError(`Internal allocation error: generated ${finalQuestions.length} questions but expected exactly ${total}. Please adjust your specification and try again.`);
        return;
      }

      // If still not enough, show error
      if (finalQuestions.length < total) {
        setError(`Not enough questions in the database to generate ${total} items across selected topics while honoring Bloom levels.`);
        return;
      }

      const distributionCheck = validateBloomDistribution(finalQuestions, expectedBloomTotals);
      if (!distributionCheck.isValid) {
        const describe = (counts) => `R/U: ${counts.remembering || 0}, A/A: ${counts.applying || 0}, E/C: ${counts.evaluating || 0}`;
        const mismatchDetail = distributionCheck.missingLevels.length > 0
          ? `Missing counts for ${distributionCheck.missingLevels.join(', ')}`
          : distributionCheck.mismatches.length > 0
            ? `Unclassified questions: ${distributionCheck.mismatches.length}`
            : 'Unknown mismatch.';
        setError(`Bloom distribution mismatch. Expected ${describe(expectedBloomTotals)} but got ${describe(distributionCheck.counts)}. ${mismatchDetail}`);
        return;
      }

      // Log collected warnings (do not block generation)
      if (warnings && warnings.length > 0) {
        setGenerationWarnings(warnings);
        console.warn('[generateExam] Warnings during allocation:', warnings);
      }

      // STEP 4: shuffle and set sample exam
      shuffleArray(finalQuestions);

      const enriched = finalQuestions.map((q) => {
        const bloomLevel = bloomCategoryFromQuestion(q);
        return {
          ...q,
          topicName: topics.find(t => String(t.id) === String(q.topicId) || String(t.id) === String(q.topic))?.title || topics.find(t => String(t.id) === String(q.topicId))?.title || '',
          level: bloomLevel,
          bloomLevel,
          bloomGroup: getBloomGroupKey(bloomLevel),
          correctAnswer: getCorrectAnswerLetter(q)
        };
      });

      setSampleExam({
        questions: enriched,
        date: new Date().toLocaleDateString(),
        totalQuestions: total,
        metadata: {
          examType,
          semester,
          schoolYear,
          setLabel: null
        }
      });
      syncSpecWithExamQuestions(enriched);
      setActiveExamMeta(null);
      setIsSampleExamVisible(false);
      setShowAnswerSheet(false);
      setLastSavedSignature('');
    } catch (err) {
      console.error('Error generating sample exam', err);
      setError('Failed to generate sample exam. See console for details.');
    }
  };

  const closeQuestionEditModal = React.useCallback(() => {
    setQuestionEditModal(DEFAULT_QUESTION_EDIT_STATE);
    setReplacementCandidates([]);
    setReplacementError('');
    setIsLoadingReplacementCandidates(false);
  }, []);

  const handleOpenQuestionEditModal = React.useCallback(async (question, index) => {
    if (!question) return;
    const topicId = getQuestionTopicId(question);
    if (!topicId) {
      setError('Unable to edit this question because its topic information is missing.');
      return;
    }
    const level = bloomCategoryFromQuestion(question);
    const topicObj = topics.find((t) => String(t.id) === String(topicId));
    const topicName = question.topicName || topicObj?.title || topicObj?.name || `Topic ${topicId}`;
    const currentQuestionId = getQuestionIdentifier(question);
    const questionCourseId = getQuestionCourseId(question);
    const questionSubjectId = getQuestionSubjectId(question);
    const normalizedCourseId = questionCourseId != null
      ? String(questionCourseId)
      : (selectedCourse ? String(selectedCourse) : null);
    const normalizedSubjectId = questionSubjectId != null
      ? String(questionSubjectId)
      : (selectedSubject ? String(selectedSubject) : null);
    const levelGroup = getBloomGroupKey(level);
    setQuestionEditModal({
      isOpen: true,
      questionIndex: index,
      topicId,
      topicName,
      level,
      levelGroup,
      currentQuestionId,
      courseId: normalizedCourseId,
      subjectId: normalizedSubjectId,
      selectedAnswer: normalizeAnswerChoice(getCorrectAnswerLetter(question))
    });
    setReplacementCandidates([]);
    setReplacementError('');
    setIsLoadingReplacementCandidates(true);
    try {
      const pool = await fetchQuestionsForTopic(topicId);
      const usedIds = new Set(
        (sampleExam?.questions || [])
          .map((q) => getQuestionIdentifier(q))
          .filter(Boolean)
          .map((id) => String(id))
      );
        const filtered = pool.filter((candidate) => {
        const candidateTopicId = getQuestionTopicId(candidate);
        if (candidateTopicId != null && String(candidateTopicId) !== String(topicId)) return false;
        const candidateLevel = bloomCategoryFromQuestion(candidate);
          const candidateGroup = getBloomGroupKey(candidateLevel);
          if (levelGroup) {
            if (!candidateGroup || candidateGroup !== levelGroup) return false;
          } else if (candidateLevel !== level) {
            return false;
          }
        if (normalizedCourseId) {
          const candidateCourseId = getQuestionCourseId(candidate);
          if (candidateCourseId != null && String(candidateCourseId) !== normalizedCourseId) return false;
        }
        if (normalizedSubjectId) {
          const candidateSubjectId = getQuestionSubjectId(candidate);
          if (candidateSubjectId != null && String(candidateSubjectId) !== normalizedSubjectId) return false;
        }
        const candidateId = getQuestionIdentifier(candidate);
        if (!candidateId) return false;
        if (String(candidateId) === String(currentQuestionId)) return true;
        return !usedIds.has(String(candidateId));
      });
      setReplacementCandidates(filtered);
      if (!filtered.length) {
        setReplacementError('No alternative questions found for this topic and cognitive level.');
      }
    } catch (err) {
      console.error('Failed to load replacement questions:', err);
      setReplacementError('Failed to load questions. Please try again.');
    } finally {
      setIsLoadingReplacementCandidates(false);
    }
  }, [fetchQuestionsForTopic, sampleExam, selectedCourse, selectedSubject, topics]);

  const handleSelectReplacementQuestion = React.useCallback((candidate) => {
    if (!candidate || !sampleExam || !questionEditModal.isOpen || questionEditModal.questionIndex === null) {
      return;
    }
    const candidateLevel = bloomCategoryFromQuestion(candidate);
    const candidateTopicId = getQuestionTopicId(candidate);
    const candidateCourseId = getQuestionCourseId(candidate);
    const candidateSubjectId = getQuestionSubjectId(candidate);
    const normalizedTopicId = questionEditModal.topicId != null ? String(questionEditModal.topicId) : null;
    const normalizedCourseId = questionEditModal.courseId != null ? String(questionEditModal.courseId) : null;
    const normalizedSubjectId = questionEditModal.subjectId != null ? String(questionEditModal.subjectId) : null;
    const candidateTopicIdStr = candidateTopicId != null ? String(candidateTopicId) : '';
    const candidateCourseIdStr = candidateCourseId != null ? String(candidateCourseId) : '';
    const candidateSubjectIdStr = candidateSubjectId != null ? String(candidateSubjectId) : '';
    const requiredGroup = questionEditModal.levelGroup || getBloomGroupKey(questionEditModal.level);
    const candidateGroup = getBloomGroupKey(candidateLevel);
    const levelMismatch = requiredGroup ? (!candidateGroup || candidateGroup !== requiredGroup) : (candidateLevel !== questionEditModal.level);
    const topicMismatch = normalizedTopicId && candidateTopicIdStr !== normalizedTopicId;
    const courseMismatch = normalizedCourseId && candidateCourseIdStr && candidateCourseIdStr !== normalizedCourseId;
    const subjectMismatch = normalizedSubjectId && candidateSubjectIdStr && candidateSubjectIdStr !== normalizedSubjectId;

    if (levelMismatch || topicMismatch || courseMismatch || subjectMismatch) {
      const mismatchReasons = [];
      if (levelMismatch) mismatchReasons.push('Bloom level');
      if (topicMismatch) mismatchReasons.push('topic');
      if (courseMismatch) mismatchReasons.push('course');
      if (subjectMismatch) mismatchReasons.push('subject');
      const reasonText = mismatchReasons.join(', ');
      setReplacementError('Replacement questions must match the original Bloom grouping, course, and topic.');
      showToast({
        message: `Cannot edit question because the selected item does not match the required ${reasonText}.`,
        type: 'error'
      });
      return;
    }
    const normalized = normalizeQuestionForSampleExam(candidate, {
      topicId: questionEditModal.topicId,
      topicName: questionEditModal.topicName
    });
    setSampleExam((prev) => {
      if (!prev) return prev;
      const updatedQuestions = [...prev.questions];
      updatedQuestions[questionEditModal.questionIndex] = normalized;
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
    setGenerationWarnings((prev) => [...prev, `Question ${questionEditModal.questionIndex + 1} manually edited (replacement).`]);
    showToast({ message: `Question ${questionEditModal.questionIndex + 1} replaced in generated exam`, type: 'success' });
    closeQuestionEditModal();
  }, [questionEditModal, sampleExam, normalizeQuestionForSampleExam, closeQuestionEditModal, showToast]);

  const handleSelectEditedCorrectAnswer = React.useCallback((answerChoice) => {
    const normalizedChoice = normalizeAnswerChoice(answerChoice);
    if (!normalizedChoice || !questionEditModal.isOpen || questionEditModal.questionIndex === null) {
      return;
    }

    setSampleExam((prev) => {
      if (!prev || !Array.isArray(prev.questions)) return prev;
      const updatedQuestions = [...prev.questions];
      const currentQuestion = updatedQuestions[questionEditModal.questionIndex];
      if (!currentQuestion) return prev;
      updatedQuestions[questionEditModal.questionIndex] = applyCorrectAnswerForGeneratedExam(currentQuestion, normalizedChoice);
      return {
        ...prev,
        questions: updatedQuestions
      };
    });

    setQuestionEditModal((prev) => ({
      ...prev,
      selectedAnswer: normalizedChoice
    }));

    setGenerationWarnings((prev) => {
      const message = `Question ${questionEditModal.questionIndex + 1} answer key shuffled to ${normalizedChoice} while preserving the original correct value.`;
      if (prev.includes(message)) return prev;
      return [...prev, message];
    });

    showToast({
      message: `Question ${questionEditModal.questionIndex + 1} correct option moved to ${normalizedChoice}`,
      type: 'success'
    });
  }, [questionEditModal, showToast]);

  // Print request handling (Admin)
  const loadPrintRequests = React.useCallback(async () => {
    if (!user?.isAdmin) return;
    
    try {
      setIsLoadingPrintRequests(true);
      const requests = await apiService.getPendingPrintRequests();
      setPrintRequests(requests);
    } catch (err) {
      console.error('Failed to load print requests:', err);
      setError('Failed to load print requests');
    } finally {
      setIsLoadingPrintRequests(false);
    }
  }, [user?.isAdmin]);

  const loadMyPrintRequests = React.useCallback(async () => {
    if (user?.isAdmin) return;

    try {
      setMyRequestsError('');
      setIsLoadingMyRequests(true);
      const response = await apiService.getMyPrintRequests();
      const normalized = normalizeApiArray(response);
      setMyPrintRequests(Array.isArray(normalized) ? normalized : []);
    } catch (err) {
      console.error('Failed to load my print requests:', err);
      setMyRequestsError('Failed to load your print requests. Please try again.');
    } finally {
      setIsLoadingMyRequests(false);
    }
  }, [user?.isAdmin, normalizeApiArray]);

  React.useEffect(() => {
    if (!user || user.isAdmin) return;
    void loadMyPrintRequests();
  }, [user, loadMyPrintRequests]);

  const loadPrintRequestExam = async (request) => {
    if (!user?.isAdmin || !request) return;
    if (isHydratingRequest) return;

    try {
      setError('');
      setShowAnswerSheet(false);
      setIsHydratingRequest(true);
      setIsLoadingPrintRequests(true);
      requestSyncRef.current = true;

      const exam = await apiService.getExam(request.testId);
      if (!exam) {
        throw new Error('Exam not found for this request.');
      }

      const departmentId = exam.departmentId || request.departmentId;
      const courseId = exam.courseId;
      const subjectId = exam.subjectId;

      if (departmentId) {
        setSelectedDepartment(String(departmentId));
      }
      if (courseId) {
        setSelectedCourse(String(courseId));
      }
      if (subjectId) {
        setSelectedSubject(String(subjectId));
      }

      if (departmentId) setIsLoadingCourses(true);
      if (courseId) setIsLoadingSubjects(true);
      if (subjectId) setIsLoadingTopics(true);

      const [coursesListRaw, subjectsListRaw, topicsListRaw] = await Promise.all([
        departmentId ? apiService.getCourses(departmentId).catch(err => {
          console.error('Failed to load courses for print request:', err);
          return [];
        }) : Promise.resolve([]),
        courseId ? apiService.getSubjects({ courseId, pageSize: 500 }).catch(err => {
          console.error('Failed to load subjects for print request:', err);
          return [];
        }) : Promise.resolve([]),
        subjectId ? apiService.getTopics(subjectId).catch(err => {
          console.error('Failed to load topics for print request:', err);
          return [];
        }) : Promise.resolve([])
      ]);

      const normalizedCourses = Array.isArray(coursesListRaw) ? coursesListRaw : normalizeApiArray(coursesListRaw);
      coursesCacheRef.current.set(departmentId, normalizedCourses);
      setCourses(normalizedCourses);

      const normalizedSubjects = Array.isArray(subjectsListRaw) ? subjectsListRaw : normalizeApiArray(subjectsListRaw);
      subjectsCacheRef.current.set(courseId, normalizedSubjects);
      setSubjects(normalizedSubjects);

      const topicsList = Array.isArray(topicsListRaw) ? topicsListRaw : normalizeApiArray(topicsListRaw);
      topicsCacheRef.current.set(subjectId, topicsList);
      setTopics(topicsList);

      if (topicsList.length > 0 && subjectId) {
        await ensureSubjectQuestionPools(subjectId, topicsList, { forceRefresh: true });
      } else {
        setQuestionsByTopic({});
      }

      setExamType(exam.examType || 'Prelim');
      setSemester(exam.semester || '1st');

      let didHydrateTosFromSpec = false;
      
      if (exam.specificationSnapshot) {
        try {
          const spec = JSON.parse(exam.specificationSnapshot);
          skipSpecRecalcRef.current = true;
          setGeneratedSpec(spec);
          if (spec.specs && spec.specs.length > 0) {
            const reconstructedRows = spec.specs.map((s, idx) => ({
              id: idx + 1,
              topicId: s.topicId || '',
              topicName: s.topicName || '',
              topic: s.topicName || '',
              hours: s.hours || '',
              lowCount: s.cognitive?.low?.count || '',
              middleCount: s.cognitive?.middle?.count || '',
              highCount: s.cognitive?.high?.count || '',
              lowPlacements: (s.cognitive?.low?.placements || []).join(', '),
              middlePlacements: (s.cognitive?.middle?.placements || []).join(', '),
              highPlacements: (s.cognitive?.high?.placements || []).join(', ')
            }));
            setTopicRows(reconstructedRows);
            didHydrateTosFromSpec = true;
          }
          const specTotal = spec.totals?.grand?.toString() || '';
          setTotalExamItems(specTotal);
          setTotalExamItemsInput(specTotal);
          setManualTotalItems(true);
        } catch (parseErr) {
          console.error('Failed to parse specification:', parseErr);
        }
      }
      
      if (exam.questions && exam.questions.length > 0) {
        const normalizedQuestions = exam.questions
          .map((q, idx) => {
            const rawOrder = Number(q.displayOrder ?? q.DisplayOrder ?? idx);
            const displayOrder = Number.isFinite(rawOrder) ? rawOrder : idx;
            return {
              ...q,
              displayOrder,
              correctAnswer: getCorrectAnswerLetter(q),
              bloomLevel: q.bloomLevel || q.BloomLevel || bloomCategoryFromQuestion(q)
            };
          })
          .sort((a, b) => {
            const orderA = Number.isFinite(a.displayOrder) ? a.displayOrder : 0;
            const orderB = Number.isFinite(b.displayOrder) ? b.displayOrder : 0;
            return orderA - orderB;
          });

        if (!didHydrateTosFromSpec) {
          const topicSummaries = new Map();

          normalizedQuestions.forEach((question, idx) => {
            const rawTopicId = getQuestionTopicId(question);
            const topicId = Number(rawTopicId);
            const topicKey = Number.isFinite(topicId)
              ? String(topicId)
              : (rawTopicId ? String(rawTopicId) : '');
            if (!topicKey) return;

            const matchedTopic = topicsList.find((t) => String(t.id) === topicKey);
            const topicName =
              question.topicName ||
              question.topic ||
              matchedTopic?.title ||
              matchedTopic?.name ||
              `Topic ${topicKey}`;

            const rawHours = matchedTopic?.allocatedHours ?? matchedTopic?.hours ?? 1;
            const parsedHours = Number(rawHours);
            const hours = Number.isFinite(parsedHours) && parsedHours > 0 ? String(parsedHours) : '1';

            if (!topicSummaries.has(topicKey)) {
              topicSummaries.set(topicKey, {
                topicId: topicKey,
                topicName,
                topic: topicName,
                hours,
                lowCount: 0,
                middleCount: 0,
                highCount: 0,
                lowPlacements: [],
                middlePlacements: [],
                highPlacements: []
              });
            }

            const summary = topicSummaries.get(topicKey);
            const level = bloomCategoryFromQuestion(question);
            const placement = String((Number.isFinite(question.displayOrder) ? question.displayOrder : idx) + 1);

            if (level === 'remembering') {
              summary.lowCount += 1;
              summary.lowPlacements.push(placement);
            } else if (level === 'applying') {
              summary.middleCount += 1;
              summary.middlePlacements.push(placement);
            } else {
              summary.highCount += 1;
              summary.highPlacements.push(placement);
            }
          });

          const reconstructedRows = Array.from(topicSummaries.values()).map((summary, idx) => ({
            id: idx + 1,
            topicId: summary.topicId,
            topicName: summary.topicName,
            topic: summary.topic,
            hours: summary.hours,
            lowCount: summary.lowCount || '',
            middleCount: summary.middleCount || '',
            highCount: summary.highCount || '',
            lowPlacements: summary.lowPlacements.join(', '),
            middlePlacements: summary.middlePlacements.join(', '),
            highPlacements: summary.highPlacements.join(', ')
          }));

          if (reconstructedRows.length > 0) {
            setTopicRows(reconstructedRows);
          }

          const fallbackTotal = String(normalizedQuestions.length || '');
          setTotalExamItems(fallbackTotal);
          setTotalExamItemsInput(fallbackTotal);
          setManualTotalItems(true);
          setGeneratedSpec(null);
        }

        setSampleExam({
          questions: normalizedQuestions,
          date: new Date(exam.createdAt || Date.now()).toLocaleDateString(),
          totalQuestions: exam.questions.length,
          metadata: {
            examType: exam.examType,
            semester: exam.semester,
            schoolYear: exam.schoolYear,
            setLabel: exam.setLabel
          }
        });
        setActiveExamMeta({
          id: exam.id,
          setLabel: exam.setLabel,
          signature: exam.questionSignature
        });
        setLastSavedSignature(exam.questionSignature || '');
        setIsSampleExamVisible(true);
      } else {
        setSampleExam(null);
      }
      
      setActivePrintRequest(request);
      setViewMode('generation');
      
      showToast({
        message: `Loaded exam "${exam.setLabel}" from print request by ${request.requestedBy}. You can now review, edit if needed, and print.`,
        type: 'info',
      });
    } catch (err) {
      console.error('Failed to load print request exam:', err);
      setError('Failed to load exam from print request');
    } finally {
      setIsLoadingPrintRequests(false);
      requestSyncRef.current = false;
      setIsHydratingRequest(false);
      setIsLoadingCourses(false);
      setIsLoadingSubjects(false);
      setIsLoadingTopics(false);
    }
  };

  const handleClearGeneration = () => {
    resetGeneratedArtifacts();
    setTopicRows(getInitialTopicRows());
    setTotalExamItems('');
    setTotalExamItemsInput('');
    setManualTotalItems(false);
    setSpecOverrides({});
    setQuestionsByTopic({});
    setError('');
    setIsHydratingRequest(false);
    requestSyncRef.current = false;
  };

  const handleApprovePrintRequest = async () => {
    if (!activePrintRequest) return;
    
    try {
      await apiService.updatePrintRequestStatus(activePrintRequest.printRequestId, 'ReadyForPickup', 'Exam approved and printed');
      showToast({ message: 'Print request marked as Ready for Pickup. The teacher will be notified.', type: 'success' });
      setActivePrintRequest(null);
      await loadPrintRequests();
      // Clear the exam
      handleClearGeneration();
    } catch (err) {
      console.error('Failed to approve print request:', err);
      setError('Failed to approve print request');
    }
  };

  const handleRejectPrintRequest = async () => {
    if (!activePrintRequest) return;
    
    const notes = window.prompt('Enter rejection reason (will be visible to the teacher):');
    if (!notes) return;
    
    try {
      await apiService.updatePrintRequestStatus(activePrintRequest.printRequestId, 'Rejected', notes);
      showToast({ message: 'Print request rejected. The teacher will be notified.', type: 'info' });
      setActivePrintRequest(null);
      await loadPrintRequests();
      // Clear the exam
      handleClearGeneration();
    } catch (err) {
      console.error('Failed to reject print request:', err);
      setError('Failed to reject print request');
    }
  };

  const handleCancelPrintRequestReview = () => {
    setCancelReviewConfirmation(true);
  };

  const confirmCancelPrintRequestReview = () => {
    setCancelReviewConfirmation(false);
    setActivePrintRequest(null);
    handleClearGeneration();
    setViewMode('printrequests');
  };

  const closeCancelPrintRequestReview = () => {
    setCancelReviewConfirmation(false);
  };

  const autoMarkRequestReady = async (contextNote = 'Exam printed and ready for pickup') => {
    if (!user?.isAdmin || !activePrintRequest) return;
    const currentId = activePrintRequest.printRequestId;
    if (!currentId) return;
    if (autoReadyRef.current.requestId !== currentId || autoReadyRef.current.marked) return;
    try {
      await apiService.updatePrintRequestStatus(currentId, 'ReadyForPickup', contextNote);
      autoReadyRef.current.marked = true;
      setActivePrintRequest(prev => prev ? { ...prev, status: 'ReadyForPickup' } : prev);
      await loadPrintRequests();
      showToast({ message: 'Printed copy logged. Request marked as Ready for Pickup.', type: 'success' });
    } catch (err) {
      console.error('Failed to auto-mark request ready:', err);
      setError('Printed successfully but failed to update the print request status. Please mark it ready manually.');
    }
  };

  const finalizePrintFlow = (contextNote) => {
    if (user?.isAdmin && activePrintRequest) {
      void autoMarkRequestReady(contextNote || 'Exam printed and ready for pickup');
    }
    setShowPrintModal(false);
  };

  // Load print requests when admin views the page
  useEffect(() => {
    if (user?.isAdmin && viewMode === 'printrequests') {
      loadPrintRequests();
    }
  }, [user, viewMode, loadPrintRequests]);

  useEffect(() => {
    autoReadyRef.current = {
      requestId: activePrintRequest?.printRequestId || null,
      marked: false
    };
  }, [activePrintRequest?.printRequestId]);

  // Handle print
  const handlePrint = () => {
    if (!generatedSpec && !sampleExam) {
      setError('Generate or load an exam set before printing.');
      return;
    }
    
    if (user?.isAdmin) {
      setShowPrintModal(true);
    } else {
      setPrintRequestCopies(1);
      setPrintRequestNotes('');
      setShowPrintRequestModal(true);
    }
  };

  // Handle print request submission (for non-admin users)
  const handleSubmitPrintRequest = async (notes, copies) => {
    try {
      if (activeExamMeta?.id) {
        await apiService.submitPrintRequest(activeExamMeta.id, notes, copies);
      } else {
        const examData = buildDraftPrintRequestExamData();
        if (!examData) {
          setError('Unable to submit print request. Generate a sample exam first.');
          return;
        }

        await apiService.submitPrintRequest({
          notes,
          copiesRequested: copies,
          isDraft: true,
          examData,
        });
      }

      setShowPrintRequestModal(false);
      setError('');
      showToast({ message: 'Print request submitted successfully. An admin will process your request.', type: 'success' });
      if (!user?.isAdmin) {
        await loadMyPrintRequests();
      }
    } catch (err) {
      console.error('Failed to submit print request:', err);
      setError(err.response?.data?.error || 'Failed to submit print request');
    }
  };

  const handleTeacherAcknowledgeRequest = async (request) => {
    if (user?.isAdmin || !request?.printRequestId) return;

    try {
      setMyRequestsError('');
      await apiService.updatePrintRequestStatus(request.printRequestId, 'Completed', null);
      showToast({ message: 'Thank you! This request is now marked as completed.', type: 'success' });
      await loadMyPrintRequests();
    } catch (err) {
      console.error('Failed to mark request as received:', err);
      setMyRequestsError('Unable to mark this request as received. Please try again.');
    }
  };

  const handleDeletePrintRequest = async (request) => {
    if (!request?.printRequestId) return;

    const confirmDelete = window.confirm('Delete this print request? This cannot be undone.');

    if (!confirmDelete) return;

    try {
      setMyRequestsError('');
      await apiService.deletePrintRequest(request.printRequestId);
      showToast({ message: 'Print request deleted.', type: 'success' });
      await loadMyPrintRequests();
    } catch (err) {
      console.error('Failed to delete print request:', err);
      setMyRequestsError('Unable to delete this print request. Please try again.');
    }
  };

  // Handle save exam
  const handleSaveExam = () => {
    if (!generatedSpec) {
      setError('Please fill at least one topic with hours');
      return;
    }
    if (!selectedDepartment || !selectedCourse || !selectedSubject) {
      setError('Select a department, program, and course before saving.');
      return;
    }
    if (!canSaveExam) {
      setError('This generated exam has already been saved. Generate a new exam to create another set.');
      return;
    }
    setCustomSetLabel(nextSetLabel || '');
    setSaveNameError('');
    setShowSaveModal(true);
  };

  // Confirm save
  const confirmSaveExam = async () => {
    if (isSavingExam) return;

    if (!generatedSpec || !generatedSpec.specs) {
      setError('No specification to save. Please generate a specification first.');
      return;
    }

    const departmentId = parseInt(selectedDepartment);
    const courseId = parseInt(selectedCourse);
    const subjectId = parseInt(selectedSubject);

    if (!departmentId || !courseId || !subjectId) {
      setError('Select a department, program, and course before saving.');
      return;
    }

    const trimmedSetLabel = (customSetLabel || '').trim();
    if (!trimmedSetLabel) {
      setSaveNameError('Please enter a name for this exam set.');
      return;
    }
    if (trimmedSetLabel.length > 120) {
      setSaveNameError('Saved exam name must be 120 characters or fewer.');
      return;
    }
    setSaveNameError('');

    const { ordered, signature } = questionsPayload;
    if (!ordered.length) {
      setError('No questions available to save. Please regenerate the exam.');
      return;
    }

    try {
      setIsSavingExam(true);
      const payload = {
        departmentId,
        courseId,
        subjectId,
        examType,
        semester,
        schoolYear,
        durationMinutes: 60,
        totalPoints: ordered.length,
        questions: ordered,
        specificationSnapshot: JSON.stringify(generatedSpec),
        generationNotes: generationWarnings?.join('\n') || undefined,
        description: `${examType} Exam - ${semester} ${schoolYear}`,
        setLabel: trimmedSetLabel
      };

      const response = await apiService.saveGeneratedExam(payload);

      setShowSaveModal(false);
      setCustomSetLabel('');
      setSaveNameError('');
      setError('');
      setLastSavedSignature(signature);
      setActiveExamMeta(response);
      setSampleExam(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          metadata: {
            ...(prev.metadata || {}),
            examType: response.examType,
            semester: response.semester,
            schoolYear: response.schoolYear,
            setLabel: response.setLabel
          }
        };
      });
      setSaveConfirmation({
        setLabel: response.setLabel,
        examType: response.examType,
        semester: response.semester,
        schoolYear: response.schoolYear,
        examPaperSaved: ordered.length > 0,
        tableOfSpecificationSaved: Boolean(payload.specificationSnapshot),
        answerKeySaved: ordered.length > 0
      });
      await loadSavedExamSets();

      showToast({
        message: `Exam saved as ${response.setLabel}. The exam paper, Table of Specification, and Answer Key are now available in Saved Exam Sets.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to save exam:', err);
      const responseBody = err?.response?.data;
      const message = responseBody?.detail
        || responseBody?.message
        || err?.message
        || 'Please try again.';
      setError(`Failed to save exam: ${message}`);
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleToggleSampleExamVisibility = () => {
    if (!sampleExam) return;
    setIsSampleExamVisible((prev) => {
      const next = !prev;
      if (!next) {
        setShowAnswerSheet(false);
      }
      return next;
    });
  };

  const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];
  const reportItems = ["Test Generation", "Saved Exam Sets"];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  const resolveDepartmentCode = () => {
    if (departmentCode) return departmentCode;
    const selectedDept = departments.find(d => d.id === Number(selectedDepartment));
    if (selectedDept?.code) return selectedDept.code;
    const fallback = departments.find(d => (d.code || '').toUpperCase() !== 'IT') || departments[0];
    return fallback?.code || 'CCS';
  };

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : ''}`}>
      <div className="background" style={{ backgroundImage: `url(${UPHSL})` }} />

      <div className="main-container">
        {/* Navbar */}
        <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="nav-left">
            <button onClick={() => { setActiveTab('Home'); navigate('/'); }} className="logo-btn">
              <img src={TDBLogo} alt="TDB Logo" className="logo" />
              <span className="logo-text">TEST DATABANK</span>
            </button>
          </div>

          <div className="nav-center">
            <NavItem icon={Home} label="Home" isActive={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); navigate('/'); }} />
            {user?.isAdmin && (
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
              dropdownItems={dataEntryItems}
              onSelect={(item) => {
                setActiveTab(item);
                if (item === 'Program - Topic') {
                  const code = resolveDepartmentCode();
                  navigate(`/course-topic/${code}`);
                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                  const code = resolveDepartmentCode();
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
                const code = resolveDepartmentCode();
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
                {isAdmin && (
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

        {/* Search bar */}
        <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search..." disabled />
          </div>
        </div>

        {/* Test Generation Container */}
        <div className="main-card" style={{ marginTop: '-40px' }}>
          {/* Mode Switcher for Admins */}
          {user?.isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
              <div className="report-mode-switch-row" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`btn report-mode-switch-btn ${viewMode === 'generation' ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={isViewSwitchLocked}
                  onClick={() => {
                    if (isViewSwitchLocked) return;
                    setViewMode('generation');
                    setActivePrintRequest(null);
                  }}
                  title={isViewSwitchLocked ? 'Finish or cancel the current review before switching modes.' : undefined}
                >
                  <BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  Test Generation
                </button>
                <button
                  className={`btn report-mode-switch-btn ${viewMode === 'printrequests' ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={isViewSwitchLocked}
                  onClick={() => {
                    if (isViewSwitchLocked) return;
                    setViewMode('printrequests');
                  }}
                  style={{ position: 'relative' }}
                  title={isViewSwitchLocked ? 'Finish or cancel the current review before switching modes.' : undefined}
                >
                  <Printer size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  Print Requests {printRequests.length > 0 && <span style={{ background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', marginLeft: '5px' }}>{printRequests.length}</span>}
                </button>
              </div>
              {isViewSwitchLocked && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Review lock is active. Cancel or finish the current request to switch views.
                </p>
              )}
            </div>
          )}

          {/* Print Request Review Banner */}
          {activePrintRequest && (
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>📋 Reviewing Print Request</strong>
                  <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
                    Requested by: {activePrintRequest.requestedBy} | Department: {activePrintRequest.departmentName} | Copies: {activePrintRequest.copiesRequested}
                    {activePrintRequest.notes && ` | Notes: "${activePrintRequest.notes}"`}
                  </p>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ background: statusColorMap[activeRequestStatus] || '#1d4ed8', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }}>
                      Status: {activeRequestStatus.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {isHydratingRequest && <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>Syncing program/course/topic data...</span>}
                    {!isActiveRequestHandled && (
                      <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>Finish printing or update the status before leaving this review.</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-success"
                    onClick={handleApprovePrintRequest}
                    disabled={isActiveRequestHandled || isHydratingRequest}
                    style={{ whiteSpace: 'nowrap' }}
                    title={isActiveRequestHandled ? 'This request has already been marked ready.' : undefined}
                  >
                    ✓ Approve & Mark Ready
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleRejectPrintRequest}
                    disabled={isHydratingRequest}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    ✗ Reject
                  </button>
                  <button className="btn btn-secondary" onClick={handleCancelPrintRequestReview} style={{ whiteSpace: 'nowrap' }}>
                    Cancel Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conditional Rendering based on View Mode */}
          {viewMode === 'printrequests' && user?.isAdmin ? (
            <>
              <h2>Print Requests Queue</h2>
              <p className="subtitle">Review and process print requests from teachers</p>

              {isLoadingPrintRequests ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading print requests...</div>
              ) : printRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <p>No pending print requests</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Requested By</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Exam Title</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Department</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Copies</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Notes</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printRequests.map((request) => {
                        const isRowActive = activePrintRequest?.printRequestId === request.printRequestId;
                        return (
                          <tr
                            key={request.printRequestId}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isRowActive ? 'rgba(13, 104, 50, 0.08)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '12px' }}>{request.requestedBy}</td>
                            <td style={{ padding: '12px' }}>{request.testTitle}</td>
                            <td style={{ padding: '12px' }}>{request.departmentName}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{request.copiesRequested}</td>
                            <td style={{ padding: '12px' }}>{new Date(request.createdAt).toLocaleString()}</td>
                            <td style={{ padding: '12px', fontSize: '0.9em', color: 'var(--text-muted)' }}>{request.notes || '—'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => loadPrintRequestExam(request)}
                                style={{ whiteSpace: 'nowrap' }}
                                disabled={isViewSwitchLocked && !isRowActive}
                                title={isViewSwitchLocked && !isRowActive ? 'Finish the current review before opening another request.' : undefined}
                              >
                                {isRowActive ? 'In Review' : 'Review & Edit'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <h2>Test Generation</h2>
              <p className="subtitle">Create a table of specifications and generate exams based on topics and cognitive levels</p>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Initial Inputs */}
          <div className="input-section">
            <div className="field-container">
              <label>Department</label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className={!selectedDepartment ? 'unselected-placeholder' : ''}
                disabled={isLoadingDepartments}
              >
                <option value="">Select Department</option>
                {isLoadingDepartments ? (
                  <option disabled>Loading departments...</option>
                ) : (
                  departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="field-container">
              <label>Program</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                className={!selectedCourse ? 'unselected-placeholder' : ''}
                disabled={!selectedDepartment || isLoadingCourses}
              >
                <option value="">Select Program</option>
                {isLoadingCourses ? (
                  <option disabled>Loading programs...</option>
                ) : courses.length === 0 ? (
                  <option disabled>No programs found</option>
                ) : (
                  courses.map(course => (
                    <option key={course.id} value={course.id}>{(course.code ? `${course.code} - ` : '') + course.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="field-container">
              <label>Course</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedCourse || isLoadingSubjects}
              >
                <option value="">Select Course</option>
                {isLoadingSubjects ? (
                  <option disabled>Loading courses...</option>
                ) : subjects.length === 0 ? (
                  <option disabled>No courses found</option>
                ) : (
                  subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{(subject.code ? `${subject.code} - ` : '') + subject.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="field-container">
              <label>Exam Period</label>
              <select 
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className={!examType ? 'unselected-placeholder' : ''}
              >
                <option value="" disabled>Select Exam Period</option>
                <option value="Prelim">Prelim</option>
                <option value="Midterm">Midterm</option>
                <option value="Finals">Finals</option>
              </select>
            </div>

            <div className="field-container">
              <label>Semester</label>
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={!semester ? 'unselected-placeholder' : ''}
              >
                <option value="" disabled>Select Semester</option>
                <option value="1st">1st Sem</option>
                <option value="2nd">2nd Sem</option>
                <option value="Summer">Summer</option>
              </select>
            </div>

            <div className="field-container">
              <label>Total Exam Items</label>
              <div className="total-items-control">
                <input
                  type="number"
                  value={totalExamItemsInput}
                  onChange={(e) => setTotalExamItemsInput(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                  disabled={!selectedSubject}
                />
                <button
                  type="button"
                  className="total-items-confirm-btn"
                  onClick={handleTotalExamItemsCommit}
                  disabled={!canConfirmTotalExamItems}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>

          {
            false && selectedSubject && questionBankSummary && questionBankSummary.totalQuestions > 0 && (
              <div className="data-summary-block separate-blooms-view">
                <h3 className="data-summary-heading">
                  Question Bank Overview — {selectedSubjectDetails?.name || 'Selected Course'}
                </h3>
                <div className="summary-details-grid three-col-blooms">
                  <div className="summary-card total-stats">
                    <h4>Course Coverage</h4>
                    <p>
                      Total Encoded Questions: <span style={{ fontWeight: 'bold' }}>{questionBankSummary.totalQuestions}</span>
                    </p>
                    <div className="total-bar-check">
                      Topics With Questions: <span style={{ fontWeight: 'bold' }}>{questionBankSummary.loadedTopicCount}</span>
                    </div>
                  </div>
                  {questionBankSummary.bloomData.map((data, index) => (
                    <div key={data.key} className={`summary-card bloom-card color-${index + 1}`}>
                      <h4 className="bloom-card-title">{data.title}</h4>
                      <p className="bloom-card-count" style={{ marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{data.count}</span> total encoded questions
                      </p>
                      <p className="bloom-card-descriptor" style={{ opacity: 0.8, fontSize: '0.9rem' }}>{data.descriptor}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          {selectedSubject && questionBankSummary && questionBankSummary.totalQuestions === 0 && (
            <div className="info-message" style={{ marginTop: '1rem' }}>
              <span className="info-icon">ℹ️</span>
              <span className="info-text">
                No encoded questions were found for the selected course yet. Add questions in Test Encoding to populate the databank.
              </span>
            </div>
          )}

          {selectedSubject && !isTableUnlocked && (
            <div className="info-message" style={{ marginTop: '1rem' }}>
              <span className="info-icon">ℹ️</span>
              <span className="info-text">
                Enter the Total Exam Items above and click Confirm to unlock topic selection.
                {hasCommittedTotalExamItems && isTotalExamItemsDirty && ' You changed the value—confirm again to reload the Table of Specification.'}
              </span>
            </div>
          )}

          {/* Topics Table */}
          {selectedSubject && isTableUnlocked && (
            <div className="table-section">
              <h3>Table of Specifications</h3>
              
              <div className="table-wrapper">
                <table className="specs-table">
                  <thead>
                    <tr>
                      <th>Topics</th>
                      <th>Hours</th>
                      <th colSpan="2">Remembering &amp;<br/>Understanding (30%)</th>
                      <th colSpan="2">Applying &amp;<br/>Analyzing (30%)</th>
                      <th colSpan="2">Evaluating &amp;<br/>Creating (40%)</th>
                      <th>Total<br/>Items</th>
                      <th>Percentage</th>
                      <th>Action</th>
                    </tr>
                    <tr className="sub-header">
                      <th></th>
                      <th></th>
                      <th>No. Questions</th>
                      <th>Placement</th>
                      <th>No. Questions</th>
                      <th>Placement</th>
                      <th>No. Questions</th>
                      <th>Placement</th>
                      <th></th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedSpec ? (
                      // Show both completed specs and input for new rows
                      <>
                        {generatedSpec.specs.map((spec, idx) => {
                          const correspondingRow = topicRows.find(r => parseInt(r.topicId) === spec.topicId && parseFloat(r.hours) === parseFloat(spec.hours));
                          const rowId = correspondingRow?.id;
                          const selectedTopicIdsInOtherRows = rowId ? getSelectedTopicIdsForOtherRows(rowId) : new Set();
                          const overrideKey = spec.overrideKey || `${spec.topicId}-${spec.hours}`;
                          const override = specOverrides[overrideKey] || {};
                          return (
                            <tr key={`spec-${idx}`}>
                              <td>
                                <select
                                  value={spec.topicId || ''}
                                  onChange={(e) => {
                                    const selectedOption = e.target.options[e.target.selectedIndex];
                                    const topicName = selectedOption ? selectedOption.text : '';
                                    const topicId = e.target.value;
                                    if (rowId && topicId) {
                                      handleTopicSelection(rowId, topicId, topicName);
                                    }
                                  }}
                                    disabled={isLoadingTopics || topics.length === 0 || !isTableUnlocked}
                                >
                                  <option value="">Select topic</option>
                                  {topics
                                    .filter(topic => !selectedTopicIdsInOtherRows.has(String(topic.id)))
                                    .map(topic => (
                                      <option key={topic.id} value={topic.id}>{topic.title}</option>
                                    ))}
                                </select>
                              </td>
                              <td>
                                <strong>{spec.hours}</strong>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={override.lowCount !== undefined && override.lowCount !== '' ? override.lowCount : (correspondingRow?.lowCount !== undefined && correspondingRow.lowCount !== '' ? correspondingRow.lowCount : spec.cognitive.low.count)}
                                  onChange={(e) => handleSpecOverrideChange(overrideKey, 'lowCount', e.target.value)}
                                  min="0"
                                  style={{ width: '90px' }}
                                />
                              </td>
                              <td>{spec.cognitive.low.placements.join(', ')}</td>
                              <td>
                                <input
                                  type="number"
                                  value={override.middleCount !== undefined && override.middleCount !== '' ? override.middleCount : (correspondingRow?.middleCount !== undefined && correspondingRow.middleCount !== '' ? correspondingRow.middleCount : spec.cognitive.middle.count)}
                                  onChange={(e) => handleSpecOverrideChange(overrideKey, 'middleCount', e.target.value)}
                                  min="0"
                                  style={{ width: '90px' }}
                                />
                              </td>
                              <td>{spec.cognitive.middle.placements.join(', ')}</td>
                              <td>
                                <input
                                  type="number"
                                  value={override.highCount !== undefined && override.highCount !== '' ? override.highCount : (correspondingRow?.highCount !== undefined && correspondingRow.highCount !== '' ? correspondingRow.highCount : spec.cognitive.high.count)}
                                  onChange={(e) => handleSpecOverrideChange(overrideKey, 'highCount', e.target.value)}
                                  min="0"
                                  style={{ width: '90px' }}
                                />
                              </td>
                              <td>{spec.cognitive.high.placements.join(', ')}</td>
                              <td>{spec.total}</td>
                              <td>{spec.percentage}%</td>
                              <td>
                                <button 
                                  className="delete-btn"
                                  onClick={() => rowId && handleDeleteRowClick(rowId)}
                                  title="Delete this row"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Show remaining empty input rows */}
                        {topicRows.filter(row => !row.topic || !row.hours).map((row) => {
                          const selectedTopicIdsInOtherRows = getSelectedTopicIdsForOtherRows(row.id);
                          return (
                          <tr key={`input-${row.id}`}>
                            <td>
                              <select
                                value={row.topicId || ''}
                                onChange={(e) => {
                                  const selectedOption = e.target.options[e.target.selectedIndex];
                                  const topicName = selectedOption ? selectedOption.text : '';
                                  const topicId = e.target.value;
                                  if (topicId) {
                                    handleTopicSelection(row.id, topicId, topicName);
                                  }
                                }}
                                disabled={isLoadingTopics || topics.length === 0 || !isTableUnlocked}
                              >
                                <option value="">Select topic</option>
                                {topics
                                  .filter(topic => !selectedTopicIdsInOtherRows.has(String(topic.id)))
                                  .map(topic => (
                                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                                  ))}
                              </select>
                            </td>
                            <td>
                              <strong>{row.hours || '-'}</strong>
                            </td>
                            <td colSpan="8" className="empty-cell">Select topic to auto-fill hours</td>
                            <td>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteRowClick(row.id)}
                                title="Delete this row"
                              >
                                <Trash2 size={20} />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </>
                    ) : (
                      // Show all input rows
                      topicRows.map((row) => {
                        const selectedTopicIdsInOtherRows = getSelectedTopicIdsForOtherRows(row.id);
                        return (
                        <tr key={row.id}>
                          <td>
                            <select
                              value={row.topicId || ''}
                              onChange={(e) => {
                                const selectedOption = e.target.options[e.target.selectedIndex];
                                const topicName = selectedOption ? selectedOption.text : '';
                                const topicId = e.target.value;
                                if (topicId) {
                                  handleTopicSelection(row.id, topicId, topicName);
                                }
                              }}
                              disabled={isLoadingTopics || topics.length === 0 || !isTableUnlocked}
                            >
                              <option value="">Select topic</option>
                              {topics
                                .filter(topic => !selectedTopicIdsInOtherRows.has(String(topic.id)))
                                .map(topic => (
                                  <option key={topic.id} value={topic.id}>{topic.title}</option>
                                ))}
                            </select>
                          </td>
                          <td>
                            <strong>{row.hours || '-'}</strong>
                          </td>
                          <td colSpan="8" className="empty-cell">Select topic to auto-fill hours</td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteRowClick(row.id)}
                              title="Delete this row"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                    {totalExamItems && topicRows.some(row => row.topic && row.hours) && (
                      <tr className="totals-row">
                        <td><strong>TOTALS</strong></td>
                        <td><strong>{calculateTotalHours()}</strong></td>
                        <td><strong>{generatedSpec ? generatedSpec.totals.low : calculateDistribution().low}</strong></td>
                        <td>All</td>
                        <td><strong>{generatedSpec ? generatedSpec.totals.middle : calculateDistribution().middle}</strong></td>
                        <td>All</td>
                        <td><strong>{generatedSpec ? generatedSpec.totals.high : calculateDistribution().high}</strong></td>
                        <td>All</td>
                        <td><strong>{generatedSpec ? generatedSpec.totals.grand : totalExamItems}</strong></td>
                        <td><strong>100%</strong></td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Warning for insufficient items */}
              {insufficientItemsWarning && (
                <div className="warning-message">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-text">{insufficientItemsWarning}</span>
                </div>
              )}
              
              {/* Warning for excess items */}
              {excessItemsWarning && (
                <div className="info-message">
                  <span className="info-icon">ℹ️</span>
                  <span className="info-text">{excessItemsWarning}</span>
                </div>
              )}

            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons" style={{ marginTop: '20px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleGenerateSample}
              disabled={!generatedSpec}
            >
              <PlayCircle size={16} /> Generate Sample Exam
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleToggleSampleExamVisibility}
              disabled={!sampleExam}
            >
              <Eye size={16} /> {isSampleExamVisible ? 'Hide Sample Exam' : 'Show Sample Exam'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handlePrint}
              disabled={!generatedSpec}
            >
              <Printer size={16} /> {user?.isAdmin ? 'Print Options' : 'Request Print'}
            </button>
            {!(user?.isAdmin && activePrintRequest) && (
              <button 
                className="btn btn-success"
                onClick={handleSaveExam}
                disabled={!generatedSpec}
              >
                <Save size={16} /> Save Exam
              </button>
            )}
          </div>

          {/* Show Sample Exam */}
          {sampleExam && isSampleExamVisible && (
            <div className="sample-exam">
              <h3>Sample Exam Preview</h3>
              <div className="sample-content exam-paper">
                {/* Exam Paper Header */}
                <div className="exam-header">
                  <img src={UPHSLLogo} alt="UPHSL Logo" className="exam-logo" />
                  <div className="university-header">
                    <h2>University of Perpetual Help System</h2>
                    <p>Test Data Bank System</p>
                    <p>Biñan Campus</p>
                    <p className="exam-filename">{(() => {
                      const now = new Date();
                      const courseCode = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.code) || 'XXXX';
                      const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
                      const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                      return `${examType}_${semester}_${schoolYear}_${courseCode}_${date}_${time}`;
                    })()}</p>
                    <p className="program-info">{(selectedCourse && (() => { const course = courses.find(c => c.id === parseInt(selectedCourse)); return course ? `${course.name} (${course.code})` : 'Program Name'; })()) || 'Program Name'}</p>
                    <p>{selectedSubjectDetails?.name || 'Course Name'}</p>
                    
                  </div>
                </div>

                {/* Form Fields */}
                <div className="exam-form-fields">
                  <div className="form-row">
                    <div className="form-field"><label>Name:</label><span className="form-line"></span></div>
                    <div className="form-field"><label>Date:</label><span className="form-line"></span></div>
                  </div>
                  <div className="form-row">
                    <div className="form-field"><label>Professor:</label><span className="form-line"></span></div>
                    <div className="form-field"><label>Permit #:</label><span className="form-line"></span></div>
                  </div>
                </div>

                {/* Instructions/Reminders */}
                <div className="exam-instructions">
                  <p><strong>REMINDER: CHEATING during examinations, BORROWING and LENDING of examination permit fall under Major offenses and are punishable under the existing University Policy</strong></p>
                  <p><strong>Direction:</strong> Multiple Choice - Choose the letter of the correct answer.</p>
                </div>

                {/* Exam Questions */}
                <div className="exam-questions-section">
                  {!showAnswerSheet ? (
                    // Student Exam View
                    sampleExam.questions.map((q, idx) => {
                      const questionText = q.content || q.Content || q.question || 'Question text not available';
                      const options = q.options || q.Options || q.choices || [];
                      const image = q.image || q.Image || null;
                      const questionHtml = asHtml(questionText);
                      // preview debug logs removed for production
                      return (
                        <div key={idx} className="exam-question-item">
                          <div className="question-number-text">
                            <strong>{idx + 1}.) </strong>
                            <span className="question-html" dangerouslySetInnerHTML={questionHtml} />
                          </div>
                          {getQuestionTopicId(q) && (
                            <div className="question-actions">
                              <button
                                type="button"
                                className="replace-question-btn"
                                onClick={() => { void handleOpenQuestionEditModal(q, idx); }}
                              >
                                <RefreshCw size={14} />
                                <span>Edit Question</span>
                              </button>
                            </div>
                          )}
                          {image && (
                            <div className="question-image-wrapper" style={{ 
                              textAlign: image.alignment?.toLowerCase() || 'center', 
                              margin: '10px 0'
                            }}>
                              {(() => {
                                const imagePath = image?.imagePath || image?.ImagePath;
                                const imageUrl = resolveQuestionImageUrl(imagePath);
                                if (!imageUrl) return null;
                                return (
                              <img 
                                src={imageUrl}
                                alt={`Question ${idx + 1}`}
                                className="question-image-print"
                                style={{ 
                                  width: `${image.widthPercentage || image.WidthPercentage || 50}%`,
                                  maxHeight: '400px',
                                  objectFit: 'contain',
                                  display: 'inline-block'
                                }}
                              />
                                );
                              })()}
                            </div>
                          )}
                          <div className="question-options">
                            {options.map((option, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const optionText = option.content || option.Content || option.optionText || option.text || option || '';
                              const optionHtml = asHtml(optionText);
                              return (
                                <div key={optIdx} className="option-line">
                                  <span className="option-letter">{letter}.</span>
                                  <span className="option-text" dangerouslySetInnerHTML={optionHtml} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Answer Sheet View
                    <div>
                      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>ANSWER SHEET</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #000' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Question #</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Question</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Correct Answer</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Bloom Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleExam.questions.map((q, idx) => {
                            const questionText = q.content || q.Content || q.question || 'N/A';
                            const correctAnswer = q.correctAnswer || '-';
                            const bloomLevel = formatBloomDisplayLabel(q);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{idx + 1}</td>
                                <td style={{ padding: '8px' }}>{String(questionText).substring(0, 50)}...</td>
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{correctAnswer}</td>
                                <td style={{ padding: '8px' }}>{bloomLevel}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
                  <button
                    onClick={() => setShowAnswerSheet(!showAnswerSheet)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: showAnswerSheet ? '#dc3545' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    {showAnswerSheet ? 'View Student Exam' : 'View Answer Sheet'}
                  </button>
                </div>

                <p className="total-questions">Total Questions: {sampleExam.totalQuestions}</p>
              </div>
            </div>
          )}

          {activeExamMeta && (
            <div className="save-status-banner" style={{ margin: '20px 0', padding: '12px 16px', borderRadius: '6px', backgroundColor: '#e6f4ea', color: '#0d6832' }}>
              Last saved set: <strong>{activeExamMeta.setLabel}</strong> · {activeExamMeta.examType} {activeExamMeta.semester} {activeExamMeta.schoolYear}
              {saveConfirmation && saveConfirmation.setLabel === activeExamMeta.setLabel && saveAssetStatus.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Stored assets ready for printing:</div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    {saveAssetStatus.map(asset => {
                      const Icon = asset.saved ? CheckCircle : AlertTriangle;
                      const iconColor = asset.saved ? '#0d6832' : '#a94442';
                      return (
                        <div key={asset.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: asset.saved ? 600 : 500 }}>
                          <Icon size={16} color={iconColor} />
                          <span>{asset.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!user?.isAdmin && (
            <div style={{ marginTop: '30px', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', background: 'var(--card-bg, #fff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ marginBottom: '4px' }}>My Print Requests</h3>
                  <p className="subtitle" style={{ marginBottom: 0 }}>Track the status of your submitted master set requests.</p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadMyPrintRequests()}
                  disabled={isLoadingMyRequests}
                >
                  Refresh
                </button>
              </div>
              {myRequestsError && (
                <div className="error-message" style={{ marginTop: '15px' }}>{myRequestsError}</div>
              )}
              {isLoadingMyRequests ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>Loading your requests...</div>
              ) : myPrintRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <p>No print requests yet. Request a master set from any generated exam to see it here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Exam Set</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                        <th style={{ textAlign: 'center', padding: '10px' }}>Copies</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Submitted</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Updated</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Notes</th>
                        <th style={{ textAlign: 'center', padding: '10px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myPrintRequests.map((req) => {
                        const statusLabel = req.status || 'Pending';
                        const badgeColor = statusColorMap[statusLabel] || '#4b5563';
                        return (
                          <tr key={req.printRequestId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px' }}>{req.testTitle || `Set #${req.testId}`}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ background: badgeColor, color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
                                {statusLabel.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{req.copiesRequested}</td>
                            <td style={{ padding: '10px' }}>{req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}</td>
                            <td style={{ padding: '10px' }}>{req.updatedAt ? new Date(req.updatedAt).toLocaleString() : '—'}</td>
                            <td style={{ padding: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{req.notes || '—'}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              {statusLabel === 'ReadyForPickup' || statusLabel === 'Pending' || statusLabel === 'Rejected' ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  {statusLabel === 'ReadyForPickup' && (
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() => handleTeacherAcknowledgeRequest(req)}
                                    >
                                      Mark as Received
                                    </button>
                                  )}
                                  {(statusLabel === 'Pending' || statusLabel === 'Rejected') && (
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleDeletePrintRequest(req)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={closeSaveModal}>
          <div className="modal-dialog exam-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="exam-modal-title">Save Exam</h3>
            <div className="exam-modal-body">
              {isLoadingSavedSets ? (
                <p>Checking existing exam sets...</p>
              ) : (
                <p className="exam-modal-lead">
                  Suggestion: <strong>{nextSetLabel}</strong>. You can rename the set before saving so it is easier to find later.
                </p>
              )}
              <div className="exam-modal-field">
                <label htmlFor="custom-set-label">Exam Set Name</label>
                <input
                  id="custom-set-label"
                  type="text"
                  maxLength={120}
                  value={customSetLabel}
                  onChange={(e) => {
                    setCustomSetLabel(e.target.value);
                    if (saveNameError) setSaveNameError('');
                  }}
                  className={`exam-modal-input${saveNameError ? ' has-error' : ''}`}
                  placeholder={`e.g. ${nextSetLabel} or 'Remedial Prelim'`}
                  autoFocus
                />
                {saveNameError && <p className="error-message" style={{ marginTop: '6px' }}>{saveNameError}</p>}
                <p className="exam-modal-note" style={{ marginTop: '8px' }}>Max 120 characters. This label shows up in Saved Exam Sets and print requests.</p>
              </div>
              <ul className="exam-modal-list">
                <li>Program: {selectedCourseDetails?.name || 'N/A'}</li>
                <li>Course: {selectedSubjectDetails?.name || 'N/A'}</li>
                <li>{examType} · {semester} Semester · SY {schoolYear}</li>
                <li>{questionsPayload.ordered.length} total questions</li>
              </ul>
            </div>
            <div className="exam-modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={closeSaveModal} disabled={isSavingExam}>Cancel</button>
              <button className="modal-btn modal-btn-primary" onClick={confirmSaveExam} disabled={isSavingExam}>
                {isSavingExam ? 'Saving...' : 'Save Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {questionEditModal.isOpen && (
        <div className="modal-overlay" onClick={closeQuestionEditModal}>
          <div className="modal-dialog question-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="question-edit-title">Edit Question</h3>
            <p className="question-edit-subtitle">
              Topic: <strong>{questionEditModal.topicName || 'N/A'}</strong> · Cognitive Level: <strong>{(questionEditModal.level || '').replace(/\b\w/g, (c) => c.toUpperCase()) || 'N/A'}</strong>
            </p>
            <div className="question-edit-answer-controls">
              <p className="question-edit-answer-label">Correct answer for this generated exam</p>
              <div className="question-edit-answer-buttons">
                {['A', 'B', 'C', 'D'].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`question-edit-answer-btn${questionEditModal.selectedAnswer === choice ? ' active' : ''}`}
                    onClick={() => handleSelectEditedCorrectAnswer(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <small className="question-edit-answer-help">This updates only the generated exam/session answer key and does not change the question bank record.</small>
            </div>
            {isLoadingReplacementCandidates ? (
              <p>Loading available questions…</p>
            ) : replacementCandidates.length > 0 ? (
              <div className="replacement-candidate-list">
                {replacementCandidates.map((candidate, candidateIndex) => {
                  const candidateId = getQuestionIdentifier(candidate);
                  const candidateKey = candidateId ? `candidate-${candidateId}` : `candidate-${questionEditModal.topicId}-${candidateIndex}`;
                  const candidateHtml = asHtml(candidate.content || candidate.Content || candidate.question || '');
                  return (
                    <div key={candidateKey} className="replacement-candidate-card">
                      <div className="replacement-candidate-body">
                        <div className="replacement-candidate-text" dangerouslySetInnerHTML={candidateHtml} />
                        <div className="candidate-meta">
                          <span>ID: {candidateId}</span>
                          <span>Level: {bloomCategoryFromQuestion(candidate)}</span>
                        </div>
                      </div>
                      <div className="candidate-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSelectReplacementQuestion(candidate)}
                        >
                          Use as Replacement
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>{replacementError || 'No alternative questions found for this topic and cognitive level.'}</p>
            )}
            <div className="question-edit-actions">
              <button className="btn btn-secondary" onClick={closeQuestionEditModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="modal-overlay">
          <div className={`modal print-modal ${isDarkMode ? 'dark' : ''}`}> 
            <h3 className="print-modal-title">Print Options</h3>
            <div className="print-modal-content">
              <div className="print-radio-group">
                <label className={`print-radio-label${printOption === 'specification' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    value="specification"
                    checked={printOption === 'specification'}
                    onChange={(e) => setPrintOption(e.target.value)}
                  />
                  <span className="custom-radio"></span>
                  <span>Print Table of Specification</span>
                </label>
                <label className={`print-radio-label${printOption === 'exam' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    value="exam"
                    checked={printOption === 'exam'}
                    onChange={(e) => setPrintOption(e.target.value)}
                  />
                  <span className="custom-radio"></span>
                  <span>Print Exam Paper</span>
                </label>
                <label className={`print-radio-label${printOption === 'answer' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    value="answer"
                    checked={printOption === 'answer'}
                    onChange={(e) => setPrintOption(e.target.value)}
                  />
                  <span className="custom-radio"></span>
                  <span>Print Answer Key</span>
                </label>
              </div>
            </div>
            <div className="modal-buttons print-modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (printOption === 'specification') {
                  if (!generatedSpec || !generatedSpec.specs) {
                    setError('Please generate the table of specification first');
                    return;
                  }
                  
                  const printWindow = window.open('', '', 'width=1200,height=800');
                  const now = new Date();
                  const courseCode = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.code) || 'XXXX';
                  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
                  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                  const courseName = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.name) || 'Program Name';
                  const filename = `${examType}_${semester}_${schoolYear}_${courseCode}_${date}_${time}`;
                  
                  let tableHTML = `
                    <html>
                      <head>
                        <title>Table of Specification</title>
                        <style>
                          @page {
                            size: Legal portrait;
                            margin: 0.5in;
                          }
                          * { color: #000; }
                          body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                          .header { text-align: center; margin-bottom: 30px; }
                          .header h1 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
                          .header p { margin: 3px 0; color: #000; }
                          .filename { font-weight: bold; margin: 10px 0; font-size: 13px; color: #000; }
                          h2 { text-align: center; margin: 20px 0; color: #000; font-size: 16px; }
                          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                          table, th, td { border: 1px solid #000; }
                          th { 
                            background-color: #fff; 
                            color: #000;
                            padding: 12px 6px; 
                            text-align: center; 
                            font-weight: bold; 
                            border: 1px solid #000;
                            font-size: 12px;
                          }
                          td { 
                            border: 1px solid #000; 
                            padding: 10px 6px; 
                            text-align: center;
                            color: #000;
                            font-size: 12px;
                          }
                          td.text-left { text-align: left; }
                          .total-row { font-weight: bold; background-color: #fff; }
                          .signature-section { margin-top: 50px; }
                          .signature-line { margin: 40px 0; display: flex; align-items: center; color: #000; }
                          .signature-label { width: 140px; font-weight: normal; color: #000; font-size: 13px; }
                          .signature-line-draw { flex: 1; border-bottom: 1px solid #000; margin: 0 10px; }
                          @media print {
                            body { margin: 0; padding: 10px; }
                            table { page-break-inside: avoid; }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1>University of Perpetual Help System</h1>
                          <p>Test Data Bank System</p>
                          <p>Biñan Campus</p>
                          <div class="filename">${filename}</div>
                          <p><strong style="color: #000;">${courseName}</strong></p>
                        </div>
                        
                        <h2>Table of Specification</h2>
                        
                        <table border="1" cellpadding="5" cellspacing="0">
                          <thead>
                            <tr>
                              <th rowspan="2" style="width: 100px;">Topics</th>
                              <th rowspan="2" style="width: 60px;">Hours</th>
                              <th colspan="2" style="width: 140px;">Remembering & Understanding (30%)</th>
                              <th colspan="2" style="width: 140px;">Applying & Analyzing (30%)</th>
                              <th colspan="2" style="width: 140px;">Evaluating & Creating (40%)</th>
                              <th rowspan="2" style="width: 70px;">Total Items</th>
                              <th rowspan="2" style="width: 70px;">Percentage</th>
                            </tr>
                            <tr>
                              <th style="width: 70px;">No. Questions</th>
                              <th style="width: 70px;">Placement</th>
                              <th style="width: 70px;">No. Questions</th>
                              <th style="width: 70px;">Placement</th>
                              <th style="width: 70px;">No. Questions</th>
                              <th style="width: 70px;">Placement</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${generatedSpec.specs.map((spec, idx) => {
                              return `
                                <tr>
                                  <td class="text-left"><strong>${spec.topicName}</strong></td>
                                  <td>${spec.hours}</td>
                                  <td>${spec.cognitive.low.count}</td>
                                  <td class="text-left">${spec.cognitive.low.placements.join(', ')}</td>
                                  <td>${spec.cognitive.middle.count}</td>
                                  <td class="text-left">${spec.cognitive.middle.placements.join(', ')}</td>
                                  <td>${spec.cognitive.high.count}</td>
                                  <td class="text-left">${spec.cognitive.high.placements.join(', ')}</td>
                                  <td><strong>${spec.total}</strong></td>
                                  <td><strong>${spec.percentage}%</strong></td>
                                    </tr>
                                  `;
                                }).join('')}
                                <tr class="total-row">
                                  <td colspan="2"><strong>TOTALS</strong></td>
                                  <td><strong>${generatedSpec.totals.low}</strong></td>
                              <td><strong>All</strong></td>
                                  <td><strong>${generatedSpec.totals.middle}</strong></td>
                              <td><strong>All</strong></td>
                                  <td><strong>${generatedSpec.totals.high}</strong></td>
                              <td><strong>All</strong></td>
                                  <td><strong>${generatedSpec.totals.grand}</strong></td>
                              <td><strong>100%</strong></td>
                            </tr>
                          </tbody>
                        </table>
                        
                        <div class="signature-section" style="margin-top:90px;">
                          <div style="display:flex; justify-content:space-between; gap:20px;">
                            <div style="flex:1; display:flex; align-items:center;">
                              <span class="signature-label" style="display:inline-block; width:auto; white-space:nowrap;">Prepared By:</span>
                              <span style="display:inline-block; width:160px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
                            </div>
                            <div style="flex:1; display:flex; align-items:center; justify-content:flex-end;">
                              <span class="signature-label" style="display:inline-block; width:auto; white-space:nowrap;">Assessed By:</span>
                              <span style="display:inline-block; width:160px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
                            </div>
                          </div>
                          <div style="display:flex; justify-content:center; margin-top:40px;">
                            <div style="width:60%; display:flex; align-items:center; justify-content:center;">
                              <span class="signature-label" style="display:inline-block; width:auto; white-space:nowrap;">Approved By:</span>
                              <span style="display:inline-block; width:220px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
                            </div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `;
                  printWindow.document.write(tableHTML);
                  printWindow.document.close();
                  setTimeout(() => printWindow.print(), 250);
                  finalizePrintFlow('Table of Specification printed');
                  return;
                } else if (printOption === 'exam') {
                  if (!generatedSpec) {
                    setError('Please generate the table of specification first');
                    return;
                  }
                  
                  // Auto-generate sample exam if it doesn't exist
                  let examToPrint = sampleExam;
                  if (!examToPrint || !examToPrint.questions || examToPrint.questions.length === 0) {
                    const allQuestions = [];
                    generatedSpec.specs.forEach(spec => {
                      spec.cognitive.low.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Remembering'
                        });
                      });
                      spec.cognitive.middle.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Applying'
                        });
                      });
                      spec.cognitive.high.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Evaluating'
                        });
                      });
                    });
                    allQuestions.sort((a, b) => a.placement - b.placement);
                    examToPrint = {
                      questions: allQuestions,
                      date: new Date().toLocaleDateString(),
                      totalQuestions: generatedSpec.totalItems
                    };
                  }
                  
                  // Convert UPHSL logo to data URL
                  const img = new Image();
                  img.onload = async function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const logoDataUrl = canvas.toDataURL('image/png');
                    
                    // Convert all question images to base64
                    const questionsWithImages = examToPrint.questions.map(async (q, idx) => {
                      const image = q.image || q.Image;
                      const imagePath = image?.imagePath || image?.ImagePath;
                      if (imagePath) {
                        try {
                          const imageUrl = resolveQuestionImageUrl(imagePath);
                          const imageDataUrl = await convertImageToDataURL(imageUrl);
                          return {
                            ...q,
                            imageDataUrl: imageDataUrl,
                            imageWidth: image.widthPercentage || image.WidthPercentage || 50,
                            imageAlignment: (image.alignment || image.Alignment || 'center').toLowerCase()
                          };
                        } catch (error) {
                          console.error(`Failed to convert image for question ${idx + 1}:`, error);
                          return {
                            ...q,
                            imageDataUrl: resolveQuestionImageUrl(imagePath),
                            imageWidth: image.widthPercentage || image.WidthPercentage || 50,
                            imageAlignment: (image.alignment || image.Alignment || 'center').toLowerCase()
                          };
                        }
                      }
                      return q;
                    });
                    
                    const processedQuestions = await Promise.all(questionsWithImages);
                    
                    const printWindow = window.open('', '', 'width=1200,height=800');
                    const now = new Date();
                    const courseCode = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.code) || 'XXXX';
                    const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
                    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                    const courseName = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.name) || 'Program Name';
                    const filename = `${examType}_${semester}_${schoolYear}_${courseCode}_${date}_${time}`;
                    
                   let examHTML = `
                      <html>
                        <head>
                          <title>Exam Paper</title>
                          <style>
                            @page {
                              size: Legal portrait;
                              margin: 0.5in;
                            }
                            * { color: #000; }
                            body { font-family: Arial, sans-serif; margin: 20px; color: #000; line-height: 1.6; }
                            .exam-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; }
                            .logo-section { flex-shrink: 0; }
                            .logo-section img { height: 140px; width: auto; }
                            .header-text { flex: 1; text-align: center; }
                            .header-text h2 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
                            .header-text p { margin: 3px 0; color: #000; font-size: 14px; }
                            .program-info { font-weight: bold; font-size: 15px; margin: 10px 0; color: #000; }
                            .filename { font-weight: bold; margin: 8px 0; font-size: 12px; color: #000; }
                            .form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
                            .form-field { display: flex; align-items: center; gap: 5px; }
                            .form-field label { color: #000; font-size: 14px; white-space: nowrap; }
                            .form-field-blank { flex: 1; border-bottom: 1px solid #000; min-width: 150px; height: 0; }
                            .reminders { margin: 15px 0; font-size: 13px; color: #000; }
                            .reminders p { margin: 5px 0; }
                            .questions-section { margin: 20px 0; }
                            .question-item { margin-bottom: 15px; color: #000; }
                            .question-text { font-weight: normal; margin-bottom: 5px; font-size: 14px; }
                            .question-image-wrapper { margin: 10px 0; page-break-inside: avoid; }
                            .question-image-wrapper.text-left { text-align: left; }
                            .question-image-wrapper.text-center { text-align: center; }
                            .question-image-wrapper.text-right { text-align: right; }
                            .question-image-wrapper img { max-height: 400px; object-fit: contain; display: inline-block; }
                            .choices { display: flex; flex-wrap: wrap; gap: 15px; margin-left: 20px; }
                            .choice-item { font-size: 14px; flex: 1 1 calc(25% - 15px); min-width: 120px; word-wrap: break-word; white-space: normal; }
                            .choice-letter { font-weight: normal; }
                            @media print {
                              body { margin: 0; padding: 10px; }
                              .question-item { page-break-inside: avoid; }
                              .question-image-wrapper { page-break-inside: avoid; display: block !important; }
                              .question-image-wrapper img { display: inline-block !important; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="exam-header">
                            <div class="logo-section">
                              <img src="${logoDataUrl}" alt="UPHSL Logo" />
                            </div>
                            <div class="header-text">
                              <h2>University of Perpetual Help System</h2>
                              <p>Test Data Bank System</p>
                              <p>Biñan Campus</p>
                              <div class="filename">${filename}</div>
                              <p class="program-info">${courseName}</p>
                            </div>
                          </div>

                          <div class="form-fields">
                            <div class="form-field">
                              <label>Name:</label>
                              <div class="form-field-blank"></div>
                            </div>
                            <div class="form-field">
                              <label>Date:</label>
                              <div class="form-field-blank"></div>
                            </div>
                            <div class="form-field">
                              <label>Professor:</label>
                              <div class="form-field-blank"></div>
                            </div>
                            <div class="form-field">
                              <label>Permit #:</label>
                              <div class="form-field-blank"></div>
                            </div>
                          </div>

                          <div class="reminders">
                            <p><strong>REMINDER: CHEATING during examinations, BORROWING and LENDING of examination permit fall under Major offenses and are punishable under the existing University Policy</strong></p>
                            <p><strong>Direction:</strong> Multiple Choice: Choose the letter of the correct answer.</p>
                          </div>

                          <div class="questions-section">
                            ${processedQuestions.map((q, idx) => {
                              const questionText = q.content || q.Content || q.question || 'Question text not available';
                              const options = q.options || q.Options || q.choices || [];
                              let imageHTML = '';
                              if (q.imageDataUrl) {
                                imageHTML = '<div class="question-image-wrapper text-' + q.imageAlignment + '"><img src="' + q.imageDataUrl + '" alt="Question ' + (idx + 1) + '" style="width: ' + q.imageWidth + '%;" /></div>';
                              }
                              let choicesHTML = '';
                              if (options && options.length > 0) {
                                choicesHTML = options.map((option, optIdx) => {
                                  const letter = String.fromCharCode(65 + optIdx);
                                  const optText = option.content || option.Content || option.optionText || option.text || option || '';
                                  return '<div class="choice-item"><span class="choice-letter">' + letter + '.</span> ' + optText + '</div>';
                                }).join('');
                              }
                              return '<div class="question-item"><div class="question-text">' + (idx + 1) + '.) ' + questionText + '</div>' + imageHTML + '<div class="choices">' + choicesHTML + '</div></div>';
                            }).join('')}
                          </div>
                        </body>
                      </html>
                    `;
                    printWindow.document.write(examHTML);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                    finalizePrintFlow('Exam paper printed');
                  };
                  img.src = UPHSLLogo;
                  return;
                } else if (printOption === 'answer') {
                  if (!generatedSpec) {
                    setError('Please generate the table of specification first');
                    return;
                  }
                  
                  // Auto-generate sample exam if it doesn't exist
                  let examToPrint = sampleExam;
                  if (!examToPrint || !examToPrint.questions || examToPrint.questions.length === 0) {
                    const allQuestions = [];
                    generatedSpec.specs.forEach(spec => {
                      spec.cognitive.low.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Remembering'
                        });
                      });
                      spec.cognitive.middle.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Applying'
                        });
                      });
                      spec.cognitive.high.questions.forEach(q => {
                        allQuestions.push({
                          ...q,
                          topicName: spec.topicName,
                          level: 'Evaluating'
                        });
                      });
                    });
                    allQuestions.sort((a, b) => a.placement - b.placement);
                    examToPrint = {
                      questions: allQuestions,
                      date: new Date().toLocaleDateString(),
                      totalQuestions: generatedSpec.totalItems
                    };
                  }
                  
                  // Convert image to data URL
                  const img2 = new Image();
                  img2.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img2.width;
                    canvas.height = img2.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img2, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    
                    const printWindow = window.open('', '', 'width=1200,height=800');
                    const now = new Date();
                    const courseCode = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.code) || 'XXXX';
                    const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
                    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                    const courseName = (selectedCourse && courses.find(c => c.id === parseInt(selectedCourse))?.name) || 'Program Name';
                    const filename = `${examType}_${semester}_${schoolYear}_${courseCode}_${date}_${time}`;

                    // Determine column count based on total answers
                    const totalAnswers = (examToPrint.questions || []).length || 0;
                    const cols = totalAnswers > 75 ? 3 : 2; // <=75 -> 2 cols, >75 -> 3 cols
                    const answerFontSize = cols === 3 ? '10px' : '11px';

                    // Build the answers HTML robustly (support numeric index or letter answers)
                    const renderAnswersHTML = (examToPrint.questions || []).map((q, idx) => {
                      let correctAnswer = '';
                      const ca = q.correctAnswer;
                      if (typeof ca === 'number' && !isNaN(ca)) {
                        correctAnswer = String.fromCharCode(65 + ca);
                      } else if (typeof ca === 'string' && ca.trim() !== '') {
                        // If string like 'A' or 'a' or '0' (index), handle appropriately
                        const trimmed = ca.trim();
                        if (/^[A-Za-z]$/.test(trimmed)) {
                          correctAnswer = trimmed.toUpperCase();
                        } else if (!isNaN(parseInt(trimmed))) {
                          correctAnswer = String.fromCharCode(65 + parseInt(trimmed));
                        } else {
                          // Fallback: if choices exist and correctAnswer matches one of them
                          const choices = q.options || q.Options || q.choices || [];
                          const matchIndex = choices ? choices.findIndex(c => String(c.content || c.Content || c).trim().toUpperCase() === trimmed.toUpperCase()) : -1;
                          if (matchIndex >= 0) correctAnswer = String.fromCharCode(65 + matchIndex);
                        }
                      }
                      return '<div class="answer-item"><span class="question-num">' + (idx + 1) + '.</span> <span class="answer-letter">' + correctAnswer + '</span></div>';
                    }).join('');

                    let answerHTML = `
                      <html>
                        <head>
                          <title>Answer Key</title>
                          <style>
                            @page {
                              size: Legal portrait;
                              margin: 0.5in;
                            }
                            * { color: #000; }
                            body { font-family: Arial, sans-serif; margin: 12px; color: #000; line-height: 1.25; }
                            .exam-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; }
                            .logo-section { flex-shrink: 0; }
                            .logo-section img { height: 90px; width: auto; }
                            .header-text { flex: 1; text-align: center; }
                            .header-text h2 { font-size: 15px; margin: 2px 0; font-weight: bold; color: #000; }
                            .header-text p { margin: 2px 0; color: #000; font-size: 11px; }
                            .program-info { font-weight: bold; font-size: 12px; margin: 4px 0; color: #000; }
                            .filename { font-weight: bold; margin: 4px 0; font-size: 10px; color: #000; }
                            .answer-title { font-weight: bold; text-align: center; font-size: 14px; margin: 8px 0; }

                            /* Multi-column layout (2 or 3 columns) so numbering can reach bottom of paper */
                            .answers-section {
                              margin: 6px 0;
                              -webkit-column-count: ${cols};
                              -moz-column-count: ${cols};
                              column-count: ${cols};
                              -webkit-column-gap: 14px;
                              -moz-column-gap: 14px;
                              column-gap: 14px;
                              -webkit-column-fill: auto;
                              -moz-column-fill: auto;
                              column-fill: auto;
                            }

                            .answer-item { font-size: ${answerFontSize}; margin: 4px 0; color: #000; display: inline-block; width: 100%; }
                            .question-num { font-weight: normal; display: inline-block; width: 28px; }
                            .answer-letter { font-weight: bold; display: inline-block; width: 20px; }

                            @media print {
                              @page { size: auto; margin: 8mm; }
                              body { margin: 0; padding: 0; }
                              .answers-section { column-count: 3; column-gap: 12px; }
                              .answer-item { page-break-inside: avoid; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="exam-header">
                            <div class="logo-section">
                              <img src="${dataUrl}" alt="UPHSL Logo" />
                            </div>
                            <div class="header-text">
                              <h2>University of Perpetual Help System</h2>
                              <p>Test Data Bank System</p>
                              <p>Biñan Campus</p>
                              <div class="filename">${filename}</div>
                              <p class="program-info">${courseName}</p>
                            </div>
                          </div>

                          <div class="answer-title">ANSWER KEY</div>

                          <div class="answers-section">
                            ${renderAnswersHTML}
                          </div>
                        </body>
                      </html>
                    `;
                    printWindow.document.write(answerHTML);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                    finalizePrintFlow('Answer key printed');
                  };
                  img2.src = UPHSLLogo;
                  return;
                } else {
                  window.print();
                  finalizePrintFlow('Browser print triggered');
                  return;
                }
              }}>Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Request Modal (Non-Admin) */}
      {showPrintRequestModal && (
        <div className="modal-overlay">
          <div className="modal-dialog exam-modal print-request-modal">
            <h3 className="exam-modal-title">Request Master Set Print</h3>
            <div className="exam-modal-body">
              <p>Request a Master Set of this exam to be printed by an administrator.</p>
              <div className="exam-modal-meta">
                <p><strong>Exam:</strong> {activeExamMeta?.setLabel || 'Current Exam'}</p>
                <p><strong>Course:</strong> {selectedSubjectDetails?.name || 'N/A'}</p>
              </div>
              
              <div className="exam-modal-field">
                <label>
                  Number of Copies:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={printRequestCopies}
                  onChange={(e) => setPrintRequestCopies(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
                  className="exam-modal-input"
                />
              </div>
              
              <div className="exam-modal-field">
                <label>
                  Additional Notes (Optional):
                </label>
                <textarea
                  rows="3"
                  placeholder="Any special instructions or requests..."
                  value={printRequestNotes}
                  onChange={(e) => setPrintRequestNotes(e.target.value)}
                  className="exam-modal-input exam-modal-textarea"
                />
              </div>
              
              <p className="exam-modal-note">
                Note: The master set includes the Table of Specifications, Exam Paper, and Answer Key.
                You will be notified when it's ready for pickup.
              </p>
            </div>
            <div className="exam-modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowPrintRequestModal(false)}>
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-primary"
                onClick={() => handleSubmitPrintRequest(printRequestNotes, printRequestCopies)}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.show}
        title="Confirm Delete"
        message="Are you sure you want to delete this row?"
        onCancel={cancelDeleteRow}
        onConfirm={confirmDeleteRow}
        cancelText="Cancel"
        confirmText="Delete"
        isDarkMode={isDarkMode}
        isDanger={true}
      />

      <ConfirmationModal
        isOpen={cancelReviewConfirmation}
        title="Confirm Cancel Review"
        message="Cancel reviewing this print request? Any unsaved changes will be lost."
        onCancel={closeCancelPrintRequestReview}
        onConfirm={confirmCancelPrintRequestReview}
        cancelText="Keep Reviewing"
        confirmText="Cancel Review"
        isDarkMode={isDarkMode}
        isDanger={true}
      />

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

export default TestGeneration;
