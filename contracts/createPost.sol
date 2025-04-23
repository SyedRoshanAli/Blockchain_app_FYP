// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CreatePost {
    // Structure to store posts
    struct Post {
        uint256 postId;
        address creator;
        string contentHash; // IPFS hash for post content (includes text and media references)
        uint256 timestamp;
        bool hasMedia;
        string[] tags;
    }

    uint256 public postCounter; // Counter for post IDs
    mapping(address => uint256[]) public userPosts; // Map user to their post IDs
    mapping(uint256 => Post) public posts; // Map post ID to Post details
    mapping(uint256 => string[]) public postTags; // Map post ID to tags
    mapping(string => uint256[]) public tagToPosts; // Map tag to post IDs
    mapping(uint256 => address[]) public postLikes; // Map post ID to addresses that liked it
    mapping(uint256 => uint256) public postViewCount; // Map post ID to view count

    // Event for a new post
    event PostCreated(uint256 postId, address indexed creator, string contentHash, uint256 timestamp, bool hasMedia, string[] tags);
    event PostLiked(uint256 postId, address liker);
    event PostUnliked(uint256 postId, address unliker);
    event PostViewed(uint256 postId, address viewer);

    // Function to create a new post
    function createPost(string memory _contentHash, bool _hasMedia, string[] memory _tags) public {
        require(bytes(_contentHash).length > 0, "Post content cannot be empty");

        postCounter++;
        uint256 newPostId = postCounter;

        posts[newPostId] = Post({
            postId: newPostId,
            creator: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            hasMedia: _hasMedia,
            tags: _tags
        });

        userPosts[msg.sender].push(newPostId);
        
        // Store tags for this post
        for (uint i = 0; i < _tags.length; i++) {
            if (bytes(_tags[i]).length > 0) {
                postTags[newPostId].push(_tags[i]);
                tagToPosts[_tags[i]].push(newPostId);
            }
        }

        emit PostCreated(newPostId, msg.sender, _contentHash, block.timestamp, _hasMedia, _tags);
    }

    // Function to like a post
    function likePost(uint256 _postId) public {
        require(posts[_postId].postId != 0, "Post does not exist");
        
        // Check if user already liked the post
        for (uint i = 0; i < postLikes[_postId].length; i++) {
            if (postLikes[_postId][i] == msg.sender) {
                // User already liked, so unlike
                postLikes[_postId][i] = postLikes[_postId][postLikes[_postId].length - 1];
                postLikes[_postId].pop();
                emit PostUnliked(_postId, msg.sender);
                return;
            }
        }
        
        // User hasn't liked, so add like
        postLikes[_postId].push(msg.sender);
        emit PostLiked(_postId, msg.sender);
    }

    // Function to increment view count
    function viewPost(uint256 _postId) public {
        require(posts[_postId].postId != 0, "Post does not exist");
        postViewCount[_postId]++;
        emit PostViewed(_postId, msg.sender);
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

    // Function to get posts by tag
    function getPostsByTag(string memory _tag) public view returns (uint256[] memory) {
        return tagToPosts[_tag];
    }

    // Function to get post likes
    function getPostLikes(uint256 _postId) public view returns (address[] memory) {
        return postLikes[_postId];
    }

    // Function to get post engagement metrics
    function getPostEngagement(uint256 _postId) public view returns (uint256 likes, uint256 views) {
        require(posts[_postId].postId != 0, "Post does not exist");
        return (postLikes[_postId].length, postViewCount[_postId]);
    }
}