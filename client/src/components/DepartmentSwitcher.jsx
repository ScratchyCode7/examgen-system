import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import '../styles/DepartmentSwitcher.css';

/**
 * DepartmentSwitcher component
 * Allows users with multiple department assignments to switch their active department context
 * Admins can access all departments
 */
const DepartmentSwitcher = ({ onDepartmentChange }) => {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { departmentCode } = useParams();

  useEffect(() => {
    const onDoc = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setOpen(false); 
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    // Load user's departments and restore active selection
    const loadDepartments = async () => {
      try {
        setLoading(true);
        
        // Get department IDs from user object or JWT claims
        const departmentIds = user?.departmentIds || [];
        
        if (departmentIds.length === 0 && !isAdmin) {
          setDepartments([]);
          setLoading(false);
          return;
        }

        // Fetch department details
        // If admin, fetch all departments; otherwise fetch user's assigned departments
        const data = isAdmin 
          ? await apiService.getDepartments()
          : await apiService.getUserDepartments(user?.userId);

        setDepartments(data);
        
        // Try to match URL's departmentCode to a department
        if (departmentCode && data.length > 0) {
          const matchedDept = data.find(d => d.code === departmentCode);
          if (matchedDept) {
            setActiveDepartmentId(matchedDept.id);
            localStorage.setItem('activeDepartmentId', matchedDept.id.toString());
            return;
          }
        }
        
        // Restore or set default active department
        const savedDeptId = localStorage.getItem('activeDepartmentId');
        if (savedDeptId && data.some(d => d.id === parseInt(savedDeptId))) {
          setActiveDepartmentId(parseInt(savedDeptId));
        } else if (data.length > 0) {
          setActiveDepartmentId(data[0].id);
          localStorage.setItem('activeDepartmentId', data[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadDepartments();
    }
  }, [user, isAdmin, departmentCode]);

  const handleDepartmentSelect = (department) => {
    setActiveDepartmentId(department.id);
    localStorage.setItem('activeDepartmentId', department.id.toString());
    setOpen(false);
    
    // Update URL if current route contains departmentCode param
    if (departmentCode) {
      const currentPath = window.location.pathname;
      const newPath = currentPath.replace(`/${departmentCode}`, `/${department.code}`);
      navigate(newPath, { replace: true });
    }
    
    if (onDepartmentChange) {
      onDepartmentChange(department);
    }
  };

  if (loading || !user) {
    return null;
  }

  // Don't show switcher if user has only one department and is not admin
  if (departments.length <= 1 && !isAdmin) {
    return null;
  }

  const activeDepartment = departments.find(d => d.id === activeDepartmentId);

  return (
    <div className="department-switcher" ref={ref} style={{ position: 'relative' }}>
      <button 
        className="department-switcher-btn"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Switch department"
      >
        <span className="department-icon">🏛️</span>
        <span className="department-name">
          {activeDepartment?.name || activeDepartment?.code || 'Select Department'}
        </span>
        <span className="dropdown-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && departments.length > 0 && (
        <div className="department-dropdown">
          {departments.map(dept => (
            <button
              key={dept.id}
              className={`department-dropdown-item ${dept.id === activeDepartmentId ? 'active' : ''}`}
              onClick={() => handleDepartmentSelect(dept)}
            >
              <span className="dept-name">{dept.name}</span>
              <span className="dept-code">{dept.code}</span>
              {dept.id === activeDepartmentId && <span className="check-mark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentSwitcher;
