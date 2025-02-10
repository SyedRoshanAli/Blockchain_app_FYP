import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { UserAuthContract, CreatePostContract } from "../UserAuth";
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
    Bookmark
} from 'lucide-react';
import { toast } from "react-hot-toast";
import "./Profile.css";
import MessageModal from './MessageModal';

const UserProfile = () => {
    const { username: encodedUsername } = useParams();
    const username = decodeURIComponent(encodedUsername);
    const [currentLoggedInUser, setCurrentLoggedInUser] = useState(null);
    
    const [userData, setUserData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });
    const [activeTab, setActiveTab] = useState('posts'); // posts, media, likes
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get current user's address
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts"
                });
                const currentAccount = accounts[0];
                console.log('Current MetaMask account:', currentAccount);
                
                // Get current logged in username
                const usernames = await UserAuthContract.methods
                    .getUsernames(currentAccount)
                    .call();
                if (usernames && usernames.length > 0) {
                    setCurrentLoggedInUser(usernames[0]);
                    console.log('Currently logged in as:', usernames[0]);
                }
                
                // Log the username from URL
                console.log('Viewing profile of:', username);
                
                // Get address for the profile being viewed
                const profileAddress = await UserAuthContract.methods
                    .getAddressByUsername(username)
                    .call();
                console.log('Profile address:', profileAddress);
                
                if (profileAddress) {
                    const userData = {
                        username: username,
                        address: profileAddress,
                        about: `@${username}'s profile`
                    };
                    setUserData(userData);
                    await fetchUserPosts(profileAddress);
                } else {
                    throw new Error("User not found");
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [username]);

    const fetchUserPosts = async (userAddress) => {
        try {
            const totalPosts = await CreatePostContract.methods
                .postCounter()
                .call();

            console.log("Total posts:", totalPosts);

            const postIds = Array.from(
                { length: Number(totalPosts) },
                (_, i) => i + 1
            );

            const allPosts = await Promise.all(
                postIds.map(async (postId) => {
                    try {
                        const post = await CreatePostContract.methods
                            .getPost(postId)
                            .call();

                        // Compare addresses case-insensitively
                        if (post.creator.toLowerCase() === userAddress.toLowerCase()) {
                            console.log("Found post for user:", post);
                            
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
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error fetching post ${postId}:`, error);
                        return null;
                    }
                })
            );

            const userPosts = allPosts
                .filter(post => post !== null)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log("Filtered user posts:", userPosts);
            setUserPosts(userPosts);
        } catch (error) {
            console.error("Error fetching user posts:", error);
            setError("Failed to load posts");
        }
    };

    const handleFollow = () => {
        setIsFollowing(!isFollowing);
        toast.success(isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
    };

    const handleMessageClick = () => {
        console.log('Opening message modal for recipient:', username);
        setIsMessageModalOpen(true);
    };

    const handleNotification = () => {
        toast.success(
            `${isFollowing ? 'Disabled' : 'Enabled'} notifications for ${username}`
        );
    };

    if (loading) return <div className="loading">Loading profile...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="profile-container">
            {currentLoggedInUser && (
                <div className="logged-in-status">
                    Logged in as: {currentLoggedInUser}
                </div>
            )}
            <div className="profile-page">
                {/* Cover Image */}
                <div className="profile-cover">
                    <div 
                        className="cover-image"
                        style={{ 
                            backgroundColor: `#${userData?.address.slice(2, 8)}40`
                        }}
                    />
                </div>

                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-avatar-wrapper">
                        <div 
                            className="profile-avatar large"
                            style={{ backgroundColor: `#${userData?.address.slice(2, 8)}` }}
                        >
                            {userData?.username[0].toUpperCase()}
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button 
                            className="action-button"
                            onClick={() => toast.info('Share profile coming soon!')}
                        >
                            <Share2 size={20} />
                        </button>
                        <button 
                            className="action-button"
                            onClick={handleMessageClick}
                        >
                            <Mail size={20} />
                        </button>
                        <button 
                            className="action-button"
                            onClick={handleNotification}
                        >
                            <Bell size={20} />
                        </button>
                        <button 
                            className={`follow-button ${isFollowing ? 'following' : ''}`}
                            onClick={handleFollow}
                        >
                            {isFollowing ? (
                                'Following'
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    Follow
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="profile-info">
                    <h1 className="profile-name">{userData?.username}</h1>
                    <p className="profile-handle">@{userData?.address.slice(0, 6)}...{userData?.address.slice(-4)}</p>
                    
                    <p className="profile-bio">
                        {userData?.about || "No bio available"}
                    </p>

                    <div className="profile-meta">
                        <span className="meta-item">
                            <MapPin size={16} />
                            Web3 World
                        </span>
                        <span className="meta-item">
                            <LinkIcon size={16} />
                            <a href="#" className="profile-link">blockconnect.web3</a>
                        </span>
                        <span className="meta-item">
                            <Calendar size={16} />
                            Joined {format(new Date(), 'MMMM yyyy')}
                        </span>
                    </div>

                    <div className="profile-stats">
                        <span className="stat-item">
                            <strong>{userPosts.length}</strong> Posts
                        </span>
                        <span className="stat-item">
                            <strong>{stats.followers}</strong> Followers
                        </span>
                        <span className="stat-item">
                            <strong>{stats.following}</strong> Following
                        </span>
                    </div>
                </div>

                {/* Profile Tabs */}
                <div className="profile-tabs">
                    <button 
                        className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <FileText size={20} />
                        Posts
                    </button>
                    <button 
                        className={`tab ${activeTab === 'media' ? 'active' : ''}`}
                        onClick={() => setActiveTab('media')}
                    >
                        <Image size={20} />
                        Media
                    </button>
                    <button 
                        className={`tab ${activeTab === 'likes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('likes')}
                    >
                        <Heart size={20} />
                        Likes
                    </button>
                    <button 
                        className={`tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bookmarks')}
                    >
                        <Bookmark size={20} />
                        Bookmarks
                    </button>
                </div>

                {/* Posts Section */}
                <div className="profile-posts">
                    {userPosts.length === 0 ? (
                        <div className="no-posts">
                            <FileText size={48} />
                            <h3>No posts yet</h3>
                            <p>When {userData?.username} posts, you'll see their posts here.</p>
                        </div>
                    ) : (
                        userPosts.map(post => (
                            <article key={post.id} className="post-card">
                                <div className="post-header">
                                    <div 
                                        className="user-avatar"
                                        style={{ backgroundColor: `#${post.creator.slice(2, 8)}` }}
                                    >
                                        {userData?.username[0].toUpperCase()}
                                    </div>
                                    <div className="post-content-wrapper">
                                        <div className="post-meta">
                                            <span className="user-name">{userData?.username}</span>
                                            <span className="user-handle">@{post.creator.slice(0, 6)}...{post.creator.slice(-4)}</span>
                                            <span className="post-dot">·</span>
                                            <span className="post-time">{format(new Date(post.timestamp), 'MMM d, yyyy h:mm a')}</span>
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
                                            <button className="action-button more-button">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>

                <MessageModal 
                    isOpen={isMessageModalOpen}
                    onClose={() => setIsMessageModalOpen(false)}
                    recipient={username}
                />
            </div>
        </div>
    );
};

export default UserProfile; 