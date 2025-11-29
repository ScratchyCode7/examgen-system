import { useAuth } from '../contexts/AuthContext';

export default function Welcome() {
  const { logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1a1a2e',
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            backgroundColor: '#16213e',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            Logo
          </div>
          <nav style={{ display: 'flex', gap: '30px' }}>
            <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
            <div style={{ position: 'relative' }}>
              <a href="#" style={{ color: 'white', textDecoration: 'none' }}>
                Data Entry
                <span style={{ marginLeft: '5px' }}>▼</span>
              </a>
            </div>
            <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Reports</a>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>User</span>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#16213e',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}>
            👤
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 15px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px',
        backgroundColor: 'white',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* Welcome Message */}
        <div style={{
          padding: '30px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <h1 style={{ marginBottom: '10px' }}>Welcome User,</h1>
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            To the new and improved Test Data Bank System 2.0! You are now logged in. 
            This updated version offers a faster, more organized, and user-friendly experience 
            for managing exams and test items.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{
              position: 'absolute',
              left: '15px',
              fontSize: '18px'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search Program/Course..."
              style={{
                width: '100%',
                padding: '12px 15px 12px 45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* View Options */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            📋
          </button>
          <button style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            ⊞
          </button>
          <button style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            📅
          </button>
        </div>

        {/* College Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '30px',
          marginTop: '30px'
        }}>
          {/* College of Computer Studies */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #2196f3'
            }}>
              Dept. Logo
            </div>
            <h3 style={{ margin: '10px 0 5px' }}>College of Computer Studies</h3>
            <div style={{ height: '2px', backgroundColor: '#ddd', margin: '10px 0' }}></div>
          </div>

          {/* College of Criminology */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 15px',
              backgroundColor: '#fff3e0',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #ff9800'
            }}>
              Dept. Logo
            </div>
            <h3 style={{ margin: '10px 0 5px' }}>College of Criminology</h3>
            <div style={{ height: '2px', backgroundColor: '#ddd', margin: '10px 0' }}></div>
          </div>

          {/* College of Arts and Sciences */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #4caf50'
            }}>
              Dept. Logo
            </div>
            <h3 style={{ margin: '10px 0 5px' }}>College of Arts and Sciences</h3>
            <div style={{ height: '2px', backgroundColor: '#ddd', margin: '10px 0' }}></div>
          </div>
        </div>
      </main>
    </div>
  );
}

