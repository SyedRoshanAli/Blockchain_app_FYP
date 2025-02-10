import React, { useState, useEffect } from 'react';
import { CreatePostContract } from "../UserAuth";
import { format } from 'date-fns';
import { 
    Heart, 
    MessageCircle, 
    Share2, 
    Home, 
    Search, 
    Bell, 
    Bookmark, 
    User, 
    Settings,
    MessageSquare,
    Users,
    TrendingUp,
    Hash,
    HelpCircle,
    Shield,
    LogOut,
    Moon,
    Sun,
    Eye
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import './HomePage.css';

const HomePage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllPosts();
        // Load dark mode preference from localStorage
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
    }, []);

    const fetchAllPosts = async () => {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            // Get total posts from postCounter
            const totalPosts = await CreatePostContract.methods
                .postCounter()
                .call();

            console.log("Total posts:", totalPosts);

            // Create an array from 1 to totalPosts (since your counter starts from 1)
            const postIds = Array.from(
                { length: Number(totalPosts) }, 
                (_, i) => i + 1
            );

            // Fetch all posts
            const allPosts = await Promise.all(
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

            // Filter out any null posts and sort by timestamp
            const validPosts = allPosts
                .filter(post => post !== null)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setPosts(validPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
            setError("Failed to load posts. Please try again later.");
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
    };

    const handleHiddenTweetsClick = (e) => {
        e.preventDefault();
        // Implement hidden tweets functionality if needed
    };

    const handleHomeClick = (e) => {
        e.preventDefault();
        navigate('/home');
    };

    return (
        <div className={`soft-ui-container ${darkMode ? 'dark-mode' : ''}`}>
            <aside className="soft-ui-sidebar">
                <div className="sidebar-header">
                    <h3>BlockConnect</h3>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <a href="/home" onClick={handleHomeClick} className="active">
                                <Home size={20} />
                                <span>Home</span>
                            </a>
                        </li>
                        <li>
                            <a href="/profile">
                                <User size={20} />
                                <span>Profile</span>
                            </a>
                        </li>
                        <li>
                            <a href="/explore">
                                <Search size={20} />
                                <span>Explore</span>
                            </a>
                        </li>
                        <li>
                            <a href="/notifications">
                                <Bell size={20} />
                                <span>Notifications</span>
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

            <main className="main-content">
                <div className="compose-tweet">
                    <div className="compose-tweet-input">
                        <div className="user-avatar">
                            {/* Get first letter of username from localStorage */}
                            {JSON.parse(localStorage.getItem('userSession'))?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="compose-input-container">
                            <input 
                                type="text" 
                                placeholder="What's happening?"
                                className="compose-input"
                            />
                            <div className="compose-actions">
                                <button className="post-tweet-btn">Post</button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loader"></div>
                        <p>Loading posts...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="posts-container">
                        {posts.length === 0 ? (
                            <div className="no-posts">
                                <p>No posts yet. Be the first to post something!</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <article key={post.id} className="post-card">
                                    <div className="post-header">
                                        <div className="user-avatar" style={{ backgroundColor: `#${post.creator.slice(2, 8)}` }}>
                                            {post.username ? post.username[0].toUpperCase() : 'A'}
                                        </div>
                                        <div className="post-content-wrapper">
                                            <div className="post-meta">
                                                <span className="user-name">{post.username || 'Anonymous'}</span>
                                                <span className="user-handle">@{post.creator.slice(0, 6)}...{post.creator.slice(-4)}</span>
                                                <span className="post-dot">·</span>
                                                <span className="post-time">{formatDate(post.timestamp)}</span>
                                            </div>
                                            <p className="post-text">{post.caption}</p>
                                            <div className="post-actions">
                                                <button className="action-button like-button">
                                                    <Heart size={18} />
                                                    <span>0</span>
                                                </button>
                                                <button className="action-button comment-button">
                                                    <MessageCircle size={18} />
                                                    <span>0</span>
                                                </button>
                                                <button className="action-button share-button">
                                                    <Share2 size={18} />
                                                    <span>0</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                )}
            </main>

            <div className="right-sidebar">
                <div className="search-container">
                    <Search size={20} className="search-icon" />
                    <input type="text" placeholder="Search BlockConnect" />
                </div>
                <div className="trending-container">
                    <h3>Trending</h3>
                    <div className="trending-item">
                        <span className="trending-category">Blockchain</span>
                        <h4>#Ethereum</h4>
                        <span className="trending-count">25.4K posts</span>
                    </div>
                    <div className="trending-item">
                        <span className="trending-category">Technology</span>
                        <h4>#Web3</h4>
                        <span className="trending-count">18.2K posts</span>
                    </div>
                    <div className="trending-item">
                        <span className="trending-category">Cryptocurrency</span>
                        <h4>#Bitcoin</h4>
                        <span className="trending-count">12.9K posts</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage; 