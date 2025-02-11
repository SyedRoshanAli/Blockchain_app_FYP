import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { UserAuthContract } from "../UserAuth";
import { messageService } from '../services/messageService';
import { format } from 'date-fns';
import MessageModal from '../Profile/MessageModal';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            const messages = await messageService.getAllMessages();
            
            const notificationsWithUsernames = await Promise.all(
                messages.map(async (msg) => {
                    const senderUsernames = await UserAuthContract.methods
                        .getUsernames(msg.sender)
                        .call();
                    
                    return {
                        id: msg.id,
                        sender: senderUsernames[0] || 'Unknown User',
                        senderAddress: msg.sender,
                        message: msg.content,
                        timestamp: Number(msg.timestamp) * 1000,
                        unread: !msg.isRead
                    };
                })
            );

            const sortedNotifications = notificationsWithUsernames.sort(
                (a, b) => b.timestamp - a.timestamp
            );

            setNotifications(sortedNotifications);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setError("Failed to load notifications");
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Open message modal with the sender
            setSelectedUser(notification.sender);
            setIsModalOpen(true);
            
            // Mark message as read
            await messageService.markAsRead(notification.id);
            
            // Update notifications list to reflect read status
            setNotifications(notifications.map(notif => 
                notif.id === notification.id 
                    ? { ...notif, unread: false }
                    : notif
            ));
        } catch (error) {
            console.error("Error handling notification click:", error);
        }
    };

    if (loading) return <div className="notifications-loading">Loading notifications...</div>;
    if (error) return <div className="notifications-error">{error}</div>;

    return (
        <div className="notifications-container">
            <div className="notifications-header">
                <h2>
                    <Bell size={24} className="bell-icon" />
                    <span>Notifications</span>
                </h2>
            </div>

            <div className="notifications-list">
                {notifications.length === 0 ? (
                    <div className="no-notifications">
                        <MessageSquare size={48} />
                        <p>No notifications yet</p>
                        <span className="no-notifications-subtitle">
                            When you receive notifications, they'll show up here
                        </span>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div 
                            key={notification.id} 
                            className={`notification-item ${notification.unread ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="notification-content">
                                <div className="notification-icon">
                                    <MessageSquare size={20} />
                                </div>
                                <div className="notification-details">
                                    <div className="notification-header">
                                        <span className="notification-sender">
                                            {notification.sender}
                                        </span>
                                        <span className="notification-time">
                                            {format(new Date(notification.timestamp), 'MMM d, yyyy h:mm a')}
                                        </span>
                                    </div>
                                    <p className="notification-message">
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Message Modal */}
            <MessageModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedUser(null);
                }}
                recipient={selectedUser}
            />
        </div>
    );
};

export default Notifications; 