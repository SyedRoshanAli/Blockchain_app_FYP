import { getFromIPFS, uploadToIPFS } from '../ipfs';
import { UserAuthContract } from '../UserAuth';

class NotificationService {
  constructor() {
    this.notificationsKey = 'userNotifications';
    this.notificationTypes = {
      LIKE: 'like',
      COMMENT: 'comment',
      FOLLOW: 'follow',
      FOLLOW_REQUEST: 'follow_request',
      MENTION: 'mention',
      MESSAGE: 'message',
      SYSTEM: 'system'
    };
  }

  // Get all notifications for a user
  async getNotifications(userAddress) {
    try {
      // Always fetch the latest notification hash from the user's profile on IPFS
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const username = userSession.username;
      if (!username) throw new Error('No username found in session');

      // First check if the user is registered on the blockchain
      try {
        // Check if username is available (if available, it means not registered)
        const isAvailable = await UserAuthContract.methods
          .isUsernameAvailable(username)
          .call();
          
        if (isAvailable) {
          // User is not registered on blockchain, use localStorage only
          const storedNotifications = localStorage.getItem(`${this.notificationsKey}_${userAddress}`);
          if (storedNotifications) {
            return JSON.parse(storedNotifications);
          }
          return [];
        }
        
        // User is registered, proceed with blockchain/IPFS approach
        const profileHash = await UserAuthContract.methods.login(username).call({ from: userAddress });
        if (!profileHash) throw new Error('No profile hash found for user');

        // Fetch the profile from IPFS
        const profileBuffer = await getFromIPFS(profileHash);
        const profile = JSON.parse(profileBuffer.toString());

        // Get the notification hash from the profile
        const notificationHash = profile.notificationHash;
        if (notificationHash) {
          const notificationsBuffer = await getFromIPFS(notificationHash);
          const notifications = JSON.parse(notificationsBuffer.toString());
          // Store in localStorage for faster access
          localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(notifications));
          localStorage.setItem(`${this.notificationsKey}_hash_${userAddress}`, notificationHash);
          return notifications;
        }
      } catch (error) {
        console.warn("Error accessing blockchain, falling back to localStorage:", error.message);
      }

      // Fallback: Try to get from localStorage if blockchain/IPFS approach fails
      const storedNotifications = localStorage.getItem(`${this.notificationsKey}_${userAddress}`);
      if (storedNotifications) {
        return JSON.parse(storedNotifications);
      }
      return [];
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  // Helper to update the user's profile with the latest notification hash
  async updateProfileNotificationHash(userAddress, notifications) {
    try {
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const username = userSession.username;
      
      if (!username) {
        console.warn("No username found in session, can't update profile notification hash");
        return false;
      }
      
      // First check if the user is registered on the blockchain
      try {
        const isAvailable = await UserAuthContract.methods
          .isUsernameAvailable(username)
          .call();
          
        if (isAvailable) {
          // User is not registered on blockchain, just use localStorage
          console.log("User not registered on blockchain, using localStorage only for notifications");
          return true;
        }
        
        // User is registered, proceed with blockchain/IPFS approach
        const profileHash = await UserAuthContract.methods.login(username).call({ from: userAddress });
        if (!profileHash) {
          console.warn("No profile hash found for user");
          return false;
        }
        
        try {
          // Fetch the profile from IPFS
          const profileBuffer = await getFromIPFS(profileHash);
          const profile = JSON.parse(profileBuffer.toString());
          
          // Upload notifications to IPFS
          const notificationsStr = JSON.stringify(notifications);
          const notificationHash = await uploadToIPFS(notificationsStr);
          
          // Update profile with new notification hash
          profile.notificationHash = notificationHash;
          
          // Upload updated profile to IPFS
          const updatedProfileHash = await uploadToIPFS(JSON.stringify(profile));
          
          // Update profile hash on blockchain
          await UserAuthContract.methods
            .updateProfile(updatedProfileHash)
            .send({ from: userAddress });
            
          return true;
        } catch (error) {
          console.error("Failed to update notifications in IPFS:", error);
          // Still return true since we saved to localStorage
          return true;
        }
      } catch (error) {
        console.error("Error checking if user is registered:", error);
        return false;
      }
    } catch (error) {
      console.error("Error updating profile notification hash:", error);
      return false;
    }
  }

  // Add a notification for a user
  async addNotification(userAddress, notification) {
    try {
      // Add timestamp if not provided
      if (!notification.timestamp) {
        notification.timestamp = new Date().toISOString();
      }
      
      // Add read status if not provided
      if (notification.read === undefined) {
        notification.read = false;
      }
      
      // Get existing notifications
      const notifications = await this.getNotifications(userAddress);
      
      // Add new notification
      notifications.unshift(notification);
      
      // Save to localStorage (this will always happen as a backup)
      localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(notifications));
      
      // Try to update on blockchain/IPFS if possible
      try {
        await this.updateProfileNotificationHash(userAddress, notifications);
      } catch (error) {
        console.error("Failed to update notification hash on blockchain, but saved to localStorage:", error);
      }
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new Event('notifications-updated'));
      
      return true;
    } catch (error) {
      console.error("Error adding notification:", error);
      return false;
    }
  }

  // Mark notification as read
  async markAsRead(userAddress, notificationId) {
    try {
      const notifications = await this.getNotifications(userAddress);
      
      const updatedNotifications = notifications.map(notification => {
        if (notification.id === notificationId) {
          return { ...notification, read: true };
        }
        return notification;
      });
      
      localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(updatedNotifications));
      
      // Update IPFS
      try {
        const ipfsHash = await uploadToIPFS(JSON.stringify(updatedNotifications));
        localStorage.setItem(`${this.notificationsKey}_hash_${userAddress}`, ipfsHash);
      } catch (error) {
        console.error("Failed to update notifications in IPFS:", error);
      }
      
      return updatedNotifications;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return null;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userAddress) {
    try {
      const notifications = await this.getNotifications(userAddress);
      
      // If no notifications, return empty array
      if (!notifications || notifications.length === 0) {
        return [];
      }
      
      const updatedNotifications = notifications.map(notification => {
        return { ...notification, read: true };
      });
      
      // Save to localStorage first (this will always work)
      localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(updatedNotifications));
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new Event('notifications-updated'));
      
      // No need to update IPFS in development environment
      // The updateProfileNotificationHash will handle this properly
      try {
        await this.updateProfileNotificationHash(userAddress, updatedNotifications);
      } catch (error) {
        console.error("Failed to update notifications in IPFS:", error);
        // Continue since we already saved to localStorage
      }
      
      return updatedNotifications;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return [];
    }
  }

  // Get unread notification count
  async getUnreadCount(userAddress) {
    try {
      const notifications = await this.getNotifications(userAddress);
      return notifications.filter(notification => !notification.read).length;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Create a like notification
  async createLikeNotification(targetUserAddress, sourceUser, postId, postPreview) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.LIKE,
      sourceUser: sourceUser, // username or address of the person who liked
      postId: postId,
      postPreview: postPreview,
      message: `${sourceUser} liked your post`
    });
  }

  // Create a comment notification
  async createCommentNotification(targetUserAddress, sourceUser, postId, commentText, postPreview) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.COMMENT,
      sourceUser: sourceUser,
      postId: postId,
      commentText: commentText.substring(0, 50) + (commentText.length > 50 ? '...' : ''),
      postPreview: postPreview,
      message: `${sourceUser} commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`
    });
  }

  // Create a follow notification
  async createFollowNotification(targetUserAddress, sourceUser) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.FOLLOW,
      sourceUser: sourceUser,
      message: `${sourceUser} started following you`
    });
  }

  // Create a follow request notification
  async createFollowRequestNotification(targetUserAddress, sourceUser) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.FOLLOW_REQUEST,
      sourceUser: sourceUser,
      message: `${sourceUser} requested to follow you`
    });
  }

  // Create a mention notification
  async createMentionNotification(targetUserAddress, sourceUser, postId, mentionText, postPreview) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.MENTION,
      sourceUser: sourceUser,
      postId: postId,
      mentionText: mentionText,
      postPreview: postPreview,
      message: `${sourceUser} mentioned you in a post`
    });
  }

  // Create a message notification
  async createMessageNotification(targetUserAddress, sourceUser, messagePreview) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.MESSAGE,
      sourceUser: sourceUser,
      messagePreview: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      message: `${sourceUser} sent you a message: "${messagePreview.substring(0, 30)}${messagePreview.length > 30 ? '...' : ''}"`
    });
  }

  // Create a system notification
  async createSystemNotification(targetUserAddress, title, message) {
    return this.addNotification(targetUserAddress, {
      type: this.notificationTypes.SYSTEM,
      title: title,
      message: message
    });
  }
}

export const notificationService = new NotificationService(); 