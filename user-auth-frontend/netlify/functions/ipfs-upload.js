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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the form data
    const { fields, files, error } = await parseMultipartForm(event);
    
    if (error) {
      return {
        statusCode: 400,
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
        body: JSON.stringify({ error: 'No file or JSON data provided' }),
      };
    }

    // Return success response with IPFS hash (CID)
    return {
      statusCode: 200,
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
      body: JSON.stringify({ 
        error: 'Failed to upload to IPFS',
        details: error.message
      }),
    };
  }
}; 