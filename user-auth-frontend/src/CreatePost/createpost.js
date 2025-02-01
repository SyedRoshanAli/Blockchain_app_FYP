import React, { useState } from "react";
import "./createpost.css"; // Import the CSS for styling
import { CreatePostContract } from "../UserAuth"; // Import the CreatePost contract instance
import { uploadToIPFS } from "../ipfs"; // Function to upload files to IPFS

const CreatePost = () => {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        image: null,
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle file upload
    const handleFileChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
    
        try {
            if (!window.ethereum) {
                setMessage("MetaMask is not installed. Please install MetaMask.");
                return;
            }
    
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    
            if (!formData.title || !formData.description || !formData.image) {
                setMessage("All fields are required, including an image.");
                return;
            }
    
            // Upload image to IPFS
            const imageHash = await uploadToIPFS(formData.image);
            console.log("IPFS Hash of image:", imageHash);
    
            // Create a JSON object with post details
            const postDetails = {
                title: formData.title,
                description: formData.description,
                image: imageHash,
            };
    
            // Upload post details to IPFS
            const postHash = await uploadToIPFS(JSON.stringify(postDetails));
            console.log("IPFS Hash of post:", postHash);
    
            // Store the post hash on the blockchain
            await CreatePostContract.methods
                .createPost(postHash)
                .send({ from: accounts[0], gas: 3000000 });
    
            setMessage("Post created successfully!");
        } catch (error) {
            console.error("Error creating post:", error);
            setMessage("Failed to create post. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="createpost-container">
            <h2>Create a New Post</h2>
            <form onSubmit={handleSubmit} className="createpost-form">
                <label>Title</label>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                />

                <label>Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                ></textarea>

                <label>Upload Image</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />

                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Post"}
                </button>
            </form>

            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default CreatePost;
