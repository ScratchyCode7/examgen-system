import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/Login.css';
import logo from '../assets/TDB logo.png';
import bgImage from '../assets/uphsl.png';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const isFormComplete = username.length > 0 && password.length > 0;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      // Navigate based on admin status
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div
        className="login-bg"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      ></div>
      <div className="login-overlay"></div>

      <form onSubmit={handleLogin} className="login-box">
        <div className="login-content">
          <img
            src={logo}
            alt="TDB Logo"
            className="login-logo"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/1C4DA1/FFFFFF?text=TDB' }}
          />
          <div className="login-line" />

          <h1 className="login-title">Login</h1>

          {error && <div className="login-message" style={{ color: '#b91c1c', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

          <label htmlFor="username">Username or Email</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username or email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <button type="button" className="forgot-password" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dark)', marginBottom: '1.5rem', textDecoration: 'none' }}>Forgot Password?</button>

          <button type="submit" disabled={!isFormComplete || loading} className="login-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="contact-us">
            Don't have an account?
            <button type="button" style={{ background: 'none', border: 'none', padding: 0, marginLeft: '0.25rem', fontWeight: '500', color: 'var(--secondary-yellow)', cursor: 'pointer', textDecoration: 'none' }}>Contact Us</button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
