import React, { useState } from "react";
import "./createpost.css";
import { CreatePostContract } from "../UserAuth";
import { uploadToIPFS } from "../ipfs";
import { toast } from 'react-hot-toast';

const CreateTweet = () => {
    const [tweetText, setTweetText] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!tweetText.trim()) {
            toast.error("Please write something to tweet.");
            return;
        }

        setLoading(true);
    
        try {
            if (!window.ethereum) {
                toast.error("MetaMask is not installed.");
                return;
            }
    
            const accounts = await window.ethereum.request({ 
                method: "eth_requestAccounts" 
            });

            // Get current user session
            const userSession = localStorage.getItem('userSession');
            if (!userSession) {
                toast.error("Please login first");
                return;
            }
            const { username } = JSON.parse(userSession);

            // Upload to IPFS with user information
            const tweetData = {
                caption: tweetText,
                username: username,
                userAddress: accounts[0],
                timestamp: new Date().toISOString()
            };

            const ipfsHash = await uploadToIPFS(JSON.stringify(tweetData));
            console.log("IPFS Hash:", ipfsHash);

            // Store only the IPFS hash in the contract
            await CreatePostContract.methods
                .createPost(ipfsHash)
                .send({ 
                    from: accounts[0], 
                    gas: 3000000 
                });
    
            toast.success("Tweet posted successfully!");
            setTweetText("");

        } catch (error) {
            console.error("Error creating tweet:", error);
            toast.error("Failed to post tweet. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tweet-compose">
            <h2>Create Tweet</h2>
            <form onSubmit={handleSubmit}>
                <textarea
                    placeholder="What's happening?"
                    value={tweetText}
                    onChange={(e) => setTweetText(e.target.value)}
                    maxLength={280}
                />
                <div className="tweet-actions">
                    <span className="character-count">{tweetText.length}/280</span>
                    <button 
                        type="submit" 
                        className="tweet-button"
                        disabled={loading || !tweetText.trim()}
                    >
                        {loading ? "Posting..." : "Tweet"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateTweet;
