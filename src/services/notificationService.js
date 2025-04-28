import { ethers } from 'ethers';

class NotificationService {
  constructor() {
    this.listeners = [];
    console.log("NotificationService initialized");
    this.initStorage();
  }

  initStorage() {
    // Initialize notifications in localStorage if not already present
    if (!localStorage.getItem('notifications')) {
      localStorage.setItem('notifications', JSON.stringify({}));
    }
  }

  // Get current user's address - crucial method
  async getCurrentUserAddress() {
    try {
      // Try to get from MetaMask first
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts"
        });
        if (accounts && accounts.length > 0) {
          return accounts[0].toLowerCase();
        }
      }
      
      // Fallback to localStorage if MetaMask isn't available
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.walletAddress) {
        return userData.walletAddress.toLowerCase();
      }
      
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      if (userSession.address) {
        return userSession.address.toLowerCase();
      }
      
      console.warn("Could not find user address in any storage location");
      return null;
    } catch (error) {
      console.error("Error getting current user address:", error);
      return null;
    }
  }
  
  // Get notifications for specific user - method missing from your code
  async getNotificationsForUser(address) {
    if (!address) {
      console.error("No address provided to getNotificationsForUser");
      return [];
    }
    
    const normalizedAddress = address.toLowerCase();
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    return allNotifications[normalizedAddress] || [];
  }
  
  // Get unread count for specific user - method missing from your code
  async getUnreadCountForUser(address) {
    if (!address) {
      console.error("No address provided to getUnreadCountForUser");
      return 0;
    }
    
    const normalizedAddress = address.toLowerCase();
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    const userNotifications = allNotifications[normalizedAddress] || [];
    
    return userNotifications.filter(n => !n.read).length;
  }
  
  // Create a notification
  async createNotification(recipientAddress, type, data) {
    try {
      console.log("Creating notification for:", recipientAddress, "of type:", type);
      
      if (!recipientAddress) {
        console.error("No recipient address provided");
        return false;
      }
      
      // Get sender information
      const currentAddress = await this.getCurrentUserAddress();
      if (!currentAddress) {
        console.error("Could not determine sender address");
        return false;
      }
      
      // Get current user's name
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const senderName = userSession.username || userData.username || currentAddress.substring(0, 6) + '...';
      
      // Normalize recipient address
      const normalizedRecipient = recipientAddress.toLowerCase();
      
      // Don't notify yourself
      if (normalizedRecipient === currentAddress) {
        console.log("Ignoring self-notification");
        return false;
      }
      
      // Create notification object
      const notification = {
        id: Date.now().toString(),
        type,
        read: false,
        timestamp: new Date().toISOString(),
        senderAddress: currentAddress,
        senderName,
        ...data
      };
      
      // Format user-friendly message
      if (type === 'like') {
        notification.message = `${senderName} liked your post: "${data.contentPreview}"`;
      } else if (type === 'comment') {
        notification.message = `${senderName} commented on your post: "${data.commentPreview}"`;
      } else if (type === 'follow') {
        notification.message = `${senderName} started following you`;
      } else if (type === 'test') {
        notification.message = `Test notification created at ${new Date().toLocaleTimeString()}`;
      } else {
        notification.message = data.message || `New ${type} notification from ${senderName}`;
      }
      
      console.log("Creating notification with message:", notification.message);
      
      // Get current notifications from localStorage
      const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      
      // Initialize for this recipient if needed
      if (!notifications[normalizedRecipient]) {
        notifications[normalizedRecipient] = [];
      }
      
      // Add to beginning of the array
      notifications[normalizedRecipient].unshift(notification);
      
      // Now also store by username to ensure compatibility
      try {
        // Find recipient's username
        let recipientUsername = '';
        
        // Try to get username from blockchain
        const usernames = await window.ethereum.send('eth_call', [{
          to: window.contractAddresses.UserAuth,
          data: window.web3.eth.abi.encodeFunctionCall({
            name: 'getUsernames',
            type: 'function',
            inputs: [{
              type: 'address',
              name: 'user'
            }]
          }, [normalizedRecipient])
        }, 'latest']);
        
        if (usernames && usernames.result) {
          const decoded = window.web3.eth.abi.decodeParameter('string[]', usernames.result);
          if (decoded && decoded.length > 0) {
            recipientUsername = decoded[0];
          }
        }
        
        // If we couldn't get from blockchain, try localStorage
        if (!recipientUsername) {
          const cachedUsernames = localStorage.getItem(`usernames_${normalizedRecipient}`);
          if (cachedUsernames) {
            const parsed = JSON.parse(cachedUsernames);
            if (parsed && parsed.length > 0) {
              recipientUsername = parsed[0];
            }
          }
        }
        
        // If we found a username, store notification by username too
        if (recipientUsername) {
          if (!notifications[recipientUsername]) {
            notifications[recipientUsername] = [];
          }
          notifications[recipientUsername].unshift({...notification});
          console.log(`Also storing notification for username: ${recipientUsername}`);
        }
      } catch (error) {
        console.error("Error getting username for notification recipient:", error);
        // Continue anyway since we already stored by address
      }
      
      // Save back to localStorage
      localStorage.setItem('notifications', JSON.stringify(notifications));
      
      console.log(`Notification created successfully for ${normalizedRecipient}`);
      
      // Notify all listeners
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error("Error creating notification:", error);
      return false;
    }
  }
  
  // Create a like notification
  async createLikeNotification(recipientAddress, senderName, postId, contentPreview) {
    return this.createNotification(recipientAddress, 'like', {
      postId,
      contentPreview
    });
  }
  
  // Create a comment notification
  async createCommentNotification(recipientAddress, senderName, postId, contentPreview, commentPreview) {
    return this.createNotification(recipientAddress, 'comment', {
      postId,
      contentPreview,
      commentPreview
    });
  }
  
  // Create a follow notification
  async createFollowNotification(recipientAddress, senderName) {
    return this.createNotification(recipientAddress, 'follow', {});
  }
  
  // Create a test notification for current user
  async createTestNotification() {
    try {
      const currentAddress = await this.getCurrentUserAddress();
      if (!currentAddress) {
        console.error("Could not determine current user address");
        return false;
      }
      
      // Create a test notification
      const notification = {
        id: Date.now().toString(),
        type: 'test',
        read: false,
        timestamp: new Date().toISOString(),
        senderAddress: currentAddress,
        senderName: "Test System",
        message: `This is a test notification created at ${new Date().toLocaleTimeString()}`
      };
      
      // Get current notifications
      const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      
      // Initialize if needed
      if (!notifications[currentAddress]) {
        notifications[currentAddress] = [];
      }
      
      // Add to beginning of the array
      notifications[currentAddress].unshift(notification);
      
      // Save back to localStorage
      localStorage.setItem('notifications', JSON.stringify(notifications));
      
      console.log("Test notification created");
      console.log(notifications);
      
      // Notify all listeners
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error("Error creating test notification:", error);
      return false;
    }
  }
  
  // Get all notifications for the current user
  async getNotifications() {
    try {
      // Get user info from multiple sources
    const address = await this.getCurrentUserAddress();
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const username = userSession.username || userData.username;
      
      if (!address && !username) {
        console.error("Could not determine user identity");
        return [];
      }
      
      const normalizedAddress = address ? address.toLowerCase() : '';
      const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      
      let userNotifications = [];
      
      // Check for notifications by address
      if (normalizedAddress) {
        userNotifications = [...userNotifications, ...(allNotifications[normalizedAddress] || [])];
        console.log(`Found ${userNotifications.length} notifications by address`);
      }
      
      // Check for notifications by username
      if (username && username !== normalizedAddress) {
        userNotifications = [...userNotifications, ...(allNotifications[username] || [])];
        console.log(`Found ${(allNotifications[username] || []).length} additional notifications by username`);
      }
      
      // Remove duplicates (in case we have same notification in both collections)
      const uniqueNotifications = Array.from(
        new Map(userNotifications.map(item => [item.id, item])).values()
      );
      
      // Sort by timestamp, newest first
      uniqueNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return uniqueNotifications;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }
  
  // Get unread notification count for current user
  async getUnreadCount() {
    try {
      const notifications = await this.getNotifications();
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }
  
  // Mark all notifications as read for a user
  async markAsRead(address) {
    try {
      if (!address) {
        console.error("No address provided to markAsRead");
        return false;
      }
      
      const normalizedAddress = address.toLowerCase();
      const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      const userNotifications = allNotifications[normalizedAddress] || [];
      
      if (userNotifications.length === 0) {
        return true; // Nothing to mark as read
      }
      
      // Mark all as read
      const updatedNotifications = userNotifications.map(n => ({...n, read: true}));
      allNotifications[normalizedAddress] = updatedNotifications;
      
      // Save back to localStorage
      localStorage.setItem('notifications', JSON.stringify(allNotifications));
      
      // Notify listeners
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      return false;
    }
  }
  
  // Mark all notifications as read for the current user
  async markAllAsRead() {
    try {
      // Get user info from multiple sources
      const address = await this.getCurrentUserAddress();
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const username = userSession.username || userData.username;
      
      if (!address && !username) {
        console.error("Could not determine user identity");
        return false;
      }
      
      const normalizedAddress = address ? address.toLowerCase() : '';
      const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      let updated = false;
      
      // Mark all as read by address
      if (normalizedAddress && allNotifications[normalizedAddress]) {
        allNotifications[normalizedAddress] = allNotifications[normalizedAddress].map(n => ({
          ...n,
          read: true
        }));
        updated = true;
      }
      
      // Mark all as read by username
      if (username && allNotifications[username]) {
        allNotifications[username] = allNotifications[username].map(n => ({
          ...n,
          read: true
        }));
        updated = true;
      }
      
      if (updated) {
        localStorage.setItem('notifications', JSON.stringify(allNotifications));
        this.notifyListeners();
      }
      
      return updated;
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      return false;
    }
  }
  
  // Add a listener for notification updates
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      return true;
    }
    return false;
  }
  
  // Remove a listener
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // Notify all listeners
  notifyListeners() {
    // Dispatch browser event
    window.dispatchEvent(new Event('notification-update'));
    
    // Call registered listeners
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in notification listener:", error);
      }
    });
  }

  // Debug function to print all notifications
  debugNotificationsForUser() {
    this.getCurrentUserAddress().then(address => {
      if (!address) {
        console.log("No user address found for debug");
        return;
      }
      
      const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      console.log("All notifications:", allNotifications);
      console.log(`Notifications for ${address}:`, allNotifications[address] || []);
      
      // Debug: Add a test notification if none exist
      if (!allNotifications[address] || allNotifications[address].length === 0) {
        console.log("No notifications found, creating a test one");
        this.createTestNotification();
      }
    });
  }

  // Clear all notifications for a user
  async clearNotifications(address) {
    try {
      const normalizedAddress = address.toLowerCase();
      const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      
      if (notifications[normalizedAddress]) {
        delete notifications[normalizedAddress];
        localStorage.setItem('notifications', JSON.stringify(notifications));
        this.notifyListeners();
      }
      
      return true;
    } catch (error) {
      console.error("Error clearing notifications:", error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const notificationService = new NotificationService();

// Also make it available on the window for debugging
if (typeof window !== 'undefined') {
  window.notificationService = notificationService;
} 