export const Header = () => {

  return (
    <header style={{
      backgroundColor: '#1a365d',
      color: 'white',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Logo Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#2c5282',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Stack of papers */}
          <div style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            backgroundColor: '#63b3ed',
            borderRadius: '2px',
            transform: 'rotate(-5deg)'
          }}></div>
          <div style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            backgroundColor: '#90cdf4',
            borderRadius: '2px',
            transform: 'rotate(2deg) translateY(-2px)'
          }}></div>
          {/* Pencil */}
          <div style={{
            position: 'absolute',
            width: '4px',
            height: '20px',
            backgroundColor: '#fbbf24',
            borderRadius: '2px',
            transform: 'rotate(45deg) translate(8px, -8px)'
          }}></div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: '0.75rem',
          lineHeight: '1.2'
        }}>
          <span style={{ fontWeight: 'bold' }}>TEST</span>
          <span style={{ fontWeight: 'bold' }}>DATA BANK</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Home</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Data Entry</a>
          <span style={{ fontSize: '0.75rem' }}>▼</span>
        </div>
        <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Reports</a>
      </nav>

      {/* User Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '24px',
          backgroundColor: '#2c5282',
          borderRadius: '12px',
          position: 'relative',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            left: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'left 0.3s'
          }}></div>
        </div>
        <span style={{ fontSize: '0.95rem' }}>User</span>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#2c5282',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'white',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#1a365d'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '16px',
              height: '8px',
              borderRadius: '8px 8px 0 0',
              backgroundColor: '#1a365d'
            }}></div>
          </div>
        </div>
        <span style={{ cursor: 'pointer' }}>▼</span>
      </div>
    </header>
  );
};

