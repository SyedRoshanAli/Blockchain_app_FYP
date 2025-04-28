// Pinata IPFS service for handling uploads in production

// Use environment variables for sensitive API keys in production
// For this example, replace these with your actual Pinata API keys
const PINATA_API_KEY = 'YOUR_PINATA_API_KEY';
const PINATA_SECRET_KEY = 'YOUR_PINATA_SECRET_KEY';

// For testing, check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

let pinata;
if (!isBrowser) {
  // Only import and initialize the SDK on the server side
  // (This won't execute in browser context)
  const PinataSDK = require('@pinata/sdk');
  pinata = new PinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);
}

// Client-side helper function to send files to our server endpoint
export const uploadToPinata = async (files, metadata = {}) => {
  try {
    // Create FormData to send the files
    const formData = new FormData();
    
    if (Array.isArray(files)) {
      // Handle multiple files
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
    } else if (typeof files === 'string') {
      // Handle JSON data
      const blob = new Blob([files], { type: 'application/json' });
      formData.append('file', blob, 'data.json');
    } else {
      // Handle single file
      formData.append('file', files);
    }
    
    // Add metadata
    formData.append('metadata', JSON.stringify(metadata));
    
    // Send to our server endpoint
    // In a real implementation, this would be your deployed serverless function or API endpoint
    const response = await fetch('https://your-backend-service.com/api/pinata/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload to Pinata: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.ipfsHash; // Return the IPFS hash (CID)
  } catch (error) {
    console.error('Pinata upload failed:', error);
    throw error;
  }
};

// Server-side function to pin data to IPFS via Pinata
// This would run in your serverless function or backend
export const pinFileToIPFS = async (fileBuffer, metadata = {}) => {
  if (isBrowser) {
    throw new Error('This function can only be executed on the server side');
  }
  
  try {
    const options = {
      pinataMetadata: {
        name: metadata.name || 'File Upload',
        keyvalues: { ...metadata }
      }
    };
    
    const result = await pinata.pinFileToIPFS(fileBuffer, options);
    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata server-side upload failed:', error);
    throw error;
  }
};

// Server-side function to pin JSON to IPFS via Pinata
export const pinJSONToIPFS = async (jsonData, metadata = {}) => {
  if (isBrowser) {
    throw new Error('This function can only be executed on the server side');
  }
  
  try {
    const options = {
      pinataMetadata: {
        name: metadata.name || 'JSON Data',
        keyvalues: { ...metadata }
      }
    };
    
    const result = await pinata.pinJSONToIPFS(jsonData, options);
    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata server-side JSON upload failed:', error);
    throw error;
  }
};

// Utility function to generate a gateway URL for an IPFS hash
export const getPinataGatewayUrl = (ipfsHash) => {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}; 