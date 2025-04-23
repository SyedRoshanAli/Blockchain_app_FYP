import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserAuthContract, CreatePostContract, FollowRelationshipContract } from "../UserAuth";
import { 
    Plus, 
    Camera, 
    LogOut, 
    Heart, 
    MessageCircle, 
    Share2, 
    X, 
    Settings,
    User,
    Moon,
    Sun,
    Home,
    Search,
    Bell,
    MessageSquare,
    Bookmark,
    Users,
    TrendingUp,
    Hash,
    HelpCircle,
    Shield,
    Pencil,
    MoreVertical,
    Edit,
    Trash,
    Eye,
    EyeOff,
    MoreHorizontal,
    File,
    Send
} from "lucide-react";
import "./Profile.css";
import { toast } from "react-hot-toast";
import { format } from 'date-fns';
import { ethers } from 'ethers';
import { messageService } from '../services/messageService';
import FollowModal from './FollowModal';
import { checkCorrectNetwork, switchToCorrectNetwork } from '../utils/networkHelpers';
import { getFromIPFS } from '../ipfs';
import PostModal from '../components/PostModal';
import { cleanupFollowRequests, resetAllUserData } from '../utils/cleanupStorage';
import { notificationService } from '../services/notificationService';
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

        return () => {
            clearInterval(interval);
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
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Get unread count from contract
            const count = await UserAuthContract.methods
                .getUnreadMessageCount()
                .call({ from: accounts[0] });
                
            setUnreadMessages(Number(count));
        } catch (error) {
            console.error('Error fetching unread count:', error);
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
                    setImagePreview(reader.result);
                    setShowPlus(false);
                };
                reader.readAsDataURL(file);
                toast.success('Profile picture updated!');
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
                    setCoverImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
                toast.success('Cover photo updated!');
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
            const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
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
            
            // Create notification
            await notificationService.createFollowRequestNotification(
                recipientAddress,
                displayName
            );
        } catch (error) {
            console.error("Error sending follow request:", error);
            toast.error("Failed to send follow request. Please try again.");
        }
    };

    // Add this PostCard component in your Profile.js file, similar to the one in HomePage.js
    const PostCard = ({ post }) => {
        const [postContent, setPostContent] = useState(post.content || null);
        const [loading, setLoading] = useState(!post.content);
        const [error, setError] = useState(null);
        
        useEffect(() => {
            if (!post.content) {
                const fetchPostContent = async () => {
                    try {
                        setLoading(true);
                        setError(null);
                        const contentHash = post.contentHash;
                        
                        // ALWAYS check localStorage first as our primary source
                        const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
                        if (localPosts[contentHash]) {
                            console.log("Found post in localStorage:", contentHash);
                            setPostContent(localPosts[contentHash]);
                            setLoading(false);
                            return;
                        }
                        
                        // Try to get content from IPFS
                        try {
                            const contentBuffer = await getFromIPFS(contentHash);
                            
                            // Try to parse the data
                            try {
                                const contentText = new TextDecoder().decode(contentBuffer);
                                const postData = JSON.parse(contentText);
                                
                                // Cache the successfully retrieved post
                                localPosts[contentHash] = postData;
                                localStorage.setItem('localPosts', JSON.stringify(localPosts));
                                
                                setPostContent(postData);
                                
                                // Also attach to the post object for the modal
                                post.content = postData;
                                
                            } catch (parseError) {
                                console.error("Error parsing post data:", parseError);
                                throw new Error("Could not parse post data");
                            }
                        } catch (ipfsError) {
                            console.error("IPFS retrieval failed:", ipfsError);
                            
                            // Create placeholder content with blockchain data
                            const fallbackContent = {
                                text: "Post created at " + formatDate(post.timestamp),
                                timestamp: post.timestamp,
                                media: [],
                                tags: [],
                                creator: post.creator
                            };
                            
                            // Store this placeholder in localStorage for future use
                            localPosts[contentHash] = fallbackContent;
                            localStorage.setItem('localPosts', JSON.stringify(localPosts));
                            
                            setPostContent(fallbackContent);
                        }
                    } catch (error) {
                        console.error("Error in post content processing:", error);
                        setError(error.message);
                    } finally {
                        setLoading(false);
                    }
                };
                
                fetchPostContent();
            }
        }, [post.contentHash, post.timestamp, post.creator, post.content]);
        
        useEffect(() => {
            // Always load comments on mount to get the count and preview top 3
            const fetchInitialData = async () => {
                try {
                    // Get the current user's address first
                    const accounts = await window.ethereum.request({
                        method: "eth_requestAccounts",
                    });
                    setCurrentAddress(accounts[0].toLowerCase());
                    
                    // Fetch comments to display count and top 3 by default
                    await fetchComments(true);
                } catch (error) {
                    console.error("Error loading initial comment data:", error);
                }
            };
            
            fetchInitialData();
        }, [post.id]);

        useEffect(() => {
            if (showComments) {
                fetchComments(false);
            }
        }, [showComments]);

        const fetchComments = async (topOnly = false) => {
            setIsLoadingComments(true);
            
            try {
                // Get comment references from localStorage
                const commentRefs = JSON.parse(localStorage.getItem('postCommentRefs') || '{}');
                const postCommentRefs = commentRefs[post.id] || [];
                
                // If there are no comments, set empty array and return
                if (postCommentRefs.length === 0) {
                    setComments([]);
                    setIsLoadingComments(false);
                    return;
                }
                
                // Get cached comments
                const cachedComments = JSON.parse(localStorage.getItem('commentContent') || '{}');
                
                let commentsData = [];
                
                // Process each comment reference
                for (const ref of postCommentRefs) {
                    try {
                        let commentData;
                        
                        // First check if we have it cached
                        if (cachedComments[ref.hash]) {
                            commentData = cachedComments[ref.hash];
                        } else {
                            // If not cached, try to fetch from IPFS
                            try {
                                const data = await getFromIPFS(ref.hash);
                                const jsonData = JSON.parse(data.toString());
                                commentData = jsonData;
                                
                                // Cache it for future
                                cachedComments[ref.hash] = commentData;
                                localStorage.setItem('commentContent', JSON.stringify(cachedComments));
                            } catch (error) {
                                console.error("Failed to fetch comment from IPFS:", error);
                                // If we can't get it from IPFS, use the fallback data
                                commentData = ref.data || {
                                    id: ref.hash,
                                    text: "Comment content unavailable",
                                    authorName: ref.authorName || "Unknown",
                                    timestamp: ref.timestamp || new Date().toISOString(),
                                    likes: []
                                };
                            }
                        }
                        
                        commentsData.push(commentData);
                    } catch (error) {
                        console.error("Error processing comment:", error);
                    }
                }
                
                // Sort comments by timestamp, newest first
                commentsData.sort((a, b) => {
                    const dateA = new Date(a.timestamp);
                    const dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });
                
                setComments(commentsData);
            } catch (error) {
                console.error("Failed to fetch comments:", error);
                setComments([]);
            } finally {
                setIsLoadingComments(false);
            }
        };

        const handleCommentsClick = (e) => {
            if (e) {
                e.preventDefault(); // Prevent navigation
                e.stopPropagation(); // Stop event bubbling
            }
            
            setShowComments(!showComments);
            if (!showComments) {
                fetchComments(false); // fetch all comments
            }
        };

        const handleAddComment = async () => {
            if (!commentText.trim()) return;
            
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts"
                });
                const currentAddress = accounts[0].toLowerCase();
                
                // Get current user's username
                const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const currentUsername = userSession.username || userData.username;
                
                // Create new comment object
                const newComment = {
                    id: Date.now().toString(),
                    text: commentText,
                    authorAddress: currentAddress,
                    authorName: currentUsername,
                    timestamp: new Date().toISOString(),
                    likes: []
                };
                
                // Upload comment to IPFS
                try {
                    // Convert comment object to JSON string and then to buffer
                    const commentString = JSON.stringify(newComment);
                    const commentBuffer = Buffer.from(commentString);
                    
                    // Upload to IPFS using the existing uploadToIPFS function
                    const { uploadToIPFS } = await import('../ipfs');
                    const commentHash = await uploadToIPFS(commentBuffer);
                    
                    console.log("Uploaded comment to IPFS with hash:", commentHash);
                    
                    // Store the comment itself in localStorage as a cache
                    const commentContent = JSON.parse(localStorage.getItem('commentContent') || '{}');
                    commentContent[commentHash] = newComment;
                    localStorage.setItem('commentContent', JSON.stringify(commentContent));
                    
                    // Store the comment hash in the post's comment list
                    const commentRefs = JSON.parse(localStorage.getItem('postCommentRefs') || '{}');
                    if (!commentRefs[post.id]) {
                        commentRefs[post.id] = [];
                    }
                    
                    // Add reference with timestamp for sorting
                    commentRefs[post.id].push({
                        hash: commentHash,
                        timestamp: newComment.timestamp,
                        authorName: currentUsername
                    });
                    
                    localStorage.setItem('postCommentRefs', JSON.stringify(commentRefs));
                    
                    // Update UI immediately
                    const updatedComments = [...comments, newComment];
                    setComments(updatedComments);
                    
                    // Also keep in postComments for backward compatibility
                    const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
                    allComments[post.id] = updatedComments;
                    localStorage.setItem('postComments', JSON.stringify(allComments));
                    
                    // Clear input
                    setCommentText('');
                    
                    // Create notification for post owner if it's not the current user
                    if (post.creator.toLowerCase() !== currentAddress) {
                        // Similar notification logic as in HomePage.js
                        // ... [notification code here]
                    }
                } catch (ipfsError) {
                    console.error("Failed to upload comment to IPFS:", ipfsError);
                    toast.error("Failed to store comment on IPFS. Saving locally only.");
                    
                    // Add to state anyway (localStorage only as fallback)
                    const updatedComments = [...comments, newComment];
                    setComments(updatedComments);
                    
                    const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
                    allComments[post.id] = updatedComments;
                    localStorage.setItem('postComments', JSON.stringify(allComments));
                    
                    setCommentText('');
                }
            } catch (error) {
                console.error("Error adding comment:", error);
                toast.error("Failed to add comment");
            }
        };

        const handleLikeComment = async (commentId) => {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts"
                });
                const currentAddress = accounts[0].toLowerCase();
                
                // Update comment likes
                const updatedComments = comments.map(comment => {
                    if (comment.id === commentId) {
                        const isAlreadyLiked = comment.likes.includes(currentAddress);
                        
                        if (isAlreadyLiked) {
                            // Unlike
                            return {
                                ...comment,
                                likes: comment.likes.filter(addr => addr !== currentAddress)
                            };
                        } else {
                            // Like
                            return {
                                ...comment,
                                likes: [...comment.likes, currentAddress]
                            };
                        }
                    }
                    return comment;
                });
                
                setComments(updatedComments);
                
                // Update cached comments
                // Same storage logic as in HomePage.js
                // ... [storage update code here]
            } catch (error) {
                console.error("Error liking comment:", error);
                toast.error("Failed to like comment");
            }
        };

        const formatCommentTime = (timestamp) => {
            let date;
            
            // Check if timestamp is a string (ISO format) or a number (Unix timestamp)
            if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else {
                date = new Date(timestamp); // Will handle numbers automatically
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);
            
            if (diffSec < 60) return `${diffSec}s`;
            if (diffMin < 60) return `${diffMin}m`;
            if (diffHour < 24) return `${diffHour}h`;
            if (diffDay < 7) return `${diffDay}d`;
            
            // Return formatted date for older posts
            return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        };

        if (loading) {
            return (
                <div className="tweet-card animate-post">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Loading post...</p>
                    </div>
                </div>
            );
        }
        
        return (
            <div 
                className="tweet-card" 
                onClick={(e) => {
                    // Prevent any default behavior
                    e.preventDefault();
                    // Stop propagation to parent elements
                    e.stopPropagation();
                    // Call handlePostClick with the post data
                    handlePostClick({...post, content: postContent});
                }}
            >
                <div className="tweet-header">
                    <div className="tweet-meta">
                        <span className="tweet-date">{formatDate(post.timestamp)}</span>
                    </div>
                    <div className="tweet-options">
                        <button className="options-button">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="tweet-content">
                    {error ? (
                        <p className="error-message">Error loading post content: {error}</p>
                    ) : postContent ? (
                        <>
                            {postContent.text && (
                                <p>{postContent.text}</p>
                            )}
                            
                            {/* Display tags if any */}
                            {postContent.tags && postContent.tags.length > 0 && (
                                <div className="post-tags">
                                    {postContent.tags.map((tag, index) => (
                                        <span key={index} className="post-tag">
                                            <Hash size={14} style={{marginRight: '4px'}} />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            {/* Display media files if any */}
                            {postContent.media && postContent.media.length > 0 && (
                                <div className="post-media-container">
                                    {postContent.media.map((media, index) => (
                                        <div key={index} className="post-media-item">
                                            {media.type && media.type.startsWith('image/') ? (
                                                <img 
                                                    src={`https://ipfs.io/ipfs/${media.hash}`} 
                                                    alt={media.name || "Post image"} 
                                                    className="post-image" 
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ddd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                                                        e.target.style.padding = "20px";
                                                        e.target.style.background = "#f5f5f5";
                                                    }}
                                                />
                                            ) : media.type && media.type.startsWith('video/') ? (
                                                <video 
                                                    src={`https://ipfs.io/ipfs/${media.hash}`} 
                                                    controls
                                                    className="post-video"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.style.display = "none";
                                                        e.target.parentNode.innerHTML = "<div class='post-file'><svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2v8L22 7v8H12v7'></path></svg><span>Video unavailable</span></div>";
                                                    }}
                                                />
                                            ) : (
                                                <div className="post-file">
                                                    <File size={24} />
                                                    <span>{media.name || "File"}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p>Post content unavailable</p>
                    )}
                </div>
                
                <div className="tweet-actions">
                    <button 
                        className={`tweet-action-button ${post.isLikedByMe ? 'active' : ''}`} 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLike(post.id);
                        }}
                    >
                        {post.isLikedByMe ? (
                            <Heart size={18} fill="#ef4444" color="#ef4444" />
                        ) : (
                            <Heart size={18} />
                        )}
                        <span>{post.likes.length > 0 ? post.likes.length : ''} Like{post.likes.length !== 1 ? 's' : ''}</span>
                    </button>
                    <button 
                        className={`action-button ${showComments ? 'active' : ''}`} 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCommentsClick(e);
                        }}
                    >
                        <MessageSquare size={20} />
                        <span>{comments.length > 0 ? comments.length : ''} Comment{comments.length !== 1 ? 's' : ''}</span>
                    </button>
                    <button className="tweet-action-button" onClick={(e) => e.stopPropagation()}>
                        <Share2 size={18} />
                        <span>Share</span>
                    </button>
                </div>

                {/* Comments section with preview of top 3 */}
                <div className={`comments-section ${showComments ? 'expanded' : ''}`}>
                    {isLoadingComments ? (
                        <div className="comment-loading">
                            <div className="spinner-small"></div>
                            <span>Loading comments...</span>
                        </div>
                    ) : (
                        <>
                            {/* Always show comment input */}
                            <div className="add-comment">
                                <div className="comment-input-container">
                                    <input
                                        type="text"
                                        id="comment-input"
                                        name="comment-input"
                                        placeholder="Add a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button 
                                        className="post-comment-btn"
                                        disabled={!commentText.trim()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddComment();
                                        }}
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                            
                            {/* Show top 3 comments always, or all comments when expanded */}
                            {comments.length > 0 && (
                                <div className="comments-list">
                                    {(showComments ? comments : comments.slice(0, 3)).map((comment) => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-avatar">
                                                {comment.authorName ? comment.authorName[0].toUpperCase() : "U"}
                                            </div>
                                            <div className="comment-content">
                                                <div className="comment-header">
                                                    <span className="comment-author">{comment.authorName || "Unknown User"}</span>
                                                    <span className="comment-time">{formatCommentTime(comment.timestamp)}</span>
                                                </div>
                                                <p className="comment-text">{comment.text}</p>
                                                <div className="comment-actions">
                                                    <button
                                                        className={`comment-like-btn ${comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentAddress) ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLikeComment(comment.id);
                                                        }}
                                                    >
                                                        <Heart size={14} />
                                                        <span>{comment.likes && Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!showComments && comments.length > 0 && comments.length > 3 && (
                                <button 
                                    className="view-more-comments"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowComments(true);
                                    }}
                                >
                                    View all {comments.length} comments
                                </button>
                            )}
                            
                            {comments.length === 0 && (
                                <p className="no-comments">No comments yet. Be the first to comment!</p>
                            )}
                        </>
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
                            <NotificationBadge />
                        </li>
                        <li>
                            <a href="/messages">
                                <MessageSquare size={20} />
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
                                    <div className="no-tweets">
                                            <h3>No tweets yet</h3>
                                            <p>When you post, your tweets will show up here.</p>
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