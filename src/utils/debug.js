// Debug utilities for the notification system

export const debugNotifications = () => {
  try {
    // Get all notifications from localStorage
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    console.log("All stored notifications:", allNotifications);
    
    // Get notification keys (addresses)
    const notificationKeys = Object.keys(allNotifications);
    console.log("Notification keys (addresses):", notificationKeys);
    
    // Get metamask accounts
    window.ethereum.request({
      method: "eth_requestAccounts"
    }).then(accounts => {
      const currentAddress = accounts[0].toLowerCase();
      console.log("Current address:", currentAddress);
      
      // Check if current address has notifications
      if (allNotifications[currentAddress]) {
        console.log(
          `Notifications for current address (${currentAddress}):`, 
          allNotifications[currentAddress]
        );
        
        // Count unread
        const unreadCount = allNotifications[currentAddress].filter(n => !n.read).length;
        console.log(`Unread notifications: ${unreadCount}`);
      } else {
        console.log(`No notifications for current address (${currentAddress})`);
      }
      
      // Return the results
      return {
        currentAddress,
        hasNotifications: !!allNotifications[currentAddress],
        notificationCount: allNotifications[currentAddress]?.length || 0,
        unreadCount: allNotifications[currentAddress]?.filter(n => !n.read).length || 0
      };
    });
  } catch (error) {
    console.error("Error debugging notifications:", error);
  }
};

export const clearAllNotifications = () => {
  try {
    localStorage.setItem('notifications', '{}');
    console.log("All notifications cleared");
    window.dispatchEvent(new Event('notification-update'));
    return true;
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return false;
  }
};

export const createDebugNotification = async (recipientAddress) => {
  try {
    // Allow creating notifications for someone else for testing
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });
    const currentAddress = accounts[0].toLowerCase();
    
    // If no recipient is provided, use current address
    const targetAddress = recipientAddress?.toLowerCase() || currentAddress;
    
    // Create a test notification
    const notification = {
      id: Date.now().toString(),
      type: 'debug',
      read: false,
      timestamp: new Date().toISOString(),
      senderAddress: currentAddress,
      senderName: "Debug System",
      message: `This is a debug notification created at ${new Date().toLocaleTimeString()}`
    };
    
    // Get current notifications
    const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    
    // Initialize for this recipient if needed
    if (!notifications[targetAddress]) {
      notifications[targetAddress] = [];
    }
    
    // Add at the beginning of the array
    notifications[targetAddress].unshift(notification);
    
    // Save back to localStorage
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    console.log(`Debug notification created for ${targetAddress}`);
    console.log('Current notifications:', notifications);
    
    // Force UI update
    window.dispatchEvent(new Event('notification-update'));
    
    return {
      success: true,
      recipient: targetAddress
    };
  } catch (error) {
    console.error("Error creating debug notification:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.blockConnectDebug = {
    debugNotifications,
    clearAllNotifications,
    createDebugNotification
  };
} 