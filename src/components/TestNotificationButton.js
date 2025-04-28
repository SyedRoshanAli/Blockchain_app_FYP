import React from 'react';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-hot-toast';

const TestNotificationButton = () => {
  const handleCreateTest = async () => {
    try {
      await notificationService.createTestNotification();
      toast.success("Test notification created!");
      
      // Debug output to console
      const address = await notificationService.getCurrentUserAddress();
      console.log("Created test notification for address:", address);
      
      // Force UI update
      window.dispatchEvent(new Event('notification-update'));
    } catch (error) {
      console.error("Error creating test notification:", error);
      toast.error("Failed to create test notification");
    }
  };
  
  // Function to debug notifications
  const handleDebug = async () => {
    try {
      const address = await notificationService.getCurrentUserAddress();
      console.log("Current user address:", address);
      
      const notifications = await notificationService.getNotificationsForUser(address);
      console.log("Current notifications:", notifications);
      
      toast.success(`Found ${notifications.length} notifications`);
    } catch (error) {
      console.error("Error debugging notifications:", error);
      toast.error("Error checking notifications");
    }
  };

  return (
    <div style={{ padding: '10px', marginTop: '10px', display: 'flex', gap: '10px' }}>
      <button 
        onClick={handleCreateTest}
        style={{ 
          padding: '8px 12px', 
          background: '#4f46e5', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Create Test Notification
      </button>
      
      <button 
        onClick={handleDebug}
        style={{ 
          padding: '8px 12px', 
          background: '#65a30d', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Debug Notifications
      </button>
    </div>
  );
};

export default TestNotificationButton; 