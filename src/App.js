import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './HomePage/HomePage';
import NotificationsPage from './components/Notifications/NotificationsPage';
import { notificationService } from './services/notificationService';
import './utils/debug'; // This will register the debug tools on window
import './App.css';

// Use the public URL path which is guaranteed to work
const logoPath = process.env.PUBLIC_URL + '/logo.png';

const App = () => {
  useEffect(() => {
    // Log notification system initialization
    console.log("Notification system initialized");
    
    // Add basic event listener for global notification updates
    const handleNotificationUpdate = () => {
      console.log("App received notification update event");
    };
    
    window.addEventListener('notification-update', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notification-update', handleNotificationUpdate);
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <img src={logoPath} alt="BlockConnect Logo" className="app-logo" />
        </div>
        <h1>BlockConnect</h1>
      </header>
      
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App; 