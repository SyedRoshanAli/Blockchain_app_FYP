import React from "react";
import CommentItem from "./commentItem";

const CommentsList = ({ comments, currentUserId, onUpdate, onDelete }) => {
  return (
    <ul className="comments-list">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isOwner={comment.userId === currentUserId}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};

export default CommentsList;
