import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadCsv from './pages/UploadCsv';
import UploadJson from './pages/UploadJson';
import ManualInput from './pages/ManualInput';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/Auth/RequireAuth';

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/home"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/upload"
              element={
                <RequireAuth>
                  <Upload />
                </RequireAuth>
              }
            />
            <Route
              path="/upload/csv"
              element={
                <RequireAuth>
                  <UploadCsv />
                </RequireAuth>
              }
            />
            <Route
              path="/upload/json"
              element={
                <RequireAuth>
                  <UploadJson />
                </RequireAuth>
              }
            />
            <Route
              path="/manual"
              element={
                <RequireAuth>
                  <ManualInput />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;