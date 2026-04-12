import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/Login.css';
import logo from '../assets/TDB logo.png';
import bgImage from '../assets/uphsl.png';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const LOGIN_GUARD_STORAGE_KEY = 'loginGuardState';
const LOGIN_COOLDOWN_SECONDS = 60;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { login, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const persistLoginGuardState = (nextState) => {
    localStorage.setItem(LOGIN_GUARD_STORAGE_KEY, JSON.stringify(nextState));
  };

  const clearLoginGuardState = () => {
    localStorage.removeItem(LOGIN_GUARD_STORAGE_KEY);
    setFailedAttempts(0);
    setCooldownRemaining(0);
  };

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

  useEffect(() => {
    const stored = localStorage.getItem(LOGIN_GUARD_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      const nextAttempts = Number(parsed?.failedAttempts) || 0;
      const lockUntil = Number(parsed?.lockUntil) || 0; 

      setFailedAttempts(nextAttempts);

      if (lockUntil > now) {
        setCooldownRemaining(Math.ceil((lockUntil - now) / 1000));
      } else if (lockUntil) {
        persistLoginGuardState({ failedAttempts: nextAttempts, lockUntil: 0 });
      }
    } catch {
      clearLoginGuardState();
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const intervalId = window.setInterval(() => {
      setCooldownRemaining((previous) => {
        if (previous <= 1) {
          const stored = localStorage.getItem(LOGIN_GUARD_STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              persistLoginGuardState({
                failedAttempts: Number(parsed?.failedAttempts) || 0,
                lockUntil: 0,
              });
            } catch {
              clearLoginGuardState();
            }
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownRemaining]);

  const isFormComplete = username.trim().length > 0 && password.trim().length > 0;
  const isCooldownActive = cooldownRemaining > 0;

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isCooldownActive) {
      const message = `Too many failed attempts. Try again in ${cooldownRemaining}s.`;
      setError(message);
      showToast({ message, type: 'error' });
      return;
    }

    if (!isFormComplete) {
      const message = 'Please enter your username and password.';
      setError(message);
      showToast({ message, type: 'error' });
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login({ username, password });

      clearLoginGuardState();
      showToast({ message: 'Login successful. Redirecting you to your dashboard.', type: 'success' });
      // Navigate based on admin status
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setPassword('');
      setShowPassword(false);

      const nextFailedAttempts = failedAttempts + 1;
      let nextCooldown = 0;

      if (nextFailedAttempts >= 3) {
        const lockUntil = Date.now() + (LOGIN_COOLDOWN_SECONDS * 1000);
        nextCooldown = LOGIN_COOLDOWN_SECONDS;
        setFailedAttempts(0);
        setCooldownRemaining(nextCooldown);
        persistLoginGuardState({ failedAttempts: 0, lockUntil });
      } else {
        setFailedAttempts(nextFailedAttempts);
        persistLoginGuardState({ failedAttempts: nextFailedAttempts, lockUntil: 0 });
      }

      const statusCode = err?.response?.status;
      const problemDetail = err?.response?.data?.detail;
      if (statusCode === 409) {
        const conflictMessage =
          err.response?.data?.message ||
          'This account is already logged in on another device.';
        setError(conflictMessage);
        showToast({ message: conflictMessage, type: 'error' });
        console.warn('Login blocked due to active session:', err);
        return;
      }

      if (statusCode === 423) {
        const lockedMessage = problemDetail
          || 'This account has been temporarly locked due to multiple incorrect login attemps please contact ITS for support.';
        setError(lockedMessage);
        showToast({ message: lockedMessage, type: 'error' });
        clearLoginGuardState();
        return;
      }

      const rawErrorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        '';

      const invalidCredentialsMessage = 'Wrong username or password.';
      const networkMessage = 'Unable to connect to the server. Please try again.';
      const isAuthFailureStatus = [400, 401, 403, 404].includes(Number(statusCode));
      const isLikelyCredentialIssue = isAuthFailureStatus
        || rawErrorMessage.toLowerCase().includes('password')
        || rawErrorMessage.toLowerCase().includes('username')
        || rawErrorMessage.toLowerCase().includes('invalid');

      const messageToShow = nextCooldown > 0
        ? `Too many failed attempts. Login is disabled for ${LOGIN_COOLDOWN_SECONDS} seconds.`
        : (isLikelyCredentialIssue
            ? invalidCredentialsMessage
        : (rawErrorMessage || networkMessage));

      setError(messageToShow);
      console.error('Login failed:', err);
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
          {isCooldownActive && (
            <div className="login-message" style={{ color: '#854d0e', backgroundColor: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '1rem' }}>
              Login temporarily disabled. Please wait {cooldownRemaining}s.
            </div>
          )}

          <label htmlFor="username">Username or Email</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username or email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <button type="submit" disabled={loading || isCooldownActive} className="login-button">
            {loading ? 'Logging in...' : isCooldownActive ? `Try again in ${cooldownRemaining}s` : 'Login'}
          </button>

          <p className="contact-us">
            Don't have an account?
            <a className="contact-link" href="mailto:c20-0461-159@uphsl.edu.ph">Contact Us</a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
