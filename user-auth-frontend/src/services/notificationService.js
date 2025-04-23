import { getFromIPFS, uploadToIPFS } from '../ipfs';

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
      const storedNotifications = localStorage.getItem(`${this.notificationsKey}_${userAddress}`);
      if (storedNotifications) {
        return JSON.parse(storedNotifications);
      }

      // Try to get from IPFS if not in localStorage
      try {
        const ipfsHash = localStorage.getItem(`${this.notificationsKey}_hash_${userAddress}`);
        if (ipfsHash) {
          const notificationsBuffer = await getFromIPFS(ipfsHash);
          const notifications = JSON.parse(notificationsBuffer.toString());
          
          // Store in localStorage for faster access
          localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(notifications));
          return notifications;
        }
      } catch (error) {
        console.error("Failed to fetch notifications from IPFS:", error);
      }
      
      return [];
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  // Add a new notification
  async addNotification(userAddress, notification) {
    try {
      // Ensure notification has required fields
      const fullNotification = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
        ...notification
      };

      // Get existing notifications
      const notifications = await this.getNotifications(userAddress);
      
      // Add new notification at the beginning
      notifications.unshift(fullNotification);
      
      // Save to localStorage
      localStorage.setItem(`${this.notificationsKey}_${userAddress}`, JSON.stringify(notifications));
      
      // Save to IPFS for persistence
      try {
        const ipfsHash = await uploadToIPFS(JSON.stringify(notifications));
        localStorage.setItem(`${this.notificationsKey}_hash_${userAddress}`, ipfsHash);
      } catch (error) {
        console.error("Failed to save notifications to IPFS:", error);
      }
      
      return fullNotification;
    } catch (error) {
      console.error("Error adding notification:", error);
      return null;
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
      
      const updatedNotifications = notifications.map(notification => {
        return { ...notification, read: true };
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
      console.error("Error marking all notifications as read:", error);
      return null;
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