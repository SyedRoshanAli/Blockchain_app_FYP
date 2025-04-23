import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { Link } from 'react-router-dom';

const MessageNotification = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await messageService.getUnreadCount();
        setUnreadCount(Number(count));
      } catch (error) {
        console.error("Error fetching unread message count:", error);
      }
    };
    
    fetchUnreadCount();
    
    // Set up interval to check for new messages
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Link to="/messages" className="notification-icon">
      <div className="nav-icon-container">
        <MessageSquare size={22} />
        {unreadCount > 0 && (
          <div className="notification-badge">{unreadCount}</div>
        )}
      </div>
    </Link>
  );
};

export default MessageNotification; 