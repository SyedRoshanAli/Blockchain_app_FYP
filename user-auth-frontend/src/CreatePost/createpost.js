import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Image, File, Tag, X } from 'lucide-react';
import { uploadToIPFS, uploadFilesToIPFS } from '../ipfs';
import { CreatePostContract } from '../UserAuth';
import './createpost.css';

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const userSession = localStorage.getItem('userSession');
    if (!userSession) {
      toast.error("Please login to create a post");
      navigate('/login');
      return;
    }
    
    try {
      const userData = JSON.parse(userSession);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error parsing user session:", error);
      toast.error("Session error. Please login again.");
      navigate('/login');
    }
  }, [navigate]);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + mediaFiles.length > 4) {
      toast.error("Maximum 4 media files allowed");
      return;
    }

    setMediaFiles([...mediaFiles, ...files]);
    
    // Create previews
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name
    }));
    
    setMediaPreviews([...mediaPreviews, ...newPreviews]);
  };

  const removeMedia = (index) => {
    const updatedFiles = [...mediaFiles];
    const updatedPreviews = [...mediaPreviews];
    
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(updatedPreviews[index].url);
    
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
    
    setMediaFiles(updatedFiles);
    setMediaPreviews(updatedPreviews);
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmedInput = tagInput.trim().toLowerCase();
    if (trimmedInput && !tags.includes(trimmedInput) && tags.length < 5) {
      setTags([...tags, trimmedInput]);
      setTagInput('');
    } else if (tags.length >= 5) {
      toast.error("Maximum 5 tags allowed");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Please add some content or media to your post");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create post data object
      const postData = {
        text: content.trim(),
        timestamp: Date.now(),
        media: [],
        tags: tags
      };
      
      // Upload media files if any
      if (mediaFiles.length > 0) {
        try {
          console.log("Uploading media files to IPFS:", mediaFiles);
          const mediaResults = await uploadFilesToIPFS(mediaFiles);
          console.log("Media upload results:", mediaResults);
          
          // Ensure media results are properly formatted
          postData.media = mediaResults.map(result => ({
            hash: result.hash,
            name: result.name,
            type: result.type,
            size: result.size
          }));
          
          // Also store preview URLs for local testing
          postData.mediaPreviews = mediaPreviews.map(preview => preview.url);
        } catch (error) {
          console.error("Error uploading media:", error);
          toast.error("Error uploading media. Post will be created without media.");
          postData.media = [];
        }
      }
      
      // Convert post data to JSON string and upload to IPFS
      const postDataString = JSON.stringify(postData);
      const contentHash = await uploadToIPFS(postDataString);
      
      // Store in localStorage as fallback
      const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
      localPosts[contentHash] = postData;
      localStorage.setItem('localPosts', JSON.stringify(localPosts));
      
      // Get user's Ethereum account
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      
      // Post to blockchain
      await CreatePostContract.methods
        .createPost(contentHash, mediaFiles.length > 0, tags)
        .send({ from: accounts[0] });
      
      toast.success("Post created successfully!");
      
      // Clear form
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setTags([]);
      setShowPreview(false);
      
      // Redirect to home page
      navigate('/home');
      
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup previews when component unmounts
  useEffect(() => {
    return () => {
      mediaPreviews.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [mediaPreviews]);

  return (
    <div className="create-post-page">
      <div className="create-post-container">
        <div className="create-post-header">
          <h2>Create Post</h2>
          <button className="back-button" onClick={() => navigate('/home')}>
            <X size={24} />
          </button>
        </div>
        
        {!showPreview ? (
          <form className="post-form" onSubmit={handleSubmit}>
            <div className="content-input">
              <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>
            
            <div className="media-input">
              <label className="media-button">
                <input
                  type="file"
                  multiple
                  onChange={handleMediaChange}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />
                <div className="button-content">
                  <Image size={20} />
                  <span>Add Media</span>
                </div>
              </label>
              
              {mediaPreviews.length > 0 && (
                <div className="media-previews">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="media-preview-item">
                      {preview.type.startsWith('image/') ? (
                        <img src={preview.url} alt={`Preview ${index}`} />
                      ) : (
                        <video src={preview.url} controls />
                      )}
                      <button 
                        type="button" 
                        className="remove-media-button"
                        onClick={() => removeMedia(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="tags-input">
              <div className="tag-input-container">
                <Tag size={16} />
                <input
                  type="text"
                  placeholder="Add tags (press Enter)"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                />
                {tagInput && (
                  <button 
                    type="button" 
                    className="add-tag-button"
                    onClick={addTag}
                  >
                    Add
                  </button>
                )}
              </div>
              
              {tags.length > 0 && (
                <div className="tags-list">
                  {tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                      <button 
                        type="button" 
                        className="remove-tag-button"
                        onClick={() => removeTag(tag)}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="preview-button"
                onClick={() => setShowPreview(true)}
              >
                Preview
              </button>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <div className="post-preview">
            <h3>Post Preview</h3>
            
            <div className="preview-content">
              {content && <p className="preview-text">{content}</p>}
              
              {mediaPreviews.length > 0 && (
                <div className="preview-media">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="preview-media-item">
                      {preview.type.startsWith('image/') ? (
                        <img src={preview.url} alt={`Preview ${index}`} />
                      ) : (
                        <video src={preview.url} controls />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {tags.length > 0 && (
                <div className="preview-tags">
                  {tags.map((tag, index) => (
                    <span key={index} className="preview-tag">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="preview-user-info">
              <div className="preview-avatar">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="preview-user-details">
                <p className="preview-username">{currentUser?.username || 'User'}</p>
                <p className="preview-time">Just now</p>
              </div>
            </div>
            
            <div className="preview-actions">
              <button 
                type="button" 
                className="edit-button"
                onClick={() => setShowPreview(false)}
              >
                Edit
              </button>
              
              <button 
                type="button" 
                className="post-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePost;
