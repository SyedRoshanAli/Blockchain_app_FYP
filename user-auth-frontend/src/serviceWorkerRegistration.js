// This optional code is used to register a service worker.
// register() is not called by default.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://cra.link/PWA

// This code is used to register a service worker and handle push notifications

// Check if the browser supports service workers
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register() {
  // Check if the service worker is already registered to avoid duplicate registration
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    console.log('Service worker already registered and controlling the page');
    return;
  }

  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists.
        checkValidServiceWorker(swUrl);
      } else {
        // Not localhost. Just register service worker
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('Service worker registration successful with scope:', registration.scope);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched
              console.log('New content is available and will be used when all tabs for this page are closed.');
            } else {
              // At this point, everything has been precached
              console.log('Content is cached for offline use.');
            }
          }
        };
      };
      
      // Handle push notifications once service worker is registered
      setupPushNotifications(registration);
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

// Check if the service worker can be found
function checkValidServiceWorker(swUrl) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

// Setup push notifications when user is logged in
async function setupPushNotifications(registration) {
  try {
    // Check if we have permission
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    // Request permission (wait until user is logged in)
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.walletAddress) {
      // Not logged in, don't request permission yet
      return;
    }
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }
    
    // Check if push manager is available
    if (!('PushManager' in window)) {
      console.log('Push API not supported');
      return;
    }
    
    // Get VAPID key (you would need to set this up on your server)
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    // Convert the VAPID key to the format required by the subscription
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Subscribe to push notifications
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      console.log('Push notification subscription:', subscription);
      
      // Send subscription to your server
      // await saveSubscription(subscription);
      
      // Store in localStorage for now (in production, send to server)
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
}

// Helper function to convert base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}
