import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserAuthContract, CreatePostContract, FollowRelationshipContract } from "../UserAuth";
import { format } from 'date-fns';
import { 
    Heart, 
    MessageCircle, 
    Share2,
    MapPin,
    Calendar,
    Link as LinkIcon,
    UserPlus,
    Mail,
    Bell,
    MoreHorizontal,
    Image,
    FileText,
    Bookmark,
    ArrowLeft,
    MessageSquare
} from 'lucide-react';
import { toast } from "react-hot-toast";
import "./UserProfile.css";
import MessageModal from './MessageModal';
import { messageService } from '../services/messageService';

const UserProfile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [followStatus, setFollowStatus] = useState('none'); // 'none', 'requested', 'following'
    const [stats, setStats] = useState({
        posts: 0,
        followers: 0,
        following: 0
    });
    const [activeTab, setActiveTab] = useState('posts');
    const [isFollowing, setIsFollowing] = useState(null); // 'pending', 'following', or null

    useEffect(() => {
        // Get current user data
        const storedData = localStorage.getItem("userData");
        if (storedData) {
            setCurrentUser(JSON.parse(storedData));
        }

        fetchUserProfile();
    }, [username]);

    useEffect(() => {
        // Check follow status
        const checkFollowStatus = () => {
            const currentUserData = JSON.parse(localStorage.getItem("userData"));
            
            if (!currentUserData || !username) return;

            const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
            const outgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
            const sentRequest = outgoingRequests.some(req => 
                req.from === currentUserData.username && req.to === username
            );

            const currentUsername = currentUserData.username;
            const followersList = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
            const isFollower = followersList.includes(username);

            if (followedUsers.includes(username) || isFollower) {
                setFollowStatus('following');
            } else if (sentRequest) {
                setFollowStatus('requested');
            } else {
                setFollowStatus('none');
            }
        };
        
        checkFollowStatus();
    }, [username]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get user's blockchain address by username
            const userAddress = await UserAuthContract.methods
                .getAddressByUsername(username)
                .call();

            if (!userAddress) {
                throw new Error("User not found");
            }

            // Get current user's address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Check if currently following this user using blockchain
            try {
                const isFollowingOnChain = await FollowRelationshipContract.methods
                    .isFollowing(accounts[0], userAddress)
                    .call();
                
                if (isFollowingOnChain) {
                    setFollowStatus('following');
                } else {
                    // Check if there's a pending request
                    const pendingRequests = await FollowRelationshipContract.methods
                        .getPendingRequests(userAddress)
                        .call();
                        
                    const hasPendingRequest = pendingRequests.some(req => 
                        req.from === accounts[0] && !req.accepted
                    );
                        
                    if (hasPendingRequest) {
                        setFollowStatus('requested');
                    } else {
                        setFollowStatus('none');
                    }
                }
            } catch (error) {
                console.error("Error checking follow status on blockchain:", error);
                
                // Fallback to localStorage
                const currentUserData = JSON.parse(localStorage.getItem("userData"));
                if (!currentUserData) return;
                
                const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
                
                if (followedUsers.includes(username)) {
                    setFollowStatus('following');
                } else {
                    const pendingOutgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
                    const hasPendingRequest = pendingOutgoingRequests.some(req => 
                        req.from === currentUserData.username && req.to === username
                    );
                        
                    setFollowStatus(hasPendingRequest ? 'requested' : 'none');
                }
            }
            
            // Get user's IPFS hashes
            const ipfsHashes = await UserAuthContract.methods
                .getUserHashes(userAddress)
                .call();

            if (!ipfsHashes || ipfsHashes.length === 0) {
                throw new Error("No profile data found");
            }

            // Use the latest IPFS hash (most recent user data)
            const latestHash = ipfsHashes[ipfsHashes.length - 1];

            // Fetch user data from IPFS
            const response = await fetch(`http://127.0.0.1:8083/ipfs/${latestHash}`);
            if (!response.ok) {
                throw new Error("Failed to fetch user data from IPFS");
            }

            const userData = await response.json();
            
            // Fetch user posts
            await fetchUserPosts(userAddress);
            
            // Get follower and following counts from localStorage
            const followersList = JSON.parse(localStorage.getItem(`followers_${username}`) || '[]');
            const followingList = JSON.parse(localStorage.getItem(`following_${username}`) || '[]');
            
            // Also check followedUsers for backward compatibility
            const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
            
            // If they've been using the old system, count this way
            let followingCount = 0;
            if (followingList.length === 0 && followedUsers.includes(username)) {
                followingCount = 1; // At least you are following them
            } else {
                followingCount = followingList.length;
            }
            
            // Set follower count
            let followersCount = followersList.length;
            
            // Get registration timestamp from blockchain (if available)
            let joinedDate = "April 2023"; // Default fallback
            try {
                // Try to get the registration timestamp from the user's first hash
                if (ipfsHashes.length > 0) {
                    const firstHash = ipfsHashes[0];
                    const firstDataResponse = await fetch(`http://127.0.0.1:8083/ipfs/${firstHash}`);
                    
                    if (firstDataResponse.ok) {
                        const firstData = await firstDataResponse.json();
                        
                        // If the firstData has a registrationTime, use it
                        if (firstData.registrationTime) {
                            joinedDate = new Date(firstData.registrationTime).toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric'
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching join date:", err);
            }

            // Set complete profile data
            setProfileData({
                ...userData,
                address: userAddress,
                joinDate: userData.registrationTime ? new Date(userData.registrationTime).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                }) : joinedDate
            });

            // Update stats with real data
            setStats({
                posts: userPosts.length,
                followers: followersCount,
                following: followingCount
            });

        } catch (error) {
            console.error("Error fetching user profile:", error);
            setError(error.message || "Failed to load profile");
            toast.error(error.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPosts = async (userAddress) => {
        try {
            // Get user's post IDs
            const postIds = await CreatePostContract.methods
                .getPostsByUser(userAddress)
                .call();

            if (!postIds || postIds.length === 0) {
                return;
            }

            // Fetch details for each post
            const posts = await Promise.all(
                postIds.map(async (postId) => {
                    const post = await CreatePostContract.methods
                        .getPost(postId)
                        .call();

                    // Fetch post content from IPFS
                    const response = await fetch(`http://127.0.0.1:8083/ipfs/${post.contentHash}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch post ${postId} content from IPFS`);
                    }

                    const postData = await response.json();
                    return {
                        id: post.postId,
                        timestamp: new Date(Number(post.timestamp) * 1000),
                        ...postData,
                        likes: Math.floor(Math.random() * 15), // Dummy data for display
                        comments: Math.floor(Math.random() * 5) // Dummy data for display
                    };
                })
            );

            // Sort by most recent
            posts.sort((a, b) => b.timestamp - a.timestamp);
            setUserPosts(posts);

        } catch (error) {
            console.error("Error fetching user posts:", error);
            toast.error("Failed to load user posts");
        }
    };

    const handleFollow = async () => {
        try {
            // First check if we already have a pending request on the blockchain
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Get recipient's blockchain address
            let targetAddress;
            try {
                targetAddress = await UserAuthContract.methods
                    .getAddressByUsername(username)
                    .call();
                
                if (!targetAddress) {
                    toast.error(`Could not find blockchain address for ${username}`);
                    return;
                }
                
                // Check on the blockchain if request is already pending
                const pendingRequests = await FollowRelationshipContract.methods
                    .getPendingRequests(targetAddress)
                    .call();
                    
                const hasPendingRequest = pendingRequests.some(req => 
                    req.from.toLowerCase() === accounts[0].toLowerCase() && !req.accepted
                );
                    
                if (hasPendingRequest) {
                    // Update both UI and localStorage to match blockchain state
                    toast.info("You already have a pending follow request to this user");
                    setFollowStatus('requested');
                    
                    // Rest of your existing code to update localStorage...
                    return; // Exit early
                }
            } catch (error) {
                console.error("Error checking existing requests:", error);
                // Continue with local storage approach if blockchain check fails
            }
            
            // Rest of your existing function...
        } catch (error) {
            // ...
        }
    };

    const handleMessage = () => {
        if (profileData && profileData.username) {
            // Navigate to messages page and provide the username to start a chat with
            navigate(`/messages?user=${profileData.username}`);
        } else {
            toast.error("Cannot start a conversation with this user");
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric', 
            year: 'numeric'
        }).format(date);
    };

    const formatTimestamp = (timestamp) => {
        const now = new Date();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s`;
        
        const minutes = Math.floor(diff / (1000 * 60));
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days < 7) return `${days}d`;
        
        return formatDate(timestamp);
    };

    if (loading) {
        return (
            <div className="user-profile-container">
                <div className="profile-loading">
                    <div className="spinner"></div>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-container">
                <div className="profile-error">
                    <h3>Error loading profile</h3>
                    <p>{error}</p>
                    <button onClick={() => navigate('/home')}>Return to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="user-profile-container">
            {/* Header with back button */}
            <header className="user-profile-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="header-user-info">
                    <h2>{username}</h2>
                    <span>{userPosts.length} posts</span>
                </div>
            </header>

            {/* Main profile content */}
            <div className="user-profile-content">
                {/* Banner image */}
                <div className="user-profile-banner" 
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')` }}>
                </div>

                {/* Profile info section */}
                <div className="user-profile-info">
                    <div className="user-avatar-section">
                        <div className="user-avatar">
                            {username[0].toUpperCase()}
                        </div>
                    </div>

                    <div className="user-profile-actions">
                        <button 
                            className={`follow-button ${followStatus !== 'none' ? 'active' : ''}`} 
                            onClick={handleFollow}
                        >
                            {followStatus === 'following' ? 'Following' : 
                             followStatus === 'requested' ? 'Requested' : 'Follow'}
                        </button>
                        
                        <button className="message-button" onClick={handleMessage}>
                            <MessageSquare size={18} />
                            <span>Message</span>
                        </button>
                        
                        <div className="secondary-actions">
                            <button className="action-btn">
                                <Bell size={18} />
                            </button>
                            <button className="action-btn">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* User details */}
                <div className="user-details">
                    <h1 className="user-name">{username}</h1>
                    <p className="user-handle">@{username.toLowerCase().replace(/\s+/g, '_')}</p>
                    
                    <p className="user-bio">
                        {profileData?.bio || `Welcome to ${username}'s profile on BlockConnect!`}
                    </p>
                    
                    <div className="user-meta">
                        <span className="meta-item">
                            <Calendar size={16} />
                            Joined {profileData?.joinDate || "April 2023"}
                        </span>
                    </div>
                    
                    <div className="user-stats">
                        <div className="stat-item">
                            <span className="stat-value">{userPosts.length}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.followers}</span>
                            <span className="stat-label">Followers</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.following}</span>
                            <span className="stat-label">Following</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="user-profile-tabs">
                    <button className="tab active">Posts</button>
                    <button className="tab">Media</button>
                    <button className="tab">Likes</button>
                </div>

                {/* Posts section */}
                <div className="user-posts-section">
                    {userPosts.length === 0 ? (
                        <div className="no-posts">
                            <p>No posts yet</p>
                        </div>
                    ) : (
                        <div className="posts-list">
                            {userPosts.map((post) => (
                                <div className="post-card" key={post.id}>
                                    <div className="post-header">
                                        <div className="post-avatar">
                                            {username[0].toUpperCase()}
                                        </div>
                                        <div className="post-meta">
                                            <div className="post-user-info">
                                                <h4>{username}</h4>
                                                <span className="post-handle">@{username.toLowerCase().replace(/\s+/g, '_')}</span>
                                                <span className="post-time">· {formatTimestamp(post.timestamp)}</span>
                                            </div>
                                            <p className="post-caption">{post.caption}</p>
                                        </div>
                                    </div>
                                    
                                    {post.image && (
                                        <div className="post-image">
                                            <img src={post.image} alt={post.caption || 'Post image'} />
                                        </div>
                                    )}
                                    
                                    <div className="post-actions">
                                        <button className="action-button">
                                            <Heart size={18} />
                                            <span>{post.likes}</span>
                                        </button>
                                        <button className="action-button">
                                            <MessageCircle size={18} />
                                            <span>{post.comments}</span>
                                        </button>
                                        <button className="action-button">
                                            <Share2 size={18} />
                                        </button>
                                        <button className="action-button bookmark">
                                            <Bookmark size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Message Modal */}
            <MessageModal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                recipient={username}
            />
        </div>
    );
};

export default UserProfile; 