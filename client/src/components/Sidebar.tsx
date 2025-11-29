export const Sidebar = () => {
  return (
    <aside style={{
      width: '250px',
      backgroundColor: '#1a365d',
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(44, 82, 130, 0.1) 10px, rgba(44, 82, 130, 0.1) 20px)',
      minHeight: 'calc(100vh - 70px)',
      padding: '1.5rem',
      boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
    }}>
      {/* Sidebar content can be added here */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Navigation items can be added here */}
      </nav>
    </aside>
  );
};

