import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, X } from 'lucide-react';
import { UserAuthContract } from "../UserAuth";
import { messageService } from '../services/messageService';
import { format } from 'date-fns';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Fetch all messages
            const messages = await messageService.getAllMessages();
            
            // Get usernames for senders
            const notificationsWithUsernames = await Promise.all(
                messages.map(async (msg) => {
                    const senderUsernames = await UserAuthContract.methods
                        .getUsernames(msg.sender)
                        .call();
                    
                    return {
                        id: msg.id,
                        sender: senderUsernames[0] || 'Unknown User',
                        message: msg.content,
                        timestamp: Number(msg.timestamp) * 1000, // Convert to milliseconds
                        unread: !msg.isRead
                    };
                })
            );

            // Sort by timestamp, newest first
            const sortedNotifications = notificationsWithUsernames.sort(
                (a, b) => b.timestamp - a.timestamp
            );

            setNotifications(sortedNotifications);
            
            // Update unread count
            const unreadCount = sortedNotifications.filter(n => n.unread).length;
            setUnreadCount(unreadCount);
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setError("Failed to load notifications");
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await messageService.markAsRead(notificationId);
            
            // Update local state
            setNotifications(notifications.map(notif => 
                notif.id === notificationId 
                    ? { ...notif, unread: false }
                    : notif
            ));
            
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    if (loading) return <div className="notifications-loading">Loading notifications...</div>;
    if (error) return <div className="notifications-error">{error}</div>;

    return (
        <div className="notifications-container">
            <div className="notifications-header">
                <h2>
                    <Bell size={20} />
                    Notifications
                    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </h2>
            </div>

            <div className="notifications-list">
                {notifications.length === 0 ? (
                    <div className="no-notifications">
                        <MessageSquare size={48} />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div 
                            key={notification.id} 
                            className={`notification-item ${notification.unread ? 'unread' : ''}`}
                        >
                            <div className="notification-content">
                                <div className="notification-icon">
                                    <MessageSquare size={16} />
                                </div>
                                <div className="notification-details">
                                    <p className="notification-message">
                                        <strong>{notification.sender}</strong> sent you a message: {notification.message}
                                    </p>
                                    <span className="notification-time">
                                        {format(new Date(notification.timestamp), 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                                {notification.unread && (
                                    <button 
                                        className="mark-read-button"
                                        onClick={() => markAsRead(notification.id)}
                                        title="Mark as read"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications; 