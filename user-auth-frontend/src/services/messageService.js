import { create } from 'ipfs-http-client';
import { v4 as uuidv4 } from 'uuid';
import { UserAuthContract } from '../UserAuth';

class MessageService {
  constructor() {
    this.ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
    this.messagesKey = 'blockchain_messages';
    this.conversationsKey = 'blockchain_conversations';
    this.messageListeners = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Setup event listener for new messages
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith(this.messagesKey)) {
        const parts = event.key.split('_');
        if (parts.length >= 3) {
          const conversationId = parts[2];
          this.notifyMessageListeners(conversationId);
        }
      }
    });
  }

  addMessageListener(conversationId, callback) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, []);
    }
    this.messageListeners.get(conversationId).push(callback);
    return () => this.removeMessageListener(conversationId, callback);
  }

  removeMessageListener(conversationId, callback) {
    if (this.messageListeners.has(conversationId)) {
      const listeners = this.messageListeners.get(conversationId);
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  notifyMessageListeners(conversationId) {
    if (this.messageListeners.has(conversationId)) {
      const listeners = this.messageListeners.get(conversationId);
      listeners.forEach(callback => {
        this.getMessages(conversationId).then(messages => {
          callback(messages);
        });
      });
    }
  }

  async sendMessage(recipientAddress, content, media = null) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const senderAddress = accounts[0].toLowerCase();
      
      // Get sender username
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      const senderUsername = userSession.username;
      
      if (!senderUsername) {
        throw new Error('Sender username not found');
      }
      
      // Create message object
      const message = {
        id: uuidv4(),
        sender: senderAddress,
        senderUsername,
        recipient: recipientAddress.toLowerCase(),
        content,
        media,
        timestamp: new Date().toISOString(),
        read: false,
        delivered: false
      };
      
      // Save message locally
      await this.saveMessageLocally(senderAddress, recipientAddress, message);
      
      // Check if recipient is registered on blockchain
      const recipientUsername = await this.getUsernameFromAddress(recipientAddress);
      
      if (recipientUsername) {
        // Save message to blockchain
        await this.saveMessageToBlockchain(recipientAddress, message);
        
        // Update message as delivered
        message.delivered = true;
        await this.updateMessage(senderAddress, recipientAddress, message.id, { delivered: true });
        
        // Create notification for recipient
        await this.createMessageNotification(recipientAddress, senderUsername, content);
      }
      
      // Update conversation list for sender
      await this.updateConversationList(senderAddress, recipientAddress, recipientUsername || 'Unknown User', content);
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  async saveMessageLocally(senderAddress, recipientAddress, message) {
    try {
      const conversationId = this.getConversationId(senderAddress, recipientAddress);
      const storageKey = `${this.messagesKey}_${conversationId}`;
      
      // Get existing messages
      const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add new message
      existingMessages.push(message);
      
      // Save updated messages
      localStorage.setItem(storageKey, JSON.stringify(existingMessages));
      
      // Notify listeners
      this.notifyMessageListeners(conversationId);
      
      return true;
    } catch (error) {
      console.error('Error saving message locally:', error);
      return false;
    }
  }
  
  async saveMessageToBlockchain(recipientAddress, message) {
    try {
      // Convert message to JSON string
      const messageJson = JSON.stringify(message);
      
      // Upload to IPFS
      const { path } = await this.ipfs.add(messageJson);
      
      // Get recipient's profile from blockchain
      const recipientProfile = await this.getRecipientProfile(recipientAddress);
      
      if (!recipientProfile || !recipientProfile.messagesHash) {
        // If recipient doesn't have a messages hash, create one
        return await this.createInitialMessagesHash(recipientAddress, message);
      }
      
      // Get existing messages from IPFS
      const existingMessages = await this.getMessagesFromIpfs(recipientProfile.messagesHash);
      
      // Add new message
      existingMessages.push(message);
      
      // Upload updated messages to IPFS
      const updatedMessagesBuffer = Buffer.from(JSON.stringify(existingMessages));
      const result = await this.ipfs.add(updatedMessagesBuffer);
      
      // Update recipient's profile with new messages hash
      await UserAuthContract.methods.updateMessagesHash(recipientAddress, result.path).send({
        from: message.sender,
        gas: 500000
      });
      
      return true;
    } catch (error) {
      console.error('Error saving message to blockchain:', error);
      return false;
    }
  }
  
  async createInitialMessagesHash(recipientAddress, message) {
    try {
      // Create initial messages array with the new message
      const initialMessages = [message];
      
      // Upload to IPFS
      const messagesBuffer = Buffer.from(JSON.stringify(initialMessages));
      const result = await this.ipfs.add(messagesBuffer);
      
      // Update recipient's profile with new messages hash
      await UserAuthContract.methods.updateMessagesHash(recipientAddress, result.path).send({
        from: message.sender,
        gas: 500000
      });
      
      return true;
    } catch (error) {
      console.error('Error creating initial messages hash:', error);
      return false;
    }
  }
  
  async getMessages(conversationId) {
    try {
      const storageKey = `${this.messagesKey}_${conversationId}`;
      const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Sort messages by timestamp
      return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
  
  async getConversations() {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      const storageKey = `${this.conversationsKey}_${userAddress}`;
      const conversations = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Sort conversations by last message time (newest first)
      return conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }
  
  async updateConversationList(userAddress, otherAddress, otherUsername, lastMessage) {
    try {
      const storageKey = `${this.conversationsKey}_${userAddress.toLowerCase()}`;
      
      // Get existing conversations
      const conversations = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Check if conversation already exists
      const existingIndex = conversations.findIndex(c => c.address.toLowerCase() === otherAddress.toLowerCase());
      
      if (existingIndex !== -1) {
        // Update existing conversation
        conversations[existingIndex].lastMessage = lastMessage;
        conversations[existingIndex].lastMessageTime = new Date().toISOString();
      } else {
        // Add new conversation
        conversations.push({
          address: otherAddress.toLowerCase(),
          username: otherUsername,
          lastMessage,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0
        });
      }
      
      // Save updated conversations
      localStorage.setItem(storageKey, JSON.stringify(conversations));
      
      return true;
    } catch (error) {
      console.error('Error updating conversation list:', error);
      return false;
    }
  }
  
  async markMessagesAsRead(conversationId) {
    try {
      const storageKey = `${this.messagesKey}_${conversationId}`;
      const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Get current user address
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      // Mark messages as read if they are from the other user
      let updated = false;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].sender !== userAddress && !messages[i].read) {
          messages[i].read = true;
          updated = true;
        }
      }
      
      if (updated) {
        // Save updated messages
        localStorage.setItem(storageKey, JSON.stringify(messages));
        
        // Reset unread count for this conversation
        await this.resetUnreadCount(conversationId);
        
        // Notify listeners
        this.notifyMessageListeners(conversationId);
      }
      
      return updated;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }
  
  async resetUnreadCount(conversationId) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      // Extract other user's address from conversation ID
      const addresses = conversationId.split('_');
      const otherAddress = addresses[0] === userAddress.toLowerCase() ? addresses[1] : addresses[0];
      
      const storageKey = `${this.conversationsKey}_${userAddress.toLowerCase()}`;
      const conversations = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Find and update the conversation
      const existingIndex = conversations.findIndex(c => c.address.toLowerCase() === otherAddress.toLowerCase());
      
      if (existingIndex !== -1) {
        conversations[existingIndex].unreadCount = 0;
        localStorage.setItem(storageKey, JSON.stringify(conversations));
      }
      
      return true;
    } catch (error) {
      console.error('Error resetting unread count:', error);
      return false;
    }
  }
  
  async updateMessage(senderAddress, recipientAddress, messageId, updates) {
    try {
      const conversationId = this.getConversationId(senderAddress, recipientAddress);
      const storageKey = `${this.messagesKey}_${conversationId}`;
      
      // Get existing messages
      const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Find and update the message
      const messageIndex = messages.findIndex(m => m.id === messageId);
      
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates };
        
        // Save updated messages
        localStorage.setItem(storageKey, JSON.stringify(messages));
        
        // Notify listeners
        this.notifyMessageListeners(conversationId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating message:', error);
      return false;
    }
  }
  
  async deleteMessage(conversationId, messageId) {
    try {
      const storageKey = `${this.messagesKey}_${conversationId}`;
      
      // Get existing messages
      const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Filter out the message to delete
      const updatedMessages = messages.filter(m => m.id !== messageId);
      
      // Save updated messages
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      
      // Notify listeners
      this.notifyMessageListeners(conversationId);
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }
  
  async deleteConversation(conversationId) {
    try {
      // Delete messages
      localStorage.removeItem(`${this.messagesKey}_${conversationId}`);
      
      // Get current user address
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      // Extract other user's address from conversation ID
      const addresses = conversationId.split('_');
      const otherAddress = addresses[0] === userAddress.toLowerCase() ? addresses[1] : addresses[0];
      
      // Remove from conversations list
      const storageKey = `${this.conversationsKey}_${userAddress.toLowerCase()}`;
      const conversations = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const updatedConversations = conversations.filter(c => c.address.toLowerCase() !== otherAddress.toLowerCase());
      
      localStorage.setItem(storageKey, JSON.stringify(updatedConversations));
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }
  
  async incrementUnreadCount(senderAddress, recipientAddress) {
    try {
      const storageKey = `${this.conversationsKey}_${recipientAddress.toLowerCase()}`;
      const conversations = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Find and update the conversation
      const existingIndex = conversations.findIndex(c => c.address.toLowerCase() === senderAddress.toLowerCase());
      
      if (existingIndex !== -1) {
        conversations[existingIndex].unreadCount = (conversations[existingIndex].unreadCount || 0) + 1;
      } else {
        // Get sender username
        const senderUsername = await this.getUsernameFromAddress(senderAddress);
        
        // Add new conversation with unread count
        conversations.push({
          address: senderAddress.toLowerCase(),
          username: senderUsername || 'Unknown User',
          lastMessage: 'New message',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 1
        });
      }
      
      // Save updated conversations
      localStorage.setItem(storageKey, JSON.stringify(conversations));
      
      return true;
    } catch (error) {
      console.error('Error incrementing unread count:', error);
      return false;
    }
  }
  
  async createMessageNotification(recipientAddress, senderUsername, messagePreview) {
    try {
      // Import notification service dynamically to avoid circular dependency
      const { default: notificationService } = await import('./notificationService');
      
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const senderAddress = accounts[0].toLowerCase();
      
      const notification = {
        type: notificationService.notificationTypes.MESSAGE,
        sourceUser: senderUsername,
        sourceAddress: senderAddress,
        content: `${senderUsername} sent you a message: "${messagePreview.substring(0, 30)}${messagePreview.length > 30 ? '...' : ''}"`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      await notificationService.addNotification(recipientAddress, notification);
      
      return true;
    } catch (error) {
      console.error('Error creating message notification:', error);
      return false;
    }
  }
  
  async getUsernameFromAddress(address) {
    try {
      const profile = await UserAuthContract.methods.getUserProfile(address).call();
      return profile.username || null;
    } catch (error) {
      console.error('Error getting username from address:', error);
      return null;
    }
  }
  
  async getRecipientProfile(address) {
    try {
      return await UserAuthContract.methods.getUserProfile(address).call();
    } catch (error) {
      console.error('Error getting recipient profile:', error);
      return null;
    }
  }
  
  async getMessagesFromIpfs(ipfsHash) {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting messages from IPFS:', error);
      return [];
    }
  }
  
  getConversationId(address1, address2) {
    // Ensure addresses are lowercase for consistency
    const addr1 = address1.toLowerCase();
    const addr2 = address2.toLowerCase();
    
    // Sort addresses to ensure consistent conversation ID regardless of sender/recipient
    return addr1 < addr2 ? `${addr1}_${addr2}` : `${addr2}_${addr1}`;
  }
  
  async getUnreadCount() {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      // Get all conversations
      const conversations = await this.getConversations();
      
      // Sum up unread counts across all conversations
      const totalUnread = conversations.reduce((total, conversation) => {
        return total + (conversation.unreadCount || 0);
      }, 0);
      
      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
  
  async getAllMessages() {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0].toLowerCase();
      
      // Get all conversations
      const conversations = await this.getConversations();
      
      // Collect all messages from all conversations
      let allMessages = [];
      
      for (const conversation of conversations) {
        const conversationId = this.getConversationId(userAddress, conversation.address);
        const messages = await this.getMessages(conversationId);
        allMessages = [...allMessages, ...messages];
      }
      
      return allMessages;
    } catch (error) {
      console.error('Error getting all messages:', error);
      return [];
    }
  }
  
  async onNewMessage(callback) {
    try {
      // Add a listener for the 'storage' event to detect new messages
      const handleStorageChange = (event) => {
        if (event.key && event.key.startsWith(this.messagesKey)) {
          callback(event);
        }
      };
      
      // Add event listener
      window.addEventListener('storage', handleStorageChange);
      
      // Also listen for our custom event
      const handleCustomEvent = () => {
        callback({ type: 'custom-event' });
      };
      
      window.addEventListener('new-message', handleCustomEvent);
      
      // Return a function to remove the listeners
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('new-message', handleCustomEvent);
      };
    } catch (error) {
      console.error("Error setting up message listener:", error);
      throw error;
    }
  }
}

export default new MessageService();