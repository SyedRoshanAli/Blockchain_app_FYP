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

    // New Message structure
    struct Message {
        uint256 id;
        address sender;
        address recipient;
        string content;
        uint256 timestamp;
        bool isRead;
    }

    // Modified mappings
    mapping(string => address) private usernameToAddress;  // Map username to address
    mapping(address => string[]) private usernames;        // Map address to usernames
    mapping(string => bool) private usernameExists;        // Track if username exists
    string[] private allUsernames;                         // Array to track all usernames

    // State variables
    mapping(address => mapping(string => User)) private users;    // Map address and username to user data

    // New mappings for messages
    mapping(address => Message[]) private userMessages;
    mapping(address => uint256) private unreadMessageCount;
    uint256 private messageIdCounter;

    // New mapping for IPFS hashes
    mapping(address => string[]) private userIpfsHashes;

    // Data ownership enhancement - selective data export tracking
    mapping(address => mapping(string => bool)) public dataExportPermissions;
    
    // Data ownership enhancement - recovery keys
    mapping(address => address) public recoveryAddresses;
    mapping(address => bool) public hasSetRecoveryAddress;
    
    // Data ownership enhancement - data deletion log
    struct DataDeletionRecord {
        string username;
        uint256 timestamp;
        bool canRecover;
    }
    mapping(address => DataDeletionRecord[]) public userDeletionHistory;
    
    // Data ownership enhancement - selective content deletion tracking
    mapping(address => mapping(string => string[])) public deletedContentHashes;

    // Events
    event UserRegistered(string username, string ipfsHash, address userAddress);
    event UserUpdated(string username, string newIpfsHash, address userAddress);
    event UserReset(string username, address userAddress);

    // New events for messages
    event MessageSent(
        uint256 indexed messageId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    event MessageRead(uint256 indexed messageId, address indexed by);

    // Add recovery address for account recovery
    function setRecoveryAddress(address _recoveryAddress) public {
        require(_recoveryAddress != address(0), "Invalid recovery address");
        require(_recoveryAddress != msg.sender, "Recovery address cannot be your own address");
        
        recoveryAddresses[msg.sender] = _recoveryAddress;
        hasSetRecoveryAddress[msg.sender] = true;
        
        emit RecoveryAddressSet(msg.sender, _recoveryAddress);
    }
    
    // Update recovery address
    function updateRecoveryAddress(address _newRecoveryAddress) public {
        require(hasSetRecoveryAddress[msg.sender], "No recovery address previously set");
        require(_newRecoveryAddress != address(0), "Invalid recovery address");
        require(_newRecoveryAddress != msg.sender, "Recovery address cannot be your own address");
        
        recoveryAddresses[msg.sender] = _newRecoveryAddress;
        
        emit RecoveryAddressUpdated(msg.sender, _newRecoveryAddress);
    }
    
    // Remove recovery address
    function removeRecoveryAddress() public {
        require(hasSetRecoveryAddress[msg.sender], "No recovery address set");
        
        delete recoveryAddresses[msg.sender];
        hasSetRecoveryAddress[msg.sender] = false;
        
        emit RecoveryAddressRemoved(msg.sender);
    }
    
    // Enhanced account deletion with recovery option
    function enhancedResetUser(string memory _username, bool _allowRecovery) public {
        // Ensure the user is already registered
        require(users[msg.sender][_username].isRegistered, "User not registered");
        require(users[msg.sender][_username].userAddress == msg.sender, "Unauthorized access");

        // Store deletion record before deleting
        DataDeletionRecord memory record = DataDeletionRecord({
            username: _username,
            timestamp: block.timestamp,
            canRecover: _allowRecovery
        });
        
        userDeletionHistory[msg.sender].push(record);

        if (!_allowRecovery) {
            // Permanent deletion - same as original resetUser
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
        }
        
        // Emit enhanced reset event
        emit EnhancedUserReset(_username, msg.sender, _allowRecovery);
    }
    
    // Recover deleted account (if recovery was allowed)
    function recoverDeletedAccount(string memory _username) public {
        bool canRecover = false;
        
        // Check deletion history to see if recovery is possible
        for (uint i = 0; i < userDeletionHistory[msg.sender].length; i++) {
            if (keccak256(bytes(userDeletionHistory[msg.sender][i].username)) == keccak256(bytes(_username)) &&
                userDeletionHistory[msg.sender][i].canRecover) {
                canRecover = true;
                break;
            }
        }
        
        require(canRecover, "Account recovery not available for this user");
        
        // Event for account recovery request
        emit AccountRecoveryRequested(msg.sender, _username);
    }
    
    // Allow recovery by recovery address
    function recoverAccountByTrustedParty(address _userToRecover, string memory _username) public {
        require(recoveryAddresses[_userToRecover] == msg.sender, "Not authorized as recovery address");
        
        bool canRecover = false;
        
        // Check deletion history
        for (uint i = 0; i < userDeletionHistory[_userToRecover].length; i++) {
            if (keccak256(bytes(userDeletionHistory[_userToRecover][i].username)) == keccak256(bytes(_username)) &&
                userDeletionHistory[_userToRecover][i].canRecover) {
                canRecover = true;
                break;
            }
        }
        
        require(canRecover, "Account recovery not available for this user");
        
        // Event for recovery by trusted party
        emit AccountRecoveredByTrustedParty(_userToRecover, msg.sender, _username);
    }
    
    // Set data export permission for specific data type
    function setDataExportPermission(string memory _dataType, bool _allowed) public {
        dataExportPermissions[msg.sender][_dataType] = _allowed;
        emit DataExportPermissionUpdated(msg.sender, _dataType, _allowed);
    }
    
    // Check if data export is allowed for a specific type
    function isExportAllowed(address _user, string memory _dataType) public view returns (bool) {
        return dataExportPermissions[_user][_dataType];
    }
    
    // Track deletion of specific content (like a post)
    function trackContentDeletion(string memory _contentType, string memory _contentHash) public {
        deletedContentHashes[msg.sender][_contentType].push(_contentHash);
        emit ContentDeleted(msg.sender, _contentType, _contentHash);
    }
    
    // Get deleted content hashes by type
    function getDeletedContentByType(string memory _contentType) public view returns (string[] memory) {
        return deletedContentHashes[msg.sender][_contentType];
    }
    
    // Event declarations for data ownership features
    event RecoveryAddressSet(address indexed user, address indexed recoveryAddress);
    event RecoveryAddressUpdated(address indexed user, address indexed newRecoveryAddress);
    event RecoveryAddressRemoved(address indexed user);
    event EnhancedUserReset(string username, address indexed userAddress, bool recoverable);
    event AccountRecoveryRequested(address indexed user, string username);
    event AccountRecoveredByTrustedParty(address indexed user, address indexed recoveryAddress, string username);
    event DataExportPermissionUpdated(address indexed user, string dataType, bool allowed);
    event ContentDeleted(address indexed user, string contentType, string contentHash);

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

        // Store the IPFS hash
        userIpfsHashes[msg.sender].push(_ipfsHash);

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

    // New function to send a message
    function sendMessage(address _to, string memory _content) public {
        require(_to != address(0), "Invalid recipient address");
        require(bytes(_content).length > 0, "Message cannot be empty");
        require(_to != msg.sender, "Cannot send message to yourself");

        messageIdCounter++;
        
        Message memory newMessage = Message({
            id: messageIdCounter,
            sender: msg.sender,
            recipient: _to,
            content: _content,
            timestamp: block.timestamp,
            isRead: false
        });

        userMessages[_to].push(newMessage);
        unreadMessageCount[_to]++;

        emit MessageSent(messageIdCounter, msg.sender, _to, block.timestamp);
    }

    // Get unread message count
    function getUnreadMessageCount() public view returns (uint256) {
        return unreadMessageCount[msg.sender];
    }

    // Get all messages for the caller
    function getMyMessages() public view returns (Message[] memory) {
        return userMessages[msg.sender];
    }

    // Mark a message as read
    function markMessageAsRead(uint256 _messageId) public {
        Message[] storage messages = userMessages[msg.sender];
        
        for (uint i = 0; i < messages.length; i++) {
            if (messages[i].id == _messageId && !messages[i].isRead) {
                messages[i].isRead = true;
                if (unreadMessageCount[msg.sender] > 0) {
                    unreadMessageCount[msg.sender]--;
                }
                emit MessageRead(_messageId, msg.sender);
                break;
            }
        }
    }

    // Get messages between current user and another user
    function getMessagesWith(address _otherUser) public view returns (Message[] memory) {
        Message[] memory allMessages = userMessages[msg.sender];
        uint256 relevantCount = 0;

        // Count relevant messages
        for (uint i = 0; i < allMessages.length; i++) {
            if (allMessages[i].sender == _otherUser || allMessages[i].recipient == _otherUser) {
                relevantCount++;
            }
        }

        // Create array of relevant messages
        Message[] memory relevantMessages = new Message[](relevantCount);
        uint256 currentIndex = 0;

        for (uint i = 0; i < allMessages.length; i++) {
            if (allMessages[i].sender == _otherUser || allMessages[i].recipient == _otherUser) {
                relevantMessages[currentIndex] = allMessages[i];
                currentIndex++;
            }
        }

        return relevantMessages;
    }

    // Add this function to get user's IPFS hashes
    function getUserHashes(address _userAddress) public view returns (string[] memory) {
        return userIpfsHashes[_userAddress];
    }

    // Add this function to get all users' IPFS hashes
    function getAllUserHashes() public view returns (string[] memory) {
        uint256 totalHashes = 0;
        
        // Count total hashes
        for(uint i = 0; i < allUsernames.length; i++) {
            address userAddr = usernameToAddress[allUsernames[i]];
            totalHashes += userIpfsHashes[userAddr].length;
        }
        
        // Create array for all hashes
        string[] memory allHashes = new string[](totalHashes);
        uint256 currentIndex = 0;
        
        // Collect all hashes
        for(uint i = 0; i < allUsernames.length; i++) {
            address userAddr = usernameToAddress[allUsernames[i]];
            string[] memory userHashes = userIpfsHashes[userAddr];
            
            for(uint j = 0; j < userHashes.length; j++) {
                allHashes[currentIndex] = userHashes[j];
                currentIndex++;
            }
        }
        
        return allHashes;
    }
}
