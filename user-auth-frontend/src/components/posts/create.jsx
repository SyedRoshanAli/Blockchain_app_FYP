import React, { useState } from "react";
import "./create.css";

const CreatePost = ({ onPostCreate }) => {
  const [postContent, setPostContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handlePostContentChange = (e) => {
    setPostContent(e.target.value);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    document.querySelector(".file-input").value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (postContent.trim() === "") {
      alert("Post content cannot be empty.");
      return;
    }

    const newPost = { content: postContent, image };
    onPostCreate(newPost);

    setPostContent("");
    setImage(null);
    setImagePreview(null);
  };

  return (
    <div className="create-post-container">
      <form onSubmit={handleSubmit} className="create-post-form">
        <textarea
          className="create-post-textarea"
          placeholder="What's on your mind?"
          value={postContent}
          onChange={handlePostContentChange}
        />

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" className="preview-img" />
            <button
              type="button"
              className="remove-image-button"
              onClick={handleRemoveImage}
            >
              Remove
            </button>
          </div>
        )}

        <div className="create-post-actions">
          <label className="upload-label">
            <input
              type="file"
              className="file-input"
              accept="image/*"
              onChange={handleImageChange}
            />
            Add Image
          </label>
          <button type="submit" className="submit-button">
            Post
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
