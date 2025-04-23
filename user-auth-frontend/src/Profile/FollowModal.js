import React from 'react';
import { X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './FollowModal.css';

const FollowModal = ({ isOpen, onClose, title, userList }) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;
  
  return (
    <div className="follow-modal-overlay">
      <div className="follow-modal">
        <div className="follow-modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="follow-list">
          {userList.length === 0 ? (
            <div className="empty-list">
              <p>No users found</p>
            </div>
          ) : (
            userList.map((username, index) => (
              <div 
                key={index} 
                className="follow-item"
                onClick={() => {
                  navigate(`/profile/${username}`);
                  onClose();
                }}
              >
                <div className="follow-avatar">
                  {username[0].toUpperCase()}
                </div>
                <div className="follow-info">
                  <h4>{username}</h4>
                  <p>@{username.toLowerCase().replace(/\s+/g, '_')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowModal; 