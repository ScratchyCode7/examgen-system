import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use email as username for login
      await login({ username: email, password });
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || 'Login failed. Please check your credentials and ensure the backend is running.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/background.jpg)', // You'll need to add a background image
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: 'overlay',
      backgroundColor: 'rgba(0, 50, 100, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '450px',
        padding: '2.5rem',
        position: 'relative'
      }}>
        {/* Header with Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000' }}>TEST</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000' }}>DATA BANK</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginLeft: 'auto'
          }}>
            {/* Database Icon */}
            <div style={{
              width: '24px',
              height: '24px',
              backgroundColor: '#0066cc',
              borderRadius: '50% 50% 0 0',
              position: 'relative'
            }}></div>
            {/* Pencil Icon */}
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#ffcc00',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: 'rotate(-45deg)'
            }}></div>
            {/* Document Icon */}
            <div style={{
              width: '18px',
              height: '24px',
              backgroundColor: '#0066cc',
              border: '2px solid #ffcc00',
              borderRadius: '2px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '2px',
                right: '2px',
                height: '2px',
                backgroundColor: '#ffcc00'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '2px',
                right: '2px',
                height: '2px',
                backgroundColor: '#ffcc00'
              }}></div>
            </div>
          </div>
        </div>

        <h2 style={{
          marginBottom: '1.5rem',
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#000'
        }}>Login</h2>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.95rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@uphsl.edu.ph"
              required
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0066cc'}
              onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.95rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  paddingRight: '3rem',
                  border: '1px solid #d0d0d0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                onBlur={(e) => e.target.style.borderColor = '#d0d0d0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '1.25rem', color: '#666' }}>👁️</span>
              </button>
            </div>
          </div>

          <div style={{
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <a href="#" style={{
              color: '#000',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}>
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#4a5568',
              background: 'linear-gradient(to bottom, #4a5568, #2d3748)',
              color: 'white',
              border: '1px solid #718096',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
              marginBottom: '1.5rem'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          Don't have an account?{' '}
          <a href="#" style={{
            color: '#ff8c00',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
};
