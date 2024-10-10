// src/App.tsx
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate} from 'react-router-dom';
import Auth from './Components/Auth/Auth';
import Dashboard from './Components/Dashboard/Dashboard';
import Navbar from './Components/Navbar/Navbar';
import Notifications from './Components/Notifications/Notifications';
import './App.css';
import Profile from './Components/Profile/profile';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className="App">
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Auth onAuthSuccess={() => setIsAuthenticated(true)} />} />
            {/* <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" />} /> */}
            <Route path="/notifications" element={ <Notifications /> } />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            {/* <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} /> */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            {/* <Route path='*' element={isAuthenticated?(<div>Error: This endpoint does not exist</div>) : (<Navigate to='/login' />)} /> */}
            <Route path='*' element={<div>Error: This endpoint does not exist</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
