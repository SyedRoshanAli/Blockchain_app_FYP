import React, { useState, useEffect } from "react";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { UserAuthContract, CreatePostContract } from "../UserAuth";
import { Plus } from "lucide-react"; // Import the Plus icon from Lucide React

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState("posts");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [profilePicture, setProfilePicture] = useState(""); // Track profile picture
    const [showPlus, setShowPlus] = useState(true); // Control visibility of "+" sign
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            setErrorMessage("");

            try {
                if (!window.ethereum) {
                    setErrorMessage("MetaMask is not installed. Please install MetaMask.");
                    return;
                }

                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });

                // Fetch user IPFS hash from blockchain
                const userIpfsHash = await UserAuthContract.methods.login().call({
                    from: accounts[0],
                });

                if (!userIpfsHash) {
                    throw new Error("User data not found on blockchain.");
                }

                // Fetch user data from IPFS
                const response = await fetch(`http://127.0.0.1:8083/ipfs/${userIpfsHash}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch user data from IPFS.");
                }

                const data = await response.json();

                // Fetch posts from blockchain
                const postIds = await CreatePostContract.methods
                    .getPostsByUser(accounts[0])
                    .call();

                // Map postIds to fetch post details from blockchain and IPFS
                const fetchedPosts = await Promise.all(
                    postIds.map(async (postId) => {
                        const post = await CreatePostContract.methods.getPost(postId.toString()).call();
                        const postDataResponse = await fetch(`http://127.0.0.1:8083/ipfs/${post.contentHash}`);
                        const postData = await postDataResponse.json();

                        return {
                            id: post.postId.toString(),
                            title: postData.title,
                            description: postData.description,
                            image: `http://127.0.0.1:8083/ipfs/${postData.image}`,
                            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
                        };
                    })
                );

                setUserData(data);
                setPosts(fetchedPosts);
                setProfilePicture(data.profilePicture || "https://via.placeholder.com/90"); // Set profile picture
                setShowPlus(!data.profilePicture); // Hide "+" if profile picture exists
            } catch (error) {
                console.error("Error fetching user data:", error);
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleProfilePictureChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result); // Update local preview
                setShowPlus(false); // Remove "+" sign after upload
                // TODO: Upload to IPFS and update blockchain here
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return <div className="soft-ui-container">Loading profile...</div>;
    }

    if (errorMessage) {
        return <div className="soft-ui-container">{errorMessage}</div>;
    }

    return (
        <div className="soft-ui-container">
            {/* SIDEBAR */}
            <aside className="soft-ui-sidebar">
                <div className="sidebar-header">
                    <h3>Soft UI Dashboard</h3>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <a href="#profile" className="active">
                                Profile
                            </a>
                        </li>
                        <li>
                            <a href="#signup">Sign Up</a>
                        </li>
                        <li>
                            <a href="#signin">Sign In</a>
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="soft-ui-main">
                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-card">
                        {/* Profile Photo with Upload Overlay */}
                        <div className="profile-photo-container">
                            <img
                                className="profile-photo"
                                src={profilePicture}
                                alt="User"
                            />
                            {/* "+" sign overlay (only visible if showPlus=true) */}
                            {showPlus && (
                                <label 
                                    htmlFor="profile-picture-upload" 
                                    className="upload-overlay"
                                >
                                    <Plus size={20} color="white" /> {/* Lucide Plus icon */}
                                </label>
                            )}
                            <input
                                type="file"
                                id="profile-picture-upload"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleProfilePictureChange}
                            />
                        </div>
                        <div className="profile-details">
                            <h2>{userData?.username || "No Name"}</h2>
                            <p>{userData?.email || "No Email"}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="profile-tabs">
                    <button
                        className={activeTab === "posts" ? "active-tab" : ""}
                        onClick={() => setActiveTab("posts")}
                    >
                        Posts
                    </button>
                    <button
                        className={activeTab === "followers" ? "active-tab" : ""}
                        onClick={() => setActiveTab("followers")}
                    >
                        Followers
                    </button>
                    <button
                        className={activeTab === "following" ? "active-tab" : ""}
                        onClick={() => setActiveTab("following")}
                    >
                        Following
                    </button>
                </div>

                {/* Tab Content */}
                <div className="profile-content">
                    {activeTab === "posts" && (
                        <section>
                            <h3>Posts</h3>
                            {posts.length > 0 ? (
                                posts.map((post, index) => (
                                    <div className="post" key={index}>
                                        <h4>{post.title}</h4>
                                        <p>{post.description}</p>
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            style={{ width: "100%", borderRadius: "10px" }}
                                        />
                                        <p>Created At: {post.timestamp}</p>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <p>No posts available.</p>
                                    <button
                                        className="add-post-button"
                                        onClick={() => navigate("/createpost")}
                                    >
                                        Add New Post
                                    </button>
                                </>
                            )}
                        </section>
                    )}
                    {activeTab === "followers" && (
                        <section>
                            <h3>Followers</h3>
                            {userData?.followers?.length > 0 ? (
                                <ul>
                                    {userData.followers.map((follower, index) => (
                                        <li key={index}>{follower}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No followers yet.</p>
                            )}
                        </section>
                    )}
                    {activeTab === "following" && (
                        <section>
                            <h3>Following</h3>
                            {userData?.following?.length > 0 ? (
                                <ul>
                                    {userData.following.map((following, index) => (
                                        <li key={index}>{following}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Not following anyone yet.</p>
                            )}
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ProfilePage;