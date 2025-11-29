import { useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { CollegeCard } from '../components/CollegeCard';

export const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');

  const colleges = [
    {
      name: 'College of Computer Studies',
      logo: {
        backgroundColor: '#63b3ed',
        icon: (
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.3)',
            position: 'relative'
          }}>
            {/* Circuit board pattern / head icon */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              border: '2px solid white',
              borderRadius: '50%'
            }}></div>
          </div>
        ),
        text: 'UNIVERSITY OF PERPETUAL HELP SYSTEM\nCOLLEGE OF COMPUTER STUDIES'
      }
    },
    {
      name: 'College of Criminology',
      logo: {
        backgroundColor: '#f97316',
        icon: (
          <div style={{ color: '#fbbf24', fontSize: '3rem' }}>⚖️</div>
        ),
        text: 'UNIVERSITY OF PERPETUAL HELP LAGUNA\nCOLLEGE OF CRIMINOLOGY'
      }
    },
    {
      name: 'College of Arts and Sciences',
      logo: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        icon: (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <span>🧪</span>
            <span>📖</span>
          </div>
        ),
        text: 'UNIVERSITY OF PERPETUAL HELP LAGUNA\nCOLLEGE OF ARTS AND SCIENCES'
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{
          flex: 1,
          padding: '2rem',
          backgroundColor: '#f7fafc'
        }}>
          {/* Welcome Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#1a365d'
            }}>
              Welcome User,
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#4a5568',
              lineHeight: '1.6',
              margin: 0
            }}>
              To the new and improved Test Data Bank System 2.0! You are now logged in. 
              This updated version offers a faster, more organized, and user-friendly experience 
              for managing exams and test items.
            </p>
          </div>

          {/* Search Bar */}
          <div style={{
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            <input
              type="text"
              placeholder="Search Program/Course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 3rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.25rem'
            }}>
              🔍
            </span>
          </div>

          {/* Colleges/Programs Section */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1a365d',
                margin: 0
              }}>
                Colleges/Programs
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    backgroundColor: viewMode === 'list' ? '#e2e8f0' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.25rem'
                  }}
                >
                  ☰
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    backgroundColor: viewMode === 'grid' ? '#e2e8f0' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.25rem'
                  }}
                >
                  ⊞
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    backgroundColor: viewMode === 'calendar' ? '#e2e8f0' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.25rem'
                  }}
                >
                  📅
                </button>
              </div>
            </div>

            {viewMode === 'grid' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {colleges.map((college, index) => (
                  <CollegeCard key={index} {...college} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
