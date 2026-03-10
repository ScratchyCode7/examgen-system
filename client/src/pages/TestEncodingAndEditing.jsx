// Refactored to integrate with backend API
// - Added department, course, and subject dropdowns
// - Replaced mock data with real API calls
// - Implemented save/update/delete functionality with backend
// - Uses Bloom's taxonomy levels from backend
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Home, ClipboardList, BookOpen, Settings, LogOut, User, Sun, Moon, Search, 
    FileText, Plus, Edit2, Trash2, Save,
    Bold, Italic, Underline, Link, List, ListOrdered, Sigma, Image, Edit, 
    Heading1, Heading2,
} from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import LogoutModal from '../components/LogoutModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';
import '../styles/TestEncodingAndEditing.css';

// Assets
import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png'; 

// --- STATIC CONFIG ---
const dataEntryItems = ["Program - Topic", "Test Question Encoding", "Test Question Editing"];

// Grouped Bloom's Taxonomy Levels (mapped to backend BloomLevel enum)
const BLOOM_LEVELS = [
    { 
        id: 1, 
        label: "Remembering & Understanding (30%)", 
        value: "RememberUnderstand",
        backendValues: ["Remember", "Understand"],
        targetPercent: 30
    },
    { 
        id: 2, 
        label: "Applying & Analyzing (30%)", 
        value: "ApplyAnalyze",
        backendValues: ["Apply", "Analyze"],
        targetPercent: 30
    },
    { 
        id: 3, 
        label: "Evaluating & Creating (40%)", 
        value: "EvaluateCreate",
        backendValues: ["Evaluate", "Create"],
        targetPercent: 40
    }
];

const MATH_SYMBOLS = [
    '=', '+', '−', '±', '×', '÷', '≠', '≈', '>', '<', '≥', '≤',
    'π', 'θ', 'α', 'β', 'γ', 'λ', 'Σ', '∫', '∂', 'Δ', '∇', '∞', 
    '∈', '∉', '∩', '∪', '⊂', '⊃', '∀', '∃', '∴', '∵',
    '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '₇', '₈', '₉', 
    '√', '³√', '⁄',
    '°', '⊥', '∠', '∆', 
];
// -----------------


// --- MathSymbolPicker Component ---
const MathSymbolPicker = ({ position, onSelect, onClose }) => {
    if (!position) return null;
    return (
        <div 
            className="math-symbol-picker" 
            style={{ top: position.y, left: position.x }}
            // Critical: Stop click from propagating to prevent focus loss in contentEditable
            onMouseDown={(e) => e.stopPropagation()} 
        >
            <div className="picker-header">
                Select Symbol
                <button onClick={onClose} className="close-btn">×</button>
            </div>
            <div className="symbol-grid">
                {MATH_SYMBOLS.map((symbol) => (
                    <button 
                        key={symbol} 
                        // 💥 FIX: Aggressively prevent the button from stealing focus
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => onSelect(symbol)}
                        className="symbol-btn"
                        title={symbol}
                    >
                        {symbol}
                    </button>
                ))}
            </div>
        </div>
    );
};
// -----------------


// --- RichTextToolbar Component ---
const RichTextToolbar = ({ onFormat, onSaveRange, activeCommands }) => {
    
    // Helper function to check if a command is currently active
    const isCommandActive = (command) => {
        return activeCommands && activeCommands[command] === true;
    };

    // FIX: Ensures selection is saved and button click is prevented from losing focus
    const handleToolbarClick = (e, formatType, command, value) => {
        // Essential: Prevents the contentEditable area from losing focus/selection
        e.preventDefault(); 
        
        // Save current selection/cursor position BEFORE processing the format command
        onSaveRange(); 

        if (formatType === 'openPicker' && command === 'math') {
            // Passing the event target (the button) for position calculation
            onFormat('openPicker', 'math', e.currentTarget); 
        } else {
            onFormat(formatType, command, value);
        }
    };

    return (
        // Critical: Prevent focus loss on the entire toolbar area
        <div className="rich-text-toolbar" onMouseDown={(e) => e.preventDefault()}> 
            {/* FormatBlock Buttons */}
            <button 
                title="Normal Text (P)" 
                onMouseDown={(e) => handleToolbarClick(e, 'formatBlock', 'formatBlock', 'p')}
                className={isCommandActive('P') ? 'active' : ''}
            >
                ¶
            </button>
            <button 
                title="Heading 1" 
                onMouseDown={(e) => handleToolbarClick(e, 'formatBlock', 'formatBlock', 'h1')}
                className={isCommandActive('H1') ? 'active' : ''}
            >
                <Heading1 size={18} />
            </button>
            <button 
                title="Heading 2" 
                onMouseDown={(e) => handleToolbarClick(e, 'formatBlock', 'formatBlock', 'h2')}
                className={isCommandActive('H2') ? 'active' : ''}
            >
                <Heading2 size={18} />
            </button>
            <div className="separator" />
            
            {/* Style Buttons */}
            <button 
                title="Bold" 
                onMouseDown={(e) => handleToolbarClick(e, 'style', 'bold')}
                className={isCommandActive('bold') ? 'active' : ''}
            >
                <Bold size={18} />
            </button>
            <button 
                title="Italic" 
                onMouseDown={(e) => handleToolbarClick(e, 'style', 'italic')}
                className={isCommandActive('italic') ? 'active' : ''}
            >
                <Italic size={18} />
            </button>
            <button 
                title="Underline" 
                onMouseDown={(e) => handleToolbarClick(e, 'style', 'underline')}
                className={isCommandActive('underline') ? 'active' : ''}
            >
                <Underline size={18} />
            </button>
            
            <div className="separator" />
            
            {/* List Buttons */}
            <button 
                title="Unordered List" 
                onMouseDown={(e) => handleToolbarClick(e, 'list', 'insertunorderedlist')}
                className={isCommandActive('insertunorderedlist') ? 'active' : ''}
            >
                <List size={18} />
            </button>
            <button 
                title="Ordered List" 
                onMouseDown={(e) => handleToolbarClick(e, 'list', 'insertorderedlist')}
                className={isCommandActive('insertorderedlist') ? 'active' : ''}
            >
                <ListOrdered size={18} />
            </button>
            
            <div className="separator" />
            
            {/* Insert Buttons */}
            <button title="Link" onMouseDown={(e) => handleToolbarClick(e, 'insert', 'createlink')}><Link size={18} /></button>
            <button title="Mathematical Symbols" 
                onMouseDown={(e) => handleToolbarClick(e, 'openPicker', 'math', e.currentTarget)}>
                <Sigma size={18} />
            </button>
            <button title="Insert Image" onMouseDown={(e) => handleToolbarClick(e, 'image', 'insertImage')}><Image size={18} /></button>
            <button title="Edit Image" onMouseDown={(e) => handleToolbarClick(e, 'image', 'editImage')}><Edit size={18} /></button>
        </div>
    );
};
// -----------------


// --- HeaderTitleBlock Component ---
const HeaderTitleBlock = ({ activeTab, isDarkMode, selectedDepartment }) => {
    const deptLogo = selectedDepartment?.code && DEPARTMENT_LOGOS[selectedDepartment.code] 
        ? DEPARTMENT_LOGOS[selectedDepartment.code] 
        : DEPARTMENT_LOGOS['CCS'];
    const deptName = selectedDepartment?.name || 'College of Computer Studies';
    
    return (
        <div className="header-section">
            <h1 className="page-title">{activeTab}</h1> 
            <hr className="header-separator-line" /> 
            <div className={`college-title-block centered-only ${isDarkMode ? 'dark' : ''}`}>
                <img src={deptLogo} alt={`${deptName} Logo`} className="dept-logo" /> 
                <span className="college-text">{deptName}</span>
            </div>
            <hr className="header-separator-line" />
        </div>
    );
};
// -----------------


// --- Main Component ---
const TestEncodingAndEditing = () => {
    const navigate = useNavigate();
    const { departmentCode } = useParams();
    const { user, logout, isAdmin } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Test Question Encoding');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Backend data state
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);

    const [department, setDepartment] = useState("");
    const [course, setCourse] = useState("");
    const [subject, setSubject] = useState("");
    const [topic, setTopic] = useState("");
    const [bloomLevel, setBloomLevel] = useState(""); 

    const getActiveDepartmentCode = useCallback(() => {
        if (departmentCode) return departmentCode;
        const selectedDept = departments.find(d => d.id === Number(department));
        if (selectedDept?.code) return selectedDept.code;
        const fallback = departments.find(d => (d.code || '').toUpperCase() !== 'IT') || departments[0];
        return fallback?.code || 'CCS';
    }, [departmentCode, departments, department]);

    // State for Rich Text Editor
    const [isMathPickerOpen, setIsMathPickerOpen] = useState(false);
    const [mathPickerPosition, setMathPickerPosition] = useState(null);
    const activeEditableRef = useRef(null); 
    const activeSetterRef = useRef(null); 
    const [savedRange, setSavedRange] = useState(null); // The critical saved selection range
    const [activeCommands, setActiveCommands] = useState({}); // State for TOOLBAR HIGHLIGHTING

    const [searchText, setSearchText] = useState("");
    
    // Questions from backend
    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    
    // States for question encoding fields
    const [questionText, setQuestionText] = useState(''); 
    const [choiceA, setChoiceA] = useState('');
    const [choiceB, setChoiceB] = useState('');
    const [choiceC, setChoiceC] = useState('');
    const [choiceD, setChoiceD] = useState('');
    const [explanation, setExplanation] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState(''); 

    const [editingQuestion, setEditingQuestion] = useState(null); 
    

    // --- Effects & Handlers ---

    // Load departments on mount
    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const data = await apiService.getDepartments();
                setDepartments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load departments:', err);
            }
        };
        void loadDepartments();
    }, []);

    // Auto-select department based on URL parameter
    useEffect(() => {
        if (!departmentCode || departments.length === 0) return;
        const dept = departments.find(d => d.code === departmentCode);
        if (dept) {
            console.log('Auto-selecting department from URL:', dept);
            setDepartment(String(dept.id));
        } else {
            console.warn('Department code not found:', departmentCode);
        }
    }, [departmentCode, departments]);

    // Load courses when department changes
    useEffect(() => {
        const loadCourses = async () => {
            if (!department) {
                setCourses([]);
                return;
            }
            const dept = departments.find(d => d.id === Number(department));
            if (!dept) return;
            
            try {
                setIsLoadingCourses(true);
                const data = await apiService.getCourses(dept.id);
                setCourses(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load courses:', err);
                setCourses([]);
            } finally {
                setIsLoadingCourses(false);
            }
        };
        void loadCourses();
    }, [department, departments]);

    // Load subjects when course changes
    useEffect(() => {
        const loadSubjects = async () => {
            if (!course) {
                setSubjects([]);
                return;
            }
            try {
                setIsLoadingSubjects(true);
                const data = await apiService.getSubjects({ courseId: course, pageSize: 100 });
                setSubjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load subjects:', err);
                setSubjects([]);
            } finally {
                setIsLoadingSubjects(false);
            }
        };
        void loadSubjects();
    }, [course]);

    // Load topics when subject changes
    useEffect(() => {
        const loadTopics = async () => {
            if (!subject) {
                setTopics([]);
                return;
            }
            try {
                setIsLoadingTopics(true);
                const data = await apiService.getTopics(subject);
                setTopics(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load topics:', err);
                setTopics([]);
            } finally {
                setIsLoadingTopics(false);
            }
        };
        void loadTopics();
    }, [subject]);

    // Load questions when topic changes
    useEffect(() => {
        const loadQuestions = async () => {
            if (!topic) {
                setQuestions([]);
                return;
            }
            try {
                setIsLoadingQuestions(true);
                const data = await apiService.getQuestionsByTopic(topic);
                console.log('Loaded questions for topic', topic, ':', data);
                setQuestions(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load questions:', err);
                setQuestions([]);
            } finally {
                setIsLoadingQuestions(false);
            }
        };
        void loadQuestions();
    }, [topic]);

    // --- REFACTORED RESET FUNCTIONS ---
    const resetInputContent = useCallback(() => {
        setQuestionText(''); 
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setExplanation('');
        setCorrectAnswer(''); 
        setBloomLevel('');
        setEditingQuestion(null);
        
        // Clear contentEditable divs visually
        document.querySelectorAll('.content-editable-area').forEach(el => el.innerHTML = '');
        setActiveCommands({});
        setSavedRange(null);
    }, []);

    const handleSetActiveTab = (item) => {
        if (item === 'Home') {
            // Redirect to appropriate dashboard based on admin status
            if (isAdmin) {
                navigate('/admin');
            } else {
                navigate('/');
            }
            return;
        }

        if (item === 'Reports') {
            const deptCode = getActiveDepartmentCode();
            navigate(`/test-generation/${deptCode}`);
            return;
        }
        
        if (item !== activeTab) {
            // Note: Filters are retained if staying in Data Entry, cleared otherwise
            if (!dataEntryItems.includes(item)) {
                setDepartment('');
                setCourse('');
                setSubject('');
                setTopic('');
            }
            // Always reset encoding/editing state on tab switch
            setBloomLevel(''); 
            resetInputContent();
        }
        setActiveTab(item);
    };


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (isMathPickerOpen && !event.target.closest('.math-symbol-picker') && !event.target.closest('.rich-text-toolbar button[title="Mathematical Symbols"]')) {
                setIsMathPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMathPickerOpen]);

    // Handle department change - update URL
    const handleDepartmentChange = (deptId) => {
        const dept = departments.find(d => d.id === Number(deptId));
        if (dept) {
            navigate(`/test-encoding/${dept.code}`);
            setDepartment(deptId);
            setCourse('');
            setSubject('');
            setTopic('');
            resetInputContent();
        }
    };

    const updateActiveCommands = useCallback(() => {
        if (!activeEditableRef.current) {
            setActiveCommands({});
            return;
        }

        const newActiveCommands = {};
        
        // Style checks (bold, italic, underline)
        newActiveCommands.bold = document.queryCommandState('bold');
        newActiveCommands.italic = document.queryCommandState('italic');
        newActiveCommands.underline = document.queryCommandState('underline');
        
        // List checks
        newActiveCommands.insertunorderedlist = document.queryCommandState('insertunorderedlist');
        newActiveCommands.insertorderedlist = document.queryCommandState('insertorderedlist');

        // FormatBlock checks (Paragraph/Heading)
        const currentBlock = document.queryCommandValue('formatBlock').toUpperCase();
        newActiveCommands.H1 = currentBlock === 'H1';
        newActiveCommands.H2 = currentBlock === 'H2';
        newActiveCommands.P = currentBlock === 'P'; 

        setActiveCommands(newActiveCommands);
    }, []);

    const handleSaveRange = useCallback(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && activeEditableRef.current) {
             const range = selection.getRangeAt(0);
             if (activeEditableRef.current.contains(range.startContainer)) {
                 setSavedRange(range); 
             } else {
                 setSavedRange(null);
             }
        } else {
            setSavedRange(null);
        }
        
        updateActiveCommands(); 
    }, [updateActiveCommands]);

    const placeCaretAtEnd = (el) => {
        el.focus(); 
        const selection = window.getSelection();
        const range = document.createRange();
        
        range.selectNodeContents(el);
        range.collapse(false); 
        
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const handleFocus = (e, setter) => { 
        activeEditableRef.current = e.target;
        activeSetterRef.current = setter; 
        handleSaveRange(); 
        updateActiveCommands();
    };

    const getToolbarActiveCommands = (setter) => {
        return activeSetterRef.current === setter ? activeCommands : {};
    };

    const handleFormat = (type, command, value) => { 
        if (type === 'openPicker' && command === 'math') { 
            const element = value;
            if (element) {
                const rect = element.getBoundingClientRect();
                setMathPickerPosition({ x: rect.left, y: rect.bottom + 5 });
                setIsMathPickerOpen(true); 
            }
            return; 
        }
        
        const currentRef = activeEditableRef.current;
        if (!currentRef) { 
            alert("Click inside a content field first."); 
            return; 
        }

        const selection = window.getSelection();
        
        const wasCollapsed = savedRange ? savedRange.collapsed : selection.isCollapsed; 
        const isStyleCommand = type === 'style'; 

        if (savedRange && currentRef.contains(savedRange.startContainer)) { 
            selection.removeAllRanges(); 
            selection.addRange(savedRange); 
        }
        
        currentRef.focus(); 
        
        switch(type) {
            case 'style': 
            case 'list': 
            case 'formatBlock':
                document.execCommand(command, false, value || null); 
                break;
            case 'insert':
                if(command==='createlink'){ 
                    const url = prompt("Enter URL:"); 
                    if(url) { 
                        document.execCommand('createlink', false, url); 
                    }
                }
                break;
            case 'image':
                if(command==='insertImage'){ 
                    const url = prompt("Enter image URL:"); 
                    if(url) { 
                        document.execCommand('insertImage', false, url); 
                    }
                }
                else if(command==='editImage'){ 
                    alert("Image edit triggered."); 
                }
                break;
            default: 
                console.log(`Command ${command} not implemented.`);
        }

        let shouldUpdateState = true;
        
        if (isStyleCommand && wasCollapsed) {
             shouldUpdateState = false;
        }

        if(shouldUpdateState && activeSetterRef.current) {
            activeSetterRef.current(currentRef.innerHTML);
        }
        
        setTimeout(() => {
            
            if (isStyleCommand && wasCollapsed && !shouldUpdateState) {
                currentRef.focus();
            } else if (wasCollapsed) {
                 placeCaretAtEnd(currentRef); 
            }
            
            handleSaveRange(); 
        }, 0);
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

    const insertSymbol = (symbol) => {
        const currentRef = activeEditableRef.current;
        setIsMathPickerOpen(false);
        if (!currentRef) return;
        
        currentRef.focus();
        const selection = window.getSelection();

        let rangeToUse;
        
        const isSavedRangeValid = savedRange 
            && currentRef.contains(savedRange.startContainer)
            && savedRange.startContainer.nodeType !== Node.DOCUMENT_TYPE_NODE; 

        if (isSavedRangeValid) {
            rangeToUse = savedRange.cloneRange(); 
        } else if (selection.rangeCount > 0 && currentRef.contains(selection.getRangeAt(0).startContainer)) {
            rangeToUse = selection.getRangeAt(0).cloneRange();
        } else {
            rangeToUse = document.createRange();
            rangeToUse.selectNodeContents(currentRef);
            rangeToUse.collapse(false); 
        }

        setTimeout(() => {
            
            const currentSelection = window.getSelection();
            
            currentSelection.removeAllRanges();
            currentSelection.addRange(rangeToUse);

            const textNode = document.createTextNode(symbol);
            
            if (!rangeToUse.collapsed) { 
                rangeToUse.deleteContents(); 
            }
            
            rangeToUse.insertNode(textNode);
            
            rangeToUse.setStartAfter(textNode); 
            rangeToUse.collapse(true); 
            
            currentSelection.removeAllRanges();
            currentSelection.addRange(rangeToUse);
            
            currentRef.focus(); 

            if(activeSetterRef.current) activeSetterRef.current(currentRef.innerHTML);
            setSavedRange(rangeToUse); 
            updateActiveCommands(); 

        }, 0); 
    };


    const handleContentChange = (e, setter) => { setter(e.target.innerHTML); };
    
    // Loads question data into input fields
    const handleEditQuestion = (question) => {
        // Clear content state first
        resetInputContent(); 
        
        // Switch to the 'Test Question Encoding' tab
        handleSetActiveTab('Test Question Encoding'); 
        
        // Set the question object currently being edited
        setEditingQuestion(question); 
        
        // Map backend bloom level to grouped level
        const backendBloomLevel = question.bloomLevel || '';
        const groupedBloom = BLOOM_LEVELS.find(bl => bl.backendValues.includes(backendBloomLevel));
        setBloomLevel(groupedBloom ? groupedBloom.value : ''); 
        
        // Populate the content fields with the question data
        setQuestionText(question.content || ''); 
        
        // Extract options (A, B, C, D) from question.options array
        if (question.options && Array.isArray(question.options)) {
            const sortedOptions = question.options.sort((a, b) => a.displayOrder - b.displayOrder);
            setChoiceA(sortedOptions[0]?.content || '');
            setChoiceB(sortedOptions[1]?.content || '');
            setChoiceC(sortedOptions[2]?.content || '');
            setChoiceD(sortedOptions[3]?.content || '');
            
            // Find the correct answer (A, B, C, or D)
            const correctOption = sortedOptions.find(opt => opt.isCorrect);
            if (correctOption) {
                const correctIndex = sortedOptions.indexOf(correctOption);
                setCorrectAnswer(String.fromCharCode(65 + correctIndex)); // 65 is 'A'
            }
        }
        
        setExplanation(question.explanation || ''); 
    };
    
    // Delete question handler
    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        
        try {
            await apiService.deleteQuestion(questionId);
            setQuestions(questions.filter(q => q.id !== questionId));
            alert('Question deleted successfully!');
        } catch (err) {
            console.error('Failed to delete question:', err);
            alert('Failed to delete question. Please try again.');
        }
    };
    
    // Handles both 'Add' and 'Save Edit' with backend API
    const handleAction = async () => { 
        // 1. Validation 
        if (!topic || !bloomLevel || !questionText || !correctAnswer) { 
            alert("Fill all required fields (Topic, Bloom Level, Question Text, Answer)."); 
            return; 
        }
        if (!choiceA || !choiceB || !choiceC || !choiceD) {
            alert('All four choices (A, B, C, D) must be filled.');
            return;
        }
        if (!['A', 'B', 'C', 'D'].includes(correctAnswer.toUpperCase())) {
            alert('Correct Answer must be A, B, C, or D');
            return;
        }

        const wasEditing = !!editingQuestion;
        const correctIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3

        // Map grouped bloom level to individual backend value
        const selectedBloomGroup = BLOOM_LEVELS.find(bl => bl.value === bloomLevel);
        const backendBloomLevel = selectedBloomGroup 
            ? selectedBloomGroup.backendValues[Math.floor(Math.random() * selectedBloomGroup.backendValues.length)]
            : bloomLevel;

        // 2. Create the question payload for the backend
        const questionData = { 
            topicId: Number(topic),
            content: questionText,
            questionType: 'MultipleChoice',
            bloomLevel: backendBloomLevel, // Mapped to individual backend enum: Remember, Understand, Apply, Analyze, Evaluate, Create
            points: 1,
            displayOrder: 0,
            options: [
                { questionId: 0, content: choiceA, isCorrect: correctIndex === 0, displayOrder: 0 },
                { questionId: 0, content: choiceB, isCorrect: correctIndex === 1, displayOrder: 1 },
                { questionId: 0, content: choiceC, isCorrect: correctIndex === 2, displayOrder: 2 },
                { questionId: 0, content: choiceD, isCorrect: correctIndex === 3, displayOrder: 3 }
            ]
        };
        
        // Debug logging
        console.log('🔍 Sending question data:', JSON.stringify(questionData, null, 2));
        console.log('📋 Topic ID:', topic, 'Bloom Level:', bloomLevel);
        
        try {
            let savedQuestion;
            if (wasEditing) {
                // Update existing question
                console.log('✏️ Updating question ID:', editingQuestion.id);
                savedQuestion = await apiService.updateQuestion(editingQuestion.id, questionData);
                setQuestions(questions.map(q => q.id === editingQuestion.id ? savedQuestion : q));
                alert(`Question ID ${editingQuestion.id} updated successfully!`);
            } else {
                // Create new question
                console.log('➕ Creating new question...');
                savedQuestion = await apiService.createQuestion(questionData);
                setQuestions([...questions, savedQuestion]);
                alert('Question added successfully!');
            }
            
            console.log('✅ Saved question:', savedQuestion);
            
            // 3. Reset content fields but keep filters
            resetInputContent(); 
            
            // 4. Ensure we are in the Encoding tab to show the new history
            setActiveTab('Test Question Encoding'); 
        } catch (err) {
            console.error('❌ Failed to save question:', err);
            console.error('📄 Error response:', err.response?.data);
            console.error('📄 Error status:', err.response?.status);
            
            const errorData = err.response?.data;
            const errorMessage = errorData?.message 
                || errorData?.title 
                || err.message 
                || 'Unknown error';
            
            const errorDetails = errorData?.details 
                ? `\n\nDetails:\n${errorData.details}` 
                : '';
            
            alert(`Failed to save question:\n${errorMessage}${errorDetails}\n\nCheck console for full details.`);
        }
    };
    
    // Filter questions - all questions are already filtered by topic from useEffect
    const filteredQuestions = questions;
    const isFilterComplete = topic; // Need topic selected
    
    // Modified computeDataSummary to calculate based on Bloom levels
    const computeDataSummary = useCallback((targetQuestions) => {
        const totalQuestions = targetQuestions.length;
        const counts = { 
            'Lower': 0,  // Remember, Understand
            'Middle': 0,  // Apply, Analyze
            'Higher': 0   // Evaluate, Create
        };
        
        targetQuestions.forEach(q => {
            const level = q.bloomLevel || '';
            if (['Remember', 'Understand'].includes(level)) {
                counts['Lower']++;
            } else if (['Apply', 'Analyze'].includes(level)) {
                counts['Middle']++;
            } else if (['Evaluate', 'Create'].includes(level)) {
                counts['Higher']++;
            }
        });
        
        const getPercent = (c) => totalQuestions > 0 ? ((c / totalQuestions) * 100).toFixed(1) : 0;
        const bloomData = [
            { level: 'Lower Order (Remember/Understand)', count: counts['Lower'], achieved: getPercent(counts['Lower']), target: 30 },
            { level: 'Middle Order (Apply/Analyze)', count: counts['Middle'], achieved: getPercent(counts['Middle']), target: 30 },
            { level: 'Higher Order (Evaluate/Create)', count: counts['Higher'], achieved: getPercent(counts['Higher']), target: 40 },
        ];
        return { totalQuestions, bloomData };
    }, []);

    const summary = computeDataSummary(filteredQuestions);
    
    // Group questions by Bloom Level for display (map backend values to grouped values)
    const groupedQuestions = filteredQuestions.reduce((acc, question) => {
        const backendLevel = question.bloomLevel || 'Unknown';
        // Find which group this backend level belongs to
        const group = BLOOM_LEVELS.find(bl => bl.backendValues.includes(backendLevel));
        const groupValue = group ? group.value : 'Unknown';
        
        if (!acc[groupValue]) {
            acc[groupValue] = [];
        }
        acc[groupValue].push(question);
        return acc;
    }, {});
    
    // Sort keys based on BLOOM_LEVELS order
    const sortedBloomLevels = BLOOM_LEVELS.map(bl => bl.value).filter(level => groupedQuestions.hasOwnProperty(level));

    // Navigation helpers
    const reportItems = ["Test Generation", "Saved Exam Sets"];
    const isDataEntryActive = dataEntryItems.includes(activeTab) || activeTab === 'Data Entry';
    const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

    // -----------------

    return (
        <div className={`dashboard test-encoding ${isDarkMode?'dark':''}`}>
            <div className="background" style={{backgroundImage:`url(${UPHSL})`}} />
            {isMathPickerOpen && <MathSymbolPicker position={mathPickerPosition} onSelect={insertSymbol} onClose={()=>setIsMathPickerOpen(false)} />}
            
            <LogoutModal isOpen={isLogoutModalOpen} onClose={()=>setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />

            <div className="main-container" style={{marginTop:'2rem'}}>
                <nav className={`navbar ${isDarkMode?'dark':''}`}>
                    <div className="nav-left">
                        <button
                            onClick={() => {
                                setActiveTab('Home');
                                navigate('/');
                            }}
                            className="logo-btn"
                        >
                            <img src={TDBLogo} alt="TDB Logo" className="logo" />
                            <span className="logo-text">TEST DATABANK</span>
                        </button>
                    </div>
                    <div className="nav-center">
                        <NavItem icon={Home} label="Home" isActive={activeTab==='Home'} onClick={()=>handleSetActiveTab('Home')} />
                        <DropdownNavItem
                            icon={ClipboardList}
                            label="Data Entry"
                            isActive={isDataEntryActive}
                            dropdownItems={dataEntryItems}
                            onSelect={(item) => {
                                handleSetActiveTab(item);
                                const deptCode = getActiveDepartmentCode();
                                if (item === 'Program - Topic') {
                                    navigate(`/course-topic/${deptCode}`);
                                } else if (item === 'Test Question Encoding' || item === 'Test Question Editing') {
                                    navigate(`/test-encoding/${deptCode}`);
                                }
                            }}
                        />
                        <DropdownNavItem
                            icon={BookOpen}
                            label="Reports"
                            isActive={isReportsActive}
                            dropdownItems={reportItems}
                            onSelect={(item) => {
                                handleSetActiveTab(item);
                                const deptCode = getActiveDepartmentCode();
                                if (item === 'Test Generation') {
                                    navigate(`/test-generation/${deptCode}`);
                                } else if (item === 'Saved Exam Sets') {
                                    navigate(`/reports/saved-exams/${deptCode}`);
                                }
                            }}
                        />
                    </div>
                    <div className="nav-right" ref={userMenuRef}>
                        <button onClick={toggleDarkMode} className={`mode-switch ${isDarkMode?'dark':''}`}>
                            <div className="circle">{isDarkMode?<Moon size={16}/>:<Sun size={16}/>}</div>
                        </button>
                        <button onClick={()=>setIsUserMenuOpen(!isUserMenuOpen)} className={`user-btn ${isUserMenuOpen?'active':''}`}>
                            <div className="user-pic">{user ? user.username.charAt(0).toUpperCase() : 'U'}</div>
                            <span className="user-name">{user ? user.username : 'User'}</span>
                        </button>
                        {isUserMenuOpen && (
                            <div className="user-dropdown show">
                                <button onClick={()=>handleUserAction('User Management')}><Settings size={18}/> User Management</button>
                                <button onClick={()=>handleUserAction('Edit Account')}><User size={18}/> Edit Account</button>
                                <button className="logout-btn" onClick={()=>handleUserAction('Logout')}><LogOut size={18}/> Logout</button>
                            </div>
                        )}
                    </div>
                </nav>

                <div className={`search-bar ${isDarkMode?'dark':''}`}>
                    <Search className="search-icon" />
                    <input type="text" placeholder="Search Question/Topic..." value={searchText} onChange={e=>setSearchText(e.target.value)} className={isDarkMode?'dark':''}/>
                </div>

                <div className="main-card">
                    <HeaderTitleBlock 
                        activeTab={activeTab} 
                        isDarkMode={isDarkMode} 
                        selectedDepartment={departments.find(d => d.id === Number(department))}
                    />
                    
                    {/* ###################################################### */}
                    {/* ################## ENCODING VIEW ##################### */}
                    {/* ###################################################### */}
                    {activeTab === 'Test Question Encoding' && (
                        <>
                            {/* Selection Fields for ENCODING (Department, Course, Subject, Topic, Bloom Level) */}
                            <div className="selection-fields encoding-filter-block">
                                {/* Department */}
                                <div className="input-group">
                                    <label htmlFor="department">Department</label>
                                    <select id="department" value={department} onChange={e=>handleDepartmentChange(e.target.value)}>
                                        <option value="" disabled>Select Department</option>
                                        {departments.map(d=><option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                                    </select>
                                </div>
                                {/* Program */}
                                <div className="input-group">
                                    <label htmlFor="course">Program</label>
                                    <select id="course" value={course} onChange={e=>{setCourse(e.target.value); setSubject(''); setTopic(''); resetInputContent();}} disabled={!department || isLoadingCourses}>
                                        <option value="" disabled>{isLoadingCourses ? "Loading..." : department ? "Select Program" : "Select Department first"}</option>
                                        {courses.map(c=><option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                {/* Subject */}
                                <div className="input-group">
                                    <label htmlFor="subject">Subject</label>
                                    <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopic(''); resetInputContent();}} disabled={!course || isLoadingSubjects}>
                                        <option value="" disabled>{isLoadingSubjects ? "Loading..." : course ? "Select Subject" : "Select Program first"}</option>
                                        {subjects.map(s=><option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                {/* Topic */}
                                <div className="input-group">
                                    <label htmlFor="topic">Topic</label>
                                    <select id="topic" value={topic} onChange={e=>{setTopic(e.target.value); resetInputContent();}} disabled={!subject || isLoadingTopics}>
                                        <option value="" disabled>{isLoadingTopics ? "Loading..." : subject ? "Select Topic" : "Select Subject first"}</option>
                                        {topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                                {/* Bloom Level */}
                                <div className="input-group">
                                    <label htmlFor="bloomLevel">Bloom Level</label>
                                    <select id="bloomLevel" value={bloomLevel} onChange={e=>setBloomLevel(e.target.value)}>
                                        <option value="" disabled>Select Bloom Level</option>
                                        {BLOOM_LEVELS.map(bl=><option key={bl.id} value={bl.value}>{bl.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <hr className="section-separator" />

                            {/* Editing Notification */}
                            {editingQuestion && (
                                <div className="editing-notification">
                                    <Edit2 size={20} style={{ marginRight: '10px' }} />
                                    You are currently **EDITING** Question ID: **{editingQuestion.id}**
                                </div>
                            )}

                            {/* Data Summary - ONLY SHOW IF TOPIC IS SELECTED, and uses FILTERED data */}
                            {isFilterComplete ? (
                                <div className="data-summary-block separate-blooms-view">
                                    <h3 className="data-summary-heading">Data Summary for **{topics.find(t => t.id === Number(topic))?.title || 'Selected Topic'}**</h3> 
                                    <div className="summary-details-grid three-col-blooms">
                                        <div className="summary-card total-stats">
                                            <h4>Total Encoding Status</h4>
                                            <p>Total Questions Encoded: <span style={{fontWeight:'bold'}}>{summary.totalQuestions}</span></p>
                                            <div className="total-bar-check">Overall Coverage: <span style={{fontWeight:'bold'}}>{summary.totalQuestions>0?100:0}%</span></div>
                                        </div>
                                        {summary.bloomData.map((data,index)=>(
                                            <div key={index} className={`summary-card bloom-card color-${index+1}`}>
                                                <h4 className="bloom-card-title">{data.level}</h4>
                                                <p className="bloom-card-count"><span style={{fontWeight:'bold'}}>{data.count}</span> Questions</p>
                                                <div className="bloom-progress-info">
                                                    <span className="achieved-percent">Achieved: <span style={{fontWeight:'bold'}}>{data.achieved}%</span></span>
                                                    <span className="target-percent">Target: {data.target}%</span>
                                                </div>
                                                <div className="aesthetic-progress-bar-container compact">
                                                    <div className={`aesthetic-progress-fill color-${index+1} ${data.achieved>=data.target?'over-target':'under-target'}`} style={{width:`${Math.min(data.achieved,100)}%`}}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="filter-prompt data-summary-prompt">
                                    <p>Please select all filters (Department, Program, Subject, Topic) above to start encoding and view the current **Data Summary**.</p>
                                </div>
                            )}
                            
                            <hr className="section-separator" />

                            {/* Question Block */}
                            <div className="question-block">
                                <label><FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Question</label>
                                <RichTextToolbar 
                                    onFormat={handleFormat} 
                                    onSaveRange={handleSaveRange} 
                                    activeCommands={getToolbarActiveCommands(setQuestionText)} 
                                />
                                <div 
                                    contentEditable="true" 
                                    className={questionText?'content-editable-area':'content-editable-area placeholder-active'} 
                                    data-placeholder="Enter question text..." 
                                    onBlur={e=>handleContentChange(e,setQuestionText)} 
                                    onFocus={e=>handleFocus(e,setQuestionText)} 
                                    onKeyUp={handleSaveRange} 
                                    onMouseUp={handleSaveRange} 
                                    dangerouslySetInnerHTML={{__html:questionText}}
                                />
                            </div>

                            {/* Choices */}
                            <div className="choices-grid">
                                {['A','B','C','D'].map((ch,index)=>{
                                    const setter=[setChoiceA,setChoiceB,setChoiceC,setChoiceD][index];
                                    const content=[choiceA,choiceB,choiceC,choiceD][index];
                                    return (
                                        <div className="choice-block" key={ch}>
                                            <label>Choice {ch}</label>
                                            <RichTextToolbar 
                                                onFormat={handleFormat} 
                                                onSaveRange={handleSaveRange} 
                                                activeCommands={getToolbarActiveCommands(setter)} 
                                            />
                                            <div 
                                                contentEditable="true" 
                                                className={content?'content-editable-area':'content-editable-area placeholder-active'} 
                                                data-placeholder={`Enter choice ${ch}...`} 
                                                onBlur={e=>handleContentChange(e,setter)} 
                                                onFocus={e=>handleFocus(e,setter)} 
                                                onKeyUp={handleSaveRange}
                                                onMouseUp={handleSaveRange}
                                                dangerouslySetInnerHTML={{__html:content}}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Answer Key */}
                            <div className="answer-key-section">
                                <div className="correct-answer-field">
                                    <input type="text" placeholder="Correct Answer (A, B, C, or D)" value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value.toUpperCase())} maxLength={1}/>
                                </div>
                                <div className="answer-key-description">
                                    <RichTextToolbar 
                                        onFormat={handleFormat} 
                                        onSaveRange={handleSaveRange} 
                                        activeCommands={getToolbarActiveCommands(setExplanation)} 
                                    />
                                    <div 
                                        contentEditable="true" 
                                        className={explanation?'content-editable-area':'content-editable-area placeholder-active'} 
                                        data-placeholder="Answer Key Explanation..." 
                                        onBlur={e=>handleContentChange(e,setExplanation)} 
                                        onFocus={e=>handleFocus(e,setExplanation)} 
                                        onKeyUp={handleSaveRange}
                                        onMouseUp={handleSaveRange}
                                        dangerouslySetInnerHTML={{__html:explanation}}
                                    />
                                </div>
                            </div>
                            
                            <hr className="section-separator" />


                            {/* Action Button (Dynamic Label) */}
                            <div className="action-buttons list-actions single-button">
                                <button 
                                    className={editingQuestion ? "btn-save" : "btn-add"} 
                                    onClick={handleAction}>
                                    {editingQuestion ? <Save size={20}/> : <Plus size={20}/>} 
                                    {editingQuestion ? 'Save Changes' : 'Add Question'}
                                </button>
                            </div>
                            
                            {/* ############ HISTORY SECTION ############ */}
                            {isFilterComplete && sortedBloomLevels.length > 0 && (
                                <div className="history-section">
                                    <hr className="section-separator" />
                                    <h3 className="editing-list-heading history-heading">
                                        Recently Encoded Questions for **{topics.find(t => t.id === Number(topic))?.title || 'Selected Topic'}**
                                    </h3>
                                    
                                    {/* Loop through sorted Bloom levels (groups) */}
                                    {sortedBloomLevels.map(level => {
                                        const levelLabel = BLOOM_LEVELS.find(bl => bl.value === level)?.label || level;
                                        return (
                                            <div key={level} className="question-group-section">
                                                <h4 className="question-type-subheader type-display-box">{levelLabel} <span className="question-count">({groupedQuestions[level].length} questions)</span></h4>
                                                
                                                <div className="question-editing-list">
                                                    <div className="history-table-container">
                                                        <table className="history-table">
                                                            <thead>
                                                                <tr><th>#</th><th>Question</th><th>Actions</th></tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupedQuestions[level].map((q, idx) => {
                                                                    const correctOption = q.options?.find(opt => opt.isCorrect);
                                                                    const correctIndex = q.options?.indexOf(correctOption);
                                                                    const correctLetter = correctIndex !== undefined ? String.fromCharCode(65 + correctIndex) : '?';
                                                                    
                                                                    return (
                                                                        <tr key={q.id}>
                                                                            <td>{idx + 1}</td>
                                                                            <td>
                                                                                <div>{(q.content || '').replace(/<[^>]*>?/gm, '').substring(0, 70)}...</div>
                                                                                <small style={{color: '#666'}}>Answer: {correctLetter}</small>
                                                                            </td>
                                                                            <td className="actions-cell">
                                                                                <button 
                                                                                    className="action-edit" 
                                                                                    title="Edit" 
                                                                                    onClick={() => handleEditQuestion(q)}>
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                                <button className="action-delete" title="Delete" onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={16} /></button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {/* ########## END HISTORY SECTION ########## */}

                        </>
                    )}

                    {/* ###################################################### */}
                    {/* ################### EDITING VIEW ##################### */}
                    {/* ###################################################### */}
                    {activeTab === 'Test Question Editing' && (
                        <div className="editing-view-container">
                            {/* Selection Fields for FILTERING (Department, Course, Subject, Topic) */}
                            <div className="selection-fields two-col-filter filter-block-top">
                                <div className="input-group">
                                    <label htmlFor="department">Department</label>
                                    <select id="department" value={department} onChange={e=>handleDepartmentChange(e.target.value)}>
                                        <option value="" disabled>Select Department</option>
                                        {departments.map(d=><option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="course">Program</label>
                                    <select id="course" value={course} onChange={e=>{setCourse(e.target.value); setSubject(''); setTopic(''); resetInputContent();}} disabled={!department || isLoadingCourses}>
                                        <option value="" disabled>{isLoadingCourses ? "Loading..." : department ? "Select Program" : "Select Department first"}</option>
                                        {courses.map(c=><option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="subject">Subject</label>
                                    <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopic(''); resetInputContent();}} disabled={!course || isLoadingSubjects}>
                                        <option value="" disabled>{isLoadingSubjects ? "Loading..." : course ? "Select Subject" : "Select Program first"}</option>
                                        {subjects.map(s=><option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="topic">Topic</label>
                                    <select id="topic" value={topic} onChange={e=>{setTopic(e.target.value); resetInputContent();}} disabled={!subject || isLoadingTopics}>
                                        <option value="" disabled>{isLoadingTopics ? "Loading..." : subject ? "Select Topic" : "Select Subject first"}</option>
                                        {topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <hr className="section-separator" />
                            
                            {isFilterComplete ? (
                                // --- STAGE 2: Filter is complete, show the grouped list ---
                                <>
                                    {/* Filter Display Box */}
                                    <h3 className="editing-list-heading filter-display-box">
                                        Questions Encoded for: **{topics.find(t => t.id === Number(topic))?.title || 'Selected Topic'}**
                                    </h3>
                                    
                                    {isLoadingQuestions ? (
                                        <div className="filter-prompt">
                                            <p>Loading questions...</p>
                                        </div>
                                    ) : sortedBloomLevels.length === 0 ? (
                                        <div className="filter-prompt no-questions no-data">
                                            <p>No questions found for the selected Topic.</p>
                                        </div>
                                    ) : (
                                        // Loop through sorted Bloom levels (groups)
                                        sortedBloomLevels.map(level => {
                                            const levelLabel = BLOOM_LEVELS.find(bl => bl.value === level)?.label || level;
                                            return (
                                                <div key={level} className="question-group-section">
                                                    {/* Bloom Level Display Box */}
                                                    <h4 className="question-type-subheader type-display-box">{levelLabel} <span className="question-count">({groupedQuestions[level].length} questions)</span></h4>
                                                    
                                                    <div className="question-editing-list">
                                                        <div className="history-table-container">
                                                            <table className="history-table">
                                                                <thead>
                                                                    <tr><th>#</th><th>Question</th><th>Actions</th></tr>
                                                                </thead>
                                                                <tbody>
                                                                    {groupedQuestions[level].map((q, idx) => {
                                                                        const correctOption = q.options?.find(opt => opt.isCorrect);
                                                                        const correctIndex = q.options?.indexOf(correctOption);
                                                                        const correctLetter = correctIndex !== undefined ? String.fromCharCode(65 + correctIndex) : '?';
                                                                        
                                                                        return (
                                                                            <tr key={q.id}>
                                                                                <td>{idx + 1}</td>
                                                                                <td>
                                                                                    <div>{(q.content || '').replace(/<[^>]*>?/gm, '').substring(0, 70)}...</div>
                                                                                    <small style={{color: '#666'}}>Answer: {correctLetter}</small>
                                                                                </td>
                                                                                <td className="actions-cell">
                                                                                    <button 
                                                                                        className="action-edit" 
                                                                                        title="Edit" 
                                                                                        onClick={() => handleEditQuestion(q)}>
                                                                                        <Edit2 size={16} />
                                                                                    </button>
                                                                                    <button className="action-delete" title="Delete" onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={16} /></button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            ) : (
                                // --- STAGE 1: Filter is incomplete, show a prompt ---
                                <div className="filter-prompt">
                                    <p>Please select all filters (Department, Program, Subject, Topic) above to view and edit questions.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div> 
            </div> 
        </div> 
    );
};

export default TestEncodingAndEditing;