import React, { useState, useRef, useEffect } from 'react';

const DropdownNavItem = ({
  icon: Icon,
  label,
  dropdownItems = [],
  isActive,
  onSelect = () => {},
  parentNotificationCount = 0,
  itemNotificationCounts = {}
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const normalizedParentCount = Number(parentNotificationCount) || 0;

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={`dropdown-nav-item ${open ? 'open' : ''} ${isActive ? 'active' : ''}`} ref={ref} style={{ position: 'relative' }}>
      <button className="dropdown-btn" onClick={() => setOpen(prev => !prev)}>
        {Icon && <Icon className="nav-icon" />}
        <span className="nav-label-with-badge">
          <span className="nav-label">{label}</span>
          {normalizedParentCount > 0 && (
            <span className="nav-notification-badge" aria-label={`${normalizedParentCount} notifications`}>
              {normalizedParentCount}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="dropdown-menu" style={{ left: 0 }}>
          {dropdownItems.map((item) => {
            const itemLabel = typeof item === 'string' ? item : item?.label;
            const rawCount = typeof item === 'object' && item !== null
              ? item.notificationCount
              : itemNotificationCounts[itemLabel];
            const itemCount = Number(rawCount) || 0;

            return (
              <button
                key={itemLabel}
                className="dropdown-menu-item"
                onClick={() => { onSelect(itemLabel); setOpen(false); }}
              >
                <span>{itemLabel}</span>
                {itemCount > 0 && (
                  <span className="nav-notification-badge dropdown-item-badge" aria-label={`${itemCount} notifications`}>
                    {itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DropdownNavItem;
