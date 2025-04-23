import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Share2, Hash, File } from 'lucide-react';
import { format } from 'date-fns';
import { getFromIPFS } from '../ipfs';

const PostModal = ({ post, onClose, onLike }) => {
  const [displayName, setDisplayName] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('');
  const [postContent, setPostContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Get username and avatar initial
    const fetchUserData = async () => {
      // First try from localStorage cache
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
      
      // If not found, fallback to shortened address
      setDisplayName(`${post.creator.substring(0, 6)}...${post.creator.substring(post.creator.length - 4)}`);
      setAvatarInitial(post.creator.substring(2, 4).toUpperCase());
    };
    
    fetchUserData();
  }, [post.creator]);
  
  // Fetch post content when modal opens
  useEffect(() => {
    const fetchPostContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const contentHash = post.contentHash;
        
        // ALWAYS check localStorage first as our primary source
        const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
        if (localPosts[contentHash]) {
          console.log("Found post in localStorage for modal:", contentHash);
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
          } catch (parseError) {
            console.error("Error parsing post data:", parseError);
            throw new Error("Could not parse post data");
          }
        } catch (ipfsError) {
          console.error("IPFS retrieval failed in modal:", ipfsError);
          
          // Create placeholder content with blockchain data
          const fallbackContent = {
            text: "Post created at " + formatDate(post.timestamp),
            timestamp: post.timestamp,
            media: [],
            tags: post.tags || [],
            creator: post.creator
          };
          
          // Store this placeholder in localStorage for future use
          localPosts[contentHash] = fallbackContent;
          localStorage.setItem('localPosts', JSON.stringify(localPosts));
          
          setPostContent(fallbackContent);
        }
      } catch (error) {
        console.error("Error in post content processing for modal:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostContent();
  }, [post.contentHash, post.timestamp, post.creator, post.tags]);
  
  // Format date for display
  const formatDate = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Handle click outside to close
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Add this in the button click handler for likes
  const handleLikeInModal = (postId) => {
    // Update the localStorage same as in handleLike
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    const currentAddress = window.ethereum.selectedAddress.toLowerCase();
    
    if (!likedPosts[currentAddress]) {
      likedPosts[currentAddress] = [];
    }
    
    // Toggle like status
    if (likedPosts[currentAddress].includes(postId.toString())) {
      likedPosts[currentAddress] = likedPosts[currentAddress].filter(id => id !== postId.toString());
    } else {
      likedPosts[currentAddress].push(postId.toString());
    }
    
    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    
    // Call the parent's onLike function
    onLike(postId);
  }
  
  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="post-modal-content">
          <div className="post-modal-header">
            <div className="post-modal-avatar">
              {avatarInitial}
            </div>
            <div className="post-modal-user-info">
              <h3>{displayName}</h3>
              <div className="address">{post.creator}</div>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading post content...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>Error loading post content: {error}</p>
            </div>
          ) : postContent ? (
            <>
              {postContent.text && (
                <p>{postContent.text}</p>
              )}
              
              {/* Display tags if any */}
              {postContent.tags && postContent.tags.length > 0 && (
                <div className="post-modal-tags">
                  {postContent.tags.map((tag, index) => (
                    <span key={index} className="post-modal-tag">
                      <Hash size={16} style={{marginRight: '6px'}} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Display media files if any */}
              {postContent.media && postContent.media.length > 0 && (
                <div className="post-modal-media">
                  {postContent.media.map((media, index) => (
                    <div key={index} className="post-modal-media-item">
                      {media.type && media.type.startsWith('image/') ? (
                        <img 
                          src={`https://ipfs.io/ipfs/${media.hash}`} 
                          alt={media.name || "Post image"} 
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
          
          <div className="post-modal-date">
            {formatDate(post.timestamp)}
          </div>
          
          <div className="post-modal-actions">
            <button 
              className={`post-modal-action ${post.isLikedByMe ? 'active' : ''}`} 
              onClick={() => handleLikeInModal(post.id)}
            >
              {post.isLikedByMe ? (
                <Heart size={20} fill="#ef4444" color="#ef4444" />
              ) : (
                <Heart size={20} />
              )}
              <span>{post.likes && post.likes.length > 0 ? post.likes.length : ''} Like{post.likes && post.likes.length !== 1 ? 's' : ''}</span>
            </button>
            <button className="post-modal-action">
              <MessageCircle size={20} />
              <span>Comment</span>
            </button>
            <button className="post-modal-action">
              <Share2 size={20} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal; 