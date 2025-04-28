import TestNotificationButton from '../components/TestNotificationButton';
import { notificationService } from '../services/notificationService';
import { debugNotifications } from '../utils/debug';
import NotificationBadge from '../components/Notifications/NotificationBadge';
import { Link } from 'react-router-dom';

const handleLike = async (postId) => {
    try {
        // Get current accounts
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });
        const currentAddress = accounts[0].toLowerCase();
        
        // Call the contract method to like the post
        await CreatePostContract.methods
            .likePost(postId)
            .send({ from: accounts[0] });
            
        // Get post details for notification
        const postDetails = await CreatePostContract.methods
            .getPost(postId)
            .call();
            
        if (postDetails && postDetails.creator) {
            const creatorAddress = postDetails.creator.toLowerCase();
            
            // Don't notify yourself
            if (creatorAddress === currentAddress) {
                console.log("Not creating notification for self-like");
            } else {
                // Get content preview
                let contentPreview = "your post";
                
                // Try to get post content from localStorage
                const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
                if (localPosts[postDetails.contentHash]) {
                    const content = localPosts[postDetails.contentHash];
                    if (content.text) {
                        contentPreview = content.text.substring(0, 30) + (content.text.length > 30 ? '...' : '');
                    }
                }
                
                console.log("Creating like notification for:", creatorAddress);
                
                // Create notification for post owner
                await notificationService.createNotification(
                    creatorAddress,
                    'like',
                    {
                        postId,
                        contentHash: postDetails.contentHash,
                        contentPreview
                    }
                );
                
                // Force UI update
                window.dispatchEvent(new Event('notification-update'));
            }
        }
        
        // Update localStorage to persist the like state
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
        
        if (!likedPosts[currentAddress]) {
            likedPosts[currentAddress] = [];
        }
        
        // Toggle liked state
        const isAlreadyLiked = likedPosts[currentAddress].includes(postId.toString());
        
        if (isAlreadyLiked) {
            // Unlike: Remove from liked posts
            likedPosts[currentAddress] = likedPosts[currentAddress].filter(id => id !== postId.toString());
        } else {
            // Like: Add to liked posts
            likedPosts[currentAddress].push(postId.toString());
        }
        
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        
        // Update UI immediately
        setPosts(prevPosts => 
            prevPosts.map(post => {
                if (post.id === postId) {
                    const newLikeCount = isAlreadyLiked ? post.likes.length - 1 : post.likes.length + 1;
                    const newLikes = isAlreadyLiked 
                        ? post.likes.filter(addr => addr.toLowerCase() !== currentAddress)
                        : [...post.likes, currentAddress];
                    
                    return {
                        ...post,
                        likes: newLikes,
                        isLikedByMe: !isAlreadyLiked
                    };
                }
                return post;
            })
        );
        
    } catch (error) {
        console.error("Error liking post:", error);
        toast.error("Failed to like post");
    }
};

const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });
        const currentAddress = accounts[0].toLowerCase();
        
        // Get current user's username
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUsername = userSession.username || userData.username;
        
        // Create new comment object
        const newComment = {
            id: Date.now().toString(),
            text: commentText,
            authorAddress: currentAddress,
            authorName: currentUsername,
            timestamp: new Date().toISOString(),
            likes: []
        };
        
        // Upload comment to IPFS
        try {
            // Convert comment object to JSON string and then to buffer
            const commentString = JSON.stringify(newComment);
            const commentBuffer = Buffer.from(commentString);
            
            // Upload to IPFS using the existing uploadToIPFS function
            const { uploadToIPFS } = await import('../ipfs');
            const commentHash = await uploadToIPFS(commentBuffer);
            
            console.log("Uploaded comment to IPFS with hash:", commentHash);
            
            // Store the comment itself in localStorage as a cache
            const commentContent = JSON.parse(localStorage.getItem('commentContent') || '{}');
            commentContent[commentHash] = newComment;
            localStorage.setItem('commentContent', JSON.stringify(commentContent));
            
            // Store the comment hash in the post's comment list
            const commentRefs = JSON.parse(localStorage.getItem('postCommentRefs') || '{}');
            if (!commentRefs[selectedPost.id]) {
                commentRefs[selectedPost.id] = [];
            }
            
            // Add reference with timestamp for sorting
            commentRefs[selectedPost.id].push({
                hash: commentHash,
                timestamp: newComment.timestamp,
                authorName: currentUsername
            });
            
            localStorage.setItem('postCommentRefs', JSON.stringify(commentRefs));
            
            // Update UI immediately
            const updatedComments = [...comments, newComment];
            setComments(updatedComments);
            
            // Also keep in postComments for backward compatibility
            const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
            allComments[selectedPost.id] = updatedComments;
            localStorage.setItem('postComments', JSON.stringify(allComments));
            
            // Clear input
            setCommentText('');
            
            // Create notification for post owner if it's not the current user
            if (selectedPost.creator && selectedPost.creator.toLowerCase() !== currentAddress) {
                try {
                    // Get content preview for notification
                    let contentPreview = "";
                    if (selectedPost.content) {
                        if (typeof selectedPost.content === 'string') {
                            contentPreview = selectedPost.content.substring(0, 30) + (selectedPost.content.length > 30 ? '...' : '');
                        } else if (selectedPost.content.text) {
                            contentPreview = selectedPost.content.text.substring(0, 30) + (selectedPost.content.text.length > 30 ? '...' : '');
                        } else {
                            contentPreview = "your post";
                        }
                    } else {
                        contentPreview = "your post";
                    }
                    
                    // Use the direct createNotification function instead of notificationService
                    await notificationService.createNotification(
                        selectedPost.creator,
                        'comment',
                        {
                            postId: selectedPost.id,
                            contentPreview: contentPreview,
                            commentPreview: newComment.text.substring(0, 30) + (newComment.text.length > 30 ? '...' : '')
                        }
                    );
                    
                    console.log("Comment notification created for post creator:", selectedPost.creator);
                } catch (notifError) {
                    console.error("Error creating comment notification:", notifError);
                    // Continue even if notification fails
                }
            }
        } catch (ipfsError) {
            console.error("Failed to upload comment to IPFS:", ipfsError);
            toast.error("Failed to store comment on IPFS. Saving locally only.");
            
            // Add to state anyway (localStorage only as fallback)
            const updatedComments = [...comments, newComment];
            setComments(updatedComments);
            
            const allComments = JSON.parse(localStorage.getItem('postComments') || '{}');
            allComments[selectedPost.id] = updatedComments;
            localStorage.setItem('postComments', JSON.stringify(allComments));
            
            setCommentText('');
        }
    } catch (error) {
        console.error("Error adding comment:", error);
        toast.error("Failed to add comment");
    }
};

// Only show in development
{process.env.NODE_ENV === 'development' && (
  <button 
    onClick={async () => {
      await notificationService.createTestNotification();
      toast.success("Test notification created");
    }}
    style={{ 
      padding: '8px 12px', 
      background: '#4f46e5', 
      color: 'white', 
      border: 'none', 
      borderRadius: '4px',
      cursor: 'pointer',
      margin: '10px'
    }}
  >
    Create Test Notification
  </button>
)}

const createNotification = async (recipientAddress, type, data) => {
  return notificationService.createNotification(recipientAddress, type, data);
};

{process.env.NODE_ENV !== 'production' && <TestNotificationButton />}

<li>
  <Link to="/notifications">
    <NotificationBadge />
    <span>Notifications</span>
  </Link>
</li> 