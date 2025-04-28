// Run this in the browser console to create a test notification
function createTestNotification() {
  try {
    // Get current user's address
    const accounts = window.ethereum.request({
      method: "eth_requestAccounts"
    });
    
    accounts.then(accts => {
      const currentAddress = accts[0].toLowerCase();
      
      // Create a test notification
      const notification = {
        id: Date.now().toString(),
        type: 'test',
        read: false,
        timestamp: new Date().toISOString(),
        message: `This is a test notification created at ${new Date().toLocaleTimeString()}`
      };
      
      // Get current notifications
      const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      
      // Initialize for this user if needed
      if (!notifications[currentAddress]) {
        notifications[currentAddress] = [];
      }
      
      // Add at the beginning of the array
      notifications[currentAddress].unshift(notification);
      
      // Save back to localStorage
      localStorage.setItem('notifications', JSON.stringify(notifications));
      
      console.log(`Test notification created for ${currentAddress}`);
      console.log('Current notifications:', notifications);
      
      // Dispatch event to update UI
      window.dispatchEvent(new Event('notification-update'));
      
      alert("Test notification created successfully!");
    }).catch(error => {
      console.error("Error getting accounts:", error);
      alert("Error creating test notification: " + error.message);
    });
  } catch (error) {
    console.error("Error in test notification:", error);
    alert("Error creating test notification: " + error.message);
  }
}

// Export for use in other files
export { createTestNotification }; 