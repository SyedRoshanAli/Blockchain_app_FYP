import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import messageService from '../../services/messageService';
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
    const fetchCurrentUser = async () => {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const userAddress = accounts[0].toLowerCase();
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        
        setCurrentUser({
          walletAddress: userAddress,
          username: userSession.username || 'User'
        });
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const conversationsList = await messageService.getConversations();
        setConversations(conversationsList);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
    fetchConversations();

    // Check if we're coming from a profile page with a message action
    if (location.state && location.state.messageUser) {
      const { address, username } = location.state.messageUser;
      setActiveChat({ address, username });
    }

    // Set up interval to refresh conversations
    const intervalId = setInterval(fetchConversations, 30000); // Every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [location.state]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
      
      // Mark messages as read when chat is opened
      const conversationId = messageService.getConversationId(
        currentUser?.walletAddress || '', 
        activeChat.address
      );
      messageService.markMessagesAsRead(conversationId);
      
      // Set up message listener for this conversation
      const unsubscribe = messageService.addMessageListener(conversationId, (updatedMessages) => {
        setMessages(updatedMessages);
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [activeChat, currentUser]);

  // Reference to auto-scroll to bottom of messages
  const messagesEndRef = React.useRef(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (conversation) => {
    try {
      if (!currentUser?.walletAddress) return;
      
      const conversationId = messageService.getConversationId(
        currentUser.walletAddress, 
        conversation.address
      );
      
      const messagesList = await messageService.getMessages(conversationId);
      setMessages(messagesList);
      
      // Mark messages as read
      await messageService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !currentUser?.walletAddress) return;
    
    try {
      await messageService.sendMessage(activeChat.address, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (!currentUser?.walletAddress || !activeChat) return;
      
      const conversationId = messageService.getConversationId(
        currentUser.walletAddress, 
        activeChat.address
      );
      
      await messageService.deleteMessage(conversationId, messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleDeleteConversation = async (conversation) => {
    try {
      if (!currentUser?.walletAddress) return;
      
      const conversationId = messageService.getConversationId(
        currentUser.walletAddress, 
        conversation.address
      );
      
      await messageService.deleteConversation(conversationId);
      setActiveChat(null);
      
      // Refresh conversations
      const conversationsList = await messageService.getConversations();
      setConversations(conversationsList);
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return format(messageDate, 'h:mm a');
    }
    
    // If this week, show day
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    if (diffInDays < 7) {
      return format(messageDate, 'EEE');
    }
    
    // Otherwise show date
    return format(messageDate, 'MM/dd/yy');
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // If today
    if (messageDate.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // If this week
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    if (diffInDays < 7) {
      return format(messageDate, 'EEEE');
    }
    
    // Otherwise show full date
    return format(messageDate, 'MMMM d, yyyy');
  };

  return (
    <div className="messages-container">
      <div className="messages-sidebar">
        <div className="messages-header">
          <div className="current-user">
            <div className="user-avatar">
              {currentUser?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <h3>{currentUser?.username || 'User'}</h3>
          </div>
          <button className="new-message-btn" onClick={() => navigate('/search?action=message')}>
            <MessageSquare size={20} />
          </button>
        </div>
        
        <div className="search-container">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search messages" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="conversations-list">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="no-conversations">
              <MessageSquare size={40} />
              <p>No conversations yet</p>
              <button 
                className="start-conversation-btn"
                onClick={() => navigate('/search?action=message')}
              >
                Start a conversation
              </button>
            </div>
          ) : (
            conversations
              .filter(convo => 
                convo.username.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(conversation => (
                <div 
                  key={conversation.address} 
                  className={`conversation-item ${activeChat?.address === conversation.address ? 'active' : ''}`}
                  onClick={() => setActiveChat(conversation)}
                >
                  <div className="conversation-avatar">
                    {conversation.username[0].toUpperCase()}
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4>{conversation.username}</h4>
                      <span className="last-message-time">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <p className="last-message-preview">
                      {conversation.lastMessage && conversation.lastMessage.length > 30
                        ? conversation.lastMessage.substring(0, 30) + '...'
                        : conversation.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
      
      <div className="messages-content">
        {activeChat ? (
          <>
            <div className="chat-header">
              <button className="back-button" onClick={() => setActiveChat(null)}>
                <ArrowLeft size={20} />
              </button>
              <div className="chat-user-info" onClick={() => navigate(`/profile/${activeChat.username}`)}>
                <div className="chat-avatar">
                  {activeChat.username[0].toUpperCase()}
                </div>
                <div>
                  <h3>{activeChat.username}</h3>
                  <span className="user-status">
                    {activeChat.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="refresh-btn" onClick={() => fetchMessages(activeChat)}>
                  <RefreshCw size={18} />
                </button>
                <button className="delete-chat-btn" onClick={() => handleDeleteConversation(activeChat)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="messages-list" ref={messagesEndRef}>
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isSender = message.sender === currentUser?.walletAddress;
                  const showDate = index === 0 || 
                    new Date(message.timestamp).toDateString() !== 
                    new Date(messages[index - 1].timestamp).toDateString();
                    
                  return (
                    <React.Fragment key={message.id}>
                      {showDate && (
                        <div className="message-date-divider">
                          <span>{formatMessageDate(message.timestamp)}</span>
                        </div>
                      )}
                      <div 
                        className={`message-bubble ${isSender ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          {message.content}
                          {message.media && (
                            <div className="message-media">
                              <img src={message.media} alt="Media" />
                            </div>
                          )}
                        </div>
                        <div className="message-meta">
                          <span className="message-time">
                            {format(new Date(message.timestamp), 'h:mm a')}
                          </span>
                          {isSender && (
                            <span className="message-status">
                              {message.read ? 'Read' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
            
            <div className="message-input-container">
              <button className="attachment-btn">
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="message-input"
              />
              <button className="emoji-btn">
                <Smile size={20} />
              </button>
              <button 
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <MessageSquare size={60} />
            <h2>Your Messages</h2>
            <p>Select a conversation or start a new one</p>
            <button 
              className="new-conversation-btn"
              onClick={() => navigate('/search?action=message')}
            >
              New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;