import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserAuthContract, CreatePostContract, FollowRelationshipContract } from "../UserAuth";
import { 
    Plus, 
    Camera, 
    Calendar, 
    MapPin, 
    Link as LinkIcon, 
    Heart, 
    MessageCircle, 
    Repeat, 
    Share,
    Share2,
    User,
    Users,
    Bell,
    Home,
    Bookmark,
    Settings,
    LogOut,
    Search,
    MessageSquare,
    Moon,
    Sun,
    MoreHorizontal,
    File,
    Send,
    BarChart,
    X,
    Shield,
    TrendingUp,
    Hash,
    HelpCircle,
    Eye,
    EyeOff,
    Pencil,
    Edit,
    Trash,
    MoreVertical
} from "lucide-react";
import "./Profile.css";
import { toast } from "react-hot-toast";
import { format } from 'date-fns';
import { ethers } from 'ethers';
import messageService from '../services/messageService'; 
import { notificationService } from '../services/notificationService';
import FollowModal from './FollowModal';
import { checkCorrectNetwork, switchToCorrectNetwork } from '../utils/networkHelpers';
import { getFromIPFS, IPFS_GATEWAY, IPFS_GATEWAYS } from '../ipfs';
import { getIpfsUrl, extractMediaUrls, getWorkingMediaUrl, generatePlaceholderImage } from '../utils/ipfsUtils';
import PostModal from '../components/PostModal';
import { cleanupFollowRequests, resetAllUserData } from '../utils/cleanupStorage';
import NotificationBadge from '../components/Notifications/NotificationBadge';

// Add this immediately at the beginning of your code (outside any function)
// This will prevent the console spamming across the entire application
(function() {
  // Store the original console.log
  const originalConsoleLog = console.log;
  
  // Create a Set to track seen post hash messages
  const seenPostHashes = new Set();
  
  // Override console.log
  console.log = function() {
    // Check if this is a localStorage post lookup message
    if (arguments[0] === "Found post in localStorage:" && typeof arguments[1] === 'string') {
      const hash = arguments[1];
      
      // If we've already logged this hash, don't log it again
      if (seenPostHashes.has(hash)) {
        return;
      }
      
      // Add it to our seen set
      seenPostHashes.add(hash);
    }
    
    // Call original console.log
    return originalConsoleLog.apply(console, arguments);
  };
})();

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [postCount, setPostCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [showPlus, setShowPlus] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
    const [editedData, setEditedData] = useState({
        username: '',
        about: ''
    });
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [hiddenTweets, setHiddenTweets] = useState([]);
    const [showHiddenTweets, setShowHiddenTweets] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [followList, setFollowList] = useState([]);
    const [viewingUser, setViewingUser] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [hasFollowRequested, setHasFollowRequested] = useState(false);
    const { username } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [currentAddress, setCurrentAddress] = useState('');
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        if (username && username !== userData?.username) {
            fetchOtherUserData(username);
        } else {
        fetchUserData();
        fetchUserPosts();
        }
        // Load dark mode preference from localStorage
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
        fetchUnreadCount();
    }, [username]);

    useEffect(() => {
        // Set up message listener
        const setupMessageListener = async () => {
            await messageService.onNewMessage(() => {
                console.log('New message received, updating count');
                fetchUnreadCount();
            });
        };

        setupMessageListener();
        fetchUnreadCount();

        // Check for new messages every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);

        // Check for notifications initially and set up interval
        const checkNotificationsAndUpdate = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                if (userData.walletAddress) {
                    // Use the updated notificationService to fetch notifications
                    const notifications = await notificationService.getNotifications(userData.walletAddress);
                    const count = notifications.filter(n => !n.read).length;
                    setNotificationCount(count);
                }
            } catch (error) {
                console.error("Error checking notifications:", error);
            }
        };

        checkNotificationsAndUpdate();

        const notificationInterval = setInterval(() => {
            checkNotificationsAndUpdate();
        }, 30000); // Check every 30 seconds

        return () => {
            clearInterval(interval);
            clearInterval(notificationInterval);
        };
    }, []);

    useEffect(() => {
        // Create a cache for post lookups to avoid repeated logging
        const originalConsoleLog = console.log;
        const notFoundPostCache = new Set();
        
        console.log = function(...args) {
            // Check if this is a "Found post" message
            if (args[0] === "Found post in localStorage:" && typeof args[1] === 'string') {
                const postHash = args[1];
                
                // If we've already logged this post hash, don't log it again
                if (notFoundPostCache.has(postHash)) {
                    return;
                }
                
                // Add to our cache so we don't log it again
                notFoundPostCache.add(postHash);
            }
            
            // Call the original console.log with all arguments
            originalConsoleLog.apply(console, args);
        };
        
        // Clean up when component unmounts
        return () => {
            console.log = originalConsoleLog;
        };
    }, []);

    useEffect(() => {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            const parsedUserData = JSON.parse(storedUserData);
            setUserData(parsedUserData);
            
            // Load profile and cover images from localStorage
            if (parsedUserData.profileImage) {
                setImagePreview(parsedUserData.profileImage);
                setShowPlus(false);
            }
            
            if (parsedUserData.coverImage) {
                setCoverImagePreview(parsedUserData.coverImage);
            }
        }
    }, []);

    const fetchUserData = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            // Check if user is on the correct network
            const networkCheck = await checkCorrectNetwork();
            if (!networkCheck.isCorrect) {
                const switched = await switchToCorrectNetwork();
                if (!switched) {
                    throw new Error(networkCheck.error || "Please switch to the correct network");
                }
            }

            if (!window.ethereum) {
                setErrorMessage("MetaMask is not installed. Please install MetaMask.");
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Get current user's username from local storage
            const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
            const currentUsername = userSession.username;

            if (!currentUsername) {
                throw new Error("User not logged in.");
            }

            // Get user data from localStorage
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (!userData) {
                throw new Error("User data not found in localStorage.");
            }

            // Fetch posts from blockchain for post count
            let postCount = 0;
            try {
                const postIds = await CreatePostContract.methods
                    .getPostsByUser(accounts[0])
                    .call();
                postCount = postIds.length;
            } catch (error) {
                console.error("Error fetching posts count:", error);
                // Don't throw error, just log it and continue with 0 posts
            }
            
            // Get following count from blockchain
            let followingCount = 0;
            try {
                followingCount = await FollowRelationshipContract.methods
                    .getFollowingCount(accounts[0])
                    .call();
            } catch (error) {
                console.error("Error fetching following count:", error);
                // Use localStorage as fallback if blockchain query fails
                const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
                followingCount = followedUsers.length;
            }
            
            // Get follower count from blockchain
            let followerCount = 0;
            try {
                followerCount = await FollowRelationshipContract.methods
                    .getFollowersCount(accounts[0])
                    .call();
            } catch (error) {
                console.error("Error fetching follower count:", error);
                // Use localStorage as fallback
                const followersList = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
                followerCount = followersList.length;
            }
            
            // Get pending follow requests for this user from blockchain
            let pendingRequestsCount = 0;
            try {
                pendingRequestsCount = await FollowRelationshipContract.methods
                    .getPendingRequestsCount(accounts[0])
                    .call();
            } catch (error) {
                console.error("Error fetching pending requests:", error);
                // Use localStorage as fallback
                const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
                const incomingRequests = pendingRequests.filter(req => req.to === currentUsername);
                pendingRequestsCount = incomingRequests.length;
            }
            
            // Set user data with actual counts
            setUserData({
                ...userData,
                postCount: postCount,
                followerCount: Number(followerCount),
                followingCount: Number(followingCount),
                pendingRequestsCount: Number(pendingRequestsCount)
            });

            // Initialize empty arrays for followers and following if they don't exist
            const username = userData.username;
            if (!localStorage.getItem(`followers_${username}`)) {
                localStorage.setItem(`followers_${username}`, JSON.stringify([]));
            }
            if (!localStorage.getItem(`following_${username}`)) {
                localStorage.setItem(`following_${username}`, JSON.stringify([]));
            }

            // Fetch posts for display
            await fetchUserPosts(accounts[0]);

        } catch (error) {
            console.error("Error fetching user data:", error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPosts = async () => {
        try {
            setLoading(true);
            
            // Get current user's MetaMask address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            const userAddress = accounts[0];
            const currentAddress = userAddress.toLowerCase();
            
            // Get liked posts from localStorage
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
            const userLikedPosts = likedPosts[currentAddress] || [];
            
            // Use CreatePostContract to get all posts by this user
            const postIds = await CreatePostContract.methods
                .getPostsByUser(userAddress)
                .call();

            // Fetch details for each post
            const userPosts = [];
            
            for (const postId of postIds) {
                try {
                    const postDetails = await CreatePostContract.methods
                            .getPost(postId)
                            .call();

                    // Get post likes
                    const likes = await CreatePostContract.methods
                        .getPostLikes(postId)
                        .call();
                        
                    // Check if the current user has liked this post
                    const isLikedByMe = likes.some(addr => addr.toLowerCase() === currentAddress) || 
                                      userLikedPosts.includes(postId.toString());
                    
                    // Format post data
                    const post = {
                        id: postDetails.postId,
                        creator: postDetails.creator,
                        contentHash: postDetails.contentHash,
                        timestamp: parseInt(postDetails.timestamp) * 1000, // Convert to ms
                        hasMedia: postDetails.hasMedia,
                        tags: postDetails.tags,
                        likes: likes,
                        isLikedByMe: isLikedByMe
                    };
                    
                    // Fetch the actual content from IPFS
                    try {
                        const contentBuffer = await getFromIPFS(post.contentHash);
                        const content = JSON.parse(contentBuffer.toString());
                        post.content = content.text || '';
                        post.mediaUrl = content.mediaUrl || null;
                        
                        // Store in localStorage for faster access next time
                        const postContent = JSON.parse(localStorage.getItem('postContent') || '{}');
                        postContent[post.contentHash] = content;
                        localStorage.setItem('postContent', JSON.stringify(postContent));
                    } catch (ipfsError) {
                        console.error(`Error fetching content from IPFS for post ${postId}:`, ipfsError);
                        
                        // Try to get from localStorage as fallback
                        const postContent = JSON.parse(localStorage.getItem('postContent') || '{}');
                        if (postContent[post.contentHash]) {
                            post.content = postContent[post.contentHash].text || '';
                            post.mediaUrl = postContent[post.contentHash].mediaUrl || null;
                        } else {
                            post.content = 'Content unavailable';
                        }
                    }
                    
                    userPosts.push(post);
                } catch (err) {
                    console.error(`Error fetching post ${postId}:`, err);
                }
            }
            
            // Sort posts by most recent first
            userPosts.sort((a, b) => b.timestamp - a.timestamp);

            setPosts(userPosts);
            setPostCount(userPosts.length);
        } catch (error) {
            console.error("Error fetching user posts:", error);
            toast.error("Failed to load posts");
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const count = await messageService.getUnreadCount();
            setUnreadMessages(Number(count));
        } catch (error) {
            console.error("Error fetching unread message count:", error);
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', !darkMode);
    };

    const handleImageChange = async (event) => {
        try {
            const file = event.target.files[0];
            if (file) {
                // Show preview immediately
                const reader = new FileReader();
                reader.onloadend = () => {
                    const imageData = reader.result;
                    setImagePreview(imageData);
                    setShowPlus(false);
                    
                    // Save to localStorage
                    const updatedUserData = {
                        ...userData,
                        profileImage: imageData
                };
                    localStorage.setItem('userData', JSON.stringify(updatedUserData));
                    setUserData(updatedUserData);
                    
                toast.success('Profile picture updated!');
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error('Failed to update profile picture');
        }
    };

    const handleCoverPhotoChange = async (event) => {
        try {
            const file = event.target.files[0];
            if (file) {
                // Show preview immediately
                const reader = new FileReader();
                reader.onloadend = () => {
                    const coverData = reader.result;
                    setCoverImagePreview(coverData);
                    
                    // Save to localStorage
                    const updatedUserData = {
                        ...userData,
                        coverImage: coverData
                    };
                    localStorage.setItem('userData', JSON.stringify(updatedUserData));
                    setUserData(updatedUserData);
                    
                toast.success('Cover photo updated!');
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Error updating cover photo:', error);
            toast.error('Failed to update cover photo');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("userSession");
        localStorage.removeItem("darkMode");
        navigate("/login");
    };

    const handlePostClick = (post) => {
        // Create a complete post object with all necessary fields
        const modalPost = {
            ...post,
            // Ensure content is passed along if we already have it loaded
            content: post.content || (post.postContent || null)
        };
        
        // Set the selected post to trigger the modal
        setSelectedPost(modalPost);
    };

    const handleLike = async (postId) => {
        try {
            // Get current accounts
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const currentAddress = accounts[0].toLowerCase();
            
            // Call the contract method to like the post
            await CreatePostContract.methods
                .likePost(postId)
                .send({ from: currentAddress });
            
            // Store in localStorage to persist the like state
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
            
            if (!likedPosts[currentAddress]) {
                likedPosts[currentAddress] = [];
            }
            
            // Toggle the liked state
            const isAlreadyLiked = likedPosts[currentAddress].includes(postId.toString());
            
            if (isAlreadyLiked) {
                // Unlike: Remove from liked posts
                likedPosts[currentAddress] = likedPosts[currentAddress].filter(id => id !== postId.toString());
            } else {
                // Like: Add to liked posts
                likedPosts[currentAddress].push(postId.toString());
            }
            
            localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
            
            // Update UI immediately
            setPosts(prevPosts => 
                prevPosts.map(post => {
                    if (post.id === postId) {
                        const newLikeCount = isAlreadyLiked ? post.likes.length - 1 : post.likes.length + 1;
                        const newLikes = isAlreadyLiked 
                            ? post.likes.filter(addr => addr.toLowerCase() !== currentAddress)
                            : [...post.likes, currentAddress];
                        
                        return {
                            ...post,
                            likes: newLikes,
                            isLikedByMe: !isAlreadyLiked
                        };
                    }
                    return post;
                })
            );
            
        } catch (error) {
            console.error("Error liking post:", error);
            toast.error("Failed to like post");
        }
    };

    const handleComment = (postId, comment) => {
        setPosts(posts.map(post =>
            post.id === postId
                ? { ...post, comments: [...post.comments, comment] }
                : post
        ));
    };

    const handleShare = (postId) => {
        setPosts(posts.map(post =>
            post.id === postId
                ? { ...post, shares: post.shares + 1 }
                : post
        ));
    };

    const handleEditClick = () => {
        setEditedData({
            username: userData?.username || '',
            about: userData?.about || ''
        });
        setIsEditMenuOpen(true);
    };

    const handleSave = async () => {
        try {
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Update user data directly
            const updatedUserData = {
                ...userData,
                username: editedData.username,
                about: editedData.about,
                email: userData.email // Keep existing email
            };

            // Store in localStorage for persistence
            localStorage.setItem('userData', JSON.stringify(updatedUserData));

            // Update local state
            setUserData(updatedUserData);
            setIsEditMenuOpen(false);
            toast.success('Profile updated successfully!');

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile: ' + error.message);
        }
    };

    const toggleDropdown = (tweetId) => {
        setActiveDropdown(activeDropdown === tweetId ? null : tweetId);
    };

    const handleCreateTweet = () => {
        navigate('/createpost');
    };

    const handleHideTweet = (tweetId) => {
        const tweetToHide = posts.find(post => post.id === tweetId);
        if (tweetToHide) {
            // Add to hidden tweets
            setHiddenTweets([...hiddenTweets, tweetToHide]);
            // Remove from visible posts
            setPosts(posts.filter(post => post.id !== tweetId));
            // Close dropdown
            setActiveDropdown(null);
            toast.success('Tweet hidden successfully');
        }
    };

    const handleRestoreTweet = (tweetId) => {
        const tweetToRestore = hiddenTweets.find(tweet => tweet.id === tweetId);
        if (tweetToRestore) {
            // Add back to visible posts
            setPosts([...posts, tweetToRestore]);
            // Remove from hidden tweets
            setHiddenTweets(hiddenTweets.filter(tweet => tweet.id !== tweetId));
            toast.success('Tweet restored successfully');
        }
    };

    const handleHiddenTweetsClick = (e) => {
        e.preventDefault();
        setShowHiddenTweets(!showHiddenTweets);
    };

    const handleHomeClick = (e) => {
        e.preventDefault();
        navigate('/home');
    };

    const handleNotification = (e) => {
        e.preventDefault();
        fetchUnreadCount(); // Refresh count when clicking notification icon
        navigate('/notifications');
    };

    const handleFollowersClick = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Get followers from blockchain
            const followersAddresses = await FollowRelationshipContract.methods
                .getFollowers(accounts[0])
                .call();
            
            // We need to map addresses to usernames
            const followersList = [];
            
            for (const address of followersAddresses) {
                try {
                    // Get the username for this address
                    const usernames = await UserAuthContract.methods
                        .getUsernames(address)
                        .call();
                    
                    if (usernames && usernames.length > 0) {
                        followersList.push(usernames[0]);
                    }
                } catch (error) {
                    console.error("Error fetching username for address:", error);
                }
            }
            
            // Use localStorage as fallback if no followers found
            if (followersList.length === 0) {
                const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
                const currentUsername = userSession.username;
                const localFollowers = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
                setFollowList(localFollowers);
            } else {
                setFollowList(followersList);
            }
            
            setShowFollowersModal(true);
        } catch (error) {
            console.error("Error fetching followers:", error);
            toast.error("Failed to load followers");
            
            // Use localStorage as fallback
            const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
            const currentUsername = userSession.username;
            const followersList = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
            setFollowList(followersList);
            setShowFollowersModal(true);
        }
    };

    const handleFollowingClick = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Get following from blockchain
            const followingAddresses = await FollowRelationshipContract.methods
                .getFollowing(accounts[0])
                .call();
            
            // We need to map addresses to usernames
            const followingList = [];
            
            for (const address of followingAddresses) {
                try {
                    // Get the username for this address
                    const usernames = await UserAuthContract.methods
                        .getUsernames(address)
                        .call();
                    
                    if (usernames && usernames.length > 0) {
                        followingList.push(usernames[0]);
                    }
                } catch (error) {
                    console.error("Error fetching username for address:", error);
                }
            }
            
            // Use localStorage as fallback if no following found
            if (followingList.length === 0) {
                const localFollowing = JSON.parse(localStorage.getItem('followedUsers') || '[]');
                setFollowList(localFollowing);
            } else {
                setFollowList(followingList);
            }
            
            setShowFollowingModal(true);
        } catch (error) {
            console.error("Error fetching following:", error);
            toast.error("Failed to load following");
            
            // Use localStorage as fallback
            const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
            setFollowList(followedUsers);
            setShowFollowingModal(true);
        }
    };

    const fetchOtherUserData = async (username) => {
        setLoading(true);
        setErrorMessage("");
        
        try {
            // Get current user's username from localStorage
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const currentUsername = userSession.username;
            
            // Check if we're following this user
            const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
            setIsFollowing(followedUsers.includes(username));
            
            // Check if we have a pending follow request to this user
            const pendingOutgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
            setHasFollowRequested(pendingOutgoingRequests.some(req => req.to === username));
            
            // Set viewing user data
            setViewingUser({
                username: username,
                // You can fetch other data like post count later
            });
            
            // Fetch their posts
            fetchUserPostsByUsername(username);
            
        } catch (error) {
            console.error("Error fetching user data:", error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPostsByUsername = async (username) => {
        // Implement similar to fetchUserPosts but filter by the username parameter
        // ...
    };

    const renderProfileActions = () => {
        // If we're viewing our own profile
        if (!viewingUser) {
            return (
                <div className="profile-actions">
                    <button 
                        className="edit-profile-button"
                        onClick={() => navigate('/settings')}
                    >
                        Edit Profile
                    </button>
                    
                    <button className="more-button">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            );
        }
        
        // If we're viewing someone else's profile
        return (
            <div className="profile-actions">
                {isFollowing ? (
                    <button className="following-button">
                        Following
                    </button>
                ) : hasFollowRequested ? (
                    <button className="pending-button" disabled>
                        Requested
                    </button>
                ) : (
                    <button 
                        className="follow-button"
                        onClick={handleSendFollowRequest}
                    >
                        Follow
                    </button>
                )}
                
                <button className="message-button">
                    Message
                </button>
            </div>
        );
    };

    const getUsernameByAddress = async (address) => {
        try {
            // First check if we have it cached in localStorage
            const usernameKey = `username_${address.toLowerCase()}`;
            const cachedUsername = localStorage.getItem(usernameKey);
            
            if (cachedUsername) {
                return cachedUsername;
            }
            
            // If not in localStorage, try to get from blockchain
            const usernames = await UserAuthContract.methods
                .getUsernames(address)
                .call();
            
            if (usernames && usernames.length > 0) {
                // Cache username for future use
                localStorage.setItem(usernameKey, usernames[0]);
                return usernames[0];
            }
            
            // If we can't find a username, return null
            return null;
        } catch (error) {
            console.error("Error getting username for address:", error);
            return null;
        }
    };

    const handleSendFollowRequest = async () => {
        if (!viewingUser) return;
        
        try {
            // Get current user's info
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            const currentAccount = accounts[0];
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const currentUsername = userSession.username;
            
            // Get the address for the username we want to follow
            const recipientAddress = await UserAuthContract.methods
                .getAddressByUsername(viewingUser.username)
                .call();
            
            // Send follow request to blockchain
            await FollowRelationshipContract.methods
                .sendFollowRequest(recipientAddress)
                .send({ from: currentAccount });
            
            // Create a new follow request for localStorage (as backup)
            const newRequest = {
                from: currentUsername,
                to: viewingUser.username,
                fromAddress: currentAccount,
                toAddress: recipientAddress,
                timestamp: new Date().toISOString()
            };
            
            // Add to outgoing requests in localStorage
            const outgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
            localStorage.setItem('outgoingFollowRequests', JSON.stringify([...outgoingRequests, newRequest]));
            
            // Add to pending requests
            const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
            localStorage.setItem('pendingFollowRequests', JSON.stringify([...pendingRequests, newRequest]));
            
            // Update UI state
            setHasFollowRequested(true);
            
            toast.success(`Follow request sent to ${viewingUser.username}`);

            // After successfully sending follow request
            const sourceUsername = await getUsernameByAddress(currentAccount);
            const displayName = sourceUsername || currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
            
            // Create notification with proper timestamp and ensure it's marked as unread
            const notification = {
                id: Date.now().toString(),
                type: notificationService.notificationTypes.FOLLOW_REQUEST,
                from: displayName,
                fromAddress: currentAccount,
                message: `${displayName} has requested to follow you`,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            // Add notification for the recipient
            await notificationService.addNotification(recipientAddress, notification);
            
            // Dispatch event to update notification badges
            window.dispatchEvent(new Event('new-notification'));
            
        } catch (error) {
            console.error("Error sending follow request:", error);
            toast.error("Failed to send follow request");
        }
    };

    const MediaItem = ({ mediaUrl }) => {
        const [displayUrl, setDisplayUrl] = useState(null);
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);
        const [gatewayAttempts, setGatewayAttempts] = useState(0);
        const maxGatewayAttempts = IPFS_GATEWAYS.length;

        // Validate IPFS hash format
        const isValidIpfsHash = (hash) => {
            // Basic validation - IPFS hashes typically start with 'Qm' and are 46 characters long
            if (!hash) return false;
            return hash.startsWith('Qm') && hash.length >= 46;
        };

        useEffect(() => {
            const loadMedia = async () => {
                try {
                    // Handle different types of media input
                    if (!mediaUrl) {
                        setHasError(true);
                        setIsLoading(false);
                        return;
                    }

                    setIsLoading(true);
                    setHasError(false);
                    
                    // Handle media object with hash property
                    if (typeof mediaUrl === 'object' && mediaUrl.hash) {
                        // Validate the hash
                        if (!isValidIpfsHash(mediaUrl.hash)) {
                            console.error(`Invalid IPFS hash format in object: ${mediaUrl.hash}`);
                            setHasError(true);
                            setIsLoading(false);
                            return;
                        }
                        
                        // First check if we have a cached working URL for this hash
                        const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                        if (gatewayCache[mediaUrl.hash]) {
                            console.log(`Using cached gateway URL for ${mediaUrl.hash}: ${gatewayCache[mediaUrl.hash]}`);
                            setDisplayUrl(gatewayCache[mediaUrl.hash]);
                            return;
                        }
                        
                        // Try the proxy approach first
                        try {
                            const proxyUrl = `/.netlify/functions/ipfs-proxy?hash=${encodeURIComponent(mediaUrl.hash)}`;
                            console.log(`Trying proxy for media: ${proxyUrl}`);
                            setDisplayUrl(proxyUrl);
                        } catch (error) {
                            // If proxy fails, fall back to direct gateway URLs
                            const url = getIpfsUrl(mediaUrl.hash, gatewayAttempts);
                            console.log(`Proxy failed, trying direct gateway ${gatewayAttempts}: ${url}`);
                            setDisplayUrl(url);
                        }
                        return;
                    }
                    
                    // Handle media object with previewUrl property (for local testing)
                    if (typeof mediaUrl === 'object' && mediaUrl.previewUrl) {
                        setDisplayUrl(mediaUrl.previewUrl);
                        setIsLoading(false);
                        return;
                    }
                    
                    // If it's an IPFS URL string, try to use our gateway system
                    if (typeof mediaUrl === 'string' && mediaUrl.includes('/ipfs/')) {
                        // Extract the hash from the URL
                        const hashMatch = mediaUrl.match(/\/ipfs\/([^\/]+)/);
                        if (hashMatch && hashMatch[1]) {
                            const hash = hashMatch[1];
                            
                            // Validate the IPFS hash
                            if (!isValidIpfsHash(hash)) {
                                console.error(`Invalid IPFS hash format in URL: ${hash}`);
                                setHasError(true);
                                setIsLoading(false);
                                return;
                            }
                            
                            // First check if we have a cached working URL for this hash
                            const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                            if (gatewayCache[hash]) {
                                console.log(`Using cached gateway URL for ${hash}: ${gatewayCache[hash]}`);
                                setDisplayUrl(gatewayCache[hash]);
                                return;
                            }
                            
                            // Try the proxy approach first
                            try {
                                const proxyUrl = `/.netlify/functions/ipfs-proxy?hash=${encodeURIComponent(hash)}`;
                                console.log(`Trying proxy for media: ${proxyUrl}`);
                                setDisplayUrl(proxyUrl);
                            } catch (error) {
                                // If proxy fails, fall back to direct gateway URLs
                                const url = getIpfsUrl(hash, gatewayAttempts);
                                console.log(`Proxy failed, trying direct gateway ${gatewayAttempts}: ${url}`);
                                setDisplayUrl(url);
                            }
                            return;
                        }
                    }
                    
                    // If it's a direct string URL, use it as is
                    if (typeof mediaUrl === 'string') {
                        setDisplayUrl(mediaUrl);
                        setIsLoading(false);
                        return;
                    }
                    
                    // If we got here, we couldn't determine how to handle the media
                    console.error("Unrecognized media format:", mediaUrl);
                    setHasError(true);
                    setIsLoading(false);
                } catch (error) {
                    console.error("Error setting up media URL:", error);
                    setHasError(true);
                    setIsLoading(false);
                }
            };
            
            loadMedia();
        }, [mediaUrl, gatewayAttempts]);

        // Handle successful media load
        const handleMediaLoad = () => {
            console.log(`Successfully loaded media from: ${displayUrl}`);
            setIsLoading(false);
            
            // Cache the working URL if it's a gateway URL
            if (mediaUrl && typeof mediaUrl === 'object' && mediaUrl.hash && displayUrl.includes('/ipfs/')) {
                const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                gatewayCache[mediaUrl.hash] = displayUrl;
                localStorage.setItem('ipfsGatewayCache', JSON.stringify(gatewayCache));
                console.log(`Cached working URL for ${mediaUrl.hash}: ${displayUrl}`);
            } else if (typeof mediaUrl === 'string' && mediaUrl.includes('ipfs://') && displayUrl.includes('/ipfs/')) {
                const hash = mediaUrl.replace('ipfs://', '');
                const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                gatewayCache[hash] = displayUrl;
                localStorage.setItem('ipfsGatewayCache', JSON.stringify(gatewayCache));
                console.log(`Cached working URL for ${hash}: ${displayUrl}`);
            }
        };
        
        // Handle media load error
        const handleMediaError = () => {
            console.error(`Failed to load media from: ${displayUrl}`);
            
            // If using proxy and it failed, try direct gateways
            if (displayUrl.includes('ipfs-proxy')) {
                console.log(`Proxy failed, trying direct gateways`);
                if (typeof mediaUrl === 'object' && mediaUrl.hash) {
                    const url = getIpfsUrl(mediaUrl.hash, 0);
                    setDisplayUrl(url);
                } else if (typeof mediaUrl === 'string' && mediaUrl.includes('ipfs://')) {
                    const hash = mediaUrl.replace('ipfs://', '');
                    const url = getIpfsUrl(hash, 0);
                    setDisplayUrl(url);
                }
                return;
            }
            
            // Try next gateway if available
            if (gatewayAttempts < maxGatewayAttempts - 1) {
                console.log(`Trying next gateway (${gatewayAttempts + 1}/${maxGatewayAttempts})`);
                setGatewayAttempts(prev => prev + 1);
            } else {
                console.error("All gateways failed, showing error state");
                setHasError(true);
                setIsLoading(false);
            }
        };

        // Determine media type based on file extension, URL, or mediaUrl object
        const getMediaType = () => {
            // If mediaUrl is an object with a type property
            if (typeof mediaUrl === 'object' && mediaUrl.type) {
                if (mediaUrl.type.startsWith('image/')) return 'image';
                if (mediaUrl.type.startsWith('video/')) return 'video';
            }
            
            // If we have a URL string, try to determine type from extension
            if (typeof displayUrl === 'string') {
                const url = displayUrl.toLowerCase();
                // Check for image extensions
                if (url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                    url.endsWith('.png') || url.endsWith('.gif') || 
                    url.endsWith('.webp') || url.endsWith('.svg')) {
                    return 'image';
                }
                
                // Check for video extensions
                if (url.endsWith('.mp4') || url.endsWith('.webm') || 
                    url.endsWith('.ogg') || url.endsWith('.mov')) {
                    return 'video';
                }
            }
            
            // If mediaUrl is an object with a name property
            if (typeof mediaUrl === 'object' && mediaUrl.name) {
                const name = mediaUrl.name.toLowerCase();
                // Check for image extensions
                if (name.endsWith('.jpg') || name.endsWith('.jpeg') || 
                    name.endsWith('.png') || name.endsWith('.gif') || 
                    name.endsWith('.webp') || name.endsWith('.svg')) {
                    return 'image';
                }
                
                // Check for video extensions
                if (name.endsWith('.mp4') || name.endsWith('.webm') || 
                    name.endsWith('.ogg') || name.endsWith('.mov')) {
                    return 'video';
                }
            }
            
            // Default to image if we can't determine
            return 'image';
        };

        if (isLoading && !displayUrl) {
            return (
                <div className="media-loading">
                    <div className="spinner"></div>
                    <p>Loading media...</p>
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="media-error">
                    <p>Media unavailable</p>
                </div>
            );
        }

        const mediaType = getMediaType();

        return mediaType === 'video' ? (
            <div className="media-container">
                <video 
                    src={displayUrl} 
                    controls 
                    className="media-content"
                    style={{
                        maxWidth: '100%',
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto',
                        borderRadius: '8px',
                        objectFit: 'contain'
                    }}
                    onLoadedData={handleMediaLoad}
                    onError={handleMediaError}
                />
                {isLoading && (
                    <div className="media-loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading video... ({gatewayAttempts + 1}/{maxGatewayAttempts})</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="media-container">
                <img 
                    src={displayUrl} 
                    alt="Post media" 
                    className="media-content"
                    style={{
                        maxWidth: '100%',
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto',
                        borderRadius: '8px',
                        objectFit: 'contain'
                    }}
                    onLoad={handleMediaLoad}
                    onError={handleMediaError}
                />
                {isLoading && (
                    <div className="media-loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading image... ({gatewayAttempts + 1}/{maxGatewayAttempts})</p>
                    </div>
                )}
            </div>
        );
    };

    const PostCard = ({ post }) => {
        const [postContent, setPostContent] = useState('');
        const [mediaUrl, setMediaUrl] = useState(null);
        const [isExpanded, setIsExpanded] = useState(false);
        const [showComments, setShowComments] = useState(false);
        const [comments, setComments] = useState([]);
        const [commentText, setCommentText] = useState('');
        const [isLoadingComments, setIsLoadingComments] = useState(false);

        useEffect(() => {
            // Load post content when component mounts
            loadPostContent();
            // Load initial comments
            fetchComments(true);
        }, [post.id]);
        
        const loadPostContent = async () => {
            try {
                // Check if we already have the content in the post object
                if (post.content) {
                    setPostContent(post.content);
                    if (post.mediaUrl) {
                        setMediaUrl(post.mediaUrl);
                    }
                    return;
                }
                
                // Try to get from localStorage first
                const postContent = JSON.parse(localStorage.getItem('postContent') || '{}');
                if (postContent[post.contentHash]) {
                    setPostContent(postContent[post.contentHash].text || '');
                    
                    // Use the utility function to extract media URLs
                    const mediaUrls = extractMediaUrls(postContent[post.contentHash]);
                    if (mediaUrls.length > 0) {
                        console.log("Setting media URL from localStorage:", mediaUrls[0]);
                        setMediaUrl(mediaUrls[0]);
                    }
                    return;
                }
                
                // If not in localStorage, fetch from IPFS
                try {
                    console.log("Fetching content from IPFS:", post.contentHash);
                    const contentBuffer = await getFromIPFS(post.contentHash);
                    const content = JSON.parse(contentBuffer.toString());
                    console.log("IPFS content retrieved:", content);
                    
                    setPostContent(content.text || '');
                    
                    // Use the utility function to extract media URLs
                    const mediaUrls = extractMediaUrls(content);
                    if (mediaUrls.length > 0) {
                        console.log("Setting media URL from IPFS:", mediaUrls[0]);
                        setMediaUrl(mediaUrls[0]);
                    }
                    
                    // Cache for future use
                    postContent[post.contentHash] = content;
                    localStorage.setItem('postContent', JSON.stringify(postContent));
                } catch (ipfsError) {
                    console.error(`Error fetching content from IPFS for post ${post.id}:`, ipfsError);
                    
                    // Try to get from localPosts as a last resort
                    const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
                    if (localPosts[post.contentHash]) {
                        const content = localPosts[post.contentHash];
                        setPostContent(content.text || '');
                        
                        // Use the utility function to extract media URLs
                        const mediaUrls = extractMediaUrls(content);
                        if (mediaUrls.length > 0) {
                            console.log("Setting media URL from localPosts:", mediaUrls[0]);
                            setMediaUrl(mediaUrls[0]);
                        }
                    } else {
                        setPostContent('Content unavailable');
                    }
                }
            } catch (error) {
                console.error(`Error loading content for post ${post.id}:`, error);
                setPostContent('Content unavailable');
            }
        };
        
        const formatTimestamp = (timestamp) => {
            const date = new Date(timestamp);
            return format(date, 'MMM d, yyyy · h:mm a');
        };
        
        const handleLike = async () => {
            // Like functionality implementation
            console.log("Like clicked for post:", post.id);
        };
        
        const toggleComments = () => {
            setShowComments(!showComments);
            if (!showComments) {
                fetchComments(false);
            }
        };
        
        const fetchComments = async (previewOnly = false) => {
            try {
                setIsLoadingComments(true);
                
                // First check localStorage for cached comments
                const commentRefs = JSON.parse(localStorage.getItem('postCommentRefs') || '{}');
                const commentHashes = commentRefs[post.id] || [];
                
                // If we have no comments, return early
                if (commentHashes.length === 0) {
                    setComments([]);
                    setIsLoadingComments(false);
                    return;
                }
                
                // Sort comment hashes by timestamp (newest first)
                commentHashes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Limit to 3 comments if preview only
                const hashesToFetch = previewOnly ? commentHashes.slice(0, 3) : commentHashes;
                
                // Load comments from localStorage or IPFS
                const commentContent = JSON.parse(localStorage.getItem('commentContent') || '{}');
                const loadedComments = [];
                
                for (const hashObj of hashesToFetch) {
                    try {
                        // Try to get from localStorage first
                        if (commentContent[hashObj.hash]) {
                            loadedComments.push(commentContent[hashObj.hash]);
                            continue;
                        }
                        
                        // If not in localStorage, get from IPFS
                        const commentBuffer = await getFromIPFS(hashObj.hash);
                        const comment = JSON.parse(commentBuffer.toString());
                        
                        // Cache for future use
                        commentContent[hashObj.hash] = comment;
                        
                        loadedComments.push(comment);
                    } catch (error) {
                        console.error(`Error loading comment ${hashObj.hash}:`, error);
                    }
                }
                
                // Sort by timestamp (newest first)
                loadedComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                setComments(loadedComments);
                localStorage.setItem('commentContent', JSON.stringify(commentContent));
            } catch (error) {
                console.error(`Error fetching comments for post ${post.id}:`, error);
            } finally {
                setIsLoadingComments(false);
            }
        };
        
        return (
            <div className="tweet-card">
                <div className="tweet-header">
                    <div className="tweet-user-info">
                        <div className="tweet-avatar">
                            {userData.username ? userData.username[0].toUpperCase() : "U"}
                        </div>
                        <div className="tweet-user-details">
                            <span className="tweet-username">{userData.username || "User"}</span>
                            <span className="tweet-time">{formatTimestamp(post.timestamp)}</span>
                        </div>
                    </div>
                    <div className="tweet-actions">
                        <button className="tweet-menu-button">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="tweet-content">
                    {postContent && (
                        <p className={`tweet-text ${isExpanded ? 'expanded' : ''}`}>
                            {postContent}
                        </p>
                    )}
                    
                    {postContent && postContent.length > 280 && !isExpanded && (
                        <button 
                            className="read-more-button"
                            onClick={() => setIsExpanded(true)}
                        >
                            Read more
                        </button>
                    )}
                    
                    {mediaUrl && (
                        <MediaItem mediaUrl={mediaUrl} />
                    )}
                    
                    <div className="tweet-actions-bar">
                        <button 
                            className={`action-button ${post.isLikedByMe ? 'liked' : ''}`}
                            onClick={handleLike}
                        >
                            {post.isLikedByMe ? (
                                <Heart size={18} fill="#ef4444" color="#ef4444" />
                            ) : (
                                <Heart size={18} />
                            )}
                            <span>{post.likes.length > 0 ? post.likes.length : ''}</span>
                        </button>
                        <button 
                            className={`action-button ${showComments ? 'active' : ''}`}
                            onClick={toggleComments}
                        >
                            <MessageSquare size={18} />
                            <span>{comments.length > 0 ? comments.length : ''}</span>
                        </button>
                        <button className="action-button">
                            <Share2 size={18} />
                        </button>
                    </div>
                    
                    {showComments && (
                        <div className="comments-section">
                            {isLoadingComments ? (
                                <div className="loading-comments">
                                    <div className="spinner-small"></div>
                                    Loading comments...
                                </div>
                            ) : (
                                <>
                                    <div className="comment-input-container">
                                        <div className="comment-input-avatar">
                                            {userData.username ? userData.username[0].toUpperCase() : "U"}
                                        </div>
                                        <div className="comment-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="Add a comment..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                            />
                                            <button 
                                                className={`post-comment-btn ${!commentText.trim() ? 'disabled' : ''}`}
                                                disabled={!commentText.trim()}
                                                onClick={() => console.log("Adding comment:", commentText)}
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="comments-list">
                                        {comments.length > 0 ? (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="comment-item">
                                                    <div className="comment-avatar">
                                                        {comment.authorName ? comment.authorName[0].toUpperCase() : "U"}
                                                    </div>
                                                    <div className="comment-content">
                                                        <div className="comment-header">
                                                            <span className="comment-author">{comment.authorName || "Unknown"}</span>
                                                            <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
                                                        </div>
                                                        <p className="comment-text">{comment.text}</p>
                                                        <div className="comment-actions">
                                                            <button className="comment-like-btn">
                                                                <Heart size={14} />
                                                            </button>
                                                            <button className="comment-reply-btn">
                                                                Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-comments">No comments yet. Be the first to comment!</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className={`soft-ui-container ${darkMode ? 'dark-mode' : ''}`}>Loading profile...</div>;
    }

    if (errorMessage) {
        return <div className={`soft-ui-container ${darkMode ? 'dark-mode' : ''}`}>{errorMessage}</div>;
    }

    return (
        <div className={`soft-ui-container ${darkMode ? 'dark-mode' : ''}`}>
            <aside className="soft-ui-sidebar">
                <div className="sidebar-header">
                    <h3>BlockConnect</h3>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <a href="/home" onClick={handleHomeClick}>
                                <Home size={20} />
                                <span>Home</span>
                            </a>
                        </li>
                        <li>
                            <a href="/profile" className="active">
                                <User size={20} />
                                <span>Profile</span>
                            </a>
                        </li>
                        <li>
                            <a href="/data-control">
                                <Shield size={20} />
                                <span>Data Control</span>
                            </a>
                        </li>
                        <li>
                            <a href="/explore">
                                <Search size={20} />
                                <span>Explore</span>
                            </a>
                        </li>
                        <li>
                            <a href="/notifications" onClick={handleNotification} className="sidebar-nav-link">
                                <div className="nav-icon-container">
                                    <Bell size={20} />
                                    {notificationCount > 0 && (
                                        <div className="notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</div>
                                    )}
                                </div>
                                <span>Notifications</span>
                            </a>
                        </li>
                        <li>
                            <a href="/messages" className="sidebar-nav-link">
                                <div className="nav-icon-container">
                                    <MessageSquare size={20} />
                                    {unreadMessages > 0 && (
                                        <div className="notification-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</div>
                                    )}
                                </div>
                                <span>Messages</span>
                            </a>
                        </li>
                        <li>
                            <a href="/bookmarks">
                                <Bookmark size={20} />
                                <span>Bookmarks</span>
                            </a>
                        </li>
                        <li>
                            <a href="/communities">
                                <Users size={20} />
                                <span>Communities</span>
                            </a>
                        </li>
                        <li>
                            <a href="/trending">
                                <TrendingUp size={20} />
                                <span>Trending</span>
                            </a>
                        </li>
                        <li>
                            <a href="/topics">
                                <Hash size={20} />
                                <span>Topics</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" onClick={handleHiddenTweetsClick}>
                                <Eye size={20} />
                                <span>Hidden Tweets</span>
                                {hiddenTweets.length > 0 && (
                                    <span className="notification-badge">
                                        {hiddenTweets.length}
                                    </span>
                                )}
                            </a>
                        </li>
                        <li>
                            <a href="/analytics">
                                <BarChart size={20} />
                                <span>Analytics</span>
                            </a>
                        </li>
                        <li className="sidebar-divider"></li>
                        <li>
                            <button className="settings-button" onClick={() => setShowSettings(!showSettings)}>
                                <Settings size={20} />
                                <span>Settings</span>
                            </button>
                            {showSettings && (
                                <div className="settings-dropdown">
                                    <button className="settings-item" onClick={() => navigate("/edit-profile")}>
                                        <User size={18} />
                                        <span>Edit Profile</span>
                                    </button>
                                    <button className="settings-item" onClick={toggleDarkMode}>
                                        {darkMode ? (
                                            <>
                                                <Sun size={18} />
                                                <span>Light Mode</span>
                                            </>
                                        ) : (
                                            <>
                                                <Moon size={18} />
                                                <span>Dark Mode</span>
                                            </>
                                        )}
                                    </button>
                                    <button className="settings-item" onClick={() => navigate("/privacy")}>
                                        <Shield size={18} />
                                        <span>Privacy</span>
                                    </button>
                                    <button className="settings-item" onClick={() => navigate("/help")}>
                                        <HelpCircle size={18} />
                                        <span>Help Center</span>
                                    </button>
                                </div>
                            )}
                        </li>
                        <li>
                            <a href="#logout" onClick={handleLogout} className="logout-button">
                                <LogOut size={20} />
                                <span>Logout</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>

            <main className="soft-ui-main">
                <div className="cover-photo-container">
                    {coverImagePreview ? (
                        <img
                            src={coverImagePreview}
                            alt="Cover"
                            className="cover-photo"
                        />
                    ) : (
                        <div className="cover-photo-placeholder"></div>
                    )}
                    <label htmlFor="cover-photo-upload" className="edit-cover-button">
                        <Camera size={16} />
                        Edit cover photo
                        <input
                            type="file"
                            id="cover-photo-upload"
                            accept="image/*"
                            onChange={handleCoverPhotoChange}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
                
                <div className="profile-header">
                    <div className="profile-card">
                        <div className="profile-upload-container">
                            <div className="profile-image-wrapper">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Profile"
                                        className="profile-image"
                                    />
                                ) : (
                                    <div className="profile-upload-placeholder">
                                        <Camera className="camera-icon" />
                                    </div>
                                )}
                                {showPlus && (
                                    <label htmlFor="profile-upload" className="profile-upload-plus">
                                        <Plus size={20} color="white" />
                                    </label>
                                )}
                                <input
                                    type="file"
                                    id="profile-upload"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="profile-upload-input"
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                        <div className="profile-details">
                            <div className="profile-header-with-edit">
                                <h2>{userData?.username || "No Name"}</h2>
                                <button className="edit-profile-button" onClick={handleEditClick}>
                                    <Pencil size={18} />
                                </button>
                            </div>
                            <p className="profile-email">{userData?.email || "No Email"}</p>
                            <p className="profile-about">
                                {userData?.about || "Tell us about yourself"}
                            </p>
                            
                            <div className="profile-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{userData?.postCount || 0}</span>
                                    <span className="stat-label">Tweets</span>
                                </div>
                                <div 
                                    className="stat-item clickable" 
                                    onClick={handleFollowersClick}
                                >
                                    <span className="stat-value">{userData?.followerCount || 0}</span>
                                    <span className="stat-label">Followers</span>
                                    {userData?.pendingRequestsCount > 0 && (
                                        <span className="pending-requests-badge" title="Pending follow requests">
                                            +{userData.pendingRequestsCount}
                                        </span>
                                    )}
                                </div>
                                <div 
                                    className="stat-item clickable" 
                                    onClick={handleFollowingClick}
                                >
                                    <span className="stat-value">{userData?.followingCount || 0}</span>
                                    <span className="stat-label">Following</span>
                                </div>
                            </div>

                            {renderProfileActions()}
                        </div>
                    </div>
                </div>
                <div className="profile-content">
                    {!showHiddenTweets ? (
                        <section>
                            <div className="tweets-section">
                                <div className="tweets-header">
                                    <h3>Tweets</h3>
                                    <button className="create-tweet-button" onClick={handleCreateTweet}>
                                        <Plus size={16} />
                                        Tweet
                                    </button>
                                </div>
                                
                                    <div className="tweets-list">
                                    {loading ? (
                                        <div className="loading-state">
                                            <div className="spinner"></div>
                                            <p>Loading tweets...</p>
                                                        </div>
                                    ) : error ? (
                                        <div className="error-state">
                                            <p>{error}</p>
                                                    </div>
                                    ) : posts.length === 0 ? (
                                    <div className="no-tweets-container">
                                        <p>You haven't tweeted yet</p>
                                        <button className="create-first-tweet-button" onClick={handleCreateTweet}>
                                            Create your first tweet
                                        </button>
                                    </div>
                                    ) : (
                                        posts.map((post) => (
                                            <PostCard key={post.id} post={post} />
                                        ))
                                )}
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section>
                            <div className="tweets-section">
                                <div className="tweets-header">
                                    <h3>Hidden Tweets</h3>
                                    <button 
                                        className="back-button"
                                        onClick={() => setShowHiddenTweets(false)}
                                        title="Back to tweets"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {hiddenTweets.length > 0 ? (
                                    <div className="tweets-list">
                                        {hiddenTweets.map((tweet) => (
                                            <PostCard key={tweet.id} post={tweet} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-tweets">
                                        <p>No hidden tweets</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {selectedPost && (
                <PostModal 
                    post={selectedPost} 
                    onClose={() => {
                        // Clean closure of the modal
                        setSelectedPost(null);
                    }} 
                    onLike={handleLike}
                />
            )}

            {/* Edit Menu Modal */}
            {isEditMenuOpen && (
                <div className="edit-menu-overlay" onClick={() => setIsEditMenuOpen(false)}>
                    <div className="edit-menu" onClick={e => e.stopPropagation()}>
                        <h3>Edit Profile</h3>
                        <div className="edit-field">
                            <label>Name</label>
                            <input
                                type="text"
                                id="username-edit"
                                name="username-edit"
                                value={editedData.username}
                                onChange={e => setEditedData({...editedData, username: e.target.value})}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="edit-field">
                            <label>About</label>
                            <textarea
                                id="about-edit"
                                name="about-edit"
                                value={editedData.about}
                                onChange={e => setEditedData({...editedData, about: e.target.value})}
                                placeholder="Tell us about yourself"
                            />
                        </div>
                        <div className="edit-menu-actions">
                            <button 
                                className="cancel-button" 
                                onClick={() => setIsEditMenuOpen(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="save-button" 
                                onClick={handleSave}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFollowersModal && (
                <FollowModal
                    isOpen={showFollowersModal}
                    onClose={() => setShowFollowersModal(false)}
                    title="Followers"
                    userList={followList}
                />
            )}

            {showFollowingModal && (
                <FollowModal
                    isOpen={showFollowingModal}
                    onClose={() => setShowFollowingModal(false)}
                    title="Following"
                    userList={followList}
                />
            )}
        </div>
    );
}

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    
    // Get date
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // Get time
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Format: DD/MM/YYYY HH:MM
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const processString = (str) => {
    if (!str) return [];
    return str.split(' ');
};

export default ProfilePage;