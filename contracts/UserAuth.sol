// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserAuth {
    // Structure to store user information
    struct User {
        string ipfsHash;      // IPFS hash for storing user data
        address userAddress;  // Ethereum address of the user
        bytes32 emailHash;    // Hashed email for validation
        bytes32 passwordHash; // Hashed password for validation
    }

    // State variables
    mapping(address => User) private users;                 // Map address to user data
    mapping(bytes32 => bool) private emailExists;           // Track if email exists
    mapping(bytes32 => bool) private usernameExists;        // Track if username exists

    // Events
    event UserRegistered(string ipfsHash, address userAddress);
    event UserReset(address userAddress);

    // Register a new user
    function register(string memory _ipfsHash, string memory _email, string memory _password) public {
        // Check if the user is already registered
        require(bytes(users[msg.sender].ipfsHash).length == 0, "User already registered.");
        
        // Hash the email and password
        bytes32 emailHash = keccak256(abi.encodePacked(_email));
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        
        // Ensure the email is unique
        require(!emailExists[emailHash], "Email already registered.");
        
        // Ensure the username (IPFS hash) is unique
        bytes32 usernameHash = keccak256(abi.encodePacked(_ipfsHash));
        require(!usernameExists[usernameHash], "Username already exists.");

        // Store the user data
        users[msg.sender] = User(_ipfsHash, msg.sender, emailHash, passwordHash);
        emailExists[emailHash] = true;
        usernameExists[usernameHash] = true;

        // Emit registration event
        emit UserRegistered(_ipfsHash, msg.sender);
    }

    // Login function - Verify email and password
    function login(string memory _email, string memory _password) public view returns (string memory) {
        // Ensure the user is registered
        require(bytes(users[msg.sender].ipfsHash).length > 0, "User not registered.");
        
        // Validate email and password
        bytes32 emailHash = keccak256(abi.encodePacked(_email));
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));

        require(users[msg.sender].emailHash == emailHash, "Invalid email.");
        require(users[msg.sender].passwordHash == passwordHash, "Invalid password.");

        // Return the IPFS hash
        return users[msg.sender].ipfsHash;
    }

    // Reset user registration (FOR DEVELOPMENT/TESTING PURPOSE ONLY)
    function resetUser() public {
        // Ensure the user is already registered
        require(bytes(users[msg.sender].ipfsHash).length > 0, "User not registered.");

        // Delete user data and mappings
        bytes32 emailHash = users[msg.sender].emailHash;
        bytes32 usernameHash = keccak256(abi.encodePacked(users[msg.sender].ipfsHash));
        
        delete emailExists[emailHash];
        delete usernameExists[usernameHash];
        delete users[msg.sender];

        // Emit reset event
        emit UserReset(msg.sender);
    }
}