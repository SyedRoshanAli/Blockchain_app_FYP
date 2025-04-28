import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import './MobileAppBanner.css';

const MobileAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // This state tracks if we've already processed the beforeinstallprompt event
  const [hasProcessedEvent, setHasProcessedEvent] = useState(false);

  useEffect(() => {
    // Check if already dismissed permanently
    if (localStorage.getItem('appBannerDismissedPermanently') === 'true') {
      return;
    }

    // Check if the app is already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
    
    // Detect platform
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);
    setIsAndroid(/android/i.test(userAgent));

    // Handle beforeinstallprompt event for Android
    const handleBeforeInstallPrompt = (e) => {
      // Don't prevent default if we've already processed an event
      if (!hasProcessedEvent) {
        // We still need to call preventDefault to handle the banner ourselves
        e.preventDefault();
        console.log('Saved beforeinstallprompt event');
        setDeferredPrompt(e);
        setHasProcessedEvent(true);
        
        // Only show banner if not already dismissed temporarily
        const lastDismissed = localStorage.getItem('appBannerDismissed');
        const dismissedTime = lastDismissed ? parseInt(lastDismissed) : 0;
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (!lastDismissed || dismissedTime < oneDayAgo) {
          setShowBanner(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // For iOS, show banner based on device detection since iOS doesn't support beforeinstallprompt
    if (isIOS && !isStandalone) {
      const lastDismissed = localStorage.getItem('appBannerDismissed');
      const dismissedTime = lastDismissed ? parseInt(lastDismissed) : 0;
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (!lastDismissed || dismissedTime < oneDayAgo) {
        setShowBanner(true);
      }
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isIOS, isAndroid, isStandalone, hasProcessedEvent]);

  const dismissBanner = (permanent = false) => {
    setShowBanner(false);
    if (permanent) {
      localStorage.setItem('appBannerDismissedPermanently', 'true');
    } else {
      // Store timestamp for temporary dismissal (24 hours)
      localStorage.setItem('appBannerDismissed', Date.now().toString());
    }
  };

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        // Show the installation prompt - this is what fixes the warning
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          // If user accepts, dismiss permanently
          dismissBanner(true);
        } else {
          console.log('User dismissed the install prompt');
          // If user dismisses prompt, just dismiss for 24 hours
          dismissBanner(false);
        }
      } catch (error) {
        console.error('Error showing install prompt:', error);
        dismissBanner(false);
      } finally {
        // Clear the saved prompt since it can't be used again
        setDeferredPrompt(null);
      }
    } else {
      dismissBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="mobile-app-banner">
      <div className="banner-content">
        <Download size={24} />
        <div className="banner-text">
          <p>
            {isIOS 
              ? 'Install this app on your iPhone: tap Share then "Add to Home Screen"' 
              : 'Add this app to your home screen'}
          </p>
        </div>
      </div>
      <div className="banner-actions">
        {isAndroid && deferredPrompt && (
          <button className="install-button" onClick={installApp}>
            Install
          </button>
        )}
        <button 
          className="dismiss-button" 
          onClick={() => dismissBanner(false)}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default MobileAppBanner; 