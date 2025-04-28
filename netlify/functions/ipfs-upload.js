const PinataSDK = require('@pinata/sdk');

// Initialize Pinata client with environment variables
const apiKey = process.env.PINATA_API_KEY;
const secretKey = process.env.PINATA_SECRET_KEY;

// Debug: Log if API keys are present (without revealing full values)
console.log(`PINATA_API_KEY present: ${!!apiKey} (${apiKey ? apiKey.substring(0, 4) + '...' : 'undefined'})`);
console.log(`PINATA_SECRET_KEY present: ${!!secretKey} (${secretKey ? secretKey.substring(0, 4) + '...' : 'undefined'})`);

// Create Pinata client - not using try/catch to get more specific errors
const pinata = apiKey && secretKey ? new PinataSDK(apiKey, secretKey) : null;

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
  console.log('IPFS upload function triggered');
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Check if Pinata SDK is initialized
    if (!pinata) {
      console.error('Pinata SDK not initialized properly. API credentials missing or invalid.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Pinata SDK not initialized',
          details: 'API credentials may be missing or invalid'
        }),
      };
    }

    // Test Pinata connection
    try {
      await pinata.testAuthentication();
      console.log('Pinata authentication successful');
    } catch (authError) {
      console.error('Pinata authentication failed:', authError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Pinata authentication failed',
          details: authError.message
        }),
      };
    }

    console.log('Processing request body...');
    
    // Parse request body
    let data;
    try {
      // If the body is a string, parse it as JSON
      if (typeof event.body === 'string') {
        data = JSON.parse(event.body);
      } else {
        data = event.body;
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request body',
          details: 'Could not parse JSON data'
        }),
      };
    }

    console.log('Request body parsed successfully:', Object.keys(data));
    
    // Extract content to upload
    let result;
    const metadata = data.metadata || {
      name: 'User Data Upload',
      keyvalues: {
        timestamp: new Date().toISOString()
      }
    };
    
    // Set up Pinata options
    const options = {
      pinataMetadata: {
        name: metadata.name || 'User Upload',
        keyvalues: metadata.keyvalues || {}
      }
    };

    // Check if we have JSON data to upload
    if (data.jsonData) {
      console.log('Uploading JSON data to Pinata...');
      
      // Upload JSON to IPFS via Pinata
      result = await pinata.pinJSONToIPFS(data.jsonData, options);
      console.log('JSON data uploaded successfully to Pinata');
    } else {
      console.error('No JSON data provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No JSON data provided' }),
      };
    }

    // Return success response with IPFS hash (CID)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        ipfsHash: result.IpfsHash,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
      }),
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to upload to IPFS',
        details: error.message,
        stack: error.stack
      }),
    };
  }
}; 