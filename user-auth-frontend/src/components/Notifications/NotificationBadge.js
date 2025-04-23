import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';

const NotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.walletAddress) {
          const count = await notificationService.getUnreadCount(userData.walletAddress);
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Error fetching unread notification count:", error);
      }
    };
    
    fetchUnreadCount();
    
    // Set up interval to check for new notifications
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Link to="/notifications" className="notification-icon">
      <div className="nav-icon-container">
        <Bell size={22} />
        {unreadCount > 0 && (
          <div className="notification-badge">{unreadCount}</div>
        )}
      </div>
    </Link>
  );
};

export default NotificationBadge; 