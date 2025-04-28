import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';

const NotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Function to check for notifications and update the count
    const checkUnreadCount = async () => {
      try {
        // Get unread count using the service
        const count = await notificationService.getUnreadCount();
        console.log("NotificationBadge: Unread count:", count);
        
        setUnreadCount(count);
      } catch (error) {
        console.error("NotificationBadge: Error checking notifications:", error);
      }
    };
    
    // Check immediately
    checkUnreadCount();
    
    // Set up interval to periodically check
    const interval = setInterval(checkUnreadCount, 5000);
    
    // Listen for notification updates
    const handleNotificationUpdate = () => {
      console.log("NotificationBadge: Notification update event received");
      checkUnreadCount();
    };
    
    window.addEventListener('notification-update', handleNotificationUpdate);
    
    // Clean up
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-update', handleNotificationUpdate);
    };
  }, []);
  
  return (
    <div className="nav-icon-container">
      <Link to="/notifications">
        <Bell size={22} />
        {unreadCount > 0 && (
          <div className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </Link>
    </div>
  );
};

export default NotificationBadge; 