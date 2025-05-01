import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Heart, MessageSquare, UserPlus, AtSign, Mail, AlertCircle, Check } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import './Notifications.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAddress, setCurrentAddress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      // Get current user address
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.walletAddress) {
        setCurrentAddress(userData.walletAddress);
        
        // Fetch notifications from the updated notificationService
        const notifs = await notificationService.getNotifications(userData.walletAddress);
        setNotifications(notifs);
        
        // Mark all as read
        await notificationService.markAllAsRead(userData.walletAddress);
      }
      
      setLoading(false);
    };
    
    initialize();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(currentAddress, notification.id);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case notificationService.notificationTypes.LIKE:
      case notificationService.notificationTypes.COMMENT:
      case notificationService.notificationTypes.MENTION:
        navigate(`/post/${notification.postId}`);
        break;
      case notificationService.notificationTypes.FOLLOW:
      case notificationService.notificationTypes.FOLLOW_REQUEST:
        navigate(`/profile/${notification.sourceUser}`);
        break;
      case notificationService.notificationTypes.MESSAGE:
        navigate(`/messages`);
        break;
      default:
        // System notifications don't navigate
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case notificationService.notificationTypes.LIKE:
        return <Heart size={20} className="notification-icon like" />;
      case notificationService.notificationTypes.COMMENT:
        return <MessageSquare size={20} className="notification-icon comment" />;
      case notificationService.notificationTypes.FOLLOW:
      case notificationService.notificationTypes.FOLLOW_REQUEST:
        return <UserPlus size={20} className="notification-icon follow" />;
      case notificationService.notificationTypes.MENTION:
        return <AtSign size={20} className="notification-icon mention" />;
      case notificationService.notificationTypes.MESSAGE:
        return <Mail size={20} className="notification-icon message" />;
      case notificationService.notificationTypes.SYSTEM:
        return <AlertCircle size={20} className="notification-icon system" />;
      default:
        return <Bell size={20} className="notification-icon" />;
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notifTime) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)}d`;
    } else {
      return notifTime.toLocaleDateString();
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <h2>Notifications</h2>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="no-notifications">
          <Bell size={40} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon-container">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-message">
                  {notification.content || (
                    <>
                      {notification.type === notificationService.notificationTypes.LIKE && (
                        <span><strong>{notification.sourceUser}</strong> liked your post {notification.postPreview ? `"${notification.postPreview}"` : ""}</span>
                      )}
                      {notification.type === notificationService.notificationTypes.COMMENT && (
                        <span><strong>{notification.sourceUser}</strong> commented on your post</span>
                      )}
                      {notification.type === notificationService.notificationTypes.FOLLOW && (
                        <span><strong>{notification.sourceUser}</strong> started following you</span>
                      )}
                      {notification.type === notificationService.notificationTypes.FOLLOW_REQUEST && (
                        <span><strong>{notification.sourceUser}</strong> requested to follow you</span>
                      )}
                      {notification.type === notificationService.notificationTypes.MESSAGE && (
                        <span>New message from <strong>{notification.sourceUser}</strong></span>
                      )}
                      {notification.type === notificationService.notificationTypes.SYSTEM && (
                        <span>{notification.message || "System notification"}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="notification-time">
                  {formatTime(notification.timestamp)}
                </div>
              </div>
              {notification.read && (
                <div className="read-indicator">
                  <Check size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 