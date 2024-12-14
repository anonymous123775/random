// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Auth from './Components/Auth/Auth';
import Dashboard from './Components/Dashboard/Dashboard';
import Navbar from './Components/Navbar/Navbar';
import Notifications from './Components/Notifications/Notifications';
import NotificationProvider from './NotificationContext';
import './App.css';
import ProfilePage from './Components/Profile/ProfilePage';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <Router>
      <div className="App">
        {isAuthenticated ? (
          <NotificationProvider>
            <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            <div className="main-content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </div>
          </NotificationProvider>
        ) : (
          <div className="main-content">
            <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            <Routes>
              <Route path="/login" element={<Auth onAuthSuccess={() => setIsAuthenticated(true)} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;
