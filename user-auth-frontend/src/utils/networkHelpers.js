export const checkCorrectNetwork = async () => {
  if (!window.ethereum) {
    return { isCorrect: false, error: "MetaMask is not installed" };
  }
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Update this to match your network's chainId (e.g., 1 for mainnet, 3 for Ropsten, 5777 for Ganache)
    const requiredChainId = "0x539"; // "0x539" is hex for 1337 (Ganache default)
    
    if (chainId !== requiredChainId) {
      return { 
        isCorrect: false, 
        error: `Please connect to the correct network (Chain ID: ${parseInt(requiredChainId, 16)})` 
      };
    }
    
    return { isCorrect: true };
  } catch (error) {
    return { isCorrect: false, error: error.message };
  }
};

export const switchToCorrectNetwork = async () => {
  try {
    // Switch to the network your contracts are deployed on
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x539' }], // Change to your network's chainId
    });
    return true;
  } catch (error) {
    console.error('Failed to switch network:', error);
    return false;
  }
}; 