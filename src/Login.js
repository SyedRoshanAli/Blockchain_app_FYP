// Add this to your handleSubmit function in Login.js, after successful authentication

// Save the user's wallet address in userData for easier access
const saveWalletAddressToUserData = async () => {
  try {
    // Get the current wallet address from MetaMask
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });
    const address = accounts[0].toLowerCase();
    
    // Update userData
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.walletAddress = address;
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Also update userSession for redundancy
    const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
    userSession.address = address;
    localStorage.setItem('userSession', JSON.stringify(userSession));
    
    console.log("Login: Saved wallet address to user data:", address);
  } catch (error) {
    console.error("Error saving wallet address:", error);
  }
};

// Call this function after successful login
saveWalletAddressToUserData(); 