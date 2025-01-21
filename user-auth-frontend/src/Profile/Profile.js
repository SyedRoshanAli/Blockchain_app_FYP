import React, { useState, useEffect } from "react";
import "./Profile.css";
import UserAuth from "../UserAuth"; // Blockchain smart contract instance
import CreatePost from "../components/posts/create";

function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Fetch user data from blockchain and IPFS
    const fetchUserData = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        if (!window.ethereum) {
          setErrorMessage(
            "MetaMask is not installed. Please install MetaMask."
          );
          return;
        }

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const userIpfsHash = await UserAuth.methods.login().call({
          from: accounts[0],
        });

        if (!userIpfsHash) {
          throw new Error("User data not found on blockchain.");
        }

        const response = await fetch(
          `http://127.0.0.1:8082/ipfs/${userIpfsHash}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch user data from IPFS.");
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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
            <img
              className="profile-photo"
              src="https://via.placeholder.com/90"
              alt="User"
            />
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
              <CreatePost />
              <div className="post">Post 1: This is a sample post.</div>
              <div className="post">Post 2: Another sample post.</div>
            </section>
          )}
          {activeTab === "followers" && (
            <section>
              <h3>Followers</h3>
              <ul>
                <li>Follower 1</li>
                <li>Follower 2</li>
              </ul>
            </section>
          )}
          {activeTab === "following" && (
            <section>
              <h3>Following</h3>
              <ul>
                <li>Following 1</li>
                <li>Following 2</li>
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
