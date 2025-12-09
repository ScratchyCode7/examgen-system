// Changes made (Dec 9, 2025):
// - Use `useAuth` to display the correct logged-in username and perform logout.
// - Make Home navigation admin-aware (redirects to /admin for admins).
// - Use ThemeContext for persistent dark mode.
// - Various UX fixes to rich-text and selection handling.
// See README for full details.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import '../styles/TestEncodingAndEditing.css';

// Mock Assets (Replace with your actual paths)
import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png';
import CCS from '../assets/CCS.png'; 

// --- MOCK DATA / STATIC CONFIG ---
const dataEntryItems = ["Course - Topic", "Test Question Encoding", "Test Question Editing"];

const MOCK_SUBJECTS = [
    { code: "CS", name: "Computer Science" },
    { code: "IT", name: "Information Technology" },
    { code: "EMC", name: "Entertainment and Multimedia Computing" }
];

const MOCK_TOPICS = [
    { id: 1, topic: "Data Structures and Algorithms", subjectCode: "CS" },
    { id: 2, topic: "Database Management Systems", subjectCode: "CS" },
    { id: 3, topic: "Web Development Fundamentals (HTML/CSS)", subjectCode: "IT" },
    { id: 4, topic: "Networking Protocols (TCP/IP)", subjectCode: "IT" },
    { id: 5, topic: "Game Design Principles", subjectCode: "EMC" },
];

const MOCK_QUESTION_TYPES = [
    "Remembering and Understanding",
    "Applying and Analyzing",
    "Evaluation and Creating"
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
const HeaderTitleBlock = ({ activeTab, isDarkMode }) => (
    <div className="header-section">
        <h1 className="page-title">{activeTab}</h1> 
        <hr className="header-separator-line" /> 
        <div className={`college-title-block centered-only ${isDarkMode ? 'dark' : ''}`}>
            <img src={CCS} alt="CCS Logo" className="dept-logo" /> 
            <span className="college-text">College of Computer Studies</span>
        </div>
        <hr className="header-separator-line" />
    </div>
);
// -----------------


// --- Main Component ---
const TestEncodingAndEditing = () => {
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Test Question Encoding');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const userMenuRef = useRef(null);

    const [subject, setSubject] = useState("");
    const [topicDescription, setTopicDescription] = useState("");
    // questionType is kept for encoding the type of a NEW/EDITED question
    const [questionType, setQuestionType] = useState(""); 

    // State for Rich Text Editor
    const [isMathPickerOpen, setIsMathPickerOpen] = useState(false);
    const [mathPickerPosition, setMathPickerPosition] = useState(null);
    const activeEditableRef = useRef(null); 
    const activeSetterRef = useRef(null); 
    const [savedRange, setSavedRange] = useState(null); // The critical saved selection range
    const [activeCommands, setActiveCommands] = useState({}); // State for TOOLBAR HIGHLIGHTING

    const [searchText, setSearchText] = useState("");
    
    // Initial dummy data for testing the Editing view
    const [questions, setQuestions] = useState([
        { id: 1, text: 'What is the runtime complexity of binary search?', choiceA:'O(n)', choiceB:'O(log n)', choiceC:'O(n^2)', choiceD:'O(1)', correctAnswer:'B', explanation:'Binary search halves the input size in each step.', subject: 'CS', topic: 'Data Structures and Algorithms', type: 'Applying and Analyzing' },
        { id: 2, text: 'Which tag is used for an unordered list in HTML?', choiceA:'<ulb>', choiceB:'<ol>', choiceC:'<ul>', choiceD:'<list>', correctAnswer:'C', explanation:'<ul> stands for unordered list.', subject: 'IT', 'topic': 'Web Development Fundamentals (HTML/CSS)', type: 'Remembering and Understanding' },
        { id: 3, text: 'Find the value of $x$ in $x+5=10$.', choiceA:'3', choiceB:'5', choiceC:'7', choiceD:'9', correctAnswer:'B', explanation:'Simple algebra, $x=10-5$.', subject: 'CS', topic: 'Database Management Systems', type: 'Remembering and Understanding' },
        { id: 4, text: 'Design an efficient database schema for a library management system.', choiceA:'Flat file', choiceB:'Relational model', choiceC:'Hierarchical model', choiceD:'Network model', correctAnswer:'B', explanation:'Relational model is best for structured data like library systems.', subject: 'CS', topic: 'Database Management Systems', type: 'Evaluation and Creating' },
    ]);
    
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

    // --- REFACTORED RESET FUNCTIONS ---
    const resetInputContent = useCallback(() => {
        setQuestionText(''); 
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setExplanation('');
        setCorrectAnswer(''); 
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
        
        if (item !== activeTab) {
            // Note: Filters (subject/topic) are retained if user clicks 'Add Question'
            // but are cleared when switching to a different section (e.g., Reports, Home)
            // or if the tab requires clean state (like the previous Encoding/Editing refactoring).
            // For now, let's keep the filter reset logic simple on tab switch:
            if (!dataEntryItems.includes(item)) {
                setSubject('');
                setTopicDescription('');
            }
            // Always reset encoding/editing state on tab switch
            setQuestionType(''); 
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
        // Preserve current filter values
        const currentSubject = question.subject;
        const currentTopic = question.topic;

        // Clear content state first to prevent brief flicker/mixup
        resetInputContent(); 
        
        // FIX: Switch to the 'Test Question Encoding' tab, as this contains the actual
        // input form for modifying the question content.
        handleSetActiveTab('Test Question Encoding'); 
        
        // Set the question object currently being edited
        setEditingQuestion(question); 
        
        // Populate the filter/type fields for the Encoding View
        setSubject(currentSubject);
        setTopicDescription(currentTopic);
        setQuestionType(question.type); // Set cognitive level for the input field
        
        // Populate the content fields with the question data
        setQuestionText(question.text); 
        setChoiceA(question.choiceA); 
        setChoiceB(question.choiceB); 
        setChoiceC(question.choiceC); 
        setChoiceD(question.choiceD); 
        setCorrectAnswer(question.correctAnswer); 
        setExplanation(question.explanation); 
    };
    
    // Handles both 'Add' and 'Save Edit' while preserving filters for history.
    const handleAction = () => { 
        // 1. Validation 
        if (!subject || !topicDescription || !questionType || !questionText || !correctAnswer) { 
            alert("Fill all required fields (Subject, Topic, Question Type, Question Text, Answer)."); 
            return; 
        }

        // Preserve current filter values
        const currentSubject = subject;
        const currentTopic = topicDescription;
        const currentType = questionType;
        const wasEditing = !!editingQuestion; 

        // 2. Create the new question object / Updated object
        const newQ = { 
            text: questionText, 
            choiceA, 
            choiceB, 
            choiceC, 
            choiceD, 
            correctAnswer, 
            explanation, 
            subject: currentSubject, 
            topic: currentTopic,     
            type: currentType, 
            id: editingQuestion ? editingQuestion.id : Date.now() 
        };
        
        let updatedQuestions;
        let alertMessage;

        if (wasEditing) {
            updatedQuestions = questions.map(q => 
                q.id === editingQuestion.id ? newQ : q
            );
            alertMessage = `Question ID ${editingQuestion.id} saved successfully!`;
        } else {
            updatedQuestions = [...questions, newQ];
            alertMessage = `Question added successfully!`;
        }

        setQuestions(updatedQuestions);
        
        // 3. Reset ONLY the content fields and editing status
        resetInputContent(); 
        
        // 4. Restore preserved filters (Subject, Topic, Type)
        setSubject(currentSubject);
        setTopicDescription(currentTopic);
        setQuestionType(currentType); 
        
        // 5. Ensure we are in the Encoding tab to show the new history
        setActiveTab('Test Question Encoding'); 
        
        alert(alertMessage);
    };
    
    // Filtering based ONLY on Subject and Topic
    const getFilteredQuestions = useCallback(() => {
        if (!subject || !topicDescription) {
            return []; 
        }
        
        return questions.filter(q => 
            q.subject === subject &&
            q.topic === topicDescription
        );
    }, [questions, subject, topicDescription]);

    const filteredQuestions = getFilteredQuestions();
    const isFilterComplete = subject && topicDescription; // Only need Subject and Topic
    
    // Modified computeDataSummary to calculate based on the provided array (filteredQuestions)
    const computeDataSummary = useCallback((targetQuestions) => {
        const totalQuestions = targetQuestions.length;
        const counts = { 'Remembering and Understanding':0, 'Applying and Analyzing':0, 'Evaluation and Creating':0 };
        
        targetQuestions.forEach(q=>{ 
            if(counts.hasOwnProperty(q.type)) counts[q.type]++; 
        });
        
        const getPercent = (c)=>totalQuestions>0?((c/totalQuestions)*100).toFixed(1):0;
        const bloomData = [
            {level:'Remembering and Understanding', count:counts['Remembering and Understanding'], achieved:getPercent(counts['Remembering and Understanding']), target:30},
            {level:'Applying and Analyzing', count:counts['Applying and Analyzing'], achieved:getPercent(counts['Applying and Analyzing']), target:30},
            {level:'Evaluation and Creating', count:counts['Evaluation and Creating'], achieved:getPercent(counts['Evaluation and Creating']), target:40},
        ];
        return { totalQuestions, bloomData };
    }, []);

    const summary = computeDataSummary(filteredQuestions);
    
    // Group questions by Type for display
    const groupedQuestions = filteredQuestions.reduce((acc, question) => {
        const type = question.type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(question);
        return acc;
    }, {});
    
    // Sort keys based on MOCK_QUESTION_TYPES order
    const sortedQuestionTypes = MOCK_QUESTION_TYPES.filter(type => groupedQuestions.hasOwnProperty(type));


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
                            isActive={dataEntryItems.includes(activeTab)}
                            dropdownItems={dataEntryItems}
                            onSelect={(item) => {
                                handleSetActiveTab(item);
                                if (item === 'Course - Topic') {
                                    navigate('/course-topic');
                                } else if (item === 'Test Question Encoding' || item === 'Test Question Editing') {
                                    navigate('/test-encoding');
                                }
                            }}
                        />
                        <NavItem icon={BookOpen} label="Reports" isActive={activeTab==='Reports'} onClick={()=>handleSetActiveTab('Reports')} />
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
                    <HeaderTitleBlock activeTab={activeTab} isDarkMode={isDarkMode} />
                    
                    {/* ###################################################### */}
                    {/* ################## ENCODING VIEW ##################### */}
                    {/* ###################################################### */}
                    {activeTab === 'Test Question Encoding' && (
                        <>
                            {/* 🚀 1. 3-COLUMN SELECTION FIELDS for ENCODING (Subject, Topic, Type) 🚀 */}
                            <div className="selection-fields encoding-filter-block">
                                {/* Subject */}
                                <div className="input-group">
                                    <label htmlFor="subject">Subject</label>
                                    <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopicDescription(''); resetInputContent();}}>
                                        <option value="" disabled>Select Subject Code</option>
                                        {MOCK_SUBJECTS.map(s=><option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                {/* Topic Description */}
                                <div className="input-group">
                                    <label htmlFor="topicDesc">Topic Description</label>
                                    <select id="topicDesc" value={topicDescription} onChange={e=>{setTopicDescription(e.target.value); resetInputContent();}} disabled={!subject}>
                                        <option value="" disabled>{subject?"Select Topic from list":"Select Subject first"}</option>
                                        {MOCK_TOPICS.filter(t=>t.subjectCode===subject).map(t=><option key={t.id} value={t.topic}>{t.topic}</option>)}
                                    </select>
                                </div>
                                {/* Type of Question (Cognitive Level) - Now in the 3-column grid for clarity */}
                                <div className="input-group">
                                    <label htmlFor="questionType">Type of Question (Cognitive Level)</label>
                                    <select id="questionType" value={questionType} onChange={e=>setQuestionType(e.target.value)}>
                                        <option value="" disabled>Select Cognitive Level</option>
                                        {MOCK_QUESTION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <hr className="section-separator" /> {/* Separator after the 3-column selector */}

                            {/* Editing Notification */}
                            {editingQuestion && (
                                <div className="editing-notification">
                                    <Edit2 size={20} style={{ marginRight: '10px' }} />
                                    You are currently **EDITING** Question ID: **{editingQuestion.id}** for **{subject}** - **{topicDescription}** ({questionType}).
                                </div>
                            )}

                            {/* Data Summary - ONLY SHOW IF SUBJECT AND TOPIC ARE SELECTED, and uses FILTERED data */}
                            {isFilterComplete ? (
                                <div className="data-summary-block separate-blooms-view">
                                    <h3 className="data-summary-heading">Data Summary for **{topicDescription}**</h3> 
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
                                    <p>Please select a **Subject** and **Topic Description** above to start encoding and view the current **Data Summary**.</p>
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
                            {isFilterComplete && sortedQuestionTypes.length > 0 && (
                                <div className="history-section">
                                    <hr className="section-separator" />
                                    <h3 className="editing-list-heading history-heading">
                                        Recently Encoded Questions for **{subject}** - **{topicDescription}**
                                    </h3>
                                    
                                    {/* Loop through sorted question types (groups) */}
                                    {sortedQuestionTypes.map(type => (
                                        <div key={type} className="question-group-section">
                                            <h4 className="question-type-subheader type-display-box">{type} <span className="question-count">({groupedQuestions[type].length} questions)</span></h4>
                                            
                                            <div className="question-editing-list">
                                                <div className="history-table-container">
                                                    <table className="history-table">
                                                        <thead>
                                                            <tr><th>#</th><th>Question</th><th>Answer</th><th>Actions</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {groupedQuestions[type].map((q, idx) => (
                                                                <tr key={q.id}>
                                                                    <td>{idx + 1}</td>
                                                                    <td>{q.text.replace(/<[^>]*>?/gm, '').substring(0, 70) + '...'}</td>
                                                                    <td className="answer-cell">{q.correctAnswer}</td>
                                                                    <td className="actions-cell">
                                                                        <button 
                                                                            className="action-edit" 
                                                                            title="Edit" 
                                                                            onClick={() => handleEditQuestion(q)}>
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button className="action-delete" title="Delete" onClick={() => alert(`Delete QID: ${q.id}`)}><Trash2 size={16} /></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                            {/* 🎯 2. 2-COLUMN SELECTION FIELDS for FILTERING (Subject, Topic ONLY) 🎯 */}
                            <div className="selection-fields two-col-filter filter-block-top">
                                <div className="input-group">
                                    <label htmlFor="subject">Subject</label>
                                    <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopicDescription(''); resetInputContent();}}>
                                        <option value="" disabled>Select Subject Code</option>
                                        {MOCK_SUBJECTS.map(s=><option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="topicDesc">Topic Description</label>
                                    <select id="topicDesc" value={topicDescription} onChange={e=>{setTopicDescription(e.target.value); resetInputContent();}} disabled={!subject}>
                                        <option value="" disabled>{subject?"Select Topic from list":"Select Subject first"}</option>
                                        {MOCK_TOPICS.filter(t=>t.subjectCode===subject).map(t=><option key={t.id} value={t.topic}>{t.topic}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <hr className="section-separator" /> {/* Separator after the 2-column filter */}
                            
                            {isFilterComplete ? (
                                // --- STAGE 2: Filter is complete, show the grouped list ---
                                <>
                                    {/* Filter Display Box */}
                                    <h3 className="editing-list-heading filter-display-box">
                                        Questions Encoded for: **{subject}** - **{topicDescription}**
                                    </h3>
                                    
                                    {sortedQuestionTypes.length === 0 ? (
                                        <div className="filter-prompt no-questions no-data">
                                            <p>No questions found for the selected Subject and Topic Description.</p>
                                        </div>
                                    ) : (
                                        // Loop through sorted question types (groups)
                                        sortedQuestionTypes.map(type => (
                                            <div key={type} className="question-group-section">
                                                {/* Type Display Box (Used for visual grouping) */}
                                                <h4 className="question-type-subheader type-display-box">{type} <span className="question-count">({groupedQuestions[type].length} questions)</span></h4>
                                                
                                                <div className="question-editing-list">
                                                    <div className="history-table-container">
                                                        <table className="history-table">
                                                            <thead>
                                                                <tr><th>#</th><th>Question</th><th>Answer</th><th>Actions</th></tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupedQuestions[type].map((q, idx) => (
                                                                    <tr key={q.id}>
                                                                        <td>{idx + 1}</td>
                                                                        <td>{q.text.replace(/<[^>]*>?/gm, '').substring(0, 70) + '...'}</td>
                                                                        <td className="answer-cell">{q.correctAnswer}</td>
                                                                        <td className="actions-cell">
                                                                            <button 
                                                                                className="action-edit" 
                                                                                title="Edit" 
                                                                                onClick={() => handleEditQuestion(q)}>
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button className="action-delete" title="Delete" onClick={() => alert(`Delete QID: ${q.id}`)}><Trash2 size={16} /></button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            ) : (
                                // --- STAGE 1: Filter is incomplete, show a prompt ---
                                <div className="filter-prompt">
                                    <p>Please select a **Subject** and **Topic Description** above to view and edit questions.</p>
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