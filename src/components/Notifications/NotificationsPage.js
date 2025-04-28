import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import './NotificationsPage.css';
import { toast } from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchNotifications();
    
    // Add event listener for notification updates
    const handleNotificationUpdate = () => {
      console.log("NotificationsPage: Notification update event received");
      fetchNotifications();
    };
    
    window.addEventListener('notification-update', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notification-update', handleNotificationUpdate);
    };
  }, []);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Get notifications using the service
      const notifs = await notificationService.getNotifications();
      console.log("Fetched notifications:", notifs);
      
      // Set to state
      setNotifications(notifs);
      
      // Mark all as read
      if (notifs.length > 0) {
        await notificationService.markAllAsRead();
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const showRawStorageData = () => {
    try {
      const notificationsData = JSON.parse(localStorage.getItem('notifications') || '{}');
      console.log("Raw notifications data in localStorage:", notificationsData);
      
      notificationService.getCurrentUserAddress().then(address => {
        if (address) {
          console.log(`Looking for notifications for address: ${address}`);
          console.log(`Found: ${JSON.stringify(notificationsData[address] || [])}`);
        } else {
          console.log("Could not determine current user address");
        }
      });
      
      // Also check userSession and userData
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      console.log("userSession:", userSession);
      console.log("userData:", userData);
      
      toast.success("Debug data logged to console");
    } catch (error) {
      console.error("Error viewing raw storage data:", error);
      toast.error("Error viewing debug data");
    }
  };
  
  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="back-button" onClick={() => navigate(-1)}>
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
          <Bell size={48} />
          <h3>No notifications yet</h3>
          <p>When you get notifications, they'll show up here</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            >
              <div className="notification-icon">
                {notification.type === 'like' && <div className="like-icon">❤️</div>}
                {notification.type === 'comment' && <div className="comment-icon">💬</div>}
                {notification.type === 'follow' && <div className="follow-icon">👤</div>}
                {notification.type === 'test' && <div className="test-icon">🔔</div>}
                {!['like', 'comment', 'follow', 'test'].includes(notification.type) && (
                  <div className="default-icon">🔔</div>
                )}
              </div>
              <div className="notification-content">
                <p>{notification.message}</p>
                <span className="notification-time">{formatTime(notification.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Debug buttons in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="debug-controls">
          <button 
            onClick={() => notificationService.createTestNotification()}
            className="debug-button"
          >
            Create Test Notification
          </button>
          <button 
            onClick={() => {
              notificationService.debugNotificationsForUser();
              fetchNotifications();
            }}
            className="debug-button"
          >
            Debug Notifications
          </button>
          <button 
            onClick={() => {
              window.blockConnectDebug.clearAllNotifications();
              fetchNotifications();
            }}
            className="debug-button"
          >
            Clear All Notifications
          </button>
          <button 
            onClick={showRawStorageData}
            className="debug-button"
          >
            Show Raw Storage Data
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 