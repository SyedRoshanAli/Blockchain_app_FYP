// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserAuth {
    // Structure to store user information
    struct User {
        string ipfsHash;      // IPFS hash for storing user data
        string username;      // Username for the user
        address userAddress;  // Ethereum address of the user
        bool isRegistered;    // Flag to check if user exists
    }

    // Modified mappings
    mapping(string => address) private usernameToAddress;  // Map username to address
    mapping(address => string[]) private usernames;        // Map address to usernames
    mapping(string => bool) private usernameExists;        // Track if username exists
    string[] private allUsernames;                         // Array to track all usernames

    // State variables
    mapping(address => mapping(string => User)) private users;    // Map address and username to user data

    // Events
    event UserRegistered(string username, string ipfsHash, address userAddress);
    event UserUpdated(string username, string newIpfsHash, address userAddress);
    event UserReset(string username, address userAddress);

    // Register a new user
    function register(string memory _username, string memory _ipfsHash) public {
        // Check if the username is empty
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        // Ensure the username is unique globally
        require(!usernameExists[_username], "Username already exists");
        
        // Store username to address mapping
        usernameToAddress[_username] = msg.sender;
        
        // Add username to global list
        allUsernames.push(_username);
        
        // Add to user's usernames
        usernames[msg.sender].push(_username);
        
        // Mark username as taken
        usernameExists[_username] = true;

        // Create new user
        users[msg.sender][_username] = User({
            ipfsHash: _ipfsHash,
            username: _username,
            userAddress: msg.sender,
            isRegistered: true
        });

        // Emit registration event
        emit UserRegistered(_username, _ipfsHash, msg.sender);
    }

    // Login function - Returns IPFS hash for a registered user
    function login(string memory _username) public view returns (string memory) {
        // Ensure the user is registered
        require(users[msg.sender][_username].isRegistered, "User not registered");
        require(users[msg.sender][_username].userAddress == msg.sender, "Unauthorized access");
        
        // Return the IPFS hash
        return users[msg.sender][_username].ipfsHash;
    }

    // Update user data
    function updateUser(string memory _username, string memory _newIpfsHash) public {
        // Ensure the user exists and is the owner
        require(users[msg.sender][_username].isRegistered, "User not registered");
        require(users[msg.sender][_username].userAddress == msg.sender, "Unauthorized access");
        
        // Update the IPFS hash
        users[msg.sender][_username].ipfsHash = _newIpfsHash;
        
        // Emit update event
        emit UserUpdated(_username, _newIpfsHash, msg.sender);
    }

    // Get address for a username
    function getAddressByUsername(string memory _username) public view returns (address) {
        require(usernameExists[_username], "Username does not exist");
        return usernameToAddress[_username];
    }

    // Get all registered usernames
    function getAllUsernames() public view returns (string[] memory) {
        return allUsernames;
    }

    // Get all usernames for an address
    function getUsernames(address _userAddress) public view returns (string[] memory) {
        return usernames[_userAddress];
    }

    // Check if a username exists
    function isUsernameAvailable(string memory _username) public view returns (bool) {
        return !usernameExists[_username];
    }

    // Reset user registration (FOR DEVELOPMENT/TESTING PURPOSE ONLY)
    function resetUser(string memory _username) public {
        // Ensure the user is already registered
        require(users[msg.sender][_username].isRegistered, "User not registered");
        require(users[msg.sender][_username].userAddress == msg.sender, "Unauthorized access");

        // Remove username from global tracking
        usernameExists[_username] = false;

        // Remove user data
        delete users[msg.sender][_username];

        // Remove username from user's list
        for(uint i = 0; i < usernames[msg.sender].length; i++) {
            if(keccak256(bytes(usernames[msg.sender][i])) == keccak256(bytes(_username))) {
                // Replace with last element and pop
                usernames[msg.sender][i] = usernames[msg.sender][usernames[msg.sender].length - 1];
                usernames[msg.sender].pop();
                break;
            }
        }

        // Emit reset event
        emit UserReset(_username, msg.sender);
    }
}
