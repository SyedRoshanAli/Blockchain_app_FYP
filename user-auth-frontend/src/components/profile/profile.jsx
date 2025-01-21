import React, { useState } from "react";
import "./profile.css";
import CreatePost from "../posts/create";
import Post from "../posts/posts";

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("posts");

  const posts = [
    {
      id: 1,
      title: "Post Title 1",
      content: "This is a sample post content.",
      likes: 10,
      comments: ["Nice post!", "Great work!"],
    },
    {
      id: 2,
      title: "Post Title 2",
      content: "This is another sample post content.",
      likes: 5,
      comments: [],
    },
  ];

  const handleEdit = (postId) => {
    console.log("Edit Post ID:", postId);
  };

  const handleDelete = (postId) => {
    console.log("Delete Post ID:", postId);
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        {/* Profile Header */}
        <div className="profile-header">
          <img
            src="https://plus.unsplash.com/premium_photo-1689568126014-06fea9d5d341?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Profile"
            className="profile-img"
          />
          <div className="profile-info">
            <h1 className="profile-name">John Doe</h1>
            <p className="profile-username">@johndoe</p>
            <p className="profile-bio">
              Passionate developer, tech enthusiast, and blogger. Sharing ideas
              and connecting with the world.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div>
            <p className="stats-value">120</p>
            <p className="stats-label">Posts</p>
          </div>
          <div>
            <p className="stats-value">1.2k</p>
            <p className="stats-label">Followers</p>
          </div>
          <div>
            <p className="stats-value">250</p>
            <p className="stats-label">Following</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`tab-button ${
              activeTab === "followers" ? "active" : ""
            }`}
            onClick={() => setActiveTab("followers")}
          >
            Followers
          </button>
          <button
            className={`tab-button ${
              activeTab === "following" ? "active" : ""
            }`}
            onClick={() => setActiveTab("following")}
          >
            Following
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "posts" && (
            <div>
              <CreatePost />

              <h2>Recent Posts</h2>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  isOwner={post.id === 1} // Assume the user owns post with ID 1
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          {activeTab === "followers" && (
            <div>
              <h2 className="tab-title">Followers</h2>
              <ul className="followers-list">
                <li className="follower">
                  <img
                    src="https://plus.unsplash.com/premium_photo-1688572454849-4348982edf7d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDF8fHxlbnwwfHx8fHw%3D"
                    alt="Follower"
                    className="follower-img"
                  />
                  <span>Follower 1</span>
                </li>
                <li className="follower">
                  <img
                    src="https://plus.unsplash.com/premium_photo-1688740375397-34605b6abe48?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Follower"
                    className="follower-img"
                  />
                  <span>Follower 2</span>
                </li>
              </ul>
            </div>
          )}
          {activeTab === "following" && (
            <div>
              <h2 className="tab-title">Following</h2>
              <ul className="following-list">
                <li className="following">
                  <img
                    src="https://plus.unsplash.com/premium_photo-1690407617686-d449aa2aad3c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Following"
                    className="following-img"
                  />
                  <span>Following 1</span>
                </li>
                <li className="following">
                  <img
                    src="https://plus.unsplash.com/premium_photo-1690407617542-2f210cf20d7e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Following"
                    className="following-img"
                  />
                  <span>Following 2</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
