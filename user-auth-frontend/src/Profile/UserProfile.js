import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserAuthContract, CreatePostContract, FollowRelationshipContract } from "../UserAuth";
import Web3 from "web3";
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
import { getFromIPFS, IPFS_GATEWAY } from '../ipfs';
import { getIpfsUrl, extractMediaUrls, getWorkingMediaUrl, safelyFetchIpfsJson } from '../utils/ipfsUtils';

// Profile Image component with fallback mechanism
const ProfileImage = ({ userData, username }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [gatewayAttempts, setGatewayAttempts] = useState(0);
    const maxGatewayAttempts = 5;

    useEffect(() => {
        const loadProfileImage = async () => {
            if (!userData || !userData.profilePicture) {
                setIsLoading(false);
                return;
            }

            try {
                const url = getIpfsUrl(userData.profilePicture, gatewayAttempts);
                console.log(`Attempting to load profile image from gateway ${gatewayAttempts}: ${url}`);
                setImageUrl(url);
            } catch (error) {
                console.error("Error setting up profile image URL:", error);
                setHasError(true);
                setIsLoading(false);
            }
        };

        loadProfileImage();
    }, [userData, gatewayAttempts]);

    // Handle successful image load
    const handleImageLoad = () => {
        console.log(`Successfully loaded profile image from: ${imageUrl}`);
        setIsLoading(false);
    };

    // Handle image load error
    const handleImageError = () => {
        console.error(`Failed to load profile image from: ${imageUrl}`);
        
        // Try next gateway if available
        if (gatewayAttempts < maxGatewayAttempts - 1) {
            console.log(`Trying next gateway (${gatewayAttempts + 1}/${maxGatewayAttempts})`);
            setGatewayAttempts(prev => prev + 1);
        } else {
            console.error("All gateways failed, showing fallback avatar");
            setHasError(true);
            setIsLoading(false);
        }
    };

    // If user has no profile image or all gateways failed, show initial
    if (!userData?.profilePicture || hasError) {
        return (
            <div className="user-avatar">
                {username ? username[0].toUpperCase() : "U"}
            </div>
        );
    }

    return (
        <div className="user-avatar">
            {isLoading && (
                <div className="avatar-placeholder">
                    {username ? username[0].toUpperCase() : "U"}
                </div>
            )}
            <img 
                src={imageUrl} 
                alt={`${username}'s profile`} 
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ 
                    display: isLoading ? 'none' : 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                }}
            />
            {isLoading && (
                <div className="avatar-loading-indicator">
                    <div className="spinner-small"></div>
                </div>
            )}
        </div>
    );
};

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

            // Get user address from username
            const userAddress = await UserAuthContract.methods
                .getAddressByUsername(username)
                .call();

            if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error("User not found");
            }

            // Get current user's address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Check if currently following this user using blockchain
            try {
                // Get current user's username
                const currentUserUsername = await UserAuthContract.methods
                    .getUsernameByAddress(accounts[0])
                    .call();
                
                const isFollowingOnChain = await FollowRelationshipContract.methods
                    .isFollowing(accounts[0], userAddress)
                    .call();
                
                setFollowStatus(isFollowingOnChain ? 'following' : 'none');

                // If not following, check if there's a pending request
                if (!isFollowingOnChain && currentUserUsername) {
                    // Get current user data to check pending requests
                    const currentUserData = JSON.parse(localStorage.getItem(`user_${currentUserUsername}`)) || {};
                    const pendingOutgoingRequests = currentUserData.pendingOutgoingRequests || [];
                    
                    const hasPendingRequest = pendingOutgoingRequests.some(req => 
                        req.from === currentUserUsername && req.to === username
                    );
                        
                    setFollowStatus(hasPendingRequest ? 'requested' : 'none');
                }
            } catch (error) {
                console.error("Error checking follow status:", error);
                // Default to not following if there's an error
                setFollowStatus('none');
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
            
            // Create a cache key for this profile
            const cacheKey = `profile_${username}_${latestHash}`;
            
            // Show loading state
            setProfileData({
                username: username,
                bio: "Loading profile information...",
                location: "Unknown",
                website: "",
                joinDate: new Date().toLocaleDateString(),
                profilePicture: null,
                address: userAddress
            });
            
            // Try to fetch the profile data using our safe utility
            const userData = await safelyFetchIpfsJson(latestHash, cacheKey);
            
            if (userData) {
                // Process the fetched profile data
                await processProfileData(userData, userAddress);
            } else {
                // If we couldn't fetch the data, show an error
                setError("Could not load complete profile data. Using limited information.");
                setLoading(false);
            }
            
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setError(error.message || "Failed to load profile");
            setLoading(false);
        }
    };
    
    // Function to handle errors
    const handleProfileError = (error) => {
        console.error("Error fetching user profile:", error);
        setError(error.message || "Failed to load profile");
        setLoading(false);
    };
    
    // Process profile data and update state
    const processProfileData = async (userData, userAddress) => {
        try {
            // Check if profile visibility is turned off
            if (userData.privacySettings && userData.privacySettings.profileVisibility === false) {
                // Get current user's address
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const currentUserAddress = accounts[0];
                
                // Check if current user is the profile owner
                if (currentUserAddress.toLowerCase() !== userAddress.toLowerCase()) {
                    // Check if current user is in the allowed list
                    const allowedUsers = userData.privacySettings.allowedUsers || [];
                    const currentUserUsername = await UserAuthContract.methods
                        .getUsernameByAddress(currentUserAddress)
                        .call();
                        
                    if (!allowedUsers.includes(currentUserUsername)) {
                        setError("This profile is private");
                        setLoading(false);
                        return;
                    }
                }
            }

            // Fetch user posts
            await fetchUserPosts(userAddress);
            
            // Get followers and following count
            const followersCount = await FollowRelationshipContract.methods
                .getFollowersCount(userAddress)
                .call();

            const followingCount = await FollowRelationshipContract.methods
                .getFollowingCount(userAddress)
                .call();

            // Get user's join date if not already in profile data
            let joinedDate = "";
            try {
                if (!userData.registrationTime) {
                    const registrationBlock = await UserAuthContract.methods
                        .getUserRegistrationBlock(userAddress)
                        .call();
                    
                    if (registrationBlock > 0) {
                        // Initialize web3 instance
                        const web3Instance = new Web3(Web3.givenProvider || "http://localhost:7545");
                        const block = await web3Instance.eth.getBlock(registrationBlock);
                        joinedDate = new Date(block.timestamp * 1000).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                        });
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
            
            setLoading(false);

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

                    // Create a cache key for this post
                    const cacheKey = `post_${postId}_${post.contentHash}`;
                    
                    // Fetch post content using our safe utility
                    const postData = await safelyFetchIpfsJson(post.contentHash, cacheKey);
                    
                    if (!postData) {
                        console.error(`Failed to fetch post ${postId} from all IPFS gateways`);
                        // Return minimal post data if we couldn't fetch the content
                        return {
                            id: post.postId,
                            timestamp: new Date(Number(post.timestamp) * 1000),
                            content: "Content unavailable",
                            likes: 0,
                            comments: 0
                        };
                    }

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
                        <ProfileImage userData={profileData} username={username} />
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