import React, { useState, useRef, useEffect } from 'react';

const DropdownNavItem = ({ icon: Icon, label, dropdownItems = [], isActive, onSelect = () => {} }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={`dropdown-nav-item ${open ? 'open' : ''} ${isActive ? 'active' : ''}`} ref={ref} style={{ position: 'relative' }}>
      <button className="dropdown-btn" onClick={() => setOpen(prev => !prev)}>
        {Icon && <Icon className="nav-icon" />}
        <span className="nav-label">{label}</span>
      </button>

      {open && (
        <div className="dropdown-menu" style={{ left: 0 }}>
          {dropdownItems.map(it => (
            <button
              key={it}
              className="dropdown-menu-item"
              onClick={() => { onSelect(it); setOpen(false); }}
            >
              {it}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownNavItem;
