import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import CourseTopic from './pages/CourseTopic';
import TestEncodingAndEditing from './pages/TestEncodingAndEditing';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course-topic"
            element={
              <ProtectedRoute>
                <CourseTopic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-encoding"
            element={
              <ProtectedRoute>
                <TestEncodingAndEditing />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
