import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import '../styles/Dashboard.css';
import '../styles/TestGeneration.css';

import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import UPHSLLogo from '../assets/UPHSL Logo.png';

const { Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, Printer, Eye, Trash2, RefreshCcw } = Icons;

const getAutoSemester = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 8 || month <= 12) return '1st';
  if (month >= 1 && month <= 5) return '2nd';
  return 'Summer';
};

const getAutoSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) {
    return `${year}${year + 1}`;
  }
  return `${year - 1}${year}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return value;
  }
};

const loadImageAsDataUrl = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = reject;
  img.src = src;
});

const SavedExamsReport = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const { departmentCode } = useParams();
  const [activeTab, setActiveTab] = useState('Saved Exam Sets');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User';

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [semester, setSemester] = useState(getAutoSemester());
  const [schoolYear, setSchoolYear] = useState(getAutoSchoolYear());

  // Collections
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [savedExamSets, setSavedExamSets] = useState([]);

  // Loading flags
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingSavedSets, setIsLoadingSavedSets] = useState(false);
  const [isLoadingExamDetail, setIsLoadingExamDetail] = useState(false);

  // Selection + UI
  const [selectedExam, setSelectedExam] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOption, setPrintOption] = useState('specification');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [examPendingDelete, setExamPendingDelete] = useState(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const data = await apiService.getDepartments();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load departments:', err);
        setError('Failed to load departments.');
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    void loadDepartments();
  }, []);

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
      if (fallback) setSelectedDepartment(String(fallback.id));
    }
  }, [departmentCode, departments, selectedDepartment]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!selectedDepartment) {
        setCourses([]);
        setSubjects([]);
        setSelectedCourse('');
        setSelectedSubject('');
        return;
      }

      try {
        setIsLoadingCourses(true);
        const dept = departments.find(d => d.id === parseInt(selectedDepartment, 10));
        if (!dept) {
          setCourses([]);
          return;
        }
        const data = await apiService.getCourses(dept.id);
        setCourses(Array.isArray(data) ? data : []);
        setSelectedCourse('');
        setSelectedSubject('');
      } catch (err) {
        console.error('Failed to load programs:', err);
        setError('Failed to load programs.');
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void fetchCourses();
  }, [selectedDepartment, departments]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedCourse) {
        setSubjects([]);
        setSelectedSubject('');
        setSavedExamSets([]);
        setSelectedExam(null);
        return;
      }

      try {
        setIsLoadingSubjects(true);
        const subjectsList = await apiService.getSubjects({ courseId: parseInt(selectedCourse, 10), pageSize: 500 });
        setSubjects(Array.isArray(subjectsList) ? subjectsList : []);
        setSelectedSubject('');
        setSavedExamSets([]);
        setSelectedExam(null);
      } catch (err) {
        console.error('Failed to load subjects:', err);
        setError('Failed to load subjects.');
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    void fetchSubjects();
  }, [selectedCourse]);

  const loadSavedExamSets = React.useCallback(async () => {
    if (!selectedSubject) {
      setSavedExamSets([]);
      setSelectedExam(null);
      return;
    }

    try {
      setIsLoadingSavedSets(true);
      const subjectId = parseInt(selectedSubject, 10);
      const saved = await apiService.getExams({
        subjectId,
        examType,
        semester,
        schoolYear,
        pageSize: 50
      });
      const list = Array.isArray(saved) ? saved : (saved?.items || []);
      setSavedExamSets(list);
      if (list.length === 0) {
        setSelectedExam(null);
      }
    } catch (err) {
      console.error('Failed to load saved exams:', err);
      setError('Failed to load saved exams.');
    } finally {
      setIsLoadingSavedSets(false);
    }
  }, [selectedSubject, examType, semester, schoolYear]);

  useEffect(() => {
    void loadSavedExamSets();
  }, [loadSavedExamSets]);

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    setSelectedCourse('');
    setSelectedSubject('');
    setCourses([]);
    setSubjects([]);
    setSavedExamSets([]);
    setSelectedExam(null);
  };

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

  const handleViewSavedExam = async (examId) => {
    setError('');
    try {
      setIsLoadingExamDetail(true);
      const exam = await apiService.getExam(examId);
      setSelectedExam(exam);
    } catch (err) {
      console.error('Failed to load exam details:', err);
      setError('Failed to load the selected exam.');
    } finally {
      setIsLoadingExamDetail(false);
    }
  };

  const promptDeleteExam = () => {
    if (!selectedExam) return;
    setExamPendingDelete(selectedExam);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteExam = async () => {
    if (!examPendingDelete) return;
    try {
      setIsDeletingExam(true);
      setError('');
      await apiService.deleteExam(examPendingDelete.id);
      setIsDeleteModalOpen(false);
      setExamPendingDelete(null);
      if (selectedExam?.id === examPendingDelete.id) {
        setSelectedExam(null);
      }
      await loadSavedExamSets();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      const message = err?.response?.data?.detail || err?.message || 'Failed to delete exam.';
      setError(message);
    } finally {
      setIsDeletingExam(false);
    }
  };

  const openPrintWindow = (html) => {
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const buildFilename = (suffix) => {
    const now = new Date();
    const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const courseCode = selectedCourse && courses.find(c => c.id === parseInt(selectedCourse, 10))?.code;
    const code = courseCode || 'PROGRAM';
    const base = `${selectedExam?.examType || examType}_${selectedExam?.semester || semester}_${selectedExam?.schoolYear || schoolYear}_${code}_${date}_${time}`;
    return `${base}_${suffix}`;
  };

  const getProgramName = () => {
    const details = selectedCourse && courses.find(c => c.id === parseInt(selectedCourse, 10));
    return details?.name || 'Program Name';
  };

  const getSubjectName = () => {
    const details = selectedSubject && subjects.find(s => s.id === parseInt(selectedSubject, 10));
    return details?.name || 'Subject Name';
  };

  const isOptionMarkedCorrect = React.useCallback((option) => {
    if (!option) return false;

    const rawValue = option.isCorrect ?? option.IsCorrect ?? option.correct ?? option.is_correct ?? option.correctOption ?? option.answer ?? null;

    if (typeof rawValue === 'boolean') {
      return rawValue === true;
    }

    if (typeof rawValue === 'string') {
      return rawValue.trim().toLowerCase() === 'true';
    }

    if (typeof rawValue === 'number') {
      if (Number.isNaN(rawValue)) return false;
      return rawValue === 1;
    }

    return false;
  }, []);

  const getOrderedOptions = React.useCallback((options = []) => {
    return options
      .map((option, idx) => {
        const rawOrder = option.displayOrder ?? option.DisplayOrder ?? option.order ?? option.Order ?? option.sequence ?? option.Sequence;
        let normalizedOrder = idx;
        if (typeof rawOrder === 'number' && !Number.isNaN(rawOrder)) {
          normalizedOrder = rawOrder;
        } else if (typeof rawOrder === 'string' && rawOrder.trim() !== '' && !Number.isNaN(Number(rawOrder))) {
          normalizedOrder = Number(rawOrder);
        } else if (typeof option.id === 'number') {
          normalizedOrder = option.id;
        } else if (typeof option.Id === 'number') {
          normalizedOrder = option.Id;
        }
        return { option, normalizedOrder, idx };
      })
      .sort((a, b) => {
        if (a.normalizedOrder === b.normalizedOrder) {
          return a.idx - b.idx;
        }
        return a.normalizedOrder - b.normalizedOrder;
      })
      .map(item => item.option);
  }, []);

  const orderedQuestions = React.useMemo(() => {
    if (!selectedExam?.questions) return [];
    return [...selectedExam.questions].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [selectedExam]);

  const parsedSpecification = React.useMemo(() => {
    if (!selectedExam?.specificationSnapshot) return null;
    try {
      return JSON.parse(selectedExam.specificationSnapshot);
    } catch (err) {
      console.warn('Failed to parse specification snapshot:', err);
      return null;
    }
  }, [selectedExam]);

  const printSpecification = () => {
    if (!parsedSpecification?.specs?.length) {
      throw new Error('This saved exam does not include a specification snapshot.');
    }

    const totals = parsedSpecification.totals || { low: 0, middle: 0, high: 0, grand: 0 };
    const programName = getProgramName();
    const subjectName = getSubjectName();
    const filename = buildFilename('TOS');

    const tableRows = parsedSpecification.specs.map((spec) => `
      <tr>
        <td class="text-left"><strong>${spec.topicName}</strong></td>
        <td>${spec.hours || '—'}</td>
        <td>${spec.cognitive?.low?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.low?.placements || []).join(', ')}</td>
        <td>${spec.cognitive?.middle?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.middle?.placements || []).join(', ')}</td>
        <td>${spec.cognitive?.high?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.high?.placements || []).join(', ')}</td>
        <td><strong>${spec.total || 0}</strong></td>
        <td><strong>${spec.percentage || 0}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Table of Specification</title>
          <style>
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 18px; margin: 5px 0; font-weight: bold; }
            .header p { margin: 3px 0; }
            .filename { font-weight: bold; margin: 10px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            table, th, td { border: 1px solid #000; }
            th { background-color: #fff; padding: 12px 6px; text-align: center; font-size: 12px; }
            td { padding: 10px 6px; text-align: center; font-size: 12px; }
            td.text-left { text-align: left; }
            .total-row { font-weight: bold; }
            .signature-section { margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>University of Perpetual Help System</h1>
            <p>Test Data Bank System · Biñan Campus</p>
            <div class="filename">${filename}</div>
            <p><strong>${programName}</strong></p>
            <p>${subjectName}</p>
          </div>
          <h2 style="text-align:center;">Table of Specification</h2>
          <table>
            <thead>
              <tr>
                <th rowspan="2">Topics</th>
                <th rowspan="2">Hours</th>
                <th colspan="2">Remembering & Understanding (30%)</th>
                <th colspan="2">Applying & Analyzing (30%)</th>
                <th colspan="2">Evaluating & Creating (40%)</th>
                <th rowspan="2">Total Items</th>
                <th rowspan="2">Percentage</th>
              </tr>
              <tr>
                <th>No. Questions</th>
                <th>Placement</th>
                <th>No. Questions</th>
                <th>Placement</th>
                <th>No. Questions</th>
                <th>Placement</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td colspan="2"><strong>TOTALS</strong></td>
                <td><strong>${totals.low || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.middle || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.high || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.grand || 0}</strong></td>
                <td><strong>100%</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="signature-section">
            <table style="width:100%; border:0; margin-top:40px;">
              <tr>
                <td style="border:0; text-align:center;">
                  <div style="margin-bottom:5px;">Prepared By:</div>
                  <div style="width:200px; margin:0 auto; border-bottom:1px solid #000; height:20px;"></div>
                </td>
                <td style="border:0; text-align:center;">
                  <div style="margin-bottom:5px;">Assessed By:</div>
                  <div style="width:200px; margin:0 auto; border-bottom:1px solid #000; height:20px;"></div>
                </td>
                <td style="border:0; text-align:center;">
                  <div style="margin-bottom:5px;">Approved By:</div>
                  <div style="width:220px; margin:0 auto; border-bottom:1px solid #000; height:20px;"></div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const printExamPaper = async () => {
    if (!orderedQuestions.length) {
      throw new Error('This saved exam has no questions.');
    }

    const logoDataUrl = await loadImageAsDataUrl(UPHSLLogo);
    const programName = getProgramName();
    const subjectName = getSubjectName();
    const filename = buildFilename('Exam');

    const questionHtml = orderedQuestions.map((question, index) => {
      const orderedOptions = getOrderedOptions(question.options || []);
      const choices = orderedOptions.map((option, idx) => `
        <div class="choice-item">
          <span class="choice-letter">${String.fromCharCode(65 + idx)}.</span>
          <span class="choice-text">${option.content}</span>
        </div>
      `).join('');
      return `
        <div class="question-item">
          <div class="question-text"><strong>${index + 1}.)</strong> ${question.content}</div>
          <div class="choices">${choices}</div>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Exam Paper</title>
          <style>
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; line-height: 1.6; }
            .exam-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000; }
            .logo-section { flex-shrink: 0; }
            .logo-section img { height: 140px; width: auto; }
            .header-text { flex: 1; text-align: center; }
            .header-text h2 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
            .header-text p { margin: 3px 0; color: #000; font-size: 14px; }
            .filename { font-weight: bold; margin: 8px 0; font-size: 12px; color: #000; }
            .program-info { font-weight: bold; font-size: 15px; margin: 10px 0; color: #000; }
            .form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .form-field { display: flex; align-items: center; gap: 6px; }
            .form-field label { color: #000; font-size: 14px; white-space: nowrap; }
            .form-field-blank { flex: 1; border-bottom: 1px solid #000; min-width: 150px; height: 0; }
            .reminders { margin: 15px 0; font-size: 13px; color: #000; }
            .reminders p { margin: 5px 0; }
            .questions-section { margin: 20px 0; }
            .question-item { margin-bottom: 18px; color: #000; }
            .question-text { font-size: 14px; margin-bottom: 8px; }
            .choices { display: flex; flex-wrap: wrap; gap: 15px; margin-left: 20px; }
            .choice-item { font-size: 14px; flex: 1 1 calc(25% - 15px); min-width: 120px; display: flex; gap: 6px; }
            .choice-letter { font-weight: bold; }
            .choice-text { flex: 1; }
            @media print {
              body { margin: 0; padding: 10px; }
              .question-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="exam-header">
            <div class="logo-section"><img src="${logoDataUrl}" alt="UPHSL Logo" /></div>
            <div class="header-text">
              <h2>University of Perpetual Help System</h2>
              <p>Test Data Bank System</p>
              <p>Biñan Campus</p>
              <div class="filename">${filename}</div>
              <p class="program-info">${programName}</p>
              <p>${subjectName}</p>
            </div>
          </div>
          <div class="form-fields">
            <div class="form-field"><label>Student Name:</label><span class="form-field-blank"></span></div>
            <div class="form-field"><label>Date:</label><span class="form-field-blank"></span></div>
            <div class="form-field"><label>Professor:</label><span class="form-field-blank"></span></div>
            <div class="form-field"><label>Permit #:</label><span class="form-field-blank"></span></div>
          </div>
          <div class="reminders">
            <p><strong>REMINDER:</strong> Cheating during examinations, borrowing, or lending permits are offenses under university policy.</p>
            <p><strong>Direction:</strong> Multiple Choice — Choose the letter of the correct answer.</p>
          </div>
          <div class="questions-section">
            ${questionHtml}
          </div>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const printAnswerKey = () => {
    if (!orderedQuestions.length) {
      throw new Error('This saved exam has no questions.');
    }

    const filename = buildFilename('AnswerKey');
    const rows = orderedQuestions.map((question, index) => {
      const options = getOrderedOptions(question.options || []);
      const correctIndex = options.findIndex(isOptionMarkedCorrect);
      const correctLetter = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : '—';
      const correctContent = options[correctIndex]?.content || 'N/A';
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${correctLetter}</td>
          <td class="text-left">${correctContent}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Answer Key</title>
          <style>
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 30px; color: #000; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            table, th, td { border: 1px solid #000; }
            th, td { padding: 10px; text-align: center; font-size: 13px; }
            td.text-left { text-align: left; }
          </style>
        </head>
        <body>
          <h2>Answer Key · ${filename}</h2>
          <table>
            <thead>
              <tr>
                <th>Question No.</th>
                <th>Answer</th>
                <th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const handlePrint = async () => {
    if (!selectedExam) {
      setError('Select a saved exam before printing.');
      return;
    }

    try {
      if (printOption === 'specification') {
        printSpecification();
      } else if (printOption === 'exam') {
        await printExamPaper();
      } else {
        printAnswerKey();
      }
      setShowPrintModal(false);
    } catch (err) {
      console.error('Failed to print:', err);
      setError(err.message || 'Failed to print.');
    }
  };

  const resolveDepartmentCode = () => {
    if (departmentCode) return departmentCode;
    const selectedDept = departments.find(d => d.id === Number(selectedDepartment));
    if (selectedDept?.code) return selectedDept.code;
    const fallback = departments.find(d => (d.code || '').toUpperCase() !== 'IT') || departments[0];
    return fallback?.code || 'CCS';
  };

  const dataEntryItems = ['Program - Topic', 'Test Encoding', 'Test Question Editing'];
  const reportItems = ['Test Generation', 'Saved Exam Sets'];
  const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
  const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

  const selectedCourseDetails = selectedCourse ? courses.find(c => c.id === parseInt(selectedCourse, 10)) : null;
  const selectedSubjectDetails = selectedSubject ? subjects.find(s => s.id === parseInt(selectedSubject, 10)) : null;

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
                const code = resolveDepartmentCode();
                if (item === 'Program - Topic') navigate(`/course-topic/${code}`);
                else if (item === 'Test Encoding' || item === 'Test Question Editing') navigate(`/test-encoding/${code}`);
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
                if (item === 'Test Generation') navigate(`/test-generation/${code}`);
                if (item === 'Saved Exam Sets') navigate(`/reports/saved-exams/${code}`);
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
                <button onClick={() => handleUserAction('Edit Account')}><User /> Edit Account</button>
                <button className="logout-btn" onClick={() => handleUserAction('Logout')}><LogOut /> Logout</button>
              </div>
            )}
          </div>
        </nav>

        <div className="search-and-view" style={{ maxWidth: '1140px', margin: '0 auto 20px auto' }}>
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search..." disabled />
          </div>
        </div>

        <div className="main-card">
          <h2>Saved Exam Sets</h2>
          <p className="subtitle">Review previously generated exams, print official sets, and access the stored Table of Specification</p>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="input-section">
            <div className="field-container">
              <label>Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
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
              <label>Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedCourse || isLoadingSubjects}
              >
                <option value="">Select Subject</option>
                {isLoadingSubjects ? (
                  <option disabled>Loading subjects...</option>
                ) : subjects.length === 0 ? (
                  <option disabled>No subjects found</option>
                ) : (
                  subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{(subject.code ? `${subject.code} - ` : '') + subject.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="field-container">
              <label>Exam Period</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="Prelim">Prelim</option>
                <option value="Midterm">Midterm</option>
                <option value="Finals">Finals</option>
              </select>
            </div>

            <div className="field-container">
              <label>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="Summer">Summer</option>
              </select>
            </div>

            <div className="field-container">
              <label>School Year</label>
              <input type="text" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
            </div>

          </div>

          <div className="action-buttons" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => void loadSavedExamSets()}
              disabled={isLoadingSavedSets}
            >
              <RefreshCcw size={16} /> Refresh Saved Sets
            </button>
          </div>

          <div className="saved-exams-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
            <div className="saved-exams-list" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Saved Sets</h3>
                {isLoadingSavedSets && <span style={{ fontSize: '12px' }}>Loading...</span>}
              </div>
              {savedExamSets.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No saved exams found for the selected filters.</p>
              ) : (
                <div className="saved-exam-scroll" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {savedExamSets.map(test => {
                    const isActive = selectedExam?.id === test.id;
                    return (
                      <button
                        key={test.id}
                        className={`saved-exam-row ${isActive ? 'active' : ''}`}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '12px',
                          marginBottom: '10px',
                          backgroundColor: isActive ? 'var(--accent-fade)' : 'transparent'
                        }}
                        onClick={() => handleViewSavedExam(test.id)}
                      >
                        <div style={{ fontWeight: 'bold' }}>{test.setLabel || 'Set ?'}</div>
                        <div style={{ fontSize: '14px' }}>{test.examType} · {test.semester} Semester · SY {test.schoolYear}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Saved on {formatDateTime(test.createdAt)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="saved-exam-detail" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', background: 'var(--card-bg)', minHeight: '480px' }}>
              {isLoadingExamDetail ? (
                <p>Loading exam details...</p>
              ) : !selectedExam ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Eye size={32} />
                  <p>Select a saved exam on the left to view its contents.</p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{selectedExam.title || `${getSubjectName()} ${selectedExam.setLabel}`}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{selectedExam.examType} · {selectedExam.semester} Semester · SY {selectedExam.schoolYear}</p>
                    <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>Saved on {formatDateTime(selectedExam.createdAt)}</p>
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                      <strong>Total Questions:</strong> {selectedExam.totalQuestions} · <strong>Total Points:</strong> {selectedExam.totalPoints || selectedExam.totalQuestions}
                    </div>
                  </div>

                  <div className="action-buttons" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowPrintModal(true)} disabled={!selectedExam}>
                      <Printer size={16} /> Print Options
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={promptDeleteExam}
                      disabled={!selectedExam}
                    >
                      <Trash2 size={16} /> Delete Set
                    </button>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <div className="exam-paper" style={{ boxShadow: 'none', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div className="exam-header">
                        <img src={UPHSLLogo} alt="UPHSL Logo" className="exam-logo" />
                        <div className="university-header">
                          <h2>University of Perpetual Help System</h2>
                          <p>Test Data Bank System</p>
                          <p>Biñan Campus</p>
                          <p className="exam-filename">{buildFilename('ExamPreview')}</p>
                          <p className="program-info">{getProgramName()}</p>
                          <p>{getSubjectName()}</p>
                        </div>
                      </div>

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

                      <div className="exam-instructions">
                        <p><strong>REMINDER:</strong> Cheating, borrowing, or lending examination permits are punishable under university policy.</p>
                        <p><strong>Direction:</strong> Multiple Choice — Choose the letter of the correct answer.</p>
                      </div>

                      <div className="exam-questions-section">
                        {orderedQuestions.map((question, index) => {
                          const options = getOrderedOptions(question.options || []);
                          return (
                            <div key={question.id || index} className="exam-question-item">
                              <div className="question-number-text">
                                <strong>{index + 1}.) {question.content}</strong>
                              </div>
                              <div className="question-options">
                                {options.map((option, idx) => (
                                  <div key={option.id || option.Id || idx} className="option-line">
                                    <span className="option-letter">{String.fromCharCode(65 + idx)}.</span>
                                    <span className="option-text">{option.content}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {showPrintModal && (
        <div className="modal-overlay">
          <div className={`modal print-modal ${isDarkMode ? 'dark' : ''}`}>
            <h3 className="print-modal-title">Print Options</h3>
            <div className="print-modal-content">
              <div className="print-radio-group">
                <label className={`print-radio-label${printOption === 'specification' ? ' selected' : ''}`}>
                  <input type="radio" value="specification" checked={printOption === 'specification'} onChange={(e) => setPrintOption(e.target.value)} />
                  <span className="custom-radio"></span>
                  <span>Table of Specification</span>
                </label>
                <label className={`print-radio-label${printOption === 'exam' ? ' selected' : ''}`}>
                  <input type="radio" value="exam" checked={printOption === 'exam'} onChange={(e) => setPrintOption(e.target.value)} />
                  <span className="custom-radio"></span>
                  <span>Exam Paper</span>
                </label>
                <label className={`print-radio-label${printOption === 'answer' ? ' selected' : ''}`}>
                  <input type="radio" value="answer" checked={printOption === 'answer'} onChange={(e) => setPrintOption(e.target.value)} />
                  <span className="custom-radio"></span>
                  <span>Answer Key</span>
                </label>
              </div>
            </div>
            <div className="modal-buttons print-modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handlePrint()}>Print</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && examPendingDelete && (
        <div className="modal-overlay">
          <div className={`modal ${isDarkMode ? 'dark' : ''}`}>
            <h3>Delete Saved Exam</h3>
            <p>
              Permanently delete <strong>{examPendingDelete.setLabel}</strong> ({examPendingDelete.examType} · {examPendingDelete.semester} Semester · SY {examPendingDelete.schoolYear})?
            </p>
            <p>This removes the stored exam paper, answer key, and TOS snapshot for this set.</p>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setExamPendingDelete(null); }} disabled={isDeletingExam}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteExam} disabled={isDeletingExam}>
                {isDeletingExam ? 'Deleting...' : 'Delete Set'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedExamsReport;
