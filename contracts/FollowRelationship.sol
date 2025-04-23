// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FollowRelationship {
    // Struct for follow requests
    struct FollowRequest {
        address from;
        address to;
        uint256 timestamp;
        bool accepted;
    }
    
    // Mapping from user address to their followers' addresses
    mapping(address => address[]) private followers;
    
    // Mapping from user address to addresses they are following
    mapping(address => address[]) private following;
    
    // Mapping from user address to pending incoming follow requests
    mapping(address => FollowRequest[]) private pendingRequests;
    
    // Events
    event FollowRequestSent(address indexed from, address indexed to, uint256 timestamp);
    event FollowRequestAccepted(address indexed from, address indexed to, uint256 timestamp);
    event FollowRequestRejected(address indexed from, address indexed to, uint256 timestamp);
    event Unfollowed(address indexed from, address indexed to, uint256 timestamp);
    
    // Send a follow request to another user
    function sendFollowRequest(address _to) external {
        require(_to != msg.sender, "Cannot follow yourself");
        
        // Check if already following
        bool alreadyFollowing = false;
        for (uint i = 0; i < following[msg.sender].length; i++) {
            if (following[msg.sender][i] == _to) {
                alreadyFollowing = true;
                break;
            }
        }
        require(!alreadyFollowing, "Already following this user");
        
        // Check if request already pending
        bool requestPending = false;
        for (uint i = 0; i < pendingRequests[_to].length; i++) {
            if (pendingRequests[_to][i].from == msg.sender && !pendingRequests[_to][i].accepted) {
                requestPending = true;
                break;
            }
        }
        require(!requestPending, "Follow request already pending");
        
        // Create and store the request
        FollowRequest memory newRequest = FollowRequest({
            from: msg.sender,
            to: _to,
            timestamp: block.timestamp,
            accepted: false
        });
        
        pendingRequests[_to].push(newRequest);
        
        emit FollowRequestSent(msg.sender, _to, block.timestamp);
    }
    
    // Accept a follow request
    function acceptFollowRequest(address _from) external {
        bool requestFound = false;
        uint requestIndex;
        
        // Find the request
        for (uint i = 0; i < pendingRequests[msg.sender].length; i++) {
            if (pendingRequests[msg.sender][i].from == _from && !pendingRequests[msg.sender][i].accepted) {
                requestFound = true;
                requestIndex = i;
                break;
            }
        }
        
        require(requestFound, "No pending request from this user");
        
        // Mark request as accepted
        pendingRequests[msg.sender][requestIndex].accepted = true;
        
        // Update follower/following relationships
        followers[msg.sender].push(_from);
        following[_from].push(msg.sender);
        
        emit FollowRequestAccepted(_from, msg.sender, block.timestamp);
    }
    
    // Reject a follow request
    function rejectFollowRequest(address _from) external {
        bool requestFound = false;
        uint requestIndex;
        
        // Find the request
        for (uint i = 0; i < pendingRequests[msg.sender].length; i++) {
            if (pendingRequests[msg.sender][i].from == _from && !pendingRequests[msg.sender][i].accepted) {
                requestFound = true;
                requestIndex = i;
                break;
            }
        }
        
        require(requestFound, "No pending request from this user");
        
        // Remove the request
        pendingRequests[msg.sender][requestIndex] = pendingRequests[msg.sender][pendingRequests[msg.sender].length - 1];
        pendingRequests[msg.sender].pop();
        
        emit FollowRequestRejected(_from, msg.sender, block.timestamp);
    }
    
    // Unfollow a user
    function unfollow(address _user) external {
        bool isFollowing = false;
        uint followingIndex;
        
        // Find in following array
        for (uint i = 0; i < following[msg.sender].length; i++) {
            if (following[msg.sender][i] == _user) {
                isFollowing = true;
                followingIndex = i;
                break;
            }
        }
        
        require(isFollowing, "Not following this user");
        
        // Remove from following array
        following[msg.sender][followingIndex] = following[msg.sender][following[msg.sender].length - 1];
        following[msg.sender].pop();
        
        // Remove from follower array of the other user
        bool followerFound = false;
        uint followerIndex;
        
        for (uint i = 0; i < followers[_user].length; i++) {
            if (followers[_user][i] == msg.sender) {
                followerFound = true;
                followerIndex = i;
                break;
            }
        }
        
        if (followerFound) {
            followers[_user][followerIndex] = followers[_user][followers[_user].length - 1];
            followers[_user].pop();
        }
        
        emit Unfollowed(msg.sender, _user, block.timestamp);
    }
    
    // Get all followers of a user
    function getFollowers(address _user) external view returns (address[] memory) {
        return followers[_user];
    }
    
    // Get all users that a user is following
    function getFollowing(address _user) external view returns (address[] memory) {
        return following[_user];
    }
    
    // Get pending follow requests for a user
    function getPendingRequests(address _user) external view returns (FollowRequest[] memory) {
        return pendingRequests[_user];
    }
    
    // Check if user A is following user B
    function isFollowing(address _follower, address _followed) external view returns (bool) {
        for (uint i = 0; i < following[_follower].length; i++) {
            if (following[_follower][i] == _followed) {
                return true;
            }
        }
        return false;
    }
    
    // Get followers count
    function getFollowersCount(address _user) external view returns (uint) {
        return followers[_user].length;
    }
    
    // Get following count
    function getFollowingCount(address _user) external view returns (uint) {
        return following[_user].length;
    }
    
    // Get pending requests count
    function getPendingRequestsCount(address _user) external view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < pendingRequests[_user].length; i++) {
            if (!pendingRequests[_user][i].accepted) {
                count++;
            }
        }
        return count;
    }
} 