import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, User, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FollowRelationshipContract, UserAuthContract } from "../UserAuth";
import './Notifications.css'; // Ensure you have the CSS file

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [followRequests, setFollowRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        fetchFollowRequests();
    }, []);

    const fetchNotifications = () => {
        try {
            setLoading(true);
            
            // Get current user's username
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const currentUsername = userSession.username || userData.username;
            
            console.log("Current username for notifications:", currentUsername);
            
            if (!currentUsername) {
                setNotifications([]);
                return;
            }
            
            // Get notifications for this user
            const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
            console.log("All notifications from localStorage:", allNotifications);
            
            const userNotifications = allNotifications[currentUsername] || [];
            console.log("User notifications:", userNotifications);
            
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

    const fetchFollowRequests = async () => {
        try {
            // Get current user's MetaMask address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Get pending requests from blockchain
            const pendingRequests = await FollowRelationshipContract.methods
                .getPendingRequests(accounts[0])
                .call();
            
            // Filter only non-accepted requests
            const activeRequests = pendingRequests.filter(req => !req.accepted);
            
            // Convert to our format with usernames
            const formattedRequests = await Promise.all(activeRequests.map(async (req) => {
                // Get username for this address
                const usernames = await UserAuthContract.methods
                    .getUsernames(req.from)
                        .call();
                    
                    return {
                    id: req.timestamp.toString(),
                    from: usernames[0] || "Unknown User",
                    fromAddress: req.from,
                    to: accounts[0],
                    timestamp: new Date(Number(req.timestamp) * 1000).toISOString()
                };
            }));
            
            setFollowRequests(formattedRequests);
        } catch (error) {
            console.error("Error fetching follow requests:", error);
            toast.error("Failed to load follow requests");
            
            // Fallback to localStorage
            const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
            const currentUsername = userSession.username;
            
            const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
            const incomingRequests = pendingRequests.filter(req => req.to === currentUsername);
            
            setFollowRequests(incomingRequests);
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
            navigate(`/post/${notification.postId || ''}`, { state: { postId: notification.postId } });
        } else if (notification.type === 'follow') {
            navigate(`/profile/${notification.fromUser}`);
        }
    };

    const acceptRequest = async (request) => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Accept the request on blockchain
            await FollowRelationshipContract.methods
                .acceptFollowRequest(request.fromAddress)
                .send({ from: accounts[0] });
            
            // Update UI
            setFollowRequests(followRequests.filter(req => req.id !== request.id));
            
            toast.success(`You are now followed by ${request.from}`);
            
            // Update localStorage for both users
            const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
            const currentUsername = userSession.username;
            
            // Update followers list for the current user
            const followersList = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
            if (!followersList.includes(request.from)) {
                followersList.push(request.from);
                localStorage.setItem(`followers_${currentUsername}`, JSON.stringify(followersList));
            }
            
            // Update following list for the user who sent the request
            const followingList = JSON.parse(localStorage.getItem(`following_${request.from}`) || '[]');
            if (!followingList.includes(currentUsername)) {
                followingList.push(currentUsername);
                localStorage.setItem(`following_${request.from}`, JSON.stringify(followingList));
            }
            
            // Remove from pending requests in localStorage
            const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
            const updatedRequests = pendingRequests.filter(req => 
                !(req.from === request.from && req.to === currentUsername)
            );
            localStorage.setItem('pendingFollowRequests', JSON.stringify(updatedRequests));
            
        } catch (error) {
            console.error("Error accepting follow request:", error);
            toast.error("Failed to accept follow request");
        }
    };

    const rejectRequest = async (request) => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Reject the request on blockchain
            await FollowRelationshipContract.methods
                .rejectFollowRequest(request.fromAddress)
                .send({ from: accounts[0] });
            
            // Update UI
            setFollowRequests(followRequests.filter(req => req.id !== request.id));
            
            toast.success(`Rejected follow request from ${request.from}`);
            
            // Remove from pending requests in localStorage as well
            const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
            const updatedRequests = pendingRequests.filter(req => 
                !(req.from === request.from && req.to === request.to)
            );
            localStorage.setItem('pendingFollowRequests', JSON.stringify(updatedRequests));
            
        } catch (error) {
            console.error("Error rejecting follow request:", error);
            toast.error("Failed to reject follow request");
        }
    };

    const getPostContent = (contentHash) => {
        try {
            console.log("Looking up post content for hash:", contentHash);
            
            // Look up the post content directly from localStorage
            const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
            console.log("Available posts in localStorage:", Object.keys(localPosts));
            
            // If we have this post's content in localStorage, return the text
            if (localPosts[contentHash]) {
                const content = localPosts[contentHash];
                console.log("Found content for hash:", content);
                
                if (content.text) {
                    // Get first 50 chars of text or full text if shorter
                    return content.text.length > 50 
                        ? content.text.substring(0, 50) + '...' 
                        : content.text;
                } else if (content.media && content.media.length > 0) {
                    // If no text but has media, indicate that
                    return `[Shared ${content.media.length} media item${content.media.length > 1 ? 's' : ''}]`;
                }
            } else {
                console.log("No content found for hash:", contentHash);
            }
            
            // Fallback if we can't find the content
            return "Your post";
        } catch (error) {
            console.error("Error getting post content:", error);
            return "Your post";
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
            ) : followRequests.length === 0 && notifications.length === 0 ? (
                    <div className="no-notifications">
                    <Bell size={24} />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                <div className="notifications-list">
                    {/* Display follow requests first */}
                    {followRequests.map(request => (
                        <div key={request.id} className="notification-item request">
                            <div className="notification-icon">
                                <User size={20} className="follow-icon" />
                            </div>
                            <div className="notification-content">
                                <p>
                                    <strong>{request.from}</strong> wants to follow you
                                </p>
                                <span className="notification-time">{formatTime(request.timestamp)}</span>
                            </div>
                            <div className="request-actions">
                                <button 
                                    className="accept-button" 
                                    onClick={() => acceptRequest(request)}
                                    title="Accept"
                                >
                                    <CheckCircle size={18} />
                                </button>
                                <button 
                                    className="reject-button" 
                                    onClick={() => rejectRequest(request)}
                                    title="Reject"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Display like notifications */}
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
                                <div>
                                    <p className="notification-message">
                                        <strong>{notification.fromUser}</strong>
                                        {notification.type === 'like' && ' liked your post'}
                                        {notification.type === 'follow' && ' started following you'}
                                    </p>
                                    {notification.type === 'like' && (
                                        <div className="post-preview">
                                            "{getPostContent(notification.contentHash)}"
                                        </div>
                                    )}
                                    <span className="notification-time">{formatTime(notification.timestamp)}</span>
                                </div>
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

export default Notifications; 