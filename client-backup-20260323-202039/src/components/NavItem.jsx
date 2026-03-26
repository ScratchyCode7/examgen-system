import React from 'react';

const NavItem = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <div
      role="button"
      onClick={onClick}
      className={`nav-item ${isActive ? 'active' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      {Icon && <Icon className="nav-icon" />}
      <span className="nav-label">{label}</span>
    </div>
  );
};

export default NavItem;
