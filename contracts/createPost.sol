// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CreatePost {
    // Structure to store posts
    struct Post {
        uint256 postId;
        address creator;
        string contentHash; // IPFS hash for post content
        uint256 timestamp;
    }

    uint256 public postCounter; // Counter for post IDs
    mapping(address => uint256[]) public userPosts; // Map user to their post IDs
    mapping(uint256 => Post) public posts; // Map post ID to Post details

    // Event for a new post
    event PostCreated(uint256 postId, address indexed creator, string contentHash, uint256 timestamp);

    // Function to create a new post
    function createPost(string memory _contentHash) public {
        require(bytes(_contentHash).length > 0, "Post content cannot be empty");

        postCounter++;
        uint256 newPostId = postCounter;

        posts[newPostId] = Post({
            postId: newPostId,
            creator: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp
        });

        userPosts[msg.sender].push(newPostId);

        emit PostCreated(newPostId, msg.sender, _contentHash, block.timestamp);
    }

    // Function to get posts by a user
    function getPostsByUser(address _user) public view returns (uint256[] memory) {
        return userPosts[_user];
    }

    // Function to get a post's details
    function getPost(uint256 _postId) public view returns (Post memory) {
        require(posts[_postId].postId != 0, "Post does not exist");
        return posts[_postId];
    }
}