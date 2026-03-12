// App changes (Dec 8-9, 2025): wrapped application with ThemeProvider
// to enable a persistent dark-mode preference across all pages.
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import PrintAccessControl from './components/PrintAccessControl';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import CourseTopic from './pages/CourseTopic';
import TestEncodingAndEditing from './pages/TestEncodingAndEditing';
import TestGeneration from './pages/TestGeneration';
import SavedExamsReport from './pages/SavedExamsReport';
import ActivityLogs from './pages/ActivityLogs';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <PrintAccessControl />
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
            path="/course-topic/:departmentCode"
            element={
              <ProtectedRoute>
                <CourseTopic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-encoding/:departmentCode"
            element={
              <ProtectedRoute>
                <TestEncodingAndEditing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-generation/:departmentCode?"
            element={
              <ProtectedRoute>
                <TestGeneration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/saved-exams/:departmentCode?"
            element={
              <ProtectedRoute>
                <SavedExamsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute requireAdmin={true}>
                <ActivityLogs />
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
