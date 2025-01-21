import React, { useState } from "react";
import "./posts.css";
import { Modal, Box, Button, Typography, TextField } from "@mui/material";
import CommentsList from "./comment";

const Post = ({ post, isOwner, onEdit, onDelete }) => {
  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editedPost, setEditedPost] = useState({
    title: post.title,
    content: post.content,
  });

  const currentUserId = 1; // Simulate the current logged-in user ID

  const handleLike = () => {
    setLiked(!liked);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim() === "") return;

    const newCommentObj = {
      id: comments.length + 1,
      text: newComment,
      userId: currentUserId,
    };

    setComments([...comments, newCommentObj]);
    setNewComment("");
  };

  const handleEditSubmit = () => {
    onEdit(post.id, editedPost);
    setEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    onDelete(post.id);
    setDeleteModalOpen(false);
  };

  const handleCommentUpdate = (commentId, updatedText) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId ? { ...comment, text: updatedText } : comment
      )
    );
  };

  const handleCommentDelete = (commentId) => {
    setComments(comments.filter((comment) => comment.id !== commentId));
  };

  return (
    <div className="post-container">
      <h3 className="post-title">{post.title}</h3>
      <p className="post-content">{post.content}</p>

      {/* Post Actions */}
      <div className="post-actions">
        <button
          className={`like-button ${liked ? "liked" : ""}`}
          onClick={handleLike}
        >
          {liked ? "Unlike" : "Like"} ({likes})
        </button>
        <button className="comment-button">Comments ({comments.length})</button>
        {isOwner && (
          <div className="post-owner-actions">
            <button
              className="edit-button"
              onClick={() => setEditModalOpen(true)}
            >
              Edit
            </button>
            <button
              className="delete-button"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Comment Section */}
      <div className="comments-section">
        <h4>Comments</h4>
        <CommentsList
          comments={comments}
          currentUserId={currentUserId}
          onUpdate={handleCommentUpdate}
          onDelete={handleCommentDelete}
        />
        <form onSubmit={handleCommentSubmit} className="comment-form">
          <input
            type="text"
            className="comment-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit" className="submit-comment-button">
            Post
          </button>
        </form>
      </div>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box className="modal-box">
          <Typography variant="h6" component="h2">
            Edit Post
          </Typography>
          <TextField
            fullWidth
            label="Title"
            value={editedPost.title}
            onChange={(e) =>
              setEditedPost({ ...editedPost, title: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Content"
            value={editedPost.content}
            onChange={(e) =>
              setEditedPost({ ...editedPost, content: e.target.value })
            }
            margin="normal"
            multiline
            rows={4}
          />
          <div className="modal-actions">
            <Button
              variant="contained"
              color="primary"
              onClick={handleEditSubmit}
            >
              Save Changes
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Box className="modal-box">
          <Typography variant="h6" component="h2">
            Confirm Deletion
          </Typography>
          <Typography variant="body1" sx={{ margin: "20px 0" }}>
            Are you sure you want to delete this post? This action cannot be
            undone.
          </Typography>
          <div className="modal-actions">
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>
    </div>
  );
};

export default Post;
