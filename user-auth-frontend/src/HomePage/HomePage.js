import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CreatePostContract, UserAuthContract, FollowRelationshipContract } from "../UserAuth";
import { format } from 'date-fns';
import { 
    Plus, 
    Camera, 
    Heart, 
    MessageCircle, 
    Share, 
    Share2,
    Search, 
    User, 
    Home, 
    Bell, 
    Bookmark, 
    Settings, 
    LogOut, 
    MessageSquare, 
    Moon, 
    Sun, 
    MoreHorizontal, 
    Hash, 
    Image, 
    Video, 
    File, 
    Send,
    BarChart,
    Calendar,
    Link as LinkIcon,
    TrendingUp
} from 'lucide-react';
import './HomePage.css';
import LogoImage from '../logo.png';
import { cleanupFollowRequests } from '../utils/cleanupStorage';
import messageService from '../services/messageService';
import { getFromIPFS } from '../ipfs';
import { IPFS_GATEWAY, IPFS_GATEWAYS } from '../ipfs';
import { getIpfsUrl, extractMediaUrls, getWorkingMediaUrl, generatePlaceholderImage } from '../utils/ipfsUtils';
import PostModal from '../components/PostModal';
import { notificationService } from '../services/notificationService';
import NotificationBadge from '../components/Notifications/NotificationBadge';

const HomePage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userData, setUserData] = useState(null);
    const [recommendedUsers, setRecommendedUsers] = useState([]);
    const [followRequestCount, setFollowRequestCount] = useState(0);
    const [animateContent, setAnimateContent] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [messagesDropdownOpen, setMessagesDropdownOpen] = useState(false);
    const [recentMessages, setRecentMessages] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [userStats, setUserStats] = useState({
        posts: 0,
        followers: 0,
        following: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        // Clean up storage first
        cleanupFollowRequests();
        
        fetchAllPosts();
        checkFollowRequests();
        
        // Load dark mode preference from localStorage
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }

        // Get user data from localStorage
        const storedData = localStorage.getItem("userData");
        if (storedData) {
            setUserData(JSON.parse(storedData));
        }

        fetchRecommendedUsers();

        // Set up interval to check for new requests
        const interval = setInterval(checkFollowRequests, 30000); // Check every 30 seconds
        
        // Add animations
        setTimeout(() => {
            setAnimateContent(true);
        }, 100);
        
        // Fetch unread message count
        const fetchUnreadCount = async () => {
            try {
                const count = await messageService.getUnreadCount();
                setUnreadMessages(Number(count));
                
                if (Number(count) > 0) {
                    // Fetch recent messages for preview
                    const allMessages = await messageService.getAllMessages();
                    const unreadMsgs = allMessages.filter(msg => !msg.isRead && msg.sender !== window.ethereum.selectedAddress);
                    
                    // Get usernames for senders
                    const messagesWithUsernames = await Promise.all(
                        unreadMsgs.slice(0, 3).map(async (msg) => {
                            const usernames = await UserAuthContract.methods
                                .getUsernames(msg.sender)
                                .call();
                            
                            return {
                                ...msg,
                                senderName: usernames[0] || 'Unknown User',
                                timestamp: Number(msg.timestamp) * 1000
                            };
                        })
                    );
                    
                    // Sort by most recent first
                    messagesWithUsernames.sort((a, b) => b.timestamp - a.timestamp);
                    
                    setRecentMessages(messagesWithUsernames);
                }
            } catch (error) {
                console.error("Error fetching unread count:", error);
            }
        };
        
        fetchUnreadCount();
        
        // Set up interval to check for new messages
        const messageInterval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
        
        // Check for notifications initially and set up interval
        const checkNotificationsAndUpdate = async () => {
            const count = await checkNotifications();
            setNotificationCount(count);
        };
        
        checkNotificationsAndUpdate();
        
        const notificationInterval = setInterval(() => {
            checkNotificationsAndUpdate();
        }, 30000); // Check every 30 seconds
        
        return () => {
            clearInterval(interval);
            clearInterval(messageInterval);
            clearInterval(notificationInterval);
        };
    }, []);

    useEffect(() => {
        if (userData) {
            const fetchStats = async () => {
                const stats = await getUserStats();
                setUserStats(stats);
            };
            fetchStats();
        }
    }, [userData]);

    const fetchAllPosts = async () => {
        setLoading(true);
        
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            
            // Get post count
            const postCount = await CreatePostContract.methods.postCounter().call();
            
            // Create an array of post IDs from 1 to postCount
            const postIds = Array.from(
                { length: parseInt(postCount) }, 
                (_, i) => i + 1
            ).reverse(); // Newest first
            
            // Get current user's address
            const currentAddress = accounts[0].toLowerCase();
            
            // Get liked posts from localStorage
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
            const userLikedPosts = likedPosts[currentAddress] || [];
            
            const fetchedPosts = [];
            const creatorAddresses = new Set(); // To collect unique creator addresses
            
            // Fetch posts details for each ID
            for (const postId of postIds) {
                try {
                    const postDetails = await CreatePostContract.methods
                            .getPost(postId)
                            .call();

                    // Explicitly fetch likes for this post from the blockchain
                    const likes = await CreatePostContract.methods
                        .getPostLikes(postId)
                        .call();
                    
                    // Check if user's address is in the post's likes array OR in localStorage
                    const isLikedByMe = userLikedPosts.includes(postId.toString()) || 
                                        likes.some(addr => addr.toLowerCase() === currentAddress);
                    
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
                    
                    fetchedPosts.push(post);
                    creatorAddresses.add(postDetails.creator); // Add to set for username fetching
                } catch (err) {
                    console.error(`Error fetching post ${postId}:`, err);
                }
            }
            
            // Fetch usernames for all creators
            const addressesArray = [...creatorAddresses];
            for (const address of addressesArray) {
                try {
                    const usernames = await UserAuthContract.methods
                        .getUsernames(address)
                        .call();
                    
                    if (usernames && usernames.length > 0) {
                        localStorage.setItem(`usernames_${address.toLowerCase()}`, JSON.stringify(usernames));
                    }
                } catch (err) {
                    console.error(`Error fetching username for ${address}:`, err);
                }
            }
            
            setPosts(fetchedPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast.error("Failed to load posts");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch {
            return 'Invalid date';
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', !darkMode);
    };

    const handleLogout = () => {
        localStorage.removeItem("userSession");
        localStorage.removeItem("darkMode");
        navigate("/login");
        toast.success("Logged out successfully");
    };

    const handleSearch = async (e) => {
        try {
            setIsSearching(true);
        const query = e.target.value;
            setSearchQuery(query); // Make sure to update the search query state

            if (query.trim() === '') {
            setSearchResults([]);
                setIsSearching(false);
            return;
        }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Get all registered usernames
            const usernames = await UserAuthContract.methods.getAllUsernames().call();
            
            // Filter usernames that match the search query
            const filteredUsernames = usernames.filter(username => 
                username && username.toLowerCase().includes(query.toLowerCase())
            );
            
            // Get current user's username to filter out
            const currentUsername = localStorage.getItem('username');
            
            // Filter out the current user and remove duplicates by creating a Set
            const uniqueUsernames = [...new Set(filteredUsernames)].filter(
                username => username && username !== currentUsername
            );
            
            // Prepare search results with user data
            const results = await Promise.all(
                uniqueUsernames.map(async (username) => {
                    try {
                        const address = await UserAuthContract.methods.getAddressByUsername(username).call();
                        return { username, address };
                    } catch (error) {
                        console.error(`Error fetching address for ${username}:`, error);
                        return null;
                    }
                })
            );
            
            // Filter out any null results
            const validResults = results.filter(result => result !== null);
            
            setSearchResults(validResults);
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreatePost = () => {
        navigate("/createpost");
    };

    const handleProfileClick = () => {
        navigate("/profile");
    };

    const fetchRecommendedUsers = async () => {
        try {
        setIsSearching(true);
            
            // Get current MetaMask account
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const currentAccount = accounts[0];
            
            // Get all registered usernames
            const usernames = await UserAuthContract.methods.getAllUsernames().call();
            
            // Get current user's username from localStorage
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const currentUsername = userSession.username || userData.username || localStorage.getItem('username');
            
            console.log("Current username:", currentUsername);
            
            // Get current user's following list from blockchain
            let followingAddresses = [];
            try {
                followingAddresses = await FollowRelationshipContract.methods
                    .getFollowing(currentAccount)
                .call();
            } catch (error) {
                console.error("Error fetching following addresses:", error);
                // If blockchain query fails, use localStorage as fallback
                const followingKey = `following_${currentUsername}`;
                const followingList = JSON.parse(localStorage.getItem(followingKey) || '[]');
                followingAddresses = followingList;
            }
            
            // Get current user's followers list from blockchain
            let followerAddresses = [];
            try {
                followerAddresses = await FollowRelationshipContract.methods
                    .getFollowers(currentAccount)
                        .call();
            } catch (error) {
                console.error("Error fetching follower addresses:", error);
                // If blockchain query fails, use localStorage as fallback
                const followersKey = `followers_${currentUsername}`;
                const followersList = JSON.parse(localStorage.getItem(followersKey) || '[]');
                followerAddresses = followersList;
            }
            
            // Filter usernames and create user objects
            const validUsers = [];
            
            for (const username of usernames) {
                try {
                    // Skip if username is not valid
                    if (!username) continue;
                    
                    // Skip if this is the current user (case-insensitive)
                    if (username.toLowerCase() === currentUsername?.toLowerCase()) continue;
                    
                    // Get the address for this username
                    const address = await UserAuthContract.methods.getAddressByUsername(username).call();
                    
                    // Don't recommend users with the same Ethereum address
                    if (address.toLowerCase() === currentAccount.toLowerCase()) continue;
                    
                    // Skip if we're already following this user (check blockchain data)
                    const isFollowing = followingAddresses.some(addr => 
                        addr.toLowerCase() === address.toLowerCase()
                    );
                    if (isFollowing) continue;
                    
                    // Skip if this user is already following us
                    const isFollower = followerAddresses.some(addr => 
                        addr.toLowerCase() === address.toLowerCase()
                    );
                    if (isFollower) continue;
                    
                    // Add this user to our recommendation list
                    validUsers.push({ username, address });
                } catch (error) {
                    console.log(`Error checking user ${username}:`, error);
                    // Skip this user if there was an error
                    continue;
                }
            }
            
            // Remove duplicates by username
            const uniqueUsers = Array.from(
                new Map(validUsers.map(user => [user.username.toLowerCase(), user])).values()
            );
            
            console.log("Filtered recommendations:", uniqueUsers);
            
            // Limit to 5 random recommendations if there are more than 5
            let recommendationList = uniqueUsers;
            if (uniqueUsers.length > 5) {
                recommendationList = uniqueUsers
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 5);
            }
            
            setRecommendedUsers(recommendationList);
        } catch (error) {
            console.error('Error fetching recommended users:', error);
            setRecommendedUsers([]);
        } finally {
            setIsSearching(false);
        }
    };

    const checkFollowRequests = () => {
        try {
            // Get current user's username
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            // Try to get username from multiple possible locations
            const currentUsername = 
                localStorage.getItem('username') || 
                userSession.username || 
                userData.username;
            
            console.log("Current username checking follow requests:", currentUsername);
            
            if (!currentUsername) {
                setFollowRequestCount(0);
                return;
            }
            
            // Get pending follow requests from localStorage
            const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
            
            // Filter for requests where current user is the recipient
            const myRequests = pendingRequests.filter(req => 
                req && req.to && req.to === currentUsername && req.from
            );
            
            // Update the notification badge count
            setFollowRequestCount(myRequests.length);
            
            console.log(`Found ${myRequests.length} pending follow requests for ${currentUsername}`);
        } catch (error) {
            console.error("Error checking follow requests:", error);
            setFollowRequestCount(0);
        }
    };

    const getUserStats = async () => {
        try {
            if (!userData || !userData.username) return { posts: 0, followers: 0, following: 0 };
            
            // Get current user's address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            const currentAddress = accounts[0].toLowerCase();
            
            // Get user's posts count from blockchain
            let userPostCount = 0;
            try {
                const postIds = await CreatePostContract.methods
                    .getPostsByUser(currentAddress)
                    .call();
                userPostCount = postIds.length;
            } catch (error) {
                console.error("Error fetching user posts:", error);
                // Fallback to localStorage if blockchain query fails
                const userPosts = posts.filter(post => 
                    post.creator.toLowerCase() === currentAddress
                );
                userPostCount = userPosts.length;
            }
            
            // Get follower and following counts from blockchain
            let followersCount = 0;
            let followingCount = 0;
            
            try {
                followersCount = await FollowRelationshipContract.methods
                    .getFollowersCount(currentAddress)
                    .call();
                
                followingCount = await FollowRelationshipContract.methods
                    .getFollowingCount(currentAddress)
                    .call();
            } catch (error) {
                console.error("Error fetching follow counts from blockchain:", error);
                
                // Fallback to localStorage
                const username = userData.username;
                const followersKey = `followers_${username}`;
                const followingKey = `following_${username}`;
                
                const followersList = JSON.parse(localStorage.getItem(followersKey) || '[]');
                const followingList = JSON.parse(localStorage.getItem(followingKey) || '[]');
                
                followersCount = followersList.length;
                followingCount = followingList.length;
            }
            
                    return {
                posts: userPostCount,
                followers: Number(followersCount),
                following: Number(followingCount)
            };
        } catch (error) {
            console.error("Error in getUserStats:", error);
            return { posts: 0, followers: 0, following: 0 };
        }
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
            
            // Get the post details to determine its creator
            const postToLike = posts.find(p => p.id === postId);
            
            if (postToLike && !isAlreadyLiked && postToLike.creator.toLowerCase() !== currentAddress) {
                // Find the username of the current user (liker)
                const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const currentUsername = userSession.username || userData.username;
                
                // Find username of post creator
                let creatorUsername = '';
                try {
                    // Try to get from localStorage cache first
                    const cachedUsernames = localStorage.getItem(`usernames_${postToLike.creator.toLowerCase()}`);
                    if (cachedUsernames) {
                        const parsed = JSON.parse(cachedUsernames);
                        if (parsed && parsed.length > 0) {
                            creatorUsername = parsed[0];
                        }
                    }
                    
                    if (!creatorUsername) {
                        // Get from blockchain if not in cache
                        const usernames = await UserAuthContract.methods
                            .getUsernames(postToLike.creator)
                            .call();
                        
                        if (usernames && usernames.length > 0) {
                            creatorUsername = usernames[0];
                        }
                    }
                } catch (error) {
                    console.error("Error getting post creator username:", error);
                }
                
                if (creatorUsername) {
                    // Get post content to include in notification
                    const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
                    let postPreview = "Post";
                    
                    // Only create a notification if the user is liking (not unliking) a post
                    if (!isAlreadyLiked && postToLike.creator.toLowerCase() !== currentAddress) {
                        // Find the post content specifically for this post's contentHash
                        if (localPosts[postToLike.contentHash]) {
                            const content = localPosts[postToLike.contentHash];
                            
                            // Extract meaningful preview text from the post
                            if (content.text) {
                                // Get first 50 chars of text or full text if shorter
                                postPreview = content.text.length > 50 
                                    ? content.text.substring(0, 50) + '...' 
                                    : content.text;
                            } else if (content.media && content.media.length > 0) {
                                // If no text but has media, indicate that
                                postPreview = `[Shared ${content.media.length} media item${content.media.length > 1 ? 's' : ''}]`;
                            }
                        }

                        try {
                            // Create notification using the notification service
                            const creatorAddress = postToLike.creator.toLowerCase();
                            
                            // Create notification object
                            const notification = {
                                type: notificationService.notificationTypes.LIKE,
                                sourceUser: currentUsername,
                                sourceAddress: currentAddress,
                                postId: postId.toString(),
                                content: `${currentUsername} liked your post: "${postPreview}"`,
                                postPreview: postPreview
                            };
                            
                            // Add notification to the creator's notifications
                            await notificationService.addNotification(creatorAddress, notification);
                            
                            // Dispatch event to update notification badge
                            window.dispatchEvent(new CustomEvent('new-notification'));
                            
                            console.log("Created like notification for user:", creatorUsername);
                        } catch (error) {
                            console.error("Error creating notification:", error);
                        }
                    }
                }
            }
            
            if (isAlreadyLiked) {
                // Unlike: Remove from liked posts
                likedPosts[currentAddress] = likedPosts[currentAddress].filter(id => id !== postId.toString());
            } else {
                // Like: Add to liked posts
                likedPosts[currentAddress].push(postId.toString());
            }
            
            localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
            
            // Update the posts state to reflect the like/unlike
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    const isLiked = !isAlreadyLiked;
                    return {
                        ...post,
                        likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
                        isLiked: isLiked
                    };
                }
                return post;
            }));
            
        } catch (error) {
            console.error("Error liking post:", error);
            toast.error("Failed to like post. Please try again.");
        }
    };

    const getUsernameByAddress = async (address) => {
        try {
            // Try to get username from localStorage cache first
            const cachedUsernames = localStorage.getItem(`usernames_${address.toLowerCase()}`);
            if (cachedUsernames) {
                try {
                    const parsed = JSON.parse(cachedUsernames);
                    if (parsed && parsed.length > 0) {
                        return parsed[0];
                    }
                } catch (e) {
                    console.error("Error parsing cached username:", e);
                }
            }
            
            // If not in cache, try to get from blockchain
            try {
                const usernames = await UserAuthContract.methods
                    .getUsernames(address)
                    .call();
                    
                if (usernames && usernames.length > 0 && usernames[0]) {
                    // Cache the result for future use
                    localStorage.setItem(`usernames_${address.toLowerCase()}`, JSON.stringify(usernames));
                    return usernames[0];
                }
            } catch (err) {
                console.error("Error fetching username from blockchain:", err);
            }
            
            // Fallback to shortened address if no username found
            return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        } catch (error) {
            console.error("Error in getUsernameByAddress:", error);
            return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        }
    };

    const getUserInitial = (address) => {
        // Try to get username for this address from localStorage
        const cachedUsernames = localStorage.getItem(`usernames_${address.toLowerCase()}`);
        if (cachedUsernames) {
            try {
                const parsed = JSON.parse(cachedUsernames);
                if (parsed && parsed.length > 0 && parsed[0]) {
                    return parsed[0][0].toUpperCase();
                }
            } catch (e) {
                console.error("Error parsing cached username for initial:", e);
            }
        }
        
        // Fallback to first two characters of address
        return address.substring(2, 4).toUpperCase();
    };
    
    const PostCard = ({ post }) => {
        const [postContent, setPostContent] = useState(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [displayName, setDisplayName] = useState(''); // State for username
        const [avatarInitial, setAvatarInitial] = useState(''); // State for avatar initial
        const [showComments, setShowComments] = useState(false);
        const [commentText, setCommentText] = useState('');
        const [comments, setComments] = useState([]);
        const [isLoadingComments, setIsLoadingComments] = useState(false);
        const [currentAddress, setCurrentAddress] = useState('');

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
            const fetchPostContent = async () => {
                try {
                    setLoading(true);
                    setError(null);
                    const contentHash = post.contentHash;
                    
                    // ALWAYS check localStorage first as our primary source
                    const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
                    if (localPosts[contentHash]) {
                        console.log("Found post in localStorage:", contentHash);
                        const content = localPosts[contentHash];
                        setPostContent(content);
                        
                        // No need to try finding working URLs here, we'll handle that in the render
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
        }, [post.contentHash, post.timestamp, post.creator]);
        
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
                        try {
                            // Get username of post creator
                            let creatorUsername = '';
                            
                            // Try to get from localStorage cache first
                            const cachedUsernames = localStorage.getItem(`usernames_${post.creator.toLowerCase()}`);
                            if (cachedUsernames) {
                                const parsed = JSON.parse(cachedUsernames);
                                if (parsed && parsed.length > 0) {
                                    creatorUsername = parsed[0];
                                }
                            }
                            
                            if (!creatorUsername) {
                                // Get from blockchain if not in cache
                                const usernames = await UserAuthContract.methods
                                    .getUsernames(post.creator)
                                    .call();
                                
                                if (usernames && usernames.length > 0) {
                                    creatorUsername = usernames[0];
                                }
                            }
                            
                            // Create notification using the notification service
                            const notification = {
                                type: notificationService.notificationTypes.COMMENT,
                                sourceUser: currentUsername,
                                sourceAddress: currentAddress,
                                postId: post.id.toString(),
                                commentText: commentText,
                                content: `${currentUsername} commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`,
                                postPreview: commentText.substring(0, 50) + (commentText.length > 50 ? '...' : '')
                            };
                            
                            // Add notification to the creator's notifications
                            await notificationService.addNotification(post.creator.toLowerCase(), notification);
                            
                            // Dispatch event to update notification badge
                            window.dispatchEvent(new CustomEvent('new-notification'));
                            
                            console.log("Created comment notification for user:", creatorUsername);
                        } catch (error) {
                            console.error("Error creating comment notification:", error);
                        }
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
                
                // Find the comment that was liked
                const likedComment = updatedComments.find(c => c.id === commentId);
                
                if (likedComment) {
                    // Update in the commentContent cache
                    const commentContent = JSON.parse(localStorage.getItem('commentContent') || '{}');
                    
                    // Find the hash for this comment
                    const commentRefs = JSON.parse(localStorage.getItem('postCommentRefs') || '{}');
                    const postRefs = commentRefs[post.id] || [];
                    
                    // Look for a matching IPFS hash by ID
                    const ref = postRefs.find(r => {
                        const cached = commentContent[r.hash];
                        return cached && cached.id === commentId;
                    });
                    
                    if (ref) {
                        // Update the cached version
                        commentContent[ref.hash] = likedComment;
                        localStorage.setItem('commentContent', JSON.stringify(commentContent));
                    }
                }
                
                // Also update in the old storage format for backward compatibility
                const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
                allComments[post.id] = updatedComments;
                localStorage.setItem('postComments', JSON.stringify(allComments));
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

        useEffect(() => {
            const fetchUserData = async () => {
                try {
                    // Try to get username from localStorage cache first
                    const cachedUsernames = localStorage.getItem(`usernames_${post.creator.toLowerCase()}`);
                    if (cachedUsernames) {
                        try {
                            const parsed = JSON.parse(cachedUsernames);
                            if (parsed && parsed.length > 0) {
                                setDisplayName(parsed[0]);
                                setAvatarInitial(parsed[0][0].toUpperCase());
                                return;
                            }
                        } catch (e) {
                            console.error("Error parsing cached username:", e);
                        }
                    }
                    
                    // If not in cache, try to get from blockchain
                    try {
                        const usernames = await UserAuthContract.methods
                            .getUsernames(post.creator)
                            .call();
                            
                        if (usernames && usernames.length > 0 && usernames[0]) {
                            setDisplayName(usernames[0]);
                            setAvatarInitial(usernames[0][0].toUpperCase());
                            // Cache the result for future use
                            localStorage.setItem(`usernames_${post.creator.toLowerCase()}`, JSON.stringify(usernames));
                            return;
                        }
                    } catch (err) {
                        console.error("Error fetching username from blockchain:", err);
                    }
                    
                    // Fallback to shortened address if no username found
                    const shortAddress = `${post.creator.substring(0, 6)}...${post.creator.substring(post.creator.length - 4)}`;
                    setDisplayName(shortAddress);
                    setAvatarInitial(post.creator.substring(2, 4).toUpperCase());
                } catch (error) {
                    console.error("Error in fetchUserData:", error);
                    const shortAddress = `${post.creator.substring(0, 6)}...${post.creator.substring(post.creator.length - 4)}`;
                    setDisplayName(shortAddress);
                    setAvatarInitial(post.creator.substring(2, 4).toUpperCase());
                }
            };

            fetchUserData();
        }, [post.creator]);

        if (loading) {
    return (
                <div className="post-card animate-post" key={post.id}>
                    <div className="post-header">
                        <div className="post-avatar">{avatarInitial || '...'}</div>
                        <div className="post-meta">
                            <h4>{displayName || 'Loading...'}</h4>
                            <span className="post-time">{formatDate(post.timestamp)}</span>
                        </div>
                    </div>
                    <div className="post-content">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Loading post...</p>
                        </div>
                    </div>
                </div>
            );
        }
        
        // Format address for display in hover or secondary text
        const addressDisplay = `${post.creator.substring(0, 6)}...${post.creator.substring(post.creator.length - 4)}`;
        
        return (
            <div 
                className="post-card animate-post" 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
            >
                <div className="post-header">
                    <div className="post-avatar">{avatarInitial}</div>
                    <div className="post-meta">
                        <h4>{displayName}</h4>
                        <span className="post-time">
                            {formatDate(post.timestamp)} • {addressDisplay}
                        </span>
                    </div>
                    <button className="post-menu">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
                
                <div className="post-content">
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
                                        <MediaItem key={index} media={media} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p>Post content unavailable</p>
                    )}
                </div>
                
                <div className="post-actions">
                    <button 
                        className={`action-button ${post.isLikedByMe ? 'active' : ''}`} 
                        onClick={(e) => {
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
                        onClick={handleCommentsClick}
                    >
                        <MessageSquare size={20} />
                        <span>{comments.length > 0 ? comments.length : ''} Comment{comments.length !== 1 ? 's' : ''}</span>
                    </button>
                    
                    <button className="action-button" onClick={(e) => e.stopPropagation()}>
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

    const MediaItem = ({ media }) => {
        const [mediaUrl, setMediaUrl] = useState('');
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);
        const [gatewayAttempts, setGatewayAttempts] = useState(0);
        const maxGatewayAttempts = IPFS_GATEWAYS.length;
        
        // Function to validate IPFS hash format
        const isValidIpfsHash = (hash) => {
            if (!hash) return false;
            // Basic validation - should start with Qm and be at least 46 chars
            return hash.startsWith('Qm') && hash.length >= 46;
        };

        useEffect(() => {
            const loadMedia = async () => {
                try {
                    // Check if media exists
                    if (!media) {
                        setHasError(true);
                        setIsLoading(false);
                        return;
                    }
                    
                    // Handle case where media might be a string URL directly
                    if (typeof media === 'string') {
                        setMediaUrl(media);
                        setIsLoading(false);
                        return;
                    }
                    
                    // If we have a preview URL stored (for local testing), use it directly
                    if (media.previewUrl) {
                        setMediaUrl(media.previewUrl);
                        setIsLoading(false);
                        return;
                    }

                    // Check if media hash exists
                    if (!media.hash) {
                        console.error('Media object has no hash:', media);
                        setHasError(true);
                        setIsLoading(false);
                        return;
                    }

                    // Validate IPFS hash
                    if (!isValidIpfsHash(media.hash)) {
                        console.error(`Invalid IPFS hash format: ${media.hash}`);
                        setHasError(true);
                        setIsLoading(false);
                        return;
                    }

                    setIsLoading(true);
                    setHasError(false);
                    
                    // First check if we have a cached working URL for this hash
                    const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                    if (gatewayCache[media.hash]) {
                        console.log(`Using cached gateway URL for ${media.hash}: ${gatewayCache[media.hash]}`);
                        setMediaUrl(gatewayCache[media.hash]);
                        return;
                    }
                    
                    // Try the proxy approach first
                    try {
                        const proxyUrl = `/.netlify/functions/ipfs-proxy?hash=${encodeURIComponent(media.hash)}`;
                        console.log(`Trying proxy for media: ${proxyUrl}`);
                        setMediaUrl(proxyUrl);
                    } catch (error) {
                        // If proxy fails, fall back to direct gateway URLs
                        const url = getIpfsUrl(media.hash, gatewayAttempts);
                        console.log(`Proxy failed, trying direct gateway ${gatewayAttempts}: ${url}`);
                        setMediaUrl(url);
                    }
                } catch (error) {
                    console.error("Error setting up media URL:", error);
                    setHasError(true);
                    setIsLoading(false);
                }
            };
            
            loadMedia();
        }, [media, gatewayAttempts]);

        // Handle successful media load
        const handleMediaLoad = () => {
            console.log(`Successfully loaded media from: ${mediaUrl}`);
            setIsLoading(false);
            
            // Cache the working URL if it's a gateway URL
            if (media && media.hash && mediaUrl.includes('/ipfs/')) {
                const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                gatewayCache[media.hash] = mediaUrl;
                localStorage.setItem('ipfsGatewayCache', JSON.stringify(gatewayCache));
                console.log(`Cached working URL for ${media.hash}: ${mediaUrl}`);
            }
        };

        // Handle media load error
        const handleMediaError = () => {
            console.error(`Failed to load media from: ${mediaUrl}`);
            
            // If using proxy and it failed, try direct gateways
            if (mediaUrl.includes('ipfs-proxy')) {
                console.log(`Proxy failed, trying direct gateways`);
                const url = getIpfsUrl(media.hash, 0);
                setMediaUrl(url);
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

        if (isLoading && !mediaUrl) {
            return (
                <div className="post-media-item loading">
                    <div className="media-loading-spinner">
                        <div className="spinner"></div>
                        <p>Loading media...</p>
                    </div>
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="post-media-item error">
                    <div className="media-error">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <p>Media unavailable</p>
                    </div>
                </div>
            );
        }

        // Determine media type based on file extension, URL, or media.type
        const getMediaType = () => {
            // If media has a type property, use it
            if (media && media.type) {
                if (media.type.startsWith('image/')) return 'image';
                if (media.type.startsWith('video/')) return 'video';
            }
            
            // If we have a URL, try to determine type from extension
            if (mediaUrl) {
                const url = mediaUrl.toLowerCase();
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
            
            // If media has a name property, try to determine type from it
            if (media && media.name) {
                const name = media.name.toLowerCase();
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
        
        const mediaType = getMediaType();
        
        if (mediaType === 'image') {
            return (
                <div className="post-media-item">
                    <img 
                        src={mediaUrl} 
                        alt={media.name || "Post image"} 
                        className="post-image" 
                        loading="lazy"
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
        } else if (mediaType === 'video') {
            return (
                <div className="post-media-item">
                    <video 
                        src={mediaUrl} 
                        controls
                        className="post-video"
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
            );
        } else {
            return (
                <div className="post-media-item">
                    <div className="post-file">
                        <File size={24} />
                        <span>{media.name || "File"}</span>
                    </div>
                </div>
            );
        }
    };

    // Add this function to check for notifications
    const checkNotifications = async () => {
        try {
            // Get current user's data
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (userData.walletAddress) {
                // Use the notificationService to get unread count
                const unreadCount = await notificationService.getUnreadCount(userData.walletAddress);
                return unreadCount;
            }
            
            return 0;
        } catch (error) {
            console.error("Error checking notifications:", error);
            return 0;
        }
    };

    const fetchPostData = async (postId) => {
        try {
            // First try to get post details from blockchain
            const postDetails = await CreatePostContract.methods
                .getPost(postId)
                .call();
            
            // Get post content from localStorage or IPFS
            const contentHash = postDetails.contentHash;
            let content = null;
            
            // Check localStorage first
            const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
            if (localPosts[contentHash]) {
                content = localPosts[contentHash];
            } else {
                // Try to get from IPFS
                try {
                    const contentBuffer = await getFromIPFS(contentHash);
                    content = JSON.parse(new TextDecoder().decode(contentBuffer));
                    
                    // Cache for future use
                    localPosts[contentHash] = content;
                    localStorage.setItem('localPosts', JSON.stringify(localPosts));
                } catch (error) {
                    console.error("Error fetching content from IPFS:", error);
                    // Create a fallback content object to prevent errors
                    content = { 
                        text: "Post content unavailable",
                        timestamp: parseInt(postDetails.timestamp) * 1000,
                        media: []
                    };
                }
            }
            
            // Format the post data
            return {
                id: postDetails.postId,
                creator: postDetails.creator,
                contentHash: postDetails.contentHash,
                timestamp: parseInt(postDetails.timestamp) * 1000,
                hasMedia: postDetails.hasMedia,
                tags: postDetails.tags || [],
                content: content, // This could be null if both localStorage and IPFS failed
                likes: await CreatePostContract.methods.getPostLikes(postId).call()
            };
        } catch (error) {
            console.error("Error fetching post data:", error);
            return null;
        }
    };

    const handleFollow = async (user) => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const currentAddress = accounts[0].toLowerCase();
            
            // Get current user's username from localStorage
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            const currentUsername = userSession.username;
            
            if (!currentUsername) {
                toast.error("Please log in to follow users");
                return;
            }
            
            const targetAddress = user.address;
            
            // Check if already following
            const isAlreadyFollowing = await FollowRelationshipContract.methods
                .isFollowing(currentAddress, targetAddress)
                .call();
                
            if (isAlreadyFollowing) {
                toast.info(`You are already following ${user.username}`);
                return;
            }
            
            // Check if there's a pending request
            const outgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
            const hasPendingRequest = outgoingRequests.some(req => 
                req.from === currentUsername && req.to === user.username
            );
            
            if (hasPendingRequest) {
                toast.info(`You already have a pending follow request for ${user.username}`);
                return;
            }
            
            // Send follow request to blockchain
            await FollowRelationshipContract.methods
                .sendFollowRequest(targetAddress)
                .send({ from: currentAddress });
                
            // Store follow request in localStorage
            const newRequest = {
                from: currentUsername,
                to: user.username,
                timestamp: Date.now()
            };
            
            outgoingRequests.push(newRequest);
            localStorage.setItem('outgoingFollowRequests', JSON.stringify(outgoingRequests));
            
            // Create notification for target user
            const notification = {
                type: notificationService.notificationTypes.FOLLOW_REQUEST,
                sourceUser: currentUsername,
                sourceAddress: currentAddress,
                content: `${currentUsername} requested to follow you`,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            await notificationService.addNotification(targetAddress, notification);
            
            // Dispatch event to update notification badge
            window.dispatchEvent(new CustomEvent('new-notification'));
            
            // Update UI
            toast.success(`Follow request sent to ${user.username}`);
            
            // Remove the user from recommended users list
            setRecommendedUsers(prevUsers => 
                prevUsers.filter(u => u.username !== user.username)
            );
            
        } catch (error) {
            console.error("Error following user:", error);
            toast.error("Failed to follow user. Please try again.");
        }
    };

    return (
        <div className={`homepage-wrapper ${darkMode ? 'dark-mode' : ''}`}>
            <div className="homepage-container">
                {/* Sidebar */}
                <aside className={`sidebar ${animateContent ? 'animate-in' : ''}`}>
                <div className="logo">
                        <div className="logo-container">
                            <img src={LogoImage} alt="BlockConnect Logo" />
                            <span className="brand-text">BlockConnect</span>
                </div>
                    </div>
                    
                <nav className="sidebar-nav">
                        <ul>
                            <li className="active">
                                <a href="/home">
                                <Home size={20} />
                                <span>Home</span>
                            </a>
                        </li>
                            <li>
                                <a href="/notifications" className="sidebar-nav-link">
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
                                            <span className="notification-badge">{unreadMessages}</span>
                                        )}
                                    </div>
                                <span>Messages</span>
                            </a>
                        </li>
                            <li>
                                <a href="/profile" className="sidebar-nav-link">
                                    <User size={20} />
                                    <span>Profile</span>
                            </a>
                        </li>
                            <li>
                                <a href="/saved">
                                    <Bookmark size={20} />
                                    <span>Saved</span>
                            </a>
                        </li>
                            <li>
                                <a href="/settings">
                                <Settings size={20} />
                                <span>Settings</span>
                            </a>
                        </li>
                            <li>
                                <a href="/analytics">
                                    <BarChart size={20} />
                                    <span>Analytics</span>
                            </a>
                        </li>
                        </ul>
                </nav>
                    
                    <button className="create-post-btn" onClick={handleCreatePost}>
                        <Plus size={18} />
                        <span>Create Post</span>
                            </button>
                    
                    <div className="sidebar-footer">
                        <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                    </button>
                        
                        <button className="logout-button" onClick={handleLogout}>
                            <LogOut size={18} />
                            <span>Log Out</span>
                                    </button>
                        
                        <div className="user-profile" onClick={handleProfileClick}>
                            <div className="avatar">
                                {userData?.username?.[0]?.toUpperCase() || "U"}
                                </div>
                            <div className="user-info">
                                <h4>{userData?.username || "User"}</h4>
                                <p>@{userData?.username?.toLowerCase().replace(/\s+/g, '_') || "username"}</p>
                            </div>
                            <MoreHorizontal size={16} />
                        </div>
                    </div>
            </aside>

            {/* Main Content */}
                <main className={`main-content ${animateContent ? 'animate-in' : ''}`}>
                    <header className="content-header">
                        <h2>Home</h2>
                        <div className="search-wrapper" style={{ position: 'relative' }}>
                            <div className="search-container">
                                <Search size={18} />
                        <input 
                            type="text" 
                                    placeholder="Search users..."
                            value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e);
                                    }}
                        />
                            </div>
                            
                            {/* Search results positioned relative to search container */}
                        {searchQuery && searchResults.length > 0 && (
                            <div className="search-results">
                                    {searchResults.map((result) => (
                                    <div 
                                            key={result.username} 
                                        className="search-result-item"
                                            onClick={() => navigate(`/profile/${result.username}`)}
                                        >
                                            <div className="result-avatar">
                                                {result.username[0].toUpperCase()}
                                        </div>
                                            <div className="result-info">
                                                <h4>{result.username}</h4>
                                                <p className="result-address">{result.address.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </header>

                    <div className="create-post-card">
                        <div className="create-post-header">
                            <div className="post-avatar">
                                {userData?.username?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="create-post-input" onClick={handleCreatePost}>
                                <p>What's on your mind?</p>
                                </div>
                            </div>
                        <div className="create-post-actions">
                            <button onClick={handleCreatePost}>
                                <Image size={20} />
                                <span>Photo</span>
                            </button>
                            <button onClick={handleCreatePost}>
                                <LinkIcon size={20} />
                                <span>Link</span>
                            </button>
                            <button onClick={handleCreatePost}>
                                <Calendar size={20} />
                                <span>Event</span>
                            </button>
                        </div>
                    </div>

                    <div className="posts-container">
                        {loading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <p>Loading posts...</p>
                            </div>
                        ) : posts.length === 0 ? (
                                <div className="no-posts">
                                <h3>No posts yet</h3>
                                <p>Be the first to share something!</p>
                                <button onClick={handleCreatePost}>Create Post</button>
                                </div>
                            ) : (
                            posts.map((post, index) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        )}
                </div>
            </main>

                {/* Right sidebar / Trending section */}
                <aside className={`trending-sidebar ${animateContent ? 'animate-in' : ''}`}>
                    <div className="trending-header">
                        <h3>Trending Topics</h3>
                    </div>
                    
                    <div className="trending-topics">
                    <div className="trending-item">
                            <TrendingUp size={16} />
                            <div className="trend-info">
                                <span className="trend-category">Blockchain</span>
                        <h4>#Ethereum</h4>
                                <span className="trend-count">2.5K posts</span>
                    </div>
                        </div>
                        
                    <div className="trending-item">
                            <TrendingUp size={16} />
                            <div className="trend-info">
                                <span className="trend-category">Technology</span>
                        <h4>#Web3</h4>
                                <span className="trend-count">1.8K posts</span>
                    </div>
                        </div>
                        
                    <div className="trending-item">
                            <TrendingUp size={16} />
                            <div className="trend-info">
                                <span className="trend-category">Cryptocurrency</span>
                                <h4>#DeFi</h4>
                                <span className="trend-count">1.2K posts</span>
                    </div>
                        </div>
                    </div>
                    
                    <div className="who-to-follow">
                        <h3 className="who-to-follow-header">Who to follow</h3>
                        
                        {recommendedUsers.length === 0 ? (
                            <div className="no-recommendations">
                                <p>No recommendations available</p>
                            </div>
                        ) : (
                            recommendedUsers.map((user, index) => (
                                <div 
                                    className={`suggested-user ${animateContent ? 'animate-user' : ''}`}
                                    key={user.username || index}
                                    style={{animationDelay: `${index * 0.1}s`}}
                                >
                                    <div className="user-avatar-container">
                                        {user.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="user-info">
                                        <h4>{user.username || 'User'}</h4>
                                        <p>@{user.username?.toLowerCase().replace(/\s+/g, '_') || 'user'}</p>
                                    </div>
                                    <button 
                                        className="follow-button" 
                                        onClick={() => handleFollow(user)}
                                    >
                                        Follow
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="activity-card">
                        <h3>Your Activity</h3>
                        <div className="activity-stats">
                            <div className="activity-stat">
                                <span className="stat-value">{userStats.posts}</span>
                                <span className="stat-label">Posts</span>
                            </div>
                            <div className="activity-stat">
                                <span className="stat-value">{userStats.followers}</span>
                                <span className="stat-label">Followers</span>
                            </div>
                            <div className="activity-stat">
                                <span className="stat-value">{userStats.following}</span>
                                <span className="stat-label">Following</span>
                            </div>
                        </div>
                        <button className="view-profile-btn" onClick={handleProfileClick}>
                            View Profile
                        </button>
                    </div>
                    
                    <div className="footer-branding">
                        <img src={LogoImage} alt="BlockConnect Logo" className="footer-logo"/>
                        <p> 2024 BlockConnect</p>
                        <p>Decentralized Social Platform</p>
                </div>
            </aside>
            </div>

            {/* Mobile Navigation for small screens */}
            <div className="mobile-navbar">
                <a href="/home" className="mobile-nav-item active">
                    <Home size={22} />
                    <span>Home</span>
                </a>
                <a href="/notifications" className="mobile-nav-item">
                    <div className="nav-icon-container">
                        <Bell size={22} />
                        {notificationCount > 0 && (
                            <div className="notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</div>
                        )}
                    </div>
                    <span>Notifications</span>
                </a>
                <a href="/messages" className="mobile-nav-item">
                    <div className="nav-icon-container">
                        <MessageSquare size={22} />
                        {unreadMessages > 0 && (
                            <span className="notification-badge">{unreadMessages}</span>
                        )}
                    </div>
                    <span>Messages</span>
                </a>
                <a href="/profile" className="mobile-nav-item">
                    <User size={22} />
                    <span>Profile</span>
                </a>
            </div>

            {selectedPost && (
                <PostModal 
                    post={selectedPost} 
                    onClose={() => setSelectedPost(null)} 
                    onLike={handleLike}
                />
            )}
        </div>
    );
};

export default HomePage; 