// Refactored to integrate with backend API
// - Added department, course, and subject dropdowns
// - Replaced mock data with real API calls
// - Implemented save/update/delete functionality with backend
// - Uses Bloom's taxonomy levels from backend
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
    Home, ClipboardList, BookOpen, Settings, LogOut, User, Users, Sun, Moon, Search, 
    FileText, Plus, Edit2, Trash2, Save, HelpCircle,
    Bold, Italic, Underline, Link, List, ListOrdered, Sigma, Image, Edit, 
    Heading1, Heading2,
} from 'lucide-react';
import NavItem from '../components/NavItem';
import DropdownNavItem from '../components/DropdownNavItem';
import BM25QuestionSearch from '../components/BM25QuestionSearch';
import LogoutModal from '../components/LogoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TransferOwnershipModal from '../components/TransferOwnershipModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { usePrintRequestNotifications } from '../contexts/PrintRequestNotificationContext';
import { apiService } from '../services/api';
import DEPARTMENT_LOGOS from '../constants/departmentLogos';
import { HELP_CENTER_URL } from '../constants/helpLinks';
import { getUserDisplayName, getUserProfileImageUrl } from '../utils/userDisplay';
import '../styles/TestEncodingAndEditing.css';

// Assets
import TDBLogo from '../assets/TDB logo.png';
import UPHSL from '../assets/uphsl.png'; 

// --- STATIC CONFIG ---
const dataEntryItems = ["Program - Topic", "Test Encoding", "Test Question Editing"];
const dataEntryTabs = [...dataEntryItems, "Test Question Encoding"];

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

const IMAGE_EDITOR_DEFAULTS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    rotate: 0,
    imageSize: 50,
    alignment: 'Center',
};

const IMAGE_EDITOR_DEFAULT_CROP = {
    x: 12,
    y: 12,
    width: 76,
    height: 76,
};

const normalizePlainText = (value, { trimEdges = false } = {}) => {
    const normalized = (value || '')
        .normalize('NFKC')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

    return trimEdges ? normalized.trim() : normalized;
};

const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
    'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
    'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ',
    'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
    'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ',
    'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ'
};

const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ'
};

const toSuperscript = (value) => String(value)
    .split('')
    .map((char) => SUPERSCRIPT_MAP[char] || char)
    .join('');

const toSubscript = (value) => String(value)
    .split('')
    .map((char) => SUBSCRIPT_MAP[char] || char)
    .join('');

const applyOverline = (value) => String(value || '')
    .split('')
    .map((char) => (/\s/.test(char) ? char : `${char}\u0305`))
    .join('');

const readBraceContent = (value, openBraceIndex) => {
    if (!value || value[openBraceIndex] !== '{') {
        return null;
    }

    let depth = 0;
    for (let i = openBraceIndex; i < value.length; i += 1) {
        if (value[i] === '{') {
            depth += 1;
        } else if (value[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return {
                    content: value.slice(openBraceIndex + 1, i),
                    nextIndex: i + 1,
                };
            }
        }
    }

    return null;
};

const applySuperSubscripts = (value) => String(value)
    .replace(/\^\{([^}]+)\}/g, (_, content) => toSuperscript(content))
    .replace(/\^([^\s{}])/g, (_, content) => toSuperscript(content))
    .replace(/_\{([^}]+)\}/g, (_, content) => toSubscript(content))
    .replace(/_([^\s{}])/g, (_, content) => toSubscript(content));

const replaceSqrtExpressions = (value, converter) => {
    let output = String(value || '');
    let searchIndex = 0;

    while (searchIndex < output.length) {
        const sqrtIndex = output.indexOf('\\sqrt', searchIndex);
        if (sqrtIndex === -1) {
            break;
        }

        let groupStart = sqrtIndex + '\\sqrt'.length;
        while (groupStart < output.length && /\s/.test(output[groupStart])) {
            groupStart += 1;
        }

        const radicand = readBraceContent(output, groupStart);
        if (!radicand) {
            searchIndex = sqrtIndex + '\\sqrt'.length;
            continue;
        }

        const convertedRadicand = converter(radicand.content).trim();
        const wrappedRadicand = convertedRadicand.startsWith('(') && convertedRadicand.endsWith(')')
            ? convertedRadicand
            : `(${convertedRadicand})`;
        output = `${output.slice(0, sqrtIndex)}√${wrappedRadicand}${output.slice(radicand.nextIndex)}`;
        searchIndex = sqrtIndex + wrappedRadicand.length + 1;
    }

    return output;
};

const replaceFractionExpressions = (value, converter) => {
    let output = String(value || '');
    let searchIndex = 0;

    while (searchIndex < output.length) {
        const fracIndex = output.indexOf('\\frac', searchIndex);
        if (fracIndex === -1) {
            break;
        }

        let numeratorStart = fracIndex + '\\frac'.length;
        while (numeratorStart < output.length && /\s/.test(output[numeratorStart])) {
            numeratorStart += 1;
        }

        const numeratorGroup = readBraceContent(output, numeratorStart);
        if (!numeratorGroup) {
            searchIndex = fracIndex + '\\frac'.length;
            continue;
        }

        let denominatorStart = numeratorGroup.nextIndex;
        while (denominatorStart < output.length && /\s/.test(output[denominatorStart])) {
            denominatorStart += 1;
        }

        const denominatorGroup = readBraceContent(output, denominatorStart);
        if (!denominatorGroup) {
            searchIndex = numeratorGroup.nextIndex;
            continue;
        }

        const numerator = converter(numeratorGroup.content);
        const denominator = converter(denominatorGroup.content);
        const replacement = `(${numerator})/(${denominator})`;

        output = `${output.slice(0, fracIndex)}${replacement}${output.slice(denominatorGroup.nextIndex)}`;
        searchIndex = fracIndex + replacement.length;
    }

    return output;
};

const replaceOverlineExpressions = (value, converter) => {
    let output = String(value || '');
    let searchIndex = 0;

    while (searchIndex < output.length) {
        const overlineIndex = output.indexOf('\\overline', searchIndex);
        const barIndex = output.indexOf('\\bar', searchIndex);

        let commandIndex = -1;
        let commandLength = 0;

        if (overlineIndex !== -1 && (barIndex === -1 || overlineIndex < barIndex)) {
            commandIndex = overlineIndex;
            commandLength = '\\overline'.length;
        } else if (barIndex !== -1) {
            commandIndex = barIndex;
            commandLength = '\\bar'.length;
        }

        if (commandIndex === -1) {
            break;
        }

        let operandStart = commandIndex + commandLength;
        while (operandStart < output.length && /\s/.test(output[operandStart])) {
            operandStart += 1;
        }

        let converted = '';
        let nextIndex = operandStart;

        const group = readBraceContent(output, operandStart);
        if (group) {
            converted = applyOverline(converter(group.content));
            nextIndex = group.nextIndex;
        } else if (operandStart < output.length) {
            converted = applyOverline(output[operandStart]);
            nextIndex = operandStart + 1;
        } else {
            searchIndex = commandIndex + commandLength;
            continue;
        }

        output = `${output.slice(0, commandIndex)}${converted}${output.slice(nextIndex)}`;
        searchIndex = commandIndex + converted.length;
    }

    return output;
};

const convertSimpleLatexMath = (expression) => {
    if (!expression) {
        return '';
    }

    const convertRecursively = (input) => {
        let output = String(input || '');

        output = output
            .replace(/\\left/g, '')
            .replace(/\\right/g, '')
            .replace(/\\text\{([^}]*)\}/g, '$1')
            .replace(/\\mathrm\{([^}]*)\}/g, '$1')
            .replace(/\\operatorname\{([^}]*)\}/g, '$1')
            .replace(/\\cdot/g, '·')
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\cup/g, '∪')
            .replace(/\\cap/g, '∩')
            .replace(/\\pm/g, '±')
            .replace(/\\neq/g, '≠')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\approx/g, '≈')
            .replace(/\\infty/g, '∞')
            .replace(/\\sum/g, 'Σ')
            .replace(/\\prod/g, '∏')
            .replace(/\\int/g, '∫')
            .replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\mu/g, 'μ')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\Delta/g, 'Δ')
            .replace(/\\Sigma/g, 'Σ');

        output = replaceSqrtExpressions(output, convertRecursively);
        output = replaceFractionExpressions(output, convertRecursively);
        output = replaceOverlineExpressions(output, convertRecursively);
        output = applySuperSubscripts(output);

        output = output
            .replace(/\$+/g, '')
            .replace(/[{}]/g, '')
            .replace(/\\/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        return output;
    };

    return convertRecursively(expression);
};

const looksLikeLatexMath = (text) => {
    const value = String(text || '');
    return /\\[a-zA-Z]+/.test(value) || /\^\{[^}]+\}|_\{[^}]+\}|\^[^\s{}]|_[^\s{}]/.test(value);
};

const convertLatexMathFromPaste = (text) => {
    const source = normalizePlainText(text || '');
    let outputHtml = '';
    let lastIndex = 0;
    let foundDelimitedToken = false;

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const plainTextToHtml = (value) => escapeHtml(value).replace(/\n/g, '<br>');

    const renderLatexExpressionToHtml = (expression, displayMode) => {
        try {
            return katex.renderToString(expression, {
                throwOnError: false,
                strict: 'ignore',
                displayMode,
            });
        } catch {
            return plainTextToHtml(convertSimpleLatexMath(expression));
        }
    };

    const latexDelimitedTokenRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g;

    source.replace(latexDelimitedTokenRegex, (token, _unused, offset) => {
        const tokenStart = Number(offset);
        if (tokenStart > lastIndex) {
            outputHtml += plainTextToHtml(source.slice(lastIndex, tokenStart));
        }

        let expression = token;
        let displayMode = false;

        if (token.startsWith('$$') && token.endsWith('$$')) {
            expression = token.slice(2, -2);
            displayMode = true;
        } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
            expression = token.slice(2, -2);
            displayMode = true;
        } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
            expression = token.slice(2, -2);
        } else if (token.startsWith('$') && token.endsWith('$')) {
            expression = token.slice(1, -1);
        }

        outputHtml += renderLatexExpressionToHtml(expression, displayMode);
        foundDelimitedToken = true;
        lastIndex = tokenStart + token.length;
        return token;
    });

    if (lastIndex < source.length) {
        outputHtml += plainTextToHtml(source.slice(lastIndex));
    }

    if (foundDelimitedToken) {
        return outputHtml;
    }

    if (looksLikeLatexMath(source)) {
        return renderLatexExpressionToHtml(source, true);
    }

    return plainTextToHtml(source);
};

const htmlToPlainText = (value) => {
    if (!value) return '';

    const withLineBreaks = value
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/(div|p|li|h1|h2|h3|h4|h5|h6)>/gi, '\n');

    const stripped = withLineBreaks.replace(/<[^>]*>/g, '');
    const decoder = typeof window !== 'undefined' ? document.createElement('textarea') : null;
    if (!decoder) {
        return normalizePlainText(stripped);
    }

    decoder.innerHTML = stripped;
    return normalizePlainText(decoder.value);
};

const normalizeQuestionDuplicateKey = (value) => normalizePlainText(htmlToPlainText(value), { trimEdges: true })
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const hasImageTag = (value) => /<img\s/i.test(value || '');

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

const resolveGroupedBloomValue = (incomingBloomLevel) => {
    if (!incomingBloomLevel) return '';

    const numericBloom = Number(incomingBloomLevel);
    if (Number.isFinite(numericBloom) && numericBloom >= 1 && numericBloom <= 6) {
        const byNumeric = {
            1: 'Remember',
            2: 'Understand',
            3: 'Apply',
            4: 'Analyze',
            5: 'Evaluate',
            6: 'Create',
        };
        const backendName = byNumeric[Math.trunc(numericBloom)];
        const groupedFromNumeric = BLOOM_LEVELS.find((item) =>
            item.backendValues.some((backendValue) => backendValue.toLowerCase() === backendName.toLowerCase())
        );
        if (groupedFromNumeric) return groupedFromNumeric.value;
    }

    const normalized = String(incomingBloomLevel).trim().toLowerCase();
    if (!normalized) return '';

    const directGroup = BLOOM_LEVELS.find((item) => item.value.toLowerCase() === normalized);
    if (directGroup) return directGroup.value;

    const byBackendValue = BLOOM_LEVELS.find((item) =>
        item.backendValues.some((backendValue) => backendValue.toLowerCase() === normalized)
    );

    return byBackendValue ? byBackendValue.value : '';
};
// -----------------


// --- RichTextToolbar Component ---
const RichTextToolbar = ({ onFormat, onSaveRange, activeCommands, onImageEdit }) => {
    
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
        } else if (formatType === 'image' && command === 'editImage' && typeof onImageEdit === 'function') {
            onImageEdit();
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
const HeaderTitleBlock = ({ activeTab, isDarkMode, departments, selectedDepartmentCode, onDepartmentChange }) => {
    const visibleDepartments = departments
        .filter((dept) => (dept.code || '').toUpperCase() !== 'ITS');
    const isScrollable = visibleDepartments.length > 5;

    return (
        <div className="header-section">
            <h1 className="page-title">{activeTab}</h1> 
            <hr className="header-separator-line" /> 
            <div className={`college-title-block centered-only ${isDarkMode ? 'dark' : ''}`}>
                <div className={`program-grid department-selector-grid${isScrollable ? ' is-scrollable' : ''}`}>
                    {visibleDepartments
                        .map((dept) => {
                        const logo = dept.code ? (DEPARTMENT_LOGOS?.[dept.code] ?? null) : null;
                        const isActive = dept.code === selectedDepartmentCode;

                        return (
                            <button
                                key={dept.id}
                                type="button"
                                className={`program-card department-selector-card ${isActive ? 'active-department-card' : ''}`}
                                onClick={() => onDepartmentChange(String(dept.id))}
                                title={`${dept.code} - ${dept.name}`}
                            >
                                {logo ? (
                                    <img
                                        src={logo}
                                        alt={dept.name}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/220x220/FFFFFF/1C4DA1?text=LOGO';
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
            <hr className="header-separator-line" />
        </div>
    );
};
// -----------------


// --- Main Component ---
const TestEncodingAndEditing = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { departmentCode } = useParams();
    const { user, logout, isAdmin } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { showToast } = useToast();
    const { pendingPrintRequestCount } = usePrintRequestNotifications();
    const [activeTab, setActiveTab] = useState('Test Question Encoding');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState(null);
    const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
    const userMenuRef = useRef(null);
    const displayName = getUserDisplayName(user, 'User');
    const profileImageUrl = user?.profileImageData || getUserProfileImageUrl(user?.profileImagePath, user?.userId);

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
    const [editingBloomFilter, setEditingBloomFilter] = useState('');

    const getActiveDepartmentCode = useCallback(() => {
        if (departmentCode) return departmentCode;
        const selectedDept = departments.find(d => d.id === Number(department));
        if (selectedDept?.code) return selectedDept.code;
        const fallback = departments.find(d => !['IT', 'ITS'].includes((d.code || '').toUpperCase())) || departments[0];
        return fallback?.code || 'CCS';
    }, [departmentCode, departments, department]);

    // State for Rich Text Editor
    const [isMathPickerOpen, setIsMathPickerOpen] = useState(false);
    const [mathPickerPosition, setMathPickerPosition] = useState(null);
    const activeEditableRef = useRef(null); 
    const activeSetterRef = useRef(null); 
    const searchScopeRef = useRef(null);
    const encodingFormRef = useRef(null);
    const questionEditorRef = useRef(null);
    const choiceAEditorRef = useRef(null);
    const choiceBEditorRef = useRef(null);
    const choiceCEditorRef = useRef(null);
    const choiceDEditorRef = useRef(null);
    const choiceEEditorRef = useRef(null);
    const [savedRange, setSavedRange] = useState(null); // The critical saved selection range
    const [activeCommands, setActiveCommands] = useState({}); // State for TOOLBAR HIGHLIGHTING
    const imageFileInputRef = useRef(null);
    const imagePreviewCanvasRef = useRef(null);
    const imageEditTargetRef = useRef({ mode: 'insert', element: null });
    const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
    const [imageEditorSource, setImageEditorSource] = useState('');
    const [originalImageSource, setOriginalImageSource] = useState('');
    const [imageEditorSettings, setImageEditorSettings] = useState({ ...IMAGE_EDITOR_DEFAULTS });
    const [cropSelection, setCropSelection] = useState({ ...IMAGE_EDITOR_DEFAULT_CROP });
    const [isCropMode, setIsCropMode] = useState(false);
    const [isCropApplied, setIsCropApplied] = useState(false);
    const [cropDragState, setCropDragState] = useState(null);
    const [isApplyingImageEdits, setIsApplyingImageEdits] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [isBm25SearchActive, setIsBm25SearchActive] = useState(false);
    
    // Questions from backend
    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const HISTORY_PAGE_SIZE = 10;
    const [historyPageNumber, setHistoryPageNumber] = useState(1);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    
    // States for question encoding fields
    const [questionText, setQuestionText] = useState(''); 
    const [choiceA, setChoiceA] = useState('');
    const [choiceB, setChoiceB] = useState('');
    const [choiceC, setChoiceC] = useState('');
    const [choiceD, setChoiceD] = useState('');
    const [choiceE, setChoiceE] = useState('');
    const [explanation, setExplanation] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState(''); 

    const [editingQuestion, setEditingQuestion] = useState(null); 
    const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
    const [editRequestTargetQuestion, setEditRequestTargetQuestion] = useState(null);
    const [editRequestMessage, setEditRequestMessage] = useState('');
    const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);
    const [inboxEditRequests, setInboxEditRequests] = useState([]);
    const [sentEditRequests, setSentEditRequests] = useState([]);
    const [inboxRequestPageNumber, setInboxRequestPageNumber] = useState(1);
    const [sentRequestPageNumber, setSentRequestPageNumber] = useState(1);
    const [permissionDrafts, setPermissionDrafts] = useState({});
    const [isLoadingEditRequests, setIsLoadingEditRequests] = useState(false);
    const [isResolvingEditRequest, setIsResolvingEditRequest] = useState(false);
    const [transferQuestionModal, setTransferQuestionModal] = useState({
        isOpen: false,
        question: null,
        targetUserId: '',
        isSubmitting: false,
    });
    const EDIT_REQUESTS_PAGE_SIZE = 5;
    const [transferUsers, setTransferUsers] = useState([]);
    const [isLoadingTransferUsers, setIsLoadingTransferUsers] = useState(false);

    const normalizeQuestionArray = useCallback((payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.Items)) return payload.Items;
        return [];
    }, []);

    useEffect(() => {
        const requestedTab = location.state?.activeTab;
        if (requestedTab === 'Test Question Editing' || requestedTab === 'Test Question Encoding') {
            setActiveTab(requestedTab);
        }
    }, [location.state]);
    

    // --- Effects & Handlers ---

    // Load departments on mount
    useEffect(() => {
        const loadDepartments = async () => {
            if (!user?.userId) return;
            
            try {
                // Admin sees all departments, non-admin sees only assigned departments
                const data = isAdmin 
                    ? await apiService.getDepartments()
                    : await apiService.getUserDepartments(user.userId);
                setDepartments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load departments:', err);
            }
        };
        void loadDepartments();
    }, [user, isAdmin]);

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

    useEffect(() => {
        if (!isAdmin) return;
        void loadTransferUsers();
    }, [isAdmin, loadTransferUsers]);

    useEffect(() => {
        if (activeTab !== 'Test Question Editing') return;
        setHistoryPageNumber(1);
    }, [activeTab, department, course, subject, topic, editingBloomFilter]);

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

    // Load questions for active mode:
    // - Encoding: requires a topic selection.
    // - Editing: department-scoped by default, then narrowed by selected filters.
    useEffect(() => {
        const loadQuestions = async () => {
            if (activeTab !== 'Test Question Editing') {
                if (!topic) {
                    setQuestions([]);
                    setHistoryTotalCount(0);
                    return;
                }

                try {
                    setIsLoadingQuestions(true);
                    const data = await apiService.getQuestionsByTopic(topic);
                    console.log('Loaded questions for topic', topic, ':', data);
                    setQuestions(Array.isArray(data) ? data : []);
                    setHistoryTotalCount(Array.isArray(data) ? data.length : 0);
                } catch (err) {
                    console.error('Failed to load questions:', err);
                    setQuestions([]);
                    setHistoryTotalCount(0);
                } finally {
                    setIsLoadingQuestions(false);
                }
                return;
            }

            if (!department) {
                setQuestions([]);
                setHistoryTotalCount(0);
                return;
            }

            try {
                setIsLoadingQuestions(true);

                const queryParams = {
                    pageNumber: historyPageNumber,
                    pageSize: HISTORY_PAGE_SIZE,
                };

                if (topic) {
                    queryParams.topicId = Number(topic);
                } else if (subject) {
                    queryParams.subjectId = Number(subject);
                } else if (course) {
                    queryParams.courseId = Number(course);
                } else {
                    queryParams.departmentId = Number(department);
                }

                if (editingBloomFilter) {
                    queryParams.bloomGroup = editingBloomFilter;
                }

                const response = await apiService.getQuestions(queryParams);
                const items = normalizeQuestionArray(response);
                const totalCount = Number(response?.totalCount ?? response?.TotalCount ?? items.length);

                setQuestions(items);
                setHistoryTotalCount(Number.isFinite(totalCount) ? totalCount : items.length);
            } catch (err) {
                console.error('Failed to load questions for editing filters:', err);
                setQuestions([]);
                setHistoryTotalCount(0);
            } finally {
                setIsLoadingQuestions(false);
            }
        };
        void loadQuestions();
    }, [activeTab, department, course, subject, topic, editingBloomFilter, historyPageNumber, normalizeQuestionArray]);

    // --- REFACTORED RESET FUNCTIONS ---
    const resetInputContent = useCallback(() => {
        setQuestionText(''); 
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setChoiceE('');
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
            if (!dataEntryTabs.includes(item)) {
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
            navigate(`/test-encoding/${dept.code}`, { state: { activeTab } });
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

    const syncEditorStateAndKeepCaretAtEnd = useCallback((editable, setterOverride = null) => {
        const setterToUse = setterOverride || activeSetterRef.current;
        if (!editable || !setterToUse) return;

        setterToUse(editable.innerHTML);

        // React re-render can reset selection; restore caret at end after DOM update.
        requestAnimationFrame(() => {
            if (!editable.isConnected) return;
            placeCaretAtEnd(editable);
            handleSaveRange();
        });
    }, [handleSaveRange]);

    const handleFocus = (e, setter) => { 
        activeEditableRef.current = e.target;
        activeSetterRef.current = setter; 
        handleSaveRange(); 
        updateActiveCommands();
    };

    const getToolbarActiveCommands = (setter) => {
        return activeSetterRef.current === setter ? activeCommands : {};
    };

    const getImageAlignmentStyle = (alignment) => {
        if (alignment === 'Left') {
            return { marginLeft: '0', marginRight: 'auto' };
        }
        if (alignment === 'Right') {
            return { marginLeft: 'auto', marginRight: '0' };
        }
        return { marginLeft: 'auto', marginRight: 'auto' };
    };

    const getImageEditorSettingsFromElement = (imageElement) => {
        if (!imageElement) return { ...IMAGE_EDITOR_DEFAULTS };

        // Try to get width from dataset first, fall back to parsing style
        let parsedSize = 50;
        if (imageElement.dataset.width) {
            parsedSize = Number(imageElement.dataset.width) || 50;
        } else {
            const widthMatch = /^([\d.]+)%$/.exec((imageElement.style.width || '').trim());
            parsedSize = widthMatch ? Number(widthMatch[1]) : 50;
        }

        const savedAlignment = imageElement.dataset?.alignment;
        let alignment = 'Center';
        if (savedAlignment === 'Left' || savedAlignment === 'Center' || savedAlignment === 'Right') {
            alignment = savedAlignment;
        } else {
            const marginLeft = imageElement.style.marginLeft;
            const marginRight = imageElement.style.marginRight;
            if (marginLeft === 'auto' && marginRight !== 'auto') {
                alignment = 'Right';
            } else if (marginLeft !== 'auto' && marginRight === 'auto') {
                alignment = 'Left';
            }
        }

        return {
            ...IMAGE_EDITOR_DEFAULTS,
            imageSize: Math.max(20, Math.min(100, Number.isFinite(parsedSize) ? parsedSize : 50)),
            alignment,
        };
    };

    const getOriginalImageSourceFromElement = (imageElement) => {
        if (!imageElement) return '';
        return imageElement.dataset?.originalSrc || imageElement.src || '';
    };

    const resetImageEditorStateToOriginal = () => {
        const fallbackSource = originalImageSource || imageEditorSource;
        if (fallbackSource) {
            setImageEditorSource(fallbackSource);
        }
        setImageEditorSettings({ ...IMAGE_EDITOR_DEFAULTS });
        setCropSelection({ ...IMAGE_EDITOR_DEFAULT_CROP });
        setIsCropMode(false);
        setIsCropApplied(false);
        setCropDragState(null);
    };

    const openImageEditor = (imageSource, mode = 'insert', targetElement = null, initialSettings = null, baseOriginalSource = null) => {
        imageEditTargetRef.current = { mode, element: targetElement };
        setImageEditorSource(imageSource);
        setOriginalImageSource(baseOriginalSource || imageSource);
        setImageEditorSettings({ ...IMAGE_EDITOR_DEFAULTS, ...(initialSettings || {}) });
        setCropSelection({ ...IMAGE_EDITOR_DEFAULT_CROP });
        setIsCropMode(false);
        setIsCropApplied(false);
        setCropDragState(null);
        setIsImageEditorOpen(true);
    };

    const startCropDrag = (event, dragType) => {
        if (!isCropMode || !imagePreviewCanvasRef.current) return;
        event.preventDefault();
        event.stopPropagation();

        setCropDragState({
            dragType,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startRect: { ...cropSelection },
        });
    };

    useEffect(() => {
        if (!cropDragState || !imagePreviewCanvasRef.current) return;

        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        const onMouseMove = (event) => {
            if (!imagePreviewCanvasRef.current) return;

            const bounds = imagePreviewCanvasRef.current.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;

            const deltaPercentX = ((event.clientX - cropDragState.startClientX) / bounds.width) * 100;
            const deltaPercentY = ((event.clientY - cropDragState.startClientY) / bounds.height) * 100;

            const minSize = 5;
            const maxX = 100 - cropDragState.startRect.width;
            const maxY = 100 - cropDragState.startRect.height;

            if (cropDragState.dragType === 'move') {
                const nextX = clamp(cropDragState.startRect.x + deltaPercentX, 0, maxX);
                const nextY = clamp(cropDragState.startRect.y + deltaPercentY, 0, maxY);
                setCropSelection(prev => ({ ...prev, x: nextX, y: nextY }));
                return;
            }

            if (cropDragState.dragType === 'resize-se') {
                const nextWidth = clamp(cropDragState.startRect.width + deltaPercentX, minSize, 100 - cropDragState.startRect.x);
                const nextHeight = clamp(cropDragState.startRect.height + deltaPercentY, minSize, 100 - cropDragState.startRect.y);
                setCropSelection(prev => ({ ...prev, width: nextWidth, height: nextHeight }));
                return;
            }

            if (cropDragState.dragType === 'resize-sw') {
                const proposedX = clamp(cropDragState.startRect.x + deltaPercentX, 0, cropDragState.startRect.x + cropDragState.startRect.width - minSize);
                const proposedWidth = clamp(cropDragState.startRect.width - (proposedX - cropDragState.startRect.x), minSize, 100 - proposedX);
                const proposedHeight = clamp(cropDragState.startRect.height + deltaPercentY, minSize, 100 - cropDragState.startRect.y);
                setCropSelection(prev => ({ ...prev, x: proposedX, width: proposedWidth, height: proposedHeight }));
                return;
            }

            if (cropDragState.dragType === 'resize-ne') {
                const proposedY = clamp(cropDragState.startRect.y + deltaPercentY, 0, cropDragState.startRect.y + cropDragState.startRect.height - minSize);
                const proposedHeight = clamp(cropDragState.startRect.height - (proposedY - cropDragState.startRect.y), minSize, 100 - proposedY);
                const proposedWidth = clamp(cropDragState.startRect.width + deltaPercentX, minSize, 100 - cropDragState.startRect.x);
                setCropSelection(prev => ({ ...prev, y: proposedY, height: proposedHeight, width: proposedWidth }));
                return;
            }

            if (cropDragState.dragType === 'resize-nw') {
                const proposedX = clamp(cropDragState.startRect.x + deltaPercentX, 0, cropDragState.startRect.x + cropDragState.startRect.width - minSize);
                const proposedY = clamp(cropDragState.startRect.y + deltaPercentY, 0, cropDragState.startRect.y + cropDragState.startRect.height - minSize);
                const proposedWidth = clamp(cropDragState.startRect.width - (proposedX - cropDragState.startRect.x), minSize, 100 - proposedX);
                const proposedHeight = clamp(cropDragState.startRect.height - (proposedY - cropDragState.startRect.y), minSize, 100 - proposedY);
                setCropSelection(prev => ({ ...prev, x: proposedX, y: proposedY, width: proposedWidth, height: proposedHeight }));
            }
        };

        const onMouseUp = () => {
            setCropDragState(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [cropDragState]);

    const triggerImagePicker = (mode = 'insert', targetElement = null) => {
        imageEditTargetRef.current = { mode, element: targetElement };
        if (!imageFileInputRef.current) {
            showToast({ message: 'Image picker is currently unavailable.', type: 'error' });
            return;
        }
        imageFileInputRef.current.value = '';
        imageFileInputRef.current.click();
    };

    const findSelectedImageElement = () => {
        const currentRef = activeEditableRef.current;
        if (!currentRef) return null;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        const commonElement = commonNode.nodeType === Node.ELEMENT_NODE
            ? commonNode
            : commonNode.parentElement;

        if (commonElement?.tagName === 'IMG' && currentRef.contains(commonElement)) {
            return commonElement;
        }

        if (commonElement?.closest) {
            const closestImage = commonElement.closest('img');
            if (closestImage && currentRef.contains(closestImage)) {
                return closestImage;
            }
        }

        if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            const startElement = range.startContainer;
            const startChild = startElement.childNodes[range.startOffset];
            if (startChild?.nodeType === Node.ELEMENT_NODE && startChild.tagName === 'IMG' && currentRef.contains(startChild)) {
                return startChild;
            }
        }

        return null;
    };

    const getFinalImageSizePercent = (imageSizePercent, shouldCrop, selection) => {
        const baseSize = Math.max(20, Math.min(100, Number(imageSizePercent) || 50));
        if (!shouldCrop) return baseSize;
        const cropWidthScale = Math.max(0.1, Math.min(1, (selection?.width || 100) / 100));
        return Math.max(10, Math.round(baseSize * cropWidthScale));
    };

    const applyImagePresentation = (imageElement, { imageSizePercent, shouldCrop, cropRect, alignment, originalSource }) => {
        if (!imageElement) return;
        const finalSizePercent = getFinalImageSizePercent(imageSizePercent, shouldCrop, cropRect);
        const marginStyle = getImageAlignmentStyle(alignment);

        imageElement.style.maxWidth = '100%';
        imageElement.style.width = `${finalSizePercent}%`;
        imageElement.style.height = 'auto';
        imageElement.style.display = 'block';
        imageElement.style.marginTop = '8px';
        imageElement.style.marginBottom = '8px';
        imageElement.style.marginLeft = marginStyle.marginLeft;
        imageElement.style.marginRight = marginStyle.marginRight;
        imageElement.dataset.alignment = alignment;
        imageElement.dataset.width = imageSizePercent; // Store width for persistence
        if (originalSource) {
            imageElement.dataset.originalSrc = originalSource;
        }
    };

    const insertImageAtCaret = (imageUrl, imageSizePercent = 50, shouldCrop = false, cropRect = null) => {
        const currentRef = activeEditableRef.current;
        if (!currentRef) return false;

        currentRef.focus();
        const selection = window.getSelection();

        let rangeToUse;
        if (savedRange && currentRef.contains(savedRange.startContainer)) {
            rangeToUse = savedRange.cloneRange();
        } else if (selection.rangeCount > 0 && currentRef.contains(selection.getRangeAt(0).startContainer)) {
            rangeToUse = selection.getRangeAt(0).cloneRange();
        } else {
            rangeToUse = document.createRange();
            rangeToUse.selectNodeContents(currentRef);
            rangeToUse.collapse(false);
        }

        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.alt = 'Inserted image';
        applyImagePresentation(imageElement, {
            imageSizePercent,
            shouldCrop,
            cropRect,
            alignment: imageEditorSettings.alignment,
            originalSource: originalImageSource || imageEditorSource,
        });

        if (!rangeToUse.collapsed) {
            rangeToUse.deleteContents();
        }

        rangeToUse.insertNode(imageElement);
        rangeToUse.setStartAfter(imageElement);
        rangeToUse.collapse(true);

        selection.removeAllRanges();
        selection.addRange(rangeToUse);

        setSavedRange(rangeToUse);
        if (activeSetterRef.current) {
            activeSetterRef.current(currentRef.innerHTML);
        }

        return true;
    };

    const buildEditedImageDataUrl = (sourceUrl, settings, cropRect, shouldCrop) => {
        return new Promise((resolve, reject) => {
            const image = new window.Image();
            image.crossOrigin = 'anonymous';

            image.onload = () => {
                try {
                    const sourceWidth = image.naturalWidth || image.width;
                    const sourceHeight = image.naturalHeight || image.height;

                    const normalizedCrop = shouldCrop
                        ? {
                            x: Math.max(0, Math.min(100, cropRect.x)),
                            y: Math.max(0, Math.min(100, cropRect.y)),
                            width: Math.max(5, Math.min(100, cropRect.width)),
                            height: Math.max(5, Math.min(100, cropRect.height)),
                        }
                        : { x: 0, y: 0, width: 100, height: 100 };

                    const sourceX = Math.round((normalizedCrop.x / 100) * sourceWidth);
                    const sourceY = Math.round((normalizedCrop.y / 100) * sourceHeight);
                    const cropWidth = Math.max(1, Math.round((normalizedCrop.width / 100) * sourceWidth));
                    const cropHeight = Math.max(1, Math.round((normalizedCrop.height / 100) * sourceHeight));

                    const normalizedRotation = ((Number(settings.rotate) || 0) % 360 + 360) % 360;
                    const swapDimensions = normalizedRotation === 90 || normalizedRotation === 270;
                    const canvas = document.createElement('canvas');
                    canvas.width = swapDimensions ? cropHeight : cropWidth;
                    canvas.height = swapDimensions ? cropWidth : cropHeight;

                    const context = canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('Unable to initialize image editor canvas.'));
                        return;
                    }

                    context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%)`;
                    context.translate(canvas.width / 2, canvas.height / 2);
                    context.rotate((normalizedRotation * Math.PI) / 180);
                    context.drawImage(
                        image,
                        sourceX,
                        sourceY,
                        cropWidth,
                        cropHeight,
                        -cropWidth / 2,
                        -cropHeight / 2,
                        cropWidth,
                        cropHeight
                    );

                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                }
            };

            image.onerror = () => reject(new Error('Unable to load image for editing.'));
            image.src = sourceUrl;
        });
    };

    const handleImageFileSelection = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast({ message: 'Please select an image file.', type: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const source = loadEvent.target?.result;
            if (!source) {
                showToast({ message: 'Failed to read selected image.', type: 'error' });
                return;
            }

            const target = imageEditTargetRef.current || { mode: 'insert', element: null };
            const initialSettings = target.mode === 'replace' && target.element
                ? getImageEditorSettingsFromElement(target.element)
                : null;
            const originalSource = target.mode === 'replace' && target.element
                ? getOriginalImageSourceFromElement(target.element)
                : source;
            openImageEditor(source, target.mode, target.element || null, initialSettings, originalSource);
        };
        reader.onerror = () => {
            showToast({ message: 'Failed to read selected image.', type: 'error' });
        };
        reader.readAsDataURL(file);
    };

    const applyImageEdits = async () => {
        if (!imageEditorSource) return;

        try {
            setIsApplyingImageEdits(true);
            const editedImageUrl = await buildEditedImageDataUrl(imageEditorSource, imageEditorSettings, cropSelection, isCropApplied);
            const target = imageEditTargetRef.current || { mode: 'insert', element: null };

            if (target.mode === 'replace' && target.element) {
                target.element.src = editedImageUrl;
                applyImagePresentation(target.element, {
                    imageSizePercent: imageEditorSettings.imageSize,
                    shouldCrop: isCropApplied,
                    cropRect: cropSelection,
                    alignment: imageEditorSettings.alignment,
                    originalSource: getOriginalImageSourceFromElement(target.element) || originalImageSource || imageEditorSource,
                });
                if (activeEditableRef.current && activeSetterRef.current) {
                    activeSetterRef.current(activeEditableRef.current.innerHTML);
                }
            } else {
                const currentEditable = activeEditableRef.current;
                const existingImage = currentEditable?.querySelector('img') || null;
                if (currentEditable && existingImage) {
                    existingImage.src = editedImageUrl;
                    applyImagePresentation(existingImage, {
                        imageSizePercent: imageEditorSettings.imageSize,
                        shouldCrop: isCropApplied,
                        cropRect: cropSelection,
                        alignment: imageEditorSettings.alignment,
                        originalSource: getOriginalImageSourceFromElement(existingImage) || originalImageSource || imageEditorSource,
                    });
                    if (activeSetterRef.current) {
                        activeSetterRef.current(currentEditable.innerHTML);
                    }
                } else {
                    const inserted = insertImageAtCaret(editedImageUrl, imageEditorSettings.imageSize, isCropApplied, cropSelection);
                    if (!inserted) {
                        showToast({ message: 'Click inside a content field first.', type: 'info' });
                        return;
                    }
                }
            }

            setIsImageEditorOpen(false);
            showToast({ message: isCropApplied ? 'Image cropped and inserted successfully.' : 'Image inserted successfully.', type: 'success' });
        } catch (error) {
            console.error('Failed to apply image edits:', error);
            showToast({ message: 'Could not apply image edits. Try a different image.', type: 'error' });
        } finally {
            setIsApplyingImageEdits(false);
        }
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
            showToast({ message: 'Click inside a content field first.', type: 'info' }); 
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
                    triggerImagePicker('insert');
                    return;
                }
                else if(command==='editImage'){ 
                    const selectedImage = findSelectedImageElement();
                    if (!selectedImage) {
                        showToast({ message: 'Select an image inside the editor first, then click Edit Image.', type: 'info' });
                        return;
                    }
                    openImageEditor(
                        selectedImage.src,
                        'replace',
                        selectedImage,
                        getImageEditorSettingsFromElement(selectedImage),
                        getOriginalImageSourceFromElement(selectedImage)
                    );
                    return;
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
        if (action === 'Logout') {
            setIsLogoutModalOpen(true);
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

    const handleEditableClick = (event, setter) => {
        const currentEditable = event.currentTarget;
        activeEditableRef.current = currentEditable;
        activeSetterRef.current = setter;

        if (event.target?.tagName === 'IMG') {
            const selectedImage = event.target;
            openImageEditor(
                selectedImage.src,
                'replace',
                selectedImage,
                getImageEditorSettingsFromElement(selectedImage),
                getOriginalImageSourceFromElement(selectedImage)
            );
            return;
        }

        handleSaveRange();
    };


    const handleNormalizeOnBlur = (e, setter) => {
        // Keep rich-text formatting from toolbar (headings, lists, symbols, etc.).
        setter(e.currentTarget.innerHTML);
        handleSaveRange();
    };

    const isKatexContainerNode = (node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        const element = node;
        return element.classList?.contains('katex-display') || element.classList?.contains('katex');
    };

    const getClosestKatexContainer = (node, editableRoot) => {
        let current = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentNode;
        let inlineKatex = null;

        while (current && current !== editableRoot) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const element = current;
                if (element.classList?.contains('katex-display')) {
                    return element;
                }
                if (element.classList?.contains('katex')) {
                    inlineKatex = inlineKatex || element;
                }
            }
            current = current.parentNode;
        }

        return inlineKatex;
    };

    const getNodeBeforeCaret = (range, editableRoot) => {
        let container = range.startContainer;
        let offset = range.startOffset;

        if (container.nodeType === Node.TEXT_NODE) {
            if (offset > 0) return null;
            let current = container;
            while (current && current !== editableRoot) {
                if (current.previousSibling) {
                    return current.previousSibling;
                }
                current = current.parentNode;
            }
            return null;
        }

        if (container.nodeType === Node.ELEMENT_NODE) {
            if (offset > 0) {
                return container.childNodes[offset - 1] || null;
            }
            let current = container;
            while (current && current !== editableRoot) {
                if (current.previousSibling) {
                    return current.previousSibling;
                }
                current = current.parentNode;
            }
        }

        return null;
    };

    const handleEditorBackspace = useCallback((event) => {
        if (event.key !== 'Backspace') return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !selection.isCollapsed) return;

        const editable = event.currentTarget;
        const range = selection.getRangeAt(0);
        if (!editable.contains(range.startContainer)) return;

        const directKatexContainer = getClosestKatexContainer(range.startContainer, editable);
        if (directKatexContainer) {
            event.preventDefault();
            directKatexContainer.remove();
            syncEditorStateAndKeepCaretAtEnd(editable);
            return;
        }

        const previousNode = getNodeBeforeCaret(range, editable);
        if (!previousNode) return;

        const shouldRemovePreviousNode = isKatexContainerNode(previousNode)
            || (previousNode.nodeType === Node.ELEMENT_NODE
                && previousNode.textContent?.trim() === ''
                && previousNode.querySelector?.('.katex, .katex-display'));

        if (!shouldRemovePreviousNode) return;

        event.preventDefault();
        previousNode.remove();
        syncEditorStateAndKeepCaretAtEnd(editable);
    }, [syncEditorStateAndKeepCaretAtEnd]);

    const handlePlainTextPaste = useCallback((event, setter) => {
        event.preventDefault();

        const pastedText = event.clipboardData?.getData('text/plain')
            || window.clipboardData?.getData('Text')
            || '';

        const normalizedPlainPaste = normalizePlainText(pastedText);
        const normalizedPasteHtml = convertLatexMathFromPaste(normalizedPlainPaste);
        const editable = event.currentTarget;
        editable.focus();

        const selection = window.getSelection();
        let rangeToUse = null;

        if (selection?.rangeCount && editable.contains(selection.getRangeAt(0).startContainer)) {
            rangeToUse = selection.getRangeAt(0).cloneRange();
        } else if (savedRange && editable.contains(savedRange.startContainer)) {
            rangeToUse = savedRange.cloneRange();
        } else {
            rangeToUse = document.createRange();
            rangeToUse.selectNodeContents(editable);
            rangeToUse.collapse(false);
        }

        if (!rangeToUse.collapsed) {
            rangeToUse.deleteContents();
        }

        const fragment = rangeToUse.createContextualFragment(normalizedPasteHtml);
        const marker = document.createTextNode('');

        rangeToUse.insertNode(fragment);
        rangeToUse.insertNode(marker);
        rangeToUse.setStartAfter(marker);
        rangeToUse.collapse(true);

        selection?.removeAllRanges();
        selection?.addRange(rangeToUse);

        if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
        }

        setter(editable.innerHTML);
        placeCaretAtEnd(editable);
        handleSaveRange();
    }, [handleSaveRange, savedRange]);
    
    const applyQuestionContextFilters = async (question) => {
        const topicIdFromQuestion = Number(question?.topicId || 0);
        if (!topicIdFromQuestion) {
            return;
        }

        try {
            const topicDetails = await apiService.getTopicById(topicIdFromQuestion);
            const subjectIdFromTopic = Number(topicDetails?.subjectId || 0);

            let courseIdFromSubject = 0;
            if (subjectIdFromTopic) {
                const subjectDetails = await apiService.getSubject(subjectIdFromTopic);
                courseIdFromSubject = Number(subjectDetails?.courseId || 0);
            }

            let departmentIdFromCourse = 0;
            if (courseIdFromSubject) {
                const courseDetails = await apiService.getCourseById(courseIdFromSubject);
                departmentIdFromCourse = Number(courseDetails?.departmentId || 0);
            }

            if (departmentIdFromCourse) {
                setDepartment(String(departmentIdFromCourse));
            }
            if (courseIdFromSubject) {
                setCourse(String(courseIdFromSubject));
            }
            if (subjectIdFromTopic) {
                setSubject(String(subjectIdFromTopic));
            }

            setTopic(String(topicIdFromQuestion));
        } catch (error) {
            console.warn('Failed to auto-fill selection filters from question context:', error);
        }
    };

    const applyPersistedImagePresentationToHtml = (htmlContent, imageMeta) => {
        if (!htmlContent || !imageMeta) {
            if (!htmlContent) {
                return '';
            }

            const tempDivWithoutMeta = document.createElement('div');
            tempDivWithoutMeta.innerHTML = htmlContent;
            const imagesWithoutMeta = tempDivWithoutMeta.querySelectorAll('img');

            if (imagesWithoutMeta.length === 0) {
                return htmlContent;
            }

            imagesWithoutMeta.forEach((imageElement) => {
                const styleWidthMatch = /^([\d.]+)%$/.exec((imageElement.style.width || '').trim());
                const datasetWidth = Number(imageElement.dataset?.width);
                const parsedStyleWidth = styleWidthMatch ? Number(styleWidthMatch[1]) : NaN;
                const width = Number.isFinite(datasetWidth)
                    ? datasetWidth
                    : (Number.isFinite(parsedStyleWidth) ? parsedStyleWidth : 50);

                const rawAlignment = imageElement.dataset?.alignment || 'Center';
                const alignment = ['Left', 'Center', 'Right'].includes(rawAlignment) ? rawAlignment : 'Center';

                const marginByAlignment = alignment === 'Left'
                    ? { marginLeft: '0', marginRight: 'auto' }
                    : alignment === 'Right'
                        ? { marginLeft: 'auto', marginRight: '0' }
                        : { marginLeft: 'auto', marginRight: 'auto' };

                imageElement.style.maxWidth = '100%';
                imageElement.style.width = `${Math.max(10, Math.min(100, width))}%`;
                imageElement.style.height = 'auto';
                imageElement.style.display = 'block';
                imageElement.style.marginTop = '8px';
                imageElement.style.marginBottom = '8px';
                imageElement.style.marginLeft = marginByAlignment.marginLeft;
                imageElement.style.marginRight = marginByAlignment.marginRight;
                imageElement.dataset.width = String(Math.max(10, Math.min(100, width)));
                imageElement.dataset.alignment = alignment;
            });

            return tempDivWithoutMeta.innerHTML;
        }

        const fallbackWidth = Math.max(10, Math.min(100, Number(imageMeta.widthPercentage ?? imageMeta.WidthPercentage ?? 50) || 50));
        const fallbackAlignment = imageMeta.alignment || imageMeta.Alignment || 'Center';
        const validFallbackAlignment = ['Left', 'Center', 'Right'].includes(fallbackAlignment) ? fallbackAlignment : 'Center';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const imageElements = tempDiv.querySelectorAll('img');
        if (imageElements.length === 0) {
            return htmlContent;
        }

        imageElements.forEach((imageElement) => {
            const styleWidthMatch = /^([\d.]+)%$/.exec((imageElement.style.width || '').trim());
            const datasetWidth = Number(imageElement.dataset?.width);
            const parsedStyleWidth = styleWidthMatch ? Number(styleWidthMatch[1]) : NaN;
            const width = Number.isFinite(datasetWidth)
                ? datasetWidth
                : (Number.isFinite(parsedStyleWidth) ? parsedStyleWidth : fallbackWidth);

            const datasetAlignment = imageElement.dataset?.alignment;
            const alignmentCandidate = datasetAlignment || validFallbackAlignment;
            const alignment = ['Left', 'Center', 'Right'].includes(alignmentCandidate) ? alignmentCandidate : 'Center';

            const marginByAlignment = alignment === 'Left'
                ? { marginLeft: '0', marginRight: 'auto' }
                : alignment === 'Right'
                    ? { marginLeft: 'auto', marginRight: '0' }
                    : { marginLeft: 'auto', marginRight: 'auto' };

            imageElement.style.maxWidth = '100%';
            imageElement.style.width = `${Math.max(10, Math.min(100, width))}%`;
            imageElement.style.height = 'auto';
            imageElement.style.display = 'block';
            imageElement.style.marginTop = '8px';
            imageElement.style.marginBottom = '8px';
            imageElement.style.marginLeft = marginByAlignment.marginLeft;
            imageElement.style.marginRight = marginByAlignment.marginRight;
            imageElement.dataset.width = String(Math.max(10, Math.min(100, width)));
            imageElement.dataset.alignment = alignment;
        });

        return tempDiv.innerHTML;
    };

    // Loads question data into input fields
    const handleEditQuestion = async (question) => {
        // Clear content state first
        resetInputContent(); 
        
        // Switch to the 'Test Question Encoding' tab
        handleSetActiveTab('Test Question Encoding'); 

        await applyQuestionContextFilters(question);
        
        // Set the question object currently being edited
        setEditingQuestion(question); 
        
        // Map bloom level to grouped selector value (supports backend/raw/grouped values)
        setBloomLevel(resolveGroupedBloomValue(question.bloomLevel)); 
        
        // Rehydrate persisted image width/alignment so edit mode reflects saved size.
        const imageMeta = question?.image || question?.Image || null;

        // Populate the content fields with question data
        setQuestionText(applyPersistedImagePresentationToHtml(question.content || '', imageMeta));
        
        // Extract options (A, B, C, D) from question.options array
        if (question.options && Array.isArray(question.options)) {
            const sortedOptions = [...question.options].sort((a, b) => a.displayOrder - b.displayOrder);
            setChoiceA(applyPersistedImagePresentationToHtml(sortedOptions[0]?.content || '', imageMeta));
            setChoiceB(applyPersistedImagePresentationToHtml(sortedOptions[1]?.content || '', imageMeta));
            setChoiceC(applyPersistedImagePresentationToHtml(sortedOptions[2]?.content || '', imageMeta));
            setChoiceD(applyPersistedImagePresentationToHtml(sortedOptions[3]?.content || '', imageMeta));
            setChoiceE(applyPersistedImagePresentationToHtml(sortedOptions[4]?.content || '', imageMeta));
            
            // Find the correct answer (A-E based on available options)
            const correctOption = sortedOptions.find(opt => opt.isCorrect);
            if (correctOption) {
                const correctIndex = sortedOptions.indexOf(correctOption);
                setCorrectAnswer(String.fromCharCode(65 + correctIndex)); // 65 is 'A'
            }
        }
        
        setExplanation(question.explanation || ''); 

        setTimeout(() => {
            encodingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    };
    
    const handleDeleteQuestion = (questionId) => {
        setPendingDeleteQuestionId(questionId);
        setIsDeleteModalOpen(true);
    };

    const handleTransferQuestionOwnership = (question) => {
        if (!isAdmin) {
            showToast({ message: 'Only admins can transfer ownership.', type: 'error' });
            return;
        }

        if (transferUsers.length === 0 && !isLoadingTransferUsers) {
            void loadTransferUsers();
        }

        setTransferQuestionModal({
            isOpen: true,
            question,
            targetUserId: '',
            isSubmitting: false,
        });
    };

    const closeTransferQuestionOwnershipModal = () => {
        if (transferQuestionModal.isSubmitting) return;
        setTransferQuestionModal({
            isOpen: false,
            question: null,
            targetUserId: '',
            isSubmitting: false,
        });
    };

    const submitTransferQuestionOwnership = async () => {
        const targetUserId = transferQuestionModal.targetUserId.trim();
        if (!targetUserId) {
            showToast({ message: 'Please select a user.', type: 'error' });
            return;
        }

        if (!transferQuestionModal.question) {
            return;
        }

        setTransferQuestionModal((prev) => ({ ...prev, isSubmitting: true }));

        try {
            await apiService.transferQuestionOwnership(
                transferQuestionModal.question.id,
                targetUserId,
                `Ownership transferred by admin ${user?.userId || 'unknown'}`
            );

            if (topic) {
                const refreshedQuestions = await apiService.getQuestionsByTopic(topic);
                setQuestions(Array.isArray(refreshedQuestions) ? refreshedQuestions : []);
            }

            showToast({ message: `Question #${transferQuestionModal.question.id} ownership transferred.`, type: 'success' });
            closeTransferQuestionOwnershipModal();
        } catch (err) {
            console.error('Failed to transfer question ownership:', err);
            const message = err?.response?.data?.message || err?.response?.data || 'Failed to transfer question ownership.';
            showToast({ message, type: 'error' });
            setTransferQuestionModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    const openEditRequestModal = (question) => {
        if (!question?.id) return;
        setEditRequestTargetQuestion(question);
        setEditRequestMessage('');
        setIsEditRequestModalOpen(true);
    };

    const closeEditRequestModal = () => {
        setIsEditRequestModalOpen(false);
        setEditRequestTargetQuestion(null);
        setEditRequestMessage('');
    };

    const loadEditRequests = useCallback(async () => {
        if (!user?.userId) return;
        try {
            setIsLoadingEditRequests(true);
            const [inbox, sent] = await Promise.all([
                apiService.getQuestionEditRequests('inbox'),
                apiService.getQuestionEditRequests('sent')
            ]);

            const inboxItems = Array.isArray(inbox) ? inbox : [];
            const sentItems = Array.isArray(sent) ? sent : [];

            setInboxEditRequests(inboxItems);
            setSentEditRequests(sentItems);
            setPermissionDrafts(
                inboxItems.reduce((acc, request) => {
                    acc[request.requestId] = {
                        canEdit: request.permissionLevel === 'EditOnly' || request.permissionLevel === 'EditDelete',
                        canDelete: request.permissionLevel === 'EditDelete',
                    };
                    return acc;
                }, {})
            );
        } catch (err) {
            console.error('Failed to load edit requests:', err);
            showToast({ message: 'Failed to load edit requests.', type: 'error' });
        } finally {
            setIsLoadingEditRequests(false);
        }
    }, [showToast, user?.userId]);

    const getPermissionDraft = (request) => (
        permissionDrafts[request.requestId] ?? {
            canEdit: request.permissionLevel === 'EditOnly' || request.permissionLevel === 'EditDelete',
            canDelete: request.permissionLevel === 'EditDelete',
        }
    );

    const buildNextPermissionDraft = (current, field, checked) => {
        const next = { ...current };

        if (field === 'canEdit') {
            next.canEdit = checked;
            if (!checked) {
                next.canDelete = false;
            }
        }

        if (field === 'canDelete') {
            next.canDelete = checked;
            if (checked) {
                next.canEdit = true;
            }
        }

        return next;
    };

    const updatePermissionDraft = async (request, field, checked) => {
        if (isResolvingEditRequest) return;

        const current = getPermissionDraft(request);
        const next = buildNextPermissionDraft(current, field, checked);

        setPermissionDrafts((prev) => ({ ...prev, [request.requestId]: next }));
        await applyPermissionSelection(request, next);
    };

    const applyPermissionSelection = async (request, overrideDraft = null) => {
        const draft = overrideDraft ?? getPermissionDraft(request);

        try {
            setIsResolvingEditRequest(true);

            if (!draft.canEdit) {
                if (request.status === 'Pending') {
                    await apiService.resolveQuestionEditRequest(request.requestId, false, false, '');
                    showToast({ message: 'Edit request rejected.', type: 'success' });
                } else {
                    await apiService.revokeQuestionEditPermission(request.requestId, 'Permission removed by owner.');
                    showToast({ message: 'Permission removed.', type: 'success' });
                }
            } else {
                await apiService.resolveQuestionEditRequest(request.requestId, true, draft.canDelete, '');
                showToast({
                    message: draft.canDelete ? 'Permission set to Edit + Delete.' : 'Permission set to Edit only.',
                    type: 'success'
                });
            }

            await loadEditRequests();
        } catch (err) {
            console.error('Failed to apply permission selection:', err);
            const message = err?.response?.data?.message || 'Failed to update permission.';
            showToast({ message, type: 'error' });
        } finally {
            setIsResolvingEditRequest(false);
        }
    };

    const submitEditRequest = async () => {
        if (!editRequestTargetQuestion?.id) return;

        try {
            setIsSubmittingEditRequest(true);
            await apiService.createQuestionEditRequest(editRequestTargetQuestion.id, editRequestMessage);
            showToast({ message: `Edit request sent for Question ID ${editRequestTargetQuestion.id}.`, type: 'success' });
            closeEditRequestModal();
            await loadEditRequests();
        } catch (err) {
            console.error('Failed to submit edit request:', err);
            const message = err?.response?.data?.message || 'Failed to submit edit request.';
            showToast({ message, type: 'error' });
        } finally {
            setIsSubmittingEditRequest(false);
        }
    };

    const resolveEditRequest = async (requestId, approve, canDelete = false) => {
        try {
            setIsResolvingEditRequest(true);
            await apiService.resolveQuestionEditRequest(requestId, approve, canDelete, '');
            showToast({
                message: approve
                    ? (canDelete ? 'Edit and delete permission approved.' : 'Edit-only permission approved.')
                    : 'Edit request rejected.',
                type: 'success'
            });
            await loadEditRequests();
        } catch (err) {
            console.error('Failed to resolve edit request:', err);
            const message = err?.response?.data?.message || 'Failed to resolve edit request.';
            showToast({ message, type: 'error' });
        } finally {
            setIsResolvingEditRequest(false);
        }
    };

    const deleteRequestForOwner = async (request) => {
        try {
            setIsResolvingEditRequest(true);

            try {
                await apiService.revokeQuestionEditPermission(request.requestId, 'Request deleted by owner. Access revoked.');
            } catch (error) {
                const statusCode = Number(error?.response?.status);
                const apiMessage = String(error?.response?.data?.message || '').toLowerCase();
                const alreadyRevoked = statusCode === 409 && apiMessage.includes('already revoked');
                if (!alreadyRevoked) {
                    throw error;
                }
            }

            await apiService.dismissQuestionEditRequest(request.requestId);
            setInboxEditRequests((prev) => prev.filter((item) => item.requestId !== request.requestId));
            showToast({ message: 'Request deleted. Access revoked and card removed.', type: 'success' });
        } catch (err) {
            console.error('Failed to delete request:', err);
            const message = err?.response?.data?.message || 'Failed to delete request.';
            showToast({ message, type: 'error' });
        } finally {
            setIsResolvingEditRequest(false);
        }
    };

    const dismissSentRequestCard = async (requestId) => {
        try {
            setIsResolvingEditRequest(true);
            await apiService.dismissQuestionEditRequest(requestId);
            setSentEditRequests((prev) => prev.filter((item) => item.requestId !== requestId));
            showToast({ message: 'Request card removed.', type: 'success' });
        } catch (err) {
            console.error('Failed to remove request card:', err);
            const message = err?.response?.data?.message || 'Failed to remove request card.';
            showToast({ message, type: 'error' });
        } finally {
            setIsResolvingEditRequest(false);
        }
    };

    const handleCloseDeleteModal = () => {
        if (isDeletingQuestion) return;
        setIsDeleteModalOpen(false);
        setPendingDeleteQuestionId(null);
    };

    const handleConfirmDeleteQuestion = async () => {
        if (!pendingDeleteQuestionId) return;

        const targetQuestion = questions.find(q => q.id === pendingDeleteQuestionId) || null;

        try {
            setIsDeletingQuestion(true);
            await apiService.deleteQuestion(pendingDeleteQuestionId);
            setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== pendingDeleteQuestionId));
            showToast({ message: 'Question deleted successfully.', type: 'success' });
            setIsDeleteModalOpen(false);
            setPendingDeleteQuestionId(null);
        } catch (err) {
            console.error('Failed to delete question:', err);
            const message = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete question. Please try again.';
            const isPermissionError = Number(err?.response?.status) === 403;
            showToast({ message, type: 'error' });
            if (isPermissionError && targetQuestion) {
                openEditRequestModal(targetQuestion);
            }
        } finally {
            setIsDeletingQuestion(false);
        }
    };

    // Extract image metadata from HTML content
    const extractImagesFromHtml = (htmlContent) => {
        const images = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const imgElements = tempDiv.querySelectorAll('img');
        
        imgElements.forEach((img, index) => {
            const widthMatch = /^([\d.]+)%$/.exec((img.style.width || '').trim());
            const width = widthMatch ? Number(widthMatch[1]) : (Number(img.dataset.width) || 50);
            const alignment = img.dataset.alignment || 'Center';
            const src = img.getAttribute('src') || img.dataset.originalSrc || '';
            
            if (src) {
                images.push({
                    src,
                    width: Math.max(10, Math.min(100, width)), // Ensure range 10-100
                    alignment: ['Left', 'Center', 'Right'].includes(alignment) ? alignment : 'Center',
                    index
                });
            }
        });
        
        return images;
    };

    // Update image metadata for a question
    const updateQuestionImages = async (questionId, allContent) => {
        try {
            // Extract images from question content and all choices
            const allImages = [
                ...extractImagesFromHtml(allContent.questionHtml),
                ...extractImagesFromHtml(allContent.choiceAHtml),
                ...extractImagesFromHtml(allContent.choiceBHtml),
                ...extractImagesFromHtml(allContent.choiceCHtml),
                ...extractImagesFromHtml(allContent.choiceDHtml),
                ...extractImagesFromHtml(allContent.choiceEHtml)
            ];
            
            if (allImages.length === 0) {
                console.log('📷 No images found in question content');
                return;
            }
            
            console.log(`📷 Found ${allImages.length} image(s) in question content:`, allImages);
            
            // Update each image's metadata
            for (const image of allImages) {
                try {
                    // For now, just log the image metadata
                    // In a future iteration, this could call an API to update image metadata
                    console.log(`✏️ Image metadata:`, {
                        width: image.width,
                        alignment: image.alignment,
                        hasSrcData: image.src.startsWith('data:')
                    });
                } catch (err) {
                    console.warn(`Failed to update image metadata for index ${image.index}:`, err);
                }
            }
        } catch (err) {
            console.warn('Failed to update question images:', err);
            // Don't throw - this is non-critical
        }
    };
    
    // Handles both 'Add' and 'Save Edit' with backend API
    const handleAction = async () => { 
        const questionHtml = questionEditorRef.current?.innerHTML ?? questionText;
        const choiceAHtml = choiceAEditorRef.current?.innerHTML ?? choiceA;
        const choiceBHtml = choiceBEditorRef.current?.innerHTML ?? choiceB;
        const choiceCHtml = choiceCEditorRef.current?.innerHTML ?? choiceC;
        const choiceDHtml = choiceDEditorRef.current?.innerHTML ?? choiceD;
        const choiceEHtml = choiceEEditorRef.current?.innerHTML ?? choiceE;

        // 1. Validation 
        const normalizedQuestionText = normalizePlainText(htmlToPlainText(questionHtml), { trimEdges: true });
        const normalizedChoiceA = normalizePlainText(htmlToPlainText(choiceAHtml), { trimEdges: true });
        const normalizedChoiceB = normalizePlainText(htmlToPlainText(choiceBHtml), { trimEdges: true });
        const normalizedChoiceC = normalizePlainText(htmlToPlainText(choiceCHtml), { trimEdges: true });
        const normalizedChoiceD = normalizePlainText(htmlToPlainText(choiceDHtml), { trimEdges: true });
        const normalizedChoiceE = normalizePlainText(htmlToPlainText(choiceEHtml), { trimEdges: true });

        const choiceAHasImage = hasImageTag(choiceAHtml);
        const choiceBHasImage = hasImageTag(choiceBHtml);
        const choiceCHasImage = hasImageTag(choiceCHtml);
        const choiceDHasImage = hasImageTag(choiceDHtml);
        const choiceEHasImage = hasImageTag(choiceEHtml);

        const choiceLetters = ['A', 'B', 'C', 'D', 'E'];
        const choiceValues = [
            { letter: 'A', html: choiceAHtml, normalized: normalizedChoiceA, hasImage: choiceAHasImage },
            { letter: 'B', html: choiceBHtml, normalized: normalizedChoiceB, hasImage: choiceBHasImage },
            { letter: 'C', html: choiceCHtml, normalized: normalizedChoiceC, hasImage: choiceCHasImage },
            { letter: 'D', html: choiceDHtml, normalized: normalizedChoiceD, hasImage: choiceDHasImage },
            { letter: 'E', html: choiceEHtml, normalized: normalizedChoiceE, hasImage: choiceEHasImage }
        ];
        const hasChoiceContent = (choice) => Boolean(choice.normalized) || choice.hasImage;
        const filledChoices = choiceValues.filter(hasChoiceContent);
        const highestFilledIndex = Math.max(
            ...choiceValues
                .map((choice, index) => (hasChoiceContent(choice) ? index : -1))
        );
        const hasSkippedChoice = highestFilledIndex >= 0
            && choiceValues.slice(0, highestFilledIndex + 1).some((choice) => !hasChoiceContent(choice));

        if (!topic || !bloomLevel || !normalizedQuestionText || !correctAnswer) { 
            showToast({ message: 'Fill all required fields (Topic, Bloom Level, Question Text, Answer).', type: 'error' }); 
            return; 
        }
        if (filledChoices.length < 2) {
            showToast({ message: 'Provide at least two choices (e.g., A and B for True/False).', type: 'error' });
            return;
        }
        if (hasSkippedChoice) {
            showToast({ message: 'Fill choices in order without skipping letters (A through the last used choice).', type: 'error' });
            return;
        }
        if (!choiceLetters.includes(correctAnswer.toUpperCase())) {
            showToast({ message: 'Correct Answer must be between A and E.', type: 'error' });
            return;
        }
        if (!filledChoices.some((choice) => choice.letter === correctAnswer.toUpperCase())) {
            showToast({ message: 'Correct Answer must match one of the provided choices.', type: 'error' });
            return;
        }

        const incomingDuplicateKey = normalizeQuestionDuplicateKey(questionHtml);
        const duplicateQuestion = questions.find((q) => {
            if (editingQuestion && q.id === editingQuestion.id) {
                return false;
            }

            return normalizeQuestionDuplicateKey(q.content) === incomingDuplicateKey;
        });

        if (duplicateQuestion) {
            showToast({
                message: `Duplicate question detected in this topic (Question ID ${duplicateQuestion.id}).`,
                type: 'error'
            });
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
            content: questionHtml,
            questionType: 'MultipleChoice',
            bloomLevel: backendBloomLevel, // Mapped to individual backend enum: Remember, Understand, Apply, Analyze, Evaluate, Create
            points: 1,
            displayOrder: 0,
            options: filledChoices.map((choice, index) => ({
                questionId: 0,
                content: choice.html,
                isCorrect: correctIndex === index,
                displayOrder: index
            }))
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
                setQuestions(questions.map(q => q.id === editingQuestion.id
                    ? { ...savedQuestion, canEdit: true, canDelete: q.canDelete ?? savedQuestion.canDelete ?? true }
                    : q));
                showToast({ message: `Question ID ${editingQuestion.id} updated successfully.`, type: 'success' });
            } else {
                // Create new question
                console.log('➕ Creating new question...');
                savedQuestion = await apiService.createQuestion(questionData);
                
                setQuestions([...questions, { ...savedQuestion, canEdit: true, canDelete: true }]);
                showToast({ message: 'Question added successfully.', type: 'success' });
            }
            
            console.log('✅ Saved question:', savedQuestion);
            
            // Update image metadata after question is saved
            const questionId = savedQuestion.id;
            await updateQuestionImages(questionId, {
                questionHtml,
                choiceAHtml,
                choiceBHtml,
                choiceCHtml,
                choiceDHtml,
                choiceEHtml
            });
            
            // 3. Reset content fields but keep filters
            resetInputContent(); 
            
            // 4. Ensure we are in the Encoding tab to show the new history
            setActiveTab('Test Question Encoding'); 
        } catch (err) {
            console.error('❌ Failed to save question:', err);
            console.error('📄 Error response:', err.response?.data);
            console.error('📄 Error status:', err.response?.status);

            if (Number(err?.response?.status) === 409) {
                showToast({ message: 'Duplicate question detected in this topic.', type: 'error' });
                return;
            }
            
            const errorData = err.response?.data;
            const errorMessage = errorData?.message 
                || errorData?.title 
                || err.message 
                || 'Unknown error';
            
            const errorDetails = errorData?.details 
                ? `\n\nDetails:\n${errorData.details}` 
                : '';
            
            showToast({ message: `Failed to save question:\n${errorMessage}${errorDetails}\n\nCheck console for full details.`, type: 'error' });

            if (wasEditing && Number(err?.response?.status) === 403 && editingQuestion) {
                openEditRequestModal(editingQuestion);
            }
        }
    };

    useEffect(() => {
        if (activeTab !== 'Test Question Editing') return;
        void loadEditRequests();
    }, [activeTab, loadEditRequests]);

    const getRequestPriority = useCallback((request) => {
        const status = String(request?.status || '').toLowerCase();
        const hasAccess = request?.canRevoke
            || request?.permissionLevel === 'EditOnly'
            || request?.permissionLevel === 'EditDelete'
            || status === 'approved';

        if (hasAccess) return 0;
        if (status === 'pending') return 1;
        if (status === 'rejected') return 2;
        if (status === 'revoked') return 3;
        return 4;
    }, []);

    const sortRequestsByPriority = useCallback((requests) => {
        return [...requests].sort((left, right) => {
            const priorityDiff = getRequestPriority(left) - getRequestPriority(right);
            if (priorityDiff !== 0) return priorityDiff;

            const leftTime = new Date(left?.requestedAt || 0).getTime();
            const rightTime = new Date(right?.requestedAt || 0).getTime();
            return rightTime - leftTime;
        });
    }, [getRequestPriority]);

    const sortedInboxEditRequests = useMemo(
        () => sortRequestsByPriority(inboxEditRequests),
        [inboxEditRequests, sortRequestsByPriority]
    );

    const sortedSentEditRequests = useMemo(
        () => sortRequestsByPriority(sentEditRequests),
        [sentEditRequests, sortRequestsByPriority]
    );

    const inboxRequestTotalPages = Math.max(1, Math.ceil(sortedInboxEditRequests.length / EDIT_REQUESTS_PAGE_SIZE));
    const sentRequestTotalPages = Math.max(1, Math.ceil(sortedSentEditRequests.length / EDIT_REQUESTS_PAGE_SIZE));

    const pagedInboxEditRequests = useMemo(() => {
        const startIndex = (inboxRequestPageNumber - 1) * EDIT_REQUESTS_PAGE_SIZE;
        return sortedInboxEditRequests.slice(startIndex, startIndex + EDIT_REQUESTS_PAGE_SIZE);
    }, [sortedInboxEditRequests, inboxRequestPageNumber, EDIT_REQUESTS_PAGE_SIZE]);

    const pagedSentEditRequests = useMemo(() => {
        const startIndex = (sentRequestPageNumber - 1) * EDIT_REQUESTS_PAGE_SIZE;
        return sortedSentEditRequests.slice(startIndex, startIndex + EDIT_REQUESTS_PAGE_SIZE);
    }, [sortedSentEditRequests, sentRequestPageNumber, EDIT_REQUESTS_PAGE_SIZE]);

    useEffect(() => {
        setInboxRequestPageNumber(1);
    }, [sortedInboxEditRequests.length]);

    useEffect(() => {
        setSentRequestPageNumber(1);
    }, [sortedSentEditRequests.length]);
    
    // Questions are loaded based on the active tab/filter scope.
    const filteredQuestions = questions;
    const isEncodingFilterComplete = Boolean(topic);
    const isEditingFilterReady = Boolean(department);
    const historyTotalPages = Math.max(1, Math.ceil(historyTotalCount / HISTORY_PAGE_SIZE));

    const selectedDepartmentName = departments.find((d) => d.id === Number(department))?.name || 'Selected Department';
    const selectedProgramName = courses.find((c) => c.id === Number(course))?.name || 'Selected Program';
    const selectedCourseName = subjects.find((s) => s.id === Number(subject))?.name || 'Selected Course';
    const selectedTopicName = topics.find((t) => t.id === Number(topic))?.title || 'Selected Topic';

    const editingScopeLabel = topic
        ? `Topic: ${selectedTopicName}`
        : subject
            ? `Course: ${selectedCourseName}`
            : course
                ? `Program: ${selectedProgramName}`
                : `Department: ${selectedDepartmentName}`;
    const editingBloomFilterLabel = BLOOM_LEVELS.find((bl) => bl.value === editingBloomFilter)?.label || '';
    const normalizedSearchText = searchText.trim().toLowerCase();

    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const highlightMatch = (value) => {
        const text = value == null ? '' : String(value);
        if (!normalizedSearchText) return text;

        const regex = new RegExp(`(${escapeRegExp(normalizedSearchText)})`, 'ig');
        return text.split(regex).map((part, index) => (
            part.toLowerCase() === normalizedSearchText
                ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
                : part
        ));
    };
    
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

    const scrollToFirstSearchMatch = () => {
        if (!normalizedSearchText) return;
        const firstMatch = searchScopeRef.current?.querySelector('.search-highlight');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
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
        const reportItems = isAdmin
            ? ["Test Generation", "Saved Exam Sets", "Print Requests"]
            : ["Test Generation", "Saved Exam Sets"];
        const reportsNotificationCount = isAdmin ? pendingPrintRequestCount : 0;
    const isDataEntryActive = dataEntryTabs.includes(activeTab) || activeTab === 'Data Entry';
    const isReportsActive = reportItems.includes(activeTab) || activeTab === 'Reports';

    // -----------------

    return (
        <div className={`dashboard test-encoding ${isDarkMode?'dark':''}`}>
            <div className="background" style={{backgroundImage:`url(${UPHSL})`}} />
            {isMathPickerOpen && <MathSymbolPicker position={mathPickerPosition} onSelect={insertSymbol} onClose={()=>setIsMathPickerOpen(false)} />}
            <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelection}
                style={{ display: 'none' }}
            />
            
            <LogoutModal isOpen={isLogoutModalOpen} onClose={()=>setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} isDarkMode={isDarkMode} />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Confirm Delete"
                message="Are you sure you want to delete this question?"
                onCancel={handleCloseDeleteModal}
                onConfirm={handleConfirmDeleteQuestion}
                cancelText="Cancel"
                confirmText={isDeletingQuestion ? 'Deleting...' : 'Delete'}
                isLoading={isDeletingQuestion}
                isDarkMode={isDarkMode}
                isDanger={true}
            />

            <TransferOwnershipModal
                isOpen={transferQuestionModal.isOpen}
                title="Transfer Question Ownership"
                description={`Transfer ownership of Question #${transferQuestionModal.question?.id || ''} to another user.`}
                entityLabel="question"
                targetUserId={transferQuestionModal.targetUserId}
                onTargetUserIdChange={(value) => setTransferQuestionModal((prev) => ({ ...prev, targetUserId: value }))}
                users={transferUsers}
                usersLoading={isLoadingTransferUsers}
                onClose={closeTransferQuestionOwnershipModal}
                onConfirm={submitTransferQuestionOwnership}
                confirmText="Transfer Question"
                isLoading={transferQuestionModal.isSubmitting}
                isDarkMode={isDarkMode}
            />

            {isEditRequestModalOpen && (
                <div className="edit-request-modal-overlay" onClick={closeEditRequestModal}>
                    <div className={`edit-request-modal ${isDarkMode ? 'dark' : ''}`} onClick={(event) => event.stopPropagation()}>
                        <h3>Request Edit Permission</h3>
                        <p>
                            Send a request to the question owner for Question ID <strong>{editRequestTargetQuestion?.id}</strong>.
                        </p>
                        <label htmlFor="edit-request-message">Message (optional)</label>
                        <textarea
                            id="edit-request-message"
                            value={editRequestMessage}
                            onChange={(event) => setEditRequestMessage(event.target.value)}
                            placeholder="Write why you need to edit this question..."
                            maxLength={1000}
                        />
                        <div className="edit-request-modal-actions">
                            <button type="button" className="btn-cancel" onClick={closeEditRequestModal} disabled={isSubmittingEditRequest}>Cancel</button>
                            <button type="button" className="btn-confirm" onClick={submitEditRequest} disabled={isSubmittingEditRequest}>
                                {isSubmittingEditRequest ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isImageEditorOpen && (
                <div className="image-editor-overlay" role="dialog" aria-modal="true" aria-label="Image editor">
                    <div className={`image-editor-modal ${isDarkMode ? 'dark' : ''}`}>
                        <div className="image-editor-header">
                            <h2>Edit Image</h2>
                            <button className="image-editor-close" onClick={() => setIsImageEditorOpen(false)} disabled={isApplyingImageEdits}>
                                ×
                            </button>
                        </div>

                        <div className="image-editor-body">
                            <div className="image-editor-preview-wrap">
                                <div ref={imagePreviewCanvasRef} className="image-editor-preview-canvas">
                                    <img
                                        src={imageEditorSource}
                                        alt="Preview"
                                        className="image-editor-preview-image"
                                        style={{
                                            filter: `brightness(${imageEditorSettings.brightness}%) contrast(${imageEditorSettings.contrast}%) saturate(${imageEditorSettings.saturation}%) grayscale(${imageEditorSettings.grayscale}%)`,
                                            transform: `rotate(${imageEditorSettings.rotate}deg)`,
                                            width: `${getFinalImageSizePercent(imageEditorSettings.imageSize, isCropApplied, cropSelection)}%`,
                                            ...getImageAlignmentStyle(imageEditorSettings.alignment),
                                            clipPath: (isCropMode || isCropApplied)
                                                ? `inset(${cropSelection.y}% ${Math.max(0, 100 - (cropSelection.x + cropSelection.width))}% ${Math.max(0, 100 - (cropSelection.y + cropSelection.height))}% ${cropSelection.x}%)`
                                                : 'none',
                                        }}
                                    />
                                    {isCropMode && (
                                        <div className="crop-overlay-layer">
                                            <div
                                                className="crop-selection-box"
                                                style={{
                                                    left: `${cropSelection.x}%`,
                                                    top: `${cropSelection.y}%`,
                                                    width: `${cropSelection.width}%`,
                                                    height: `${cropSelection.height}%`,
                                                }}
                                                onMouseDown={(event) => startCropDrag(event, 'move')}
                                            >
                                                <span className="crop-selection-size">{Math.round(cropSelection.width)}% × {Math.round(cropSelection.height)}%</span>
                                                <span
                                                    className="crop-resize-handle crop-resize-handle-nw"
                                                    onMouseDown={(event) => startCropDrag(event, 'resize-nw')}
                                                    title="Resize crop (top-left)"
                                                />
                                                <span
                                                    className="crop-resize-handle crop-resize-handle-ne"
                                                    onMouseDown={(event) => startCropDrag(event, 'resize-ne')}
                                                    title="Resize crop (top-right)"
                                                />
                                                <span
                                                    className="crop-resize-handle crop-resize-handle-sw"
                                                    onMouseDown={(event) => startCropDrag(event, 'resize-sw')}
                                                    title="Resize crop (bottom-left)"
                                                />
                                                <span
                                                    className="crop-resize-handle crop-resize-handle-se"
                                                    onMouseDown={(event) => startCropDrag(event, 'resize-se')}
                                                    title="Resize crop (bottom-right)"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="image-editor-controls">
                                <div className="image-editor-crop-actions">
                                    <button
                                        type="button"
                                        className={`crop-toggle-btn ${isCropMode ? 'active' : ''}`}
                                        onClick={() => {
                                            setIsCropMode(prev => !prev);
                                            if (!isCropMode) {
                                                setIsCropApplied(false);
                                            }
                                        }}
                                    >
                                        {isCropMode ? 'Disable Crop Drag' : 'Enable Crop Drag'}
                                    </button>
                                    <div className="crop-action-row">
                                        <button
                                            type="button"
                                            className="crop-apply-btn"
                                            onClick={() => {
                                                setIsCropApplied(true);
                                                setIsCropMode(false);
                                            }}
                                            disabled={!isCropMode}
                                        >
                                            Crop Image
                                        </button>
                                        <button
                                            type="button"
                                            className="crop-reset-btn"
                                            onClick={resetImageEditorStateToOriginal}
                                        >
                                            Reset Crop
                                        </button>
                                        <button
                                            type="button"
                                            className="crop-reset-btn"
                                            onClick={resetImageEditorStateToOriginal}
                                        >
                                            Reset Image
                                        </button>
                                    </div>
                                    {isCropMode && <p>Drag the crop box. Use any corner handle to resize, then click Crop Image.</p>}
                                    {isCropApplied && <p className="crop-size-note">Cropped view: {Math.round(cropSelection.width)}% of original width (kept at cropped size for print).</p>}
                                </div>

                                <label>Brightness ({imageEditorSettings.brightness}%)</label>
                                <input type="range" min="50" max="150" value={imageEditorSettings.brightness} onChange={(e) => setImageEditorSettings(prev => ({ ...prev, brightness: Number(e.target.value) }))} />

                                <label>Contrast ({imageEditorSettings.contrast}%)</label>
                                <input type="range" min="50" max="150" value={imageEditorSettings.contrast} onChange={(e) => setImageEditorSettings(prev => ({ ...prev, contrast: Number(e.target.value) }))} />

                                <label>Saturation ({imageEditorSettings.saturation}%)</label>
                                <input type="range" min="0" max="200" value={imageEditorSettings.saturation} onChange={(e) => setImageEditorSettings(prev => ({ ...prev, saturation: Number(e.target.value) }))} />

                                <label>Grayscale ({imageEditorSettings.grayscale}%)</label>
                                <input type="range" min="0" max="100" value={imageEditorSettings.grayscale} onChange={(e) => setImageEditorSettings(prev => ({ ...prev, grayscale: Number(e.target.value) }))} />

                                <label>Image Width: {imageEditorSettings.imageSize}%</label>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input type="range" min="20" max="100" value={imageEditorSettings.imageSize} onChange={(e) => setImageEditorSettings(prev => ({ ...prev, imageSize: Number(e.target.value) }))} style={{ flex: 1 }} />
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                    {[25, 50, 75, 100].map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                backgroundColor: imageEditorSettings.imageSize === size ? '#2563eb' : '#e5e7eb',
                                                color: imageEditorSettings.imageSize === size ? 'white' : 'black',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: imageEditorSettings.imageSize === size ? 'bold' : 'normal',
                                            }}
                                            onClick={() => setImageEditorSettings(prev => ({ ...prev, imageSize: size }))}
                                        >
                                            {size}%
                                        </button>
                                    ))}
                                </div>

                                <label>Placement</label>
                                <div className="align-action-row">
                                    {['Left', 'Center', 'Right'].map((align) => (
                                        <button
                                            key={align}
                                            type="button"
                                            className={`align-btn ${imageEditorSettings.alignment === align ? 'active' : ''}`}
                                            onClick={() => setImageEditorSettings(prev => ({ ...prev, alignment: align }))}
                                        >
                                            {align}
                                        </button>
                                    ))}
                                </div>

                                <label>Rotate ({imageEditorSettings.rotate}°)</label>
                                <div className="rotate-action-row">
                                    <button
                                        type="button"
                                        className="rotate-btn"
                                        onClick={() => setImageEditorSettings(prev => ({ ...prev, rotate: (prev.rotate + 270) % 360 }))}
                                    >
                                        Rotate Left
                                    </button>
                                    <button
                                        type="button"
                                        className="rotate-btn"
                                        onClick={() => setImageEditorSettings(prev => ({ ...prev, rotate: (prev.rotate + 90) % 360 }))}
                                    >
                                        Rotate Right
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="image-editor-actions">
                            <button className="btn-cancel" onClick={() => setIsImageEditorOpen(false)} disabled={isApplyingImageEdits}>Cancel</button>
                            <button className="btn-confirm" onClick={applyImageEdits} disabled={isApplyingImageEdits}>{isApplyingImageEdits ? 'Applying...' : 'Apply & Insert'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="main-container">
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
                    <button
                        type="button"
                        className="navbar-menu-toggle"
                        onClick={() => setIsMobileNavOpen((prev) => !prev)}
                        aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isMobileNavOpen}
                        aria-controls="primary-navigation"
                    >
                        <span className="navbar-menu-toggle-bar" />
                        <span className="navbar-menu-toggle-bar" />
                        <span className="navbar-menu-toggle-bar" />
                    </button>
                    <div id="primary-navigation" className={`nav-center ${isMobileNavOpen ? 'mobile-open' : ''}`}>
                        <NavItem icon={Home} label="Home" isActive={activeTab==='Home'} onClick={()=>handleSetActiveTab('Home')} />
                        {user?.isAdmin && (
                            <NavItem
                                icon={Users}
                                label="Users"
                                isActive={activeTab === 'User Management'}
                                onClick={() => {
                                    handleSetActiveTab('User Management');
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
                                const targetTab = item === 'Test Encoding' ? 'Test Question Encoding' : item;
                                handleSetActiveTab(targetTab);
                                const deptCode = getActiveDepartmentCode();
                                if (item === 'Program - Topic') {
                                    navigate(`/course-topic/${deptCode}`);
                                } else if (item === 'Test Encoding' || item === 'Test Question Editing') {
                                    navigate(`/test-encoding/${deptCode}`, { state: { activeTab: targetTab } });
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
                                handleSetActiveTab(item);
                                const deptCode = getActiveDepartmentCode();
                                if (item === 'Test Generation') {
                                    navigate(`/test-generation/${deptCode}`);
                                } else if (item === 'Saved Exam Sets') {
                                    navigate(`/reports/saved-exams/${deptCode}`);
                                } else if (item === 'Print Requests') {
                                    navigate(`/test-generation/${deptCode}?view=printrequests`);
                                }
                            }}
                        />
                    </div>
                    <div className="nav-right" ref={userMenuRef}>
                        <button onClick={toggleDarkMode} className={`mode-switch ${isDarkMode?'dark':''}`}>
                            <div className="circle">{isDarkMode?<Moon size={16}/>:<Sun size={16}/>}</div>
                        </button>
                        <button onClick={()=>setIsUserMenuOpen(!isUserMenuOpen)} className={`user-btn ${isUserMenuOpen?'active':''}`}>
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
                                        <button onClick={()=>handleUserAction('User Management')}><Settings size={18}/> User Management</button>
                                        <button onClick={()=>handleUserAction('Activity Logs')}><FileText size={18}/> Activity Logs</button>
                                    </>
                                )}
                                <button onClick={()=>handleUserAction('Need Help')}><HelpCircle size={18}/> Need Help</button>
                                <button onClick={()=>handleUserAction('Edit Account')}><User size={18}/> Edit Account</button>
                                <button className="logout-btn" onClick={()=>handleUserAction('Logout')}><LogOut size={18}/> Logout</button>
                            </div>
                        )}
                    </div>
                </nav>

                {activeTab !== 'Test Question Editing' && (
                    <div className={`search-bar ${isDarkMode?'dark':''}`}>
                        <Search className="search-icon" onClick={scrollToFirstSearchMatch} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchText}
                            onChange={e=>setSearchText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    scrollToFirstSearchMatch();
                                }
                            }}
                            className={isDarkMode?'dark':''}
                        />
                    </div>
                )}

                {activeTab === 'Test Question Editing' && (
                    <BM25QuestionSearch
                        isDarkMode={isDarkMode}
                        onEditQuestion={handleEditQuestion}
                        onRequestEdit={openEditRequestModal}
                        onDeleteQuestion={handleDeleteQuestion}
                        onSearchStateChange={setIsBm25SearchActive}
                        resultsMountId="bm25-results-anchor"
                        courseId={course || undefined}
                        subjectId={subject || undefined}
                        topicId={topic || undefined}
                    />
                )}

                <div className="main-card" ref={searchScopeRef}>
                    <HeaderTitleBlock 
                        activeTab={activeTab} 
                        isDarkMode={isDarkMode} 
                        departments={departments}
                        selectedDepartmentCode={getActiveDepartmentCode()}
                        onDepartmentChange={handleDepartmentChange}
                    />
                    
                    {/* ###################################################### */}
                    {/* ################## ENCODING VIEW ##################### */}
                    {/* ###################################################### */}
                    {activeTab === 'Test Question Encoding' && (
                        <>
                            {/* Selection Fields for ENCODING (Department, Course, Subject, Topic, Bloom Level) */}
                            <div className="selection-fields encoding-filter-block">
                                <div className="encoding-filter-row top-row">
                                    {/* Program */}
                                    <div className="input-group">
                                        <label htmlFor="course">Program</label>
                                        <select id="course" value={course} onChange={e=>{setCourse(e.target.value); setSubject(''); setTopic(''); resetInputContent();}} disabled={!department || isLoadingCourses}>
                                            <option value="" disabled>{isLoadingCourses ? "Loading..." : department ? "Select Program" : "Select Department first"}</option>
                                            {courses.map(c=><option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="encoding-filter-row bottom-row">
                                    {/* Course */}
                                    <div className="input-group">
                                        <label htmlFor="subject">Course</label>
                                        <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopic(''); resetInputContent();}} disabled={!course || isLoadingSubjects}>
                                            <option value="" disabled>{isLoadingSubjects ? "Loading..." : course ? "Select Course" : "Select Program first"}</option>
                                            {subjects.map(s=><option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                        </select>
                                    </div>
                                    {/* Topic */}
                                    <div className="input-group">
                                        <label htmlFor="topic">Topic</label>
                                        <select id="topic" value={topic} onChange={e=>{setTopic(e.target.value); resetInputContent();}} disabled={!subject || isLoadingTopics}>
                                            <option value="" disabled>{isLoadingTopics ? "Loading..." : subject ? "Select Topic" : "Select Course first"}</option>
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
                            {isEncodingFilterComplete ? (
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
                                                <p className="bloom-card-count"><span style={{fontWeight:'bold'}}>{data.count}</span> Total Encoded Questions</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="filter-prompt data-summary-prompt">
                                    <p>Please select all filters (Department, Program, Course, Topic) above to start encoding and view the current **Data Summary**.</p>
                                </div>
                            )}
                            
                            <hr className="section-separator" />

                            {/* Question Block */}
                            <div className="question-block" ref={encodingFormRef}>
                                <label><FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Question</label>
                                <RichTextToolbar 
                                    onFormat={handleFormat} 
                                    onSaveRange={handleSaveRange} 
                                    activeCommands={getToolbarActiveCommands(setQuestionText)} 
                                />
                                <div 
                                    ref={questionEditorRef}
                                    contentEditable="true" 
                                    className={questionText?'content-editable-area':'content-editable-area placeholder-active'} 
                                    data-placeholder="Enter question text..." 
                                    onBlur={e=>handleNormalizeOnBlur(e,setQuestionText)} 
                                    onFocus={e=>handleFocus(e,setQuestionText)} 
                                    onClick={e=>handleEditableClick(e,setQuestionText)}
                                    onPaste={e=>handlePlainTextPaste(e,setQuestionText)}
                                    onKeyDown={handleEditorBackspace}
                                    onKeyUp={handleSaveRange} 
                                    onMouseUp={handleSaveRange} 
                                    dangerouslySetInnerHTML={{__html:questionText}}
                                />
                            </div>

                            {/* Choices */}
                            <div className="choices-grid">
                                {['A','B','C','D','E'].map((ch,index)=>{
                                    const setter=[setChoiceA,setChoiceB,setChoiceC,setChoiceD,setChoiceE][index];
                                    const content=[choiceA,choiceB,choiceC,choiceD,choiceE][index];
                                    return (
                                        <div className="choice-block" key={ch}>
                                            <label>Choice {ch}</label>
                                            <RichTextToolbar 
                                                onFormat={handleFormat} 
                                                onSaveRange={handleSaveRange} 
                                                activeCommands={getToolbarActiveCommands(setter)} 
                                            />
                                            <div 
                                                ref={[choiceAEditorRef, choiceBEditorRef, choiceCEditorRef, choiceDEditorRef, choiceEEditorRef][index]}
                                                contentEditable="true" 
                                                className={content?'content-editable-area':'content-editable-area placeholder-active'} 
                                                data-placeholder={`Enter choice ${ch}...`} 
                                                onBlur={e=>handleNormalizeOnBlur(e,setter)} 
                                                onFocus={e=>handleFocus(e,setter)} 
                                                onClick={e=>handleEditableClick(e,setter)}
                                                onPaste={e=>handlePlainTextPaste(e,setter)}
                                                onKeyDown={handleEditorBackspace}
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
                                    <span className="correct-answer-label">Select the correct answer</span>
                                    <div className="correct-answer-buttons" role="group" aria-label="Correct answer choices">
                                        {[
                                            { letter: 'A', value: choiceA, hasImage: hasImageTag(choiceA) },
                                            { letter: 'B', value: choiceB, hasImage: hasImageTag(choiceB) },
                                            { letter: 'C', value: choiceC, hasImage: hasImageTag(choiceC) },
                                            { letter: 'D', value: choiceD, hasImage: hasImageTag(choiceD) },
                                            { letter: 'E', value: choiceE, hasImage: hasImageTag(choiceE) }
                                        ].filter((choice, index, list) => {
                                            const hasContent = normalizePlainText(htmlToPlainText(choice.value), { trimEdges: true }) || choice.hasImage;
                                            if (index < 2) return true;
                                            return Boolean(hasContent) || list.slice(index + 1).some((nextChoice) => {
                                                const nextHasContent = normalizePlainText(htmlToPlainText(nextChoice.value), { trimEdges: true }) || nextChoice.hasImage;
                                                return Boolean(nextHasContent);
                                            });
                                        }).map(({ letter }) => {
                                            const isSelected = correctAnswer === letter;
                                            return (
                                                <button
                                                    key={letter}
                                                    type="button"
                                                    className={`correct-answer-button${isSelected ? ' selected' : ''}`}
                                                    onClick={() => setCorrectAnswer(prev => (prev === letter ? '' : letter))}
                                                    aria-pressed={isSelected}
                                                >
                                                    {letter}
                                                </button>
                                            );
                                        })}
                                    </div>
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
                                        onBlur={e=>handleNormalizeOnBlur(e,setExplanation)} 
                                        onFocus={e=>handleFocus(e,setExplanation)} 
                                        onClick={e=>handleEditableClick(e,setExplanation)}
                                        onPaste={e=>handlePlainTextPaste(e,setExplanation)}
                                        onKeyDown={handleEditorBackspace}
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
                            {isEncodingFilterComplete && sortedBloomLevels.length > 0 && (
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
                                                                    const hasValidCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0;
                                                                    const correctLetter = hasValidCorrectIndex ? String.fromCharCode(65 + correctIndex) : '?';
                                                                    const correctValueRaw = correctOption?.content || correctOption?.Content || correctOption?.optionText || correctOption?.text || '';
                                                                    const correctValue = String(correctValueRaw).replace(/<[^>]*>?/gm, '').trim();
                                                                    const answerValuePreview = correctValue.length > 80 ? `${correctValue.substring(0, 80)}...` : correctValue;
                                                                    const answerDisplay = answerValuePreview ? `${correctLetter} (${answerValuePreview})` : correctLetter;
                                                                    
                                                                    return (
                                                                        <tr key={q.id}>
                                                                            <td>{idx + 1}</td>
                                                                            <td>
                                                                                <div>{highlightMatch(`${(q.content || '').replace(/<[^>]*>?/gm, '').substring(0, 70)}...`)}</div>
                                                                                <small style={{color: '#666'}}>Answer: {answerDisplay}</small>
                                                                                <br />
                                                                                <small style={{color: '#666'}}>Created by: {q.createdByName || 'Unknown'}</small>
                                                                            </td>
                                                                            <td className="actions-cell">
                                                                                    {isAdmin && (
                                                                                        <button
                                                                                            className="action-request"
                                                                                            title="Transfer Ownership"
                                                                                            onClick={() => handleTransferQuestionOwnership(q)}>
                                                                                            <Users size={16} />
                                                                                        </button>
                                                                                    )}
                                                                                    {q.canEdit && (
                                                                                        <button
                                                                                            className="action-edit"
                                                                                            title="Edit"
                                                                                            onClick={() => handleEditQuestion(q)}>
                                                                                            <Edit2 size={16} />
                                                                                        </button>
                                                                                    )}
                                                                                    {!q.canEdit && (
                                                                                        <button
                                                                                            className="action-request"
                                                                                            title="Request Edit Permission"
                                                                                            onClick={() => openEditRequestModal(q)}>
                                                                                            <FileText size={16} />
                                                                                        </button>
                                                                                    )}
                                                                                    {q.canDelete && (
                                                                                        <button className="action-delete" title="Delete" onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={16} /></button>
                                                                                    )}
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
                                    <label htmlFor="course">Program</label>
                                    <select id="course" value={course} onChange={e=>{setCourse(e.target.value); setSubject(''); setTopic(''); resetInputContent();}} disabled={!department || isLoadingCourses}>
                                        <option value="" disabled>{isLoadingCourses ? "Loading..." : department ? "Select Program" : "Select Department first"}</option>
                                        {courses.map(c=><option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="subject">Course</label>
                                    <select id="subject" value={subject} onChange={e=>{setSubject(e.target.value); setTopic(''); resetInputContent();}} disabled={!course || isLoadingSubjects}>
                                        <option value="" disabled>{isLoadingSubjects ? "Loading..." : course ? "Select Course" : "Select Program first"}</option>
                                        {subjects.map(s=><option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="topic">Topic</label>
                                    <select id="topic" value={topic} onChange={e=>{setTopic(e.target.value); resetInputContent();}} disabled={!subject || isLoadingTopics}>
                                        <option value="" disabled>{isLoadingTopics ? "Loading..." : subject ? "Select Topic" : "Select Course first"}</option>
                                        {topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="editingBloomLevel">Bloom Level</label>
                                    <select id="editingBloomLevel" value={editingBloomFilter} onChange={(e) => setEditingBloomFilter(e.target.value)}>
                                        <option value="">All Bloom Levels</option>
                                        {BLOOM_LEVELS.map((bl) => (
                                            <option key={bl.id} value={bl.value}>{bl.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <hr className="section-separator" />

                            <hr className="section-separator" />

                            <div id="bm25-results-anchor" className="bm25-results-anchor" />

                            <div className="edit-requests-panel">
                                <div className="edit-requests-header">
                                    <h3>Edit Requests</h3>
                                    <button type="button" className="refresh-requests-btn" onClick={() => loadEditRequests()} disabled={isLoadingEditRequests || isResolvingEditRequest}>
                                        {isLoadingEditRequests ? 'Loading...' : 'Refresh'}
                                    </button>
                                </div>

                                <div className="edit-requests-grid">
                                    <div className="edit-request-column">
                                        <h4>Requests To You</h4>
                                        {!sortedInboxEditRequests.length ? (
                                            <p className="edit-request-empty">No pending requests.</p>
                                        ) : (
                                            <>
                                            {pagedInboxEditRequests.map((request) => {
                                                const draft = getPermissionDraft(request);
                                                const requesterName = request.requesterName || 'Unknown user';
                                                const requesterInitials = requesterName
                                                    .split(' ')
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map((part) => part.charAt(0).toUpperCase())
                                                    .join('') || 'U';
                                                const requestedAtLabel = request.requestedAt
                                                    ? new Date(request.requestedAt).toLocaleString()
                                                    : null;
                                                const normalizedStatus = String(request.status || '').toLowerCase();

                                                return (
                                                    <div key={`inbox-${request.requestId}`} className={`edit-request-card compact request-status-${normalizedStatus}`}>
                                                        <div className="request-card-header">
                                                            <div className="topic-request-identity">
                                                                <span className="requester-avatar" aria-hidden="true">{requesterInitials}</span>
                                                                <div className="topic-request-title-group">
                                                                    <p className="request-card-title"><strong>{requesterName}</strong> requested access to <span>Question #{request.questionId}</span></p>
                                                                    {requestedAtLabel ? <span className="topic-request-time">{requestedAtLabel}</span> : null}
                                                                </div>
                                                            </div>
                                                            <div className="request-card-header-actions">
                                                                <span className={`request-status-badge status-${String(request.status || '').toLowerCase()}`}>{request.status}</span>
                                                                <button
                                                                    type="button"
                                                                    className="request-card-close-btn"
                                                                    aria-label="Close request card"
                                                                    title="Delete Request"
                                                                    onClick={() => deleteRequestForOwner(request)}
                                                                    disabled={isResolvingEditRequest}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {request.message && <p className="edit-request-message"><strong>Message:</strong> {request.message}</p>}
                                                        <div className="topic-request-meta">
                                                            <span className="request-meta-pill">Type: Question</span>
                                                            <span className="request-meta-pill">Permission: {request.permissionLevel || 'None'}</span>
                                                        </div>
                                                        <div className="request-card-controls">
                                                            {!isAdmin && (
                                                                <div className="permission-checkboxes">
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={draft.canEdit}
                                                                            onChange={(event) => updatePermissionDraft(request, 'canEdit', event.target.checked)}
                                                                            disabled={isResolvingEditRequest}
                                                                        />
                                                                        Edit
                                                                    </label>
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={draft.canDelete}
                                                                            onChange={(event) => updatePermissionDraft(request, 'canDelete', event.target.checked)}
                                                                            disabled={isResolvingEditRequest || !draft.canEdit}
                                                                        />
                                                                        Delete
                                                                    </label>
                                                                </div>
                                                            )}
                                                            <div className="topic-request-actions edit-request-actions">
                                                                <button
                                                                    type="button"
                                                                    className="danger action-revoke"
                                                                    onClick={() => deleteRequestForOwner(request)}
                                                                    disabled={isResolvingEditRequest}
                                                                >
                                                                    {isAdmin ? 'Revoke Access' : 'Delete Request'}
                                                                </button>
                                                                {request.status === 'Pending' && !isAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        className="danger action-reject"
                                                                        onClick={() => resolveEditRequest(request.requestId, false)}
                                                                        disabled={isResolvingEditRequest}
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {sortedInboxEditRequests.length > EDIT_REQUESTS_PAGE_SIZE ? (
                                                <div className="history-pagination-bar">
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setInboxRequestPageNumber((prev) => Math.max(1, prev - 1))}
                                                        disabled={inboxRequestPageNumber <= 1 || isResolvingEditRequest}
                                                    >
                                                        ‹
                                                    </button>
                                                    <span className="history-pagination-info">Page {inboxRequestPageNumber} of {inboxRequestTotalPages}</span>
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setInboxRequestPageNumber((prev) => Math.min(inboxRequestTotalPages, prev + 1))}
                                                        disabled={inboxRequestPageNumber >= inboxRequestTotalPages || isResolvingEditRequest}
                                                    >
                                                        ›
                                                    </button>
                                                </div>
                                            ) : null}
                                            </>
                                        )}
                                    </div>

                                    <div className="edit-request-column">
                                        <h4>Your Requests</h4>
                                        {!sortedSentEditRequests.length ? (
                                            <p className="edit-request-empty">No requests sent yet.</p>
                                        ) : (
                                            <>
                                            {pagedSentEditRequests.map((request) => {
                                                const ownerName = request.ownerName || 'Unknown user';
                                                const ownerInitials = ownerName
                                                    .split(' ')
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map((part) => part.charAt(0).toUpperCase())
                                                    .join('') || 'U';
                                                const requestedAtLabel = request.requestedAt
                                                    ? new Date(request.requestedAt).toLocaleString()
                                                    : null;
                                                const normalizedStatus = String(request.status || '').toLowerCase();

                                                return (
                                                <div key={`sent-${request.requestId}`} className={`edit-request-card compact request-status-${normalizedStatus}`}>
                                                    <div className="request-card-header">
                                                        <div className="topic-request-identity">
                                                            <span className="requester-avatar" aria-hidden="true">{ownerInitials}</span>
                                                            <div className="topic-request-title-group">
                                                                <p className="request-card-title"><strong>You</strong> requested access to <span>Question #{request.questionId}</span></p>
                                                                {requestedAtLabel ? <span className="topic-request-time">{requestedAtLabel}</span> : null}
                                                            </div>
                                                        </div>
                                                        <div className="request-card-header-actions">
                                                            <span className={`request-status-badge status-${String(request.status || '').toLowerCase()}`}>{request.status}</span>
                                                            <button
                                                                type="button"
                                                                className="request-card-close-btn"
                                                                aria-label="Close request card"
                                                                title="Remove card"
                                                                onClick={() => dismissSentRequestCard(request.requestId)}
                                                                disabled={isResolvingEditRequest}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="topic-request-meta">
                                                        <span className="request-meta-pill">Owner: {ownerName}</span>
                                                        {request.permissionLevel === 'EditDelete' && <span className="request-meta-pill">Permission: Edit + Delete</span>}
                                                        {request.permissionLevel === 'EditOnly' && <span className="request-meta-pill">Permission: Edit Only</span>}
                                                        {request.status === 'Revoked' && <span className="request-meta-pill">Permission: Revoked by owner</span>}
                                                    </div>
                                                    {request.message && <p className="edit-request-message"><strong>Message:</strong> {request.message}</p>}
                                                </div>
                                                );
                                            })}
                                            {sortedSentEditRequests.length > EDIT_REQUESTS_PAGE_SIZE ? (
                                                <div className="history-pagination-bar">
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setSentRequestPageNumber((prev) => Math.max(1, prev - 1))}
                                                        disabled={sentRequestPageNumber <= 1 || isResolvingEditRequest}
                                                    >
                                                        ‹
                                                    </button>
                                                    <span className="history-pagination-info">Page {sentRequestPageNumber} of {sentRequestTotalPages}</span>
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setSentRequestPageNumber((prev) => Math.min(sentRequestTotalPages, prev + 1))}
                                                        disabled={sentRequestPageNumber >= sentRequestTotalPages || isResolvingEditRequest}
                                                    >
                                                        ›
                                                    </button>
                                                </div>
                                            ) : null}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {isBm25SearchActive ? (
                                null
                            ) : isEditingFilterReady ? (
                                // --- STAGE 2: Department selected, show paginated filtered list ---
                                <>
                                    {/* Filter Display Box */}
                                    <h3 className="editing-list-heading filter-display-box">
                                        Questions Encoded for: **{editingScopeLabel}**{editingBloomFilterLabel ? ` | Bloom: ${editingBloomFilterLabel}` : ''}
                                    </h3>
                                    
                                    {isLoadingQuestions ? (
                                        <div className="filter-prompt">
                                            <p>Loading questions...</p>
                                        </div>
                                    ) : filteredQuestions.length === 0 ? (
                                        <div className="filter-prompt no-questions no-data">
                                            <p>No questions found for the selected filter scope.</p>
                                        </div>
                                    ) : (
                                        <div className="question-group-section">
                                            <div className="question-editing-list">
                                                <div className="history-table-container">
                                                    <table className="history-table">
                                                        <thead>
                                                            <tr><th>ID</th><th>Question</th><th>Actions</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredQuestions.map((q) => {
                                                                const correctOption = q.options?.find(opt => opt.isCorrect);
                                                                const correctIndex = q.options?.indexOf(correctOption);
                                                                const hasValidCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0;
                                                                const correctLetter = hasValidCorrectIndex ? String.fromCharCode(65 + correctIndex) : '?';
                                                                const correctValueRaw = correctOption?.content || correctOption?.Content || correctOption?.optionText || correctOption?.text || '';
                                                                const correctValue = String(correctValueRaw).replace(/<[^>]*>?/gm, '').trim();
                                                                const answerValuePreview = correctValue.length > 80 ? `${correctValue.substring(0, 80)}...` : correctValue;
                                                                const answerDisplay = answerValuePreview ? `${correctLetter} (${answerValuePreview})` : correctLetter;

                                                                return (
                                                                    <tr key={q.id}>
                                                                        <td>{q.id}</td>
                                                                        <td>
                                                                            <div>{highlightMatch(`${(q.content || '').replace(/<[^>]*>?/gm, '').substring(0, 70)}...`)}</div>
                                                                            <small style={{ color: '#666' }}>
                                                                                Answer: {answerDisplay} | Bloom: {q.bloomLevel || 'N/A'}
                                                                            </small>
                                                                            <br />
                                                                            <small style={{ color: '#666' }}>Created by: {q.createdByName || 'Unknown'}</small>
                                                                        </td>
                                                                        <td className="actions-cell">
                                                                            {isAdmin && (
                                                                                <button
                                                                                    className="action-request"
                                                                                    title="Transfer Ownership"
                                                                                    onClick={() => handleTransferQuestionOwnership(q)}
                                                                                >
                                                                                    <Users size={16} />
                                                                                </button>
                                                                            )}
                                                                            {q.canEdit && (
                                                                                <button
                                                                                    className="action-edit"
                                                                                    title="Edit"
                                                                                    onClick={() => handleEditQuestion(q)}>
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                            )}
                                                                            {!q.canEdit && (
                                                                                <button
                                                                                    className="action-request"
                                                                                    title="Request Edit Permission"
                                                                                    onClick={() => openEditRequestModal(q)}
                                                                                >
                                                                                    <FileText size={16} />
                                                                                </button>
                                                                            )}
                                                                            {q.canDelete && (
                                                                                <button className="action-delete" title="Delete" onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={16} /></button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="history-pagination-bar">
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setHistoryPageNumber((prev) => Math.max(1, prev - 1))}
                                                        disabled={historyPageNumber <= 1 || isLoadingQuestions}
                                                    >
                                                        ‹
                                                    </button>
                                                    <span className="history-pagination-info">Page {historyPageNumber} of {historyTotalPages}</span>
                                                    <button
                                                        type="button"
                                                        className="history-pagination-btn"
                                                        onClick={() => setHistoryPageNumber((prev) => Math.min(historyTotalPages, prev + 1))}
                                                        disabled={historyPageNumber >= historyTotalPages || isLoadingQuestions}
                                                    >
                                                        ›
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // --- STAGE 1: Filter is incomplete, show a prompt ---
                                <div className="filter-prompt">
                                    <p>Please select a Department above to load questions. Program, Course, and Topic fields are optional filters.</p>
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