const fetch = require('node-fetch');

// List of CORS-friendly IPFS gateways to try
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://ipfs.fleek.co/ipfs',
  'https://gateway.ipfs.io/ipfs',
  'https://dweb.link/ipfs'
];

exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Allow both GET and POST requests
  let hash;
  
  try {
    if (event.httpMethod === 'GET') {
      // Get hash from query parameters
      const params = event.queryStringParameters;
      hash = params.hash;
    } else if (event.httpMethod === 'POST') {
      // Parse the request body
      const body = JSON.parse(event.body);
      hash = body.hash;
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
    
    if (!hash) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'IPFS hash is required' })
      };
    }

    // Clean the hash by removing any ipfs:// or /ipfs/ prefix
    const cleanHash = hash.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '');
    
    // Try each gateway in sequence
    let lastError = null;
    
    for (const gateway of IPFS_GATEWAYS) {
      try {
        console.log(`Trying IPFS gateway: ${gateway}/${cleanHash}`);
        
        const response = await fetch(`${gateway}/${cleanHash}`, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            'User-Agent': 'Netlify Function IPFS Proxy'
          },
          timeout: 10000
        });
        
        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status}`);
        }
        
        // Get the content type from the response
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Get the response as an array buffer
        const buffer = await response.buffer();
        
        // Return the content with the appropriate content type
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true
        };
      } catch (error) {
        console.log(`Gateway ${gateway} failed:`, error.message);
        lastError = error;
        // Continue to next gateway
      }
    }
    
    // If we get here, all gateways failed
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to retrieve content from IPFS',
        details: lastError ? lastError.message : 'All gateways failed'
      })
    };
  } catch (error) {
    console.error('IPFS proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
