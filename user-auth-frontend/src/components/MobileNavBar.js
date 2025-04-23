import React from 'react';
import { Home, Search, Bell, User, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { messageService } from '../services/messageService';
import './MobileNavBar.css';

const MobileNavBar = () => {
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [messageCount, setMessageCount] = React.useState(0);
  const location = useLocation();
  
  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.walletAddress) {
          const notifCount = await notificationService.getUnreadCount(userData.walletAddress);
          setNotificationCount(notifCount);
          
          const msgCount = await messageService.getUnreadCount();
          setMessageCount(msgCount);
        }
      } catch (error) {
        console.error("Error fetching notification counts:", error);
      }
    };
    
    fetchCounts();
    
    // Set up interval to check for new notifications
    const interval = setInterval(fetchCounts, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Only show on mobile devices
  if (window.innerWidth > 768) return null;
  
  return (
    <div className="mobile-navbar">
      <Link to="/home" className={`mobile-nav-item ${location.pathname === '/home' ? 'active' : ''}`}>
        <Home size={24} />
      </Link>
      <Link to="/search" className={`mobile-nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
        <Search size={24} />
      </Link>
      <Link to="/notifications" className={`mobile-nav-item ${location.pathname === '/notifications' ? 'active' : ''}`}>
        <Bell size={24} />
        {notificationCount > 0 && (
          <div className="nav-badge">{notificationCount}</div>
        )}
      </Link>
      <Link to="/messages" className={`mobile-nav-item ${location.pathname === '/messages' ? 'active' : ''}`}>
        <MessageSquare size={24} />
        {messageCount > 0 && (
          <div className="nav-badge">{messageCount}</div>
        )}
      </Link>
      <Link to="/profile" className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <User size={24} />
      </Link>
    </div>
  );
};

export default MobileNavBar; 