import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "react-feather";
import { notificationService } from "../../services/notificationService";
import "./Notifications.css";

const NotificationBadge = ({ count = 0, showText = false, isLink = true, wrapInLink = true }) => {
  const [notificationCount, setNotificationCount] = useState(count);
  
  useEffect(() => {
    // Function to fetch notification count
    const fetchNotificationCount = async () => {
      try {
        // Get current user data
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        
        if (userData.walletAddress || userSession.address) {
          const address = userData.walletAddress || userSession.address;
          const unreadCount = await notificationService.getUnreadCount(address);
          setNotificationCount(unreadCount);
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    // Fetch initial count
    fetchNotificationCount();
    
    // Set up interval to check for new notifications every 30 seconds
    const intervalId = setInterval(fetchNotificationCount, 30000);
    
    // Set up event listener for new notifications
    const handleNewNotification = () => {
      fetchNotificationCount();
    };
    
    // Listen for custom events
    window.addEventListener('new-notification', handleNewNotification);
    window.addEventListener('notifications-updated', handleNewNotification);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('new-notification', handleNewNotification);
      window.removeEventListener('notifications-updated', handleNewNotification);
    };
  }, []);

  const badgeContent = (
    <div className="nav-icon-container">
      <Bell size={20} color="currentColor" className="notification-icon" />
      {notificationCount > 0 && <div className="notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</div>}
      {showText && <span className="notification-text">Notifications</span>}
    </div>
  );

  // For backward compatibility
  const shouldWrapInLink = wrapInLink !== undefined ? wrapInLink : isLink;

  if (shouldWrapInLink) {
    return (
      <Link to="/notifications" className="notification-link">
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
};

export default NotificationBadge;