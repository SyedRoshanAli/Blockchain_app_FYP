import React, { useState } from "react";
import { Modal, Box, Button, TextField, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import "./comments.css";
const CommentItem = ({ comment, isOwner, onUpdate, onDelete }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);

  const handleUpdate = () => {
    onUpdate(comment.id, editedText);
    setEditModalOpen(false);
  };

  return (
    <li className="comment-item">
      <div className="comment-content">
        <span>{comment.text}</span>
        {isOwner && (
          <div className="comment-actions">
            <EditIcon
              className="action-icon edit-icon"
              onClick={() => setEditModalOpen(true)}
            />
            <DeleteIcon
              className="action-icon delete-icon"
              onClick={() => onDelete(comment.id)}
            />
          </div>
        )}
      </div>

      {/* Edit Comment Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box className="modal-box">
          <Typography variant="h6" component="h2">
            Edit Comment
          </Typography>
          <TextField
            fullWidth
            label="Comment"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            margin="normal"
          />
          <div className="modal-actions">
            <Button variant="contained" color="primary" onClick={handleUpdate}>
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
    </li>
  );
};

export default CommentItem;
