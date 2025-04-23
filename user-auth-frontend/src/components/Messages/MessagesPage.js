import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { messageService } from '../../services/messageService';
import { UserAuthContract } from "../../UserAuth";
import { Search, ArrowLeft, Send, Paperclip, Smile, Image, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import './Messages.css';

const LOCAL_STORAGE_KEY_PREFIX = 'blockchain_messages_';

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userParam = searchParams.get('user');

  useEffect(() => {
    // Get current user's data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    setCurrentUser(userData);
    
    // Set up blockchain account
    const setupAccount = async () => {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Fetch conversations first
        await fetchConversations();
        
        // Sync all messages after conversations are loaded
        await syncMessagesOnLoad();
        
        // If a user parameter is provided in the URL, start a conversation with that user
        if (userParam) {
          await startConversationWithUser(userParam);
        }
      } catch (error) {
        console.error("Error setting up account:", error);
        toast.error("Failed to connect to blockchain. Please make sure MetaMask is connected.");
      }
    };
    
    setupAccount();
    
    // Set up event listener for new messages
    const setupMessageListener = async () => {
      try {
        messageService.onNewMessage((newMsg) => {
          // Update conversations and message list if needed
          fetchConversations();
          if (activeChat && (newMsg.sender === activeChat.address || newMsg.recipient === activeChat.address)) {
            fetchMessages(activeChat);
          }
        });
      } catch (error) {
        console.error("Error setting up message listener:", error);
      }
    };
    
    setupMessageListener();
    
    // Cleanup
    return () => {
      // Any cleanup needed for event listeners
    };
  }, [userParam]); // Only re-run when userParam changes

  // Add this useEffect to update when activeChat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    // Check if there's a stored active chat
    const lastActiveChat = localStorage.getItem('last_active_chat');
    if (lastActiveChat) {
      try {
        const parsedChat = JSON.parse(lastActiveChat);
        if (parsedChat) {
          setActiveChat(parsedChat);
        }
      } catch (error) {
        console.error("Error parsing last active chat:", error);
      }
    }
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const allMessages = await messageService.getAllMessages();
      
      // Group messages by sender/recipient to create conversations
      const conversationMap = new Map();
      
      for (const msg of allMessages) {
        const otherParty = msg.sender === window.ethereum.selectedAddress ? msg.recipient : msg.sender;
        
        if (!conversationMap.has(otherParty)) {
          // Get username for this address
          const usernames = await UserAuthContract.methods
            .getUsernames(otherParty)
            .call();
            
          const username = usernames[0] || 'Unknown User';
          
          // Count unread messages for this conversation
          const unreadCount = allMessages.filter(m => 
            m.sender === otherParty && 
            !m.isRead && 
            m.recipient === window.ethereum.selectedAddress
          ).length;
          
          conversationMap.set(otherParty, {
            address: otherParty,
            username: username,
            lastMessage: msg.content,
            timestamp: Number(msg.timestamp) * 1000,
            unread: unreadCount
          });
        } else {
          const existing = conversationMap.get(otherParty);
          if (Number(msg.timestamp) * 1000 > existing.timestamp) {
            existing.lastMessage = msg.content;
            existing.timestamp = Number(msg.timestamp) * 1000;
          }
        }
      }
      
      // Convert map to array and sort by timestamp (most recent first)
      const conversationList = Array.from(conversationMap.values());
      conversationList.sort((a, b) => b.timestamp - a.timestamp);
      
      setConversations(conversationList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversation) => {
    try {
      console.log("Fetching messages for:", conversation.username);
      setLoading(true);
      
      // Get the current user's address
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      const myAddress = accounts[0].toLowerCase();
      
      // Create a storage key for this conversation
      const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${myAddress}_${conversation.address.toLowerCase()}`;
      
      // First load any messages we have in localStorage
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      console.log("Messages from localStorage:", storedMessages);
      
      // Try to fetch from blockchain and merge with localStorage
      try {
        // Fetch messages from blockchain
        const blockchainMessages = await messageService.getMessagesWith(conversation.address);
        console.log("Blockchain messages:", blockchainMessages);
        
        // Format blockchain messages
        const formattedBlockchainMessages = blockchainMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          recipient: msg.recipient,
          timestamp: Number(msg.timestamp) * 1000,
          isRead: msg.isRead,
          isMine: msg.sender.toLowerCase() === myAddress,
          fromBlockchain: true
        }));
        
        // Get IDs of messages from blockchain to avoid duplicates
        const blockchainMessageIds = formattedBlockchainMessages.map(msg => msg.id);
        
        // Keep localStorage messages that aren't from blockchain (pending/failed)
        // or aren't duplicated in blockchain messages
        const localOnlyMessages = storedMessages.filter(msg => 
          !msg.fromBlockchain || !blockchainMessageIds.includes(msg.id)
        );
        
        // Combine blockchain messages with localStorage-only messages
        const combinedMessages = [...formattedBlockchainMessages, ...localOnlyMessages];
        
        // Sort by timestamp
        combinedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Save the combined set to localStorage
        localStorage.setItem(storageKey, JSON.stringify(combinedMessages));
        console.log("Saved combined messages to localStorage:", combinedMessages);
        
        // Save to state
        setMessages(combinedMessages);
        
        // Mark unread messages as read
        const unreadMessages = combinedMessages.filter(msg => 
          !msg.isRead && 
          msg.sender.toLowerCase() !== myAddress && 
          msg.fromBlockchain // Only mark blockchain messages as read
        );
        
        for (const msg of unreadMessages) {
          await messageService.markAsRead(msg.id);
        }
        
        // Update conversations list if there were unread messages
        if (unreadMessages.length > 0) {
          fetchConversations();
        }
        
      } catch (error) {
        console.error("Error fetching from blockchain, using localStorage only:", error);
        
        // If blockchain fetch fails, just use localStorage
        setMessages(storedMessages);
        console.log("Using stored messages only:", storedMessages);
      }
    } catch (error) {
      console.error("Error in fetch messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    
    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    try {
      // Get my address
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      const myAddress = accounts[0];
      
      // Create a temporary message to show immediately
      const tempMessage = {
        id: tempId,
        content: messageContent,
        sender: myAddress,
        recipient: activeChat.address,
        timestamp: Date.now(),
        isRead: true,
        isMine: true,
        isPending: true
      };
      
      // Add message to UI immediately
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Clear input
      setNewMessage('');
      
      // Save to localStorage immediately with consistent key format
      const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${myAddress.toLowerCase()}_${activeChat.address.toLowerCase()}`;
      let storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      storedMessages = [...storedMessages, tempMessage];
      localStorage.setItem(storageKey, JSON.stringify(storedMessages));
      
      console.log("Saved pending message to localStorage:", tempMessage);
      console.log("Current messages in localStorage:", storedMessages);
      
      console.log("Sending message to blockchain...");
      
      // Send actual message to blockchain
      const result = await messageService.sendMessage(activeChat.address, messageContent);
      console.log("Message sent successfully:", result);
      
      // Get the real message ID from the transaction result
      const realMessageId = result.events?.MessageSent?.returnValues?.id || tempId;
      
      console.log("Real message ID:", realMessageId);
      
      // Update the temporary message with the real message ID
      const updatedMessage = {
        ...tempMessage,
        id: realMessageId,
        isPending: false,
        fromBlockchain: true
      };
      
      // Update messages state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempId ? updatedMessage : msg
        )
      );
      
      // Update in localStorage too - making sure to load the latest state first
      storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedStoredMessages = storedMessages.map(msg => 
        msg.id === tempId ? updatedMessage : msg
      );
      localStorage.setItem(storageKey, JSON.stringify(updatedStoredMessages));
      
      console.log("Updated message in localStorage:", updatedMessage);
      console.log("Current messages in localStorage after update:", updatedStoredMessages);
      
      // Refresh conversation list
      fetchConversations();
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      try {
        // Get accounts inside catch block too
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts"
        });
        const myAddress = accounts[0];
        
        // Mark the message as failed in UI but keep it visible
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId 
              ? { ...msg, isPending: false, isFailed: true } 
              : msg
          )
        );
        
        // Update in localStorage too - making sure to load the latest state first
        const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${myAddress.toLowerCase()}_${activeChat.address.toLowerCase()}`;
        const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedMessages = storedMessages.map(msg => 
          msg.id === tempId ? { ...msg, isPending: false, isFailed: true } : msg
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        
      } catch (nestedError) {
        console.error("Error handling failed message:", nestedError);
      }
      
      toast.error("Failed to send message. You can retry.");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If within last week, show day
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      return format(date, 'EEEE');
    }
    
    // Otherwise show date
    return format(date, 'MMM d');
  };

  const filteredConversations = conversations.filter(
    convo => convo.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add a function to start a conversation with a specific user
  const startConversationWithUser = async (username) => {
    try {
      // Get the Ethereum address for this username
      const address = await UserAuthContract.methods
        .getAddressByUsername(username)
        .call();
      
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        toast.error("User not found");
        return;
      }
      
      // Check if we already have a conversation with this user
      const existingConversation = conversations.find(
        conv => conv.address.toLowerCase() === address.toLowerCase()
      );
      
      if (existingConversation) {
        // If conversation exists, set it as active
        setActiveChat(existingConversation);
      } else {
        // Create a new conversation object
        const newConversation = {
          address: address,
          username: username,
          lastMessage: "Start a conversation",
          timestamp: Date.now(),
          unread: 0
        };
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...prev]);
        
        // Set as active chat
        setActiveChat(newConversation);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Could not start conversation with this user");
    }
  };

  // Add this function to handle message deletion
  const handleDeleteMessage = async (messageId) => {
    try {
      // Add confirmation dialog
      if (!window.confirm("Are you sure you want to delete this message?")) {
        return;
      }
      
      // Call the delete message function from messageService
      await messageService.deleteMessage(messageId);
      
      // Update the UI by removing the deleted message
      setMessages(messages.filter(msg => msg.id !== messageId));
      
      toast.success("Message deleted successfully");
      
      // Refresh conversations
      fetchConversations();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleRetryMessage = async (content, failedId) => {
    try {
      // Remove the failed message
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== failedId));
      
      // Now resend it as a new message
      const tempId = `temp-${Date.now()}`;
      
      // Create a new temporary message
      const tempMessage = {
        id: tempId,
        content: content,
        sender: window.ethereum.selectedAddress,
        recipient: activeChat.address,
        timestamp: Date.now(),
        isRead: true,
        isMine: true,
        isPending: true
      };
      
      // Add message to UI immediately
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Send actual message to blockchain
      const result = await messageService.sendMessage(activeChat.address, content);
      
      // Update the temporary message with the real message ID
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: result.events?.MessageSent?.returnValues?.id || msg.id, isPending: false } 
            : msg
        )
      );
      
      // Refresh conversation list
      fetchConversations();
      
    } catch (error) {
      console.error("Error retrying message:", error);
      toast.error("Failed to retry sending message");
    }
  };

  // Add this function to sync all conversations on page load
  const syncAllConversations = async () => {
    try {
      // Get all messages
      const allMessages = await messageService.getAllMessages();
      
      // Group by conversation partner
      const messagesByPartner = {};
      
      for (const msg of allMessages) {
        const myAddress = window.ethereum.selectedAddress.toLowerCase();
        const partner = msg.sender.toLowerCase() === myAddress 
          ? msg.recipient.toLowerCase() 
          : msg.sender.toLowerCase();
        
        if (!messagesByPartner[partner]) {
          messagesByPartner[partner] = [];
        }
        
        messagesByPartner[partner].push({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          recipient: msg.recipient,
          timestamp: Number(msg.timestamp) * 1000,
          isRead: msg.isRead,
          isMine: msg.sender.toLowerCase() === myAddress,
          fromBlockchain: true
        });
      }
      
      // Save each conversation to localStorage
      for (const partner in messagesByPartner) {
        const storageKey = `chat_${window.ethereum.selectedAddress.toLowerCase()}_${partner}`;
        const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Existing blockchain messages
        const existingBlockchainIds = storedMessages
          .filter(m => m.fromBlockchain)
          .map(m => m.id);
        
        // Local-only messages (pending or failed)
        const localMessages = storedMessages.filter(m => !m.fromBlockchain);
        
        // New blockchain messages
        const newBlockchainMessages = messagesByPartner[partner]
          .filter(m => !existingBlockchainIds.includes(m.id));
        
        // Combine all messages
        const allMessages = [...storedMessages.filter(m => m.fromBlockchain), ...newBlockchainMessages, ...localMessages];
        
        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(allMessages));
      }
      
      console.log("All conversations synced with blockchain");
    } catch (error) {
      console.error("Error syncing conversations:", error);
    }
  };

  // Add this function to sync messages on load
  const syncMessagesOnLoad = async () => {
    try {
      console.log("Syncing all messages...");
      // Get accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      const myAddress = accounts[0].toLowerCase();

      // Get all messages
      const allMessages = await messageService.getAllMessages();
      
      // Group messages by conversation partner
      for (const conversation of conversations) {
        const otherAddress = conversation.address.toLowerCase();
        
        // Filter messages for this conversation
        const conversationMessages = allMessages.filter(msg => 
          (msg.sender.toLowerCase() === myAddress && msg.recipient.toLowerCase() === otherAddress) ||
          (msg.sender.toLowerCase() === otherAddress && msg.recipient.toLowerCase() === myAddress)
        );
        
        // Format the messages
        const formattedMessages = conversationMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          recipient: msg.recipient,
          timestamp: Number(msg.timestamp) * 1000,
          isRead: msg.isRead,
          isMine: msg.sender.toLowerCase() === myAddress,
          fromBlockchain: true
        }));
        
        // Save to localStorage
        const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${myAddress}_${otherAddress}`;
        localStorage.setItem(storageKey, JSON.stringify(formattedMessages));
        
        console.log(`Synced ${formattedMessages.length} messages for conversation with ${conversation.username}`);
      }
      
      // If we have an active chat, reload its messages
      if (activeChat) {
        fetchMessages(activeChat);
      }
      
      console.log("All messages synced");
    } catch (error) {
      console.error("Error syncing messages:", error);
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="conversations-sidebar">
          <div className="conversations-header">
            <h2>Messages</h2>
            <div className="search-container">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search messages" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="conversations-list">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map(conversation => (
                <div 
                  key={conversation.address}
                  className={`conversation-item ${activeChat?.address === conversation.address ? 'active' : ''} ${conversation.unread ? 'unread' : ''}`}
                  onClick={() => {
                    setActiveChat(conversation);
                    // Save active chat to localStorage
                    localStorage.setItem('last_active_chat', JSON.stringify(conversation));
                    fetchMessages(conversation);
                  }}
                >
                  <div className="conversation-avatar">
                    {conversation.username[0].toUpperCase()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4>{conversation.username}</h4>
                      <span className="conversation-time">
                        {formatTime(conversation.timestamp)}
                      </span>
                    </div>
                    <p className="conversation-preview">{conversation.lastMessage}</p>
                  </div>
                  {conversation.unread > 0 && (
                    <div className="unread-badge">{conversation.unread}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="chat-container">
          {!activeChat ? (
            <div className="no-chat-selected">
              <div className="no-chat-icon">
                <MessageSquare size={48} />
              </div>
              <h3>Your Messages</h3>
              <p>Send private messages to a friend or group</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <button className="back-button" onClick={() => setActiveChat(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div 
                  className="chat-user-info"
                  onClick={() => navigate(`/profile/${activeChat.username}`)}
                >
                  <div className="chat-avatar">
                    {activeChat.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h4>{activeChat.username}</h4>
                    <span className="user-status">Active now</span>
                  </div>
                </div>
              </div>
              
              <div className="messages-list">
                {/* Show date divider only if we have messages */}
                {messages.length > 0 && (
                  <div className="chat-date-divider">
                    <span>Messages</span>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div 
                    key={message.id || index}
                    className={`message-bubble ${message.isMine ? 'sent' : 'received'} ${message.isPending ? 'pending' : ''} ${message.isFailed ? 'failed' : ''}`}
                  >
                    <p>{message.content}</p>
                    <span className="message-time">
                      {message.isPending ? 'Sending...' : 
                       message.isFailed ? 'Failed to send - tap to retry' : 
                       format(new Date(message.timestamp), 'h:mm a')}
                    </span>
                    
                    {message.isMine && !message.isPending && !message.isFailed && (
                      <button 
                        className="delete-message-btn" 
                        onClick={() => handleDeleteMessage(message.id)}
                        title="Delete message"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    
                    {message.isFailed && (
                      <button 
                        className="retry-btn"
                        onClick={() => handleRetryMessage(message.content, message.id)}
                        title="Retry sending"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <form className="message-input-container" onSubmit={handleSendMessage}>
                <div className="message-attachments">
                  <button type="button" className="attachment-button">
                    <Image size={20} />
                  </button>
                  <button type="button" className="attachment-button">
                    <Paperclip size={20} />
                  </button>
                  <button type="button" className="attachment-button">
                    <Smile size={20} />
                  </button>
                </div>
                <div className="message-input-wrapper">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${activeChat.username}`}
                    rows={1}
                    className="message-input"
                  />
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={!newMessage.trim()}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage; 