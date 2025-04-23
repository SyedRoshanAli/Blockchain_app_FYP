import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, User, ArrowLeft, CheckCircle } from 'lucide-react';
import './NotificationsPage.css';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = () => {
        try {
            setLoading(true);
            
            // Get current user's username
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const currentUsername = userSession.username || userData.username;
            
            if (!currentUsername) {
                setNotifications([]);
                setLoading(false);
                return;
            }
            
            // Get notifications for this user
            const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
            const userNotifications = allNotifications[currentUsername] || [];
            
            // Sort by newest first
            userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            setNotifications(userNotifications);
            
            // Mark all as read
            const updatedNotifications = userNotifications.map(notif => ({
                ...notif,
                read: true
            }));
            
            allNotifications[currentUsername] = updatedNotifications;
            localStorage.setItem('notifications', JSON.stringify(allNotifications));
            
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return `${diffSec}s ago`;
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        
        return date.toLocaleDateString();
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleNotificationClick = (notification) => {
        if (notification.type === 'like') {
            navigate(`/post/${notification.postId}`);
        } else if (notification.type === 'follow') {
            navigate(`/profile/${notification.fromUser}`);
        }
    };

    return (
        <div className="notifications-container">
            <div className="notifications-header">
                <button className="back-button" onClick={handleBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2>
                    <Bell size={20} />
                    Notifications
                </h2>
            </div>
            
            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="no-notifications">
                    <Bell size={24} />
                    <p>No notifications yet</p>
                </div>
            ) : (
                <div className="notifications-list">
                    {notifications.map(notification => (
                        <div 
                            key={notification.id} 
                            className={`notification-item ${notification.read ? '' : 'unread'}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="notification-icon">
                                {notification.type === 'like' ? (
                                    <Heart size={20} className="like-icon" />
                                ) : notification.type === 'follow' ? (
                                    <User size={20} className="follow-icon" />
                                ) : (
                                    <Bell size={20} />
                                )}
                            </div>
                            <div className="notification-content">
                                <p>
                                    <strong>{notification.fromUser}</strong>
                                    {notification.type === 'like' && ' liked your post'}
                                    {notification.type === 'follow' && ' started following you'}
                                </p>
                                <span className="notification-time">{formatTime(notification.timestamp)}</span>
                            </div>
                            {!notification.read && (
                                <div className="unread-indicator" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage; 