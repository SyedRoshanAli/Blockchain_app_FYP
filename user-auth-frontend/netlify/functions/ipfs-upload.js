const PinataSDK = require('@pinata/sdk');
const formidable = require('formidable');
const fs = require('fs');

// Initialize Pinata client
const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

// Function to parse multipart form data
const parseMultipartForm = (event) => {
  return new Promise((resolve) => {
    const form = formidable({ multiples: true });
    
    form.parse(event, (err, fields, files) => {
      if (err) {
        resolve({ error: err });
        return;
      }
      
      resolve({ fields, files });
    });
  });
};

exports.handler = async (event, context) => {
  // Add CORS headers for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the form data
    const { fields, files, error } = await parseMultipartForm(event);
    
    if (error) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: 'Failed to parse form data' }),
      };
    }

    // Get metadata if provided
    const metadata = fields.metadata ? JSON.parse(fields.metadata) : {};
    
    // Set up Pinata options
    const options = {
      pinataMetadata: {
        name: metadata.name || 'User Upload',
        keyvalues: { ...metadata }
      }
    };

    let result;
    
    // Check if we received a file
    if (files.file) {
      // Read the file buffer
      const fileBuffer = fs.readFileSync(files.file.path);
      
      // Upload file to IPFS via Pinata
      result = await pinata.pinFileToIPFS(fileBuffer, options);
    } 
    // Check if we received JSON data
    else if (fields.jsonData) {
      // Parse the JSON data
      const jsonData = JSON.parse(fields.jsonData);
      
      // Upload JSON to IPFS via Pinata
      result = await pinata.pinJSONToIPFS(jsonData, options);
    } 
    else {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: 'No file or JSON data provided' }),
      };
    }

    // List of CORS-friendly IPFS gateways
    const corsGateways = [
      'https://ipfs.io/ipfs',
      'https://cloudflare-ipfs.com/ipfs',
      'https://dweb.link/ipfs',
      'https://ipfs.fleek.co/ipfs',
      'https://gateway.pinata.cloud/ipfs'
    ];

    // Return success response with IPFS hash (CID) and multiple gateway URLs
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        success: true, 
        ipfsHash: result.IpfsHash,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        gatewayUrls: corsGateways.map(gateway => `${gateway}/${result.IpfsHash}`)
      }),
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Failed to upload to IPFS',
        details: error.message
      }),
    };
  }
}; 