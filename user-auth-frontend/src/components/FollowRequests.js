import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, User, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './FollowRequests.css';
import { UserAuthContract, FollowRelationshipContract } from "../UserAuth";

const FollowRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      // Get pending requests from blockchain
      const pendingRequests = await FollowRelationshipContract.methods
        .getPendingRequests(accounts[0])
        .call();
      
      // Filter only non-accepted requests
      const activeRequests = pendingRequests.filter(req => !req.accepted);
      
      // Convert to our format with usernames
      const formattedRequests = await Promise.all(activeRequests.map(async (req) => {
        // Get username for this address
        const usernames = await UserAuthContract.methods
          .getUsernames(req.from)
          .call();
        
        return {
          id: req.timestamp.toString(),
          from: usernames[0] || "Unknown User",
          fromAddress: req.from,
          to: accounts[0],
          timestamp: new Date(Number(req.timestamp) * 1000).toISOString()
        };
      }));
      
      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
      toast.error("Failed to load follow requests");
      
      // Fallback to localStorage
      const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
      const currentUsername = userSession.username;
      
      const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
      const incomingRequests = pendingRequests.filter(req => req.to === currentUsername);
      
      setRequests(incomingRequests);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (request) => {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      // Accept the request on blockchain
      await FollowRelationshipContract.methods
        .acceptFollowRequest(request.fromAddress)
        .send({ from: accounts[0] });
      
      // Update UI
      setRequests(requests.filter(req => req.id !== request.id));
      
      toast.success(`You are now followed by ${request.from}`);
      
      // Update localStorage for both users
      const userSession = JSON.parse(localStorage.getItem('userSession')) || {};
      const currentUsername = userSession.username;
      
      // Update followers list for the current user
      const followersList = JSON.parse(localStorage.getItem(`followers_${currentUsername}`) || '[]');
      if (!followersList.includes(request.from)) {
        followersList.push(request.from);
        localStorage.setItem(`followers_${currentUsername}`, JSON.stringify(followersList));
      }
      
      // Update following list for the user who sent the request
      const followingList = JSON.parse(localStorage.getItem(`following_${request.from}`) || '[]');
      if (!followingList.includes(currentUsername)) {
        followingList.push(currentUsername);
        localStorage.setItem(`following_${request.from}`, JSON.stringify(followingList));
      }
      
      // Remove from pending requests in localStorage
      const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
      const updatedRequests = pendingRequests.filter(req => 
        !(req.from === request.from && req.to === currentUsername)
      );
      localStorage.setItem('pendingFollowRequests', JSON.stringify(updatedRequests));
      
    } catch (error) {
      console.error("Error accepting follow request:", error);
      toast.error("Failed to accept follow request");
    }
  };

  const rejectRequest = async (request) => {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      // Reject the request on blockchain
      await FollowRelationshipContract.methods
        .rejectFollowRequest(request.fromAddress)
        .send({ from: accounts[0] });
      
      // Update UI
      setRequests(requests.filter(req => req.id !== request.id));
      
      toast.success(`Rejected follow request from ${request.from}`);
      
      // Remove from pending requests in localStorage as well
      const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
      const updatedRequests = pendingRequests.filter(req => 
        !(req.from === request.from && req.to === request.to)
      );
      localStorage.setItem('pendingFollowRequests', JSON.stringify(updatedRequests));
      
    } catch (error) {
      console.error("Error rejecting follow request:", error);
      toast.error("Failed to reject follow request");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
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
    
    return date.toLocaleDateString();
  };

  return (
    <div className="follow-requests-container">
      <div className="follow-requests-header">
        <h2>
          <User size={20} />
          Follow Requests
        </h2>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="no-requests">
          <Clock size={24} />
          <p>No pending follow requests</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-item">
              <div 
                className="request-avatar"
                onClick={() => navigate(`/profile/${request.from}`)}
              >
                {request.from[0].toUpperCase()}
              </div>
              <div className="request-details">
                <h4 onClick={() => navigate(`/profile/${request.from}`)}>
                  {request.from}
                </h4>
                <p className="request-time">
                  {formatTime(request.timestamp)} ago
                </p>
              </div>
              <div className="request-actions">
                <button 
                  className="accept-button" 
                  onClick={() => acceptRequest(request)}
                  title="Accept"
                >
                  <Check size={18} />
                </button>
                <button 
                  className="reject-button" 
                  onClick={() => rejectRequest(request)}
                  title="Reject"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowRequests; 