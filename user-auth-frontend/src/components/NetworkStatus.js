import React, { useState, useEffect } from 'react';
import { checkCorrectNetwork, switchToCorrectNetwork } from '../utils/networkHelpers';
import { toast } from 'react-hot-toast';

const NetworkStatus = () => {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const result = await checkCorrectNetwork();
      setIsCorrectNetwork(result.isCorrect);
      
      if (!result.isCorrect) {
        toast.error("You're on the wrong network. Please switch to continue.");
      }
    };
    
    checkNetwork();
    
    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        checkNetwork();
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      }
    };
  }, []);

  const handleSwitchNetwork = async () => {
    const success = await switchToCorrectNetwork();
    if (success) {
      toast.success("Successfully switched to the correct network");
    } else {
      toast.error("Failed to switch network. Please switch manually in MetaMask");
    }
  };

  if (isCorrectNetwork) return null;

  return (
    <div className="network-warning">
      <p>You're connected to the wrong network</p>
      <button onClick={handleSwitchNetwork}>
        Switch Network
      </button>
    </div>
  );
};

export default NetworkStatus; 