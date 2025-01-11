// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserAuth {
    // Structure to store user information
    struct User {
        string ipfsHash;      // IPFS hash for storing user data
        address userAddress;  // Ethereum address of the user
    }

    // State variables
    mapping(address => User) private users;                 // Map address to user data
    mapping(bytes32 => bool) private usernameExists;        // Track if username exists

    // Events
    event UserRegistered(string ipfsHash, address userAddress);
    event UserReset(address userAddress);

    // Register a new user
    function register(string memory _ipfsHash) public {
        // Check if the user is already registered
        require(bytes(users[msg.sender].ipfsHash).length == 0, "User already registered.");
        
        // Ensure the IPFS hash (username) is unique
        bytes32 usernameHash = keccak256(abi.encodePacked(_ipfsHash));
        require(!usernameExists[usernameHash], "Username already exists.");

        // Store the user data
        users[msg.sender] = User(_ipfsHash, msg.sender);
        usernameExists[usernameHash] = true;

        // Emit registration event
        emit UserRegistered(_ipfsHash, msg.sender);
    }

    // Login function - Returns IPFS hash for a registered user
    function login() public view returns (string memory) {
        // Ensure the user is registered
        require(bytes(users[msg.sender].ipfsHash).length > 0, "User not registered.");
        
        // Return the IPFS hash
        return users[msg.sender].ipfsHash;
    }

    // Reset user registration (FOR DEVELOPMENT/TESTING PURPOSE ONLY)
    function resetUser() public {
        // Ensure the user is already registered
        require(bytes(users[msg.sender].ipfsHash).length > 0, "User not registered.");

        // Delete user data and username mapping
        bytes32 usernameHash = keccak256(abi.encodePacked(users[msg.sender].ipfsHash));
        delete usernameExists[usernameHash];
        delete users[msg.sender];

        // Emit reset event
        emit UserReset(msg.sender);
    }
}
