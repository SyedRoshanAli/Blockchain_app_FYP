import React, { useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import NotificationBadge from '../components/Notifications/NotificationBadge';
import TestNotificationButton from '../components/TestNotificationButton';

const Profile = () => {
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        // Get the current MetaMask account
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const currentAddress = accounts[0].toLowerCase();
        
        // Get userSession data
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const username = userSession.username;
        
        console.log(`Checking notifications for ${username} with address ${currentAddress}`);
        
        // Check if we have any notifications for this address
        const notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
        const userNotifications = notifications[currentAddress] || [];
        
        console.log(`Found ${userNotifications.length} notifications for ${username}`);
        console.log(`Unread count: ${userNotifications.filter(n => !n.read).length}`);
        
        // Force a refresh of the notification badge
        notificationService.notifyListeners(currentAddress);
      } catch (error) {
        console.error("Error checking notifications:", error);
      }
    };
    
    checkNotifications();
  }, []);

  useEffect(() => {
    // Check notifications when viewing profile
    const checkNotifications = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log("Profile: Checking notifications on profile load");
        const address = await notificationService.getCurrentUserAddress();
        if (address) {
          const notifs = await notificationService.getNotificationsForUser(address);
          console.log(`Profile: Found ${notifs.length} notifications for ${address}`);
        } else {
          console.log("Profile: No address found for notification check");
        }
      }
    };
    
    checkNotifications();
  }, []);

  return (
    // Rest of the component code
    {process.env.NODE_ENV !== 'production' && <TestNotificationButton />}
  );
};

export default Profile; 