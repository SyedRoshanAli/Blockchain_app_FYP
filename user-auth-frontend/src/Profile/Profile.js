import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuthContract, CreatePostContract } from "../UserAuth";
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
    EyeOff
} from "lucide-react";
import "./Profile.css";
import { toast } from "react-hot-toast";
import { format } from 'date-fns';
import { ethers } from 'ethers';
import { messageService } from '../services/messageService';

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
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
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserData();
        fetchUserPosts();
        // Load dark mode preference from localStorage
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
        fetchUnreadCount();
    }, []);

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

    const fetchUserData = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed. Please install MetaMask.");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Get user data from localStorage first
            const storedData = localStorage.getItem('userData');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                setUserData(parsedData);
                
                if (parsedData.profilePicture) {
                    setImagePreview(parsedData.profilePicture);
                    setShowPlus(false);
                }
            } else {
                // If no stored data, get from blockchain
                const userIpfsHash = await UserAuthContract.methods.login().call({
                    from: accounts[0],
                });

                if (!userIpfsHash) {
                    throw new Error("User data not found on blockchain.");
                }

                const response = await fetch(`http://127.0.0.1:8083/ipfs/${userIpfsHash}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch user data from IPFS.");
                }

                const data = await response.json();
                
                if (data.profilePicture) {
                    setImagePreview(data.profilePicture);
                    setShowPlus(false);
                }

                setUserData(data);
                // Store initial data in localStorage
                localStorage.setItem('userData', JSON.stringify(data));
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPosts = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            // Get the current logged-in username from localStorage
            const userSession = JSON.parse(localStorage.getItem('userSession'));
            const currentUsername = userSession?.username;

            if (!currentUsername) {
                throw new Error("No user session found");
            }

            // Get all posts first
            const totalPosts = await CreatePostContract.methods
                .postCounter()
                .call();

            const postIds = Array.from(
                { length: Number(totalPosts) },
                (_, i) => i + 1
            );

            const fetchedPosts = await Promise.all(
                postIds.map(async (postId) => {
                    try {
                        const post = await CreatePostContract.methods
                            .getPost(postId)
                            .call();

                        // Fetch post data from IPFS
                        const response = await fetch(`http://127.0.0.1:8083/ipfs/${post.contentHash}`);
                        if (!response.ok) throw new Error('Failed to fetch post data');
                        
                        const postData = await response.json();
                        return {
                            id: post.postId,
                            creator: post.creator,
                            ipfsHash: post.contentHash,
                            timestamp: new Date(Number(post.timestamp) * 1000).toISOString(),
                            ...postData
                        };
                    } catch (error) {
                        console.error(`Error fetching post ${postId}:`, error);
                        return null;
                    }
                })
            );

            // Filter posts by the current logged-in username
            const userPosts = fetchedPosts
                .filter(post => post !== null && post.username === currentUsername)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setPosts(userPosts);
        } catch (error) {
            console.error("Error fetching user posts:", error);
            setErrorMessage("Failed to load your posts. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Get all messages
            const messages = await messageService.getAllMessages();
            
            // Count unread messages
            const unreadCount = messages.filter(msg => !msg.isRead).length;
            console.log('Unread messages count:', unreadCount);
            
            setUnreadMessages(unreadCount);
        } catch (error) {
            console.error('Error fetching unread messages:', error);
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
        setSelectedPost(post);
    };

    const handleLike = (postId) => {
        setPosts(posts.map(post => 
            post.id === postId 
                ? { ...post, likes: post.likes + 1 } 
                : post
        ));
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
                            <a href="/notifications" onClick={handleNotification}>
                                <Bell size={20} />
                                <span>Notifications</span>
                                {unreadMessages > 0 && (
                                    <span className="notification-badge">{unreadMessages}</span>
                                )}
                            </a>
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
                                    <span className="hidden-count">{hiddenTweets.length}</span>
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
                                    <span className="stat-value">{posts.length}</span>
                                    <span className="stat-label">Tweets</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">30000</span>
                                    <span className="stat-label">Followers</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">50000</span>
                                    <span className="stat-label">Following</span>
                                </div>
                            </div>

                            <div className="profile-actions">
                                <button className="profile-action-button primary-action">
                                    Connect
                                </button>
                                <button className="profile-action-button secondary-action">
                                    Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="profile-content">
                    {!showHiddenTweets ? (
                        <section>
                            <div className="tweets-section">
                                <div className="tweets-header">
                                    <h3>Tweets</h3>
                                    <button 
                                        className="create-tweet-button"
                                        onClick={handleCreateTweet}
                                        title="Create new tweet"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                {loading ? (
                                    <div className="loading">Loading tweets...</div>
                                ) : posts.length > 0 ? (
                                    <div className="tweets-list">
                                        {posts.map((tweet) => (
                                            <div key={tweet.id} className="tweet-card">
                                                <div className="tweet-header">
                                                    <div className="tweet-user-info">
                                                        <img 
                                                            src={imagePreview || "/default-avatar.png"} 
                                                            alt="Profile" 
                                                            className="tweet-avatar"
                                                        />
                                                        <div className="tweet-meta">
                                                            <span className="tweet-username">{userData?.username || "Anonymous"}</span>
                                                            <span className="tweet-date">
                                                                {formatDate(tweet.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="tweet-options">
                                                        <button 
                                                            className="options-button"
                                                            onClick={() => toggleDropdown(tweet.id)}
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {activeDropdown === tweet.id && (
                                                            <div className="dropdown-menu">
                                                                <button className="dropdown-item">
                                                                    <Edit size={14} />
                                                                    <span>Edit Tweet</span>
                                                                </button>
                                                                <button 
                                                                    className="dropdown-item"
                                                                    onClick={() => handleHideTweet(tweet.id)}
                                                                >
                                                                    <EyeOff size={14} />
                                                                    <span>Hide Tweet</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="tweet-content">
                                                    <p>
                                                        {processString(tweet.caption)?.map((word, index) => {
                                                            if (word.startsWith('#')) {
                                                                return <span key={index} className="hashtag">{word} </span>;
                                                            } else if (word.startsWith('@')) {
                                                                return <span key={index} className="mention">{word} </span>;
                                                            }
                                                            return word + ' ';
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="tweet-actions">
                                                    <button className="tweet-action-button">
                                                        <Heart size={18} />
                                                        <span>0</span>
                                                    </button>
                                                    <button className="tweet-action-button">
                                                        <MessageCircle size={18} />
                                                        <span>0</span>
                                                    </button>
                                                    <button className="tweet-action-button">
                                                        <Share2 size={18} />
                                                        <span>0</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-tweets">
                                        <p>No tweets yet</p>
                                        <button 
                                            className="create-first-tweet-button"
                                            onClick={handleCreateTweet}
                                        >
                                            Create your first tweet
                                        </button>
                                    </div>
                                )}
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
                                            <div key={tweet.id} className="tweet-card hidden">
                                                <div className="tweet-header">
                                                    <div className="tweet-user-info">
                                                        <img 
                                                            src={imagePreview || "/default-avatar.png"} 
                                                            alt="Profile" 
                                                            className="tweet-avatar"
                                                        />
                                                        <div className="tweet-meta">
                                                            <span className="tweet-username">
                                                                {userData?.username || "Anonymous"}
                                                            </span>
                                                            <span className="tweet-date">
                                                                {formatDate(tweet.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        className="restore-button"
                                                        onClick={() => handleRestoreTweet(tweet.id)}
                                                    >
                                                        <Eye size={14} />
                                                        <span>Restore</span>
                                                    </button>
                                                </div>
                                                <div className="tweet-content">
                                                    <p>{tweet.caption}</p>
                                                </div>
                                                <div className="tweet-actions">
                                                    <button className="tweet-action-button">
                                                        <Heart size={18} />
                                                        <span>0</span>
                                                    </button>
                                                    <button className="tweet-action-button">
                                                        <MessageCircle size={18} />
                                                        <span>0</span>
                                                    </button>
                                                    <button className="tweet-action-button">
                                                        <Share2 size={18} />
                                                        <span>0</span>
                                                    </button>
                                                </div>
                                            </div>
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
                <div className="post-modal-overlay" onClick={() => setSelectedPost(null)}>
                    <div className="post-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-button" onClick={() => setSelectedPost(null)}>
                            <X size={24} />
                        </button>
                        <div className="modal-post-content">
                            <div className="post-header">
                                <div className="post-avatar">
                                    <img 
                                        src={selectedPost.image}
                                        alt={selectedPost.title}
                                        className="post-image"
                                    />
                                </div>
                                <div className="post-user-info">
                                    <span className="post-username">{userData?.username || "Unknown User"}</span>
                                    <span className="post-time">{selectedPost.timestamp}</span>
                                </div>
                            </div>
                            <h4 className="post-title">{selectedPost.title}</h4>
                            <p className="post-description">{selectedPost.description}</p>
                            <div className="post-image-container">
                                <img src={selectedPost.image} alt={selectedPost.title} />
                            </div>
                            <div className="post-actions">
                                <button onClick={() => handleLike(selectedPost.id)} className="post-action-button">
                                    <Heart size={20} /> {selectedPost.likes}
                                </button>
                                <button onClick={() => handleComment(selectedPost.id, "New comment")} className="post-action-button">
                                    <MessageCircle size={20} /> {selectedPost.comments.length}
                                </button>
                                <button onClick={() => handleShare(selectedPost.id)} className="post-action-button">
                                    <Share2 size={20} /> {selectedPost.shares}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
                                value={editedData.username}
                                onChange={e => setEditedData({...editedData, username: e.target.value})}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="edit-field">
                            <label>About</label>
                            <textarea
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
        </div>
    );
}

const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
        return format(new Date(date), 'MM/dd/yyyy');
    } catch (error) {
        return 'Invalid Date';
    }
};

const processString = (str) => {
    if (!str) return [];
    return str.split(' ');
};

export default ProfilePage;