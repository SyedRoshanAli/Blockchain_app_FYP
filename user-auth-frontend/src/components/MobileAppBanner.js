import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import './MobileAppBanner.css';

const MobileAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if the app is already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
    
    // Detect platform
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);
    setIsAndroid(/android/i.test(userAgent));
    
    // Only show banner on mobile devices that aren't already in standalone mode
    const shouldShowBanner = (isIOS || isAndroid) && !isStandalone && !localStorage.getItem('appBannerDismissed');
    setShowBanner(shouldShowBanner);
    
    // Handle beforeinstallprompt event for Android
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, [isIOS, isAndroid, isStandalone]);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('appBannerDismissed', 'true');
  };

  const installApp = async () => {
    if (deferredPrompt) {
      // For Android - show the installation prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      // Clear the saved prompt since it can't be used again
      setDeferredPrompt(null);
    }
    dismissBanner();
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
        <button className="dismiss-button" onClick={dismissBanner}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default MobileAppBanner; 