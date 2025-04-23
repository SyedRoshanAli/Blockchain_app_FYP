// Clean up functions for follow relationship data

export const cleanupFollowRequests = () => {
  // Remove expired follow requests (older than 7 days)
  const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const validRequests = pendingRequests.filter(req => {
    const requestDate = new Date(req.timestamp);
    return requestDate > oneWeekAgo;
  });
  
  localStorage.setItem('pendingFollowRequests', JSON.stringify(validRequests));
};

export const cleanupUserData = (username) => {
  // Clear follow relationships for this user
  localStorage.removeItem(`followers_${username}`);
  localStorage.removeItem(`following_${username}`);
  
  // Clear any outgoing or incoming follow requests
  const outgoingRequests = JSON.parse(localStorage.getItem('outgoingFollowRequests') || '[]');
  const filteredOutgoing = outgoingRequests.filter(req => req.from !== username);
  localStorage.setItem('outgoingFollowRequests', JSON.stringify(filteredOutgoing));
  
  const incomingRequestsKey = `incomingFollowRequests_${username}`;
  localStorage.removeItem(incomingRequestsKey);
  
  // Clear any pending follow requests involving this user
  const pendingRequests = JSON.parse(localStorage.getItem('pendingFollowRequests') || '[]');
  const filteredPending = pendingRequests.filter(
    req => req.from !== username && req.to !== username
  );
  localStorage.setItem('pendingFollowRequests', JSON.stringify(filteredPending));
  
  // Clear followed users if this user is in the list
  const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
  if (followedUsers.includes(username)) {
    const updatedFollowed = followedUsers.filter(user => user !== username);
    localStorage.setItem('followedUsers', JSON.stringify(updatedFollowed));
  }
};

export const resetAllUserData = () => {
  // Save the post content before clearing
  const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
  
  // First, clear specific keys that we know are important
  const specificKeys = [
    'userSession',
    'userData',
    'pendingFollowRequests',
    'outgoingFollowRequests',
    'followedUsers',
    'darkMode'
  ];
  
  specificKeys.forEach(key => localStorage.removeItem(key));
  
  // Then look for pattern-based keys
  const keys = Object.keys(localStorage);
  
  // Pattern matching for user-related data
  const patterns = [
    /^followers_/,
    /^following_/,
    /^usernames_/,
    /^incomingFollowRequests_/
  ];
  
  // Remove matching items
  keys.forEach(key => {
    for (const pattern of patterns) {
      if (pattern.test(key)) {
        localStorage.removeItem(key);
        break;
      }
    }
  });
  
  // Restore the post content
  localStorage.setItem('localPosts', JSON.stringify(localPosts));
}; 