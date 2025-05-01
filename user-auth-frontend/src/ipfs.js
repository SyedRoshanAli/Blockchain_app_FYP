import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Function to determine if we're in a local environment
const isLocalEnvironment = () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
};

// Connect to IPFS - use local node if in development, Pinata for production
const ipfs = isLocalEnvironment()
    ? create({ url: 'http://127.0.0.1:5004/api/v0' })
    : null; // We'll use Pinata API instead for production

// Public gateway URLs - using multiple CORS-friendly gateways
export const IPFS_GATEWAYS = isLocalEnvironment()
    ? ['http://127.0.0.1:8083/ipfs']
    : [
        'https://ipfs.io/ipfs',
        'https://cloudflare-ipfs.com/ipfs',
        'https://ipfs.fleek.co/ipfs',
        'https://gateway.ipfs.io/ipfs',
        'https://dweb.link/ipfs'
      ];

// Primary gateway for initial attempts
export const IPFS_GATEWAY = IPFS_GATEWAYS[0];

// Function to upload data to IPFS
export const uploadToIPFS = async (data) => {
    try {
        if (isLocalEnvironment()) {
            // Use local IPFS node
            const result = await ipfs.add(data);
            console.log("Uploaded to local IPFS. CID:", result.path);
            return result.path; // Return the CID (IPFS hash)
        } else {
            // Use Pinata for production
            console.log("Using Pinata for IPFS upload...");
            
            // Prepare the data for direct JSON upload
            const userData = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Prepare the payload
            const payload = {
                jsonData: JSON.parse(userData),
                metadata: {
                    name: 'User Data',
                    keyvalues: {
                        type: 'user-data',
                        timestamp: new Date().toISOString()
                    }
                }
            };
            
            // Send to our Netlify function with the correct path
            const response = await fetch('/.netlify/functions/ipfs-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: response.statusText };
                }
                throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
            }
            
            const result = await response.json();
            console.log("Uploaded to Pinata IPFS. CID:", result.ipfsHash);
            return result.ipfsHash;
        }
    } catch (error) {
        console.error("IPFS upload failed:", error);
        throw error;
    }
};

// Function to upload multiple files to IPFS
export const uploadFilesToIPFS = async (files) => {
    try {
        if (isLocalEnvironment() && ipfs) {
            // Use local IPFS node
            const results = [];
            for (const file of files) {
                // Convert file to buffer
                const buffer = await file.arrayBuffer();
                const result = await ipfs.add(buffer);
                results.push({
                    hash: result.path,
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
            }
            console.log("Uploaded files to local IPFS:", results);
            return results;
        } else {
            // Use Pinata for production via Netlify function
            console.log("Using Netlify function for IPFS files upload...");
            
            // Process all files and create results array
            const results = [];
            
            for (const file of files) {
                try {
                    // Create FormData for multipart upload
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    // Add metadata as JSON string
                    const metadata = {
                        name: file.name,
                        keyvalues: {
                            type: 'user-file',
                            fileName: file.name,
                            fileType: file.type,
                            timestamp: new Date().toISOString()
                        }
                    };
                    formData.append('metadata', JSON.stringify(metadata));
                    
                    console.log(`Uploading file ${file.name} to Netlify function...`);
                    
                    // Send to our Netlify function with the correct path
                    const response = await fetch('/.netlify/functions/ipfs-upload', {
                        method: 'POST',
                        // Don't set Content-Type header - browser will set it with boundary
                        body: formData,
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    console.log(`File ${file.name} uploaded to IPFS. CID:`, result.ipfsHash);
                    
                    // Add to results array
                    results.push({
                        hash: result.ipfsHash,
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                } catch (error) {
                    console.error(`Error uploading file ${file.name}:`, error);
                    throw error;
                }
            }
            
            // Return all the results
            console.log("All files uploaded to IPFS:", results);
            return results;
        }
    } catch (error) {
        console.error("IPFS files upload failed:", error);
        throw error;
    }
};

// Function to get data from IPFS
export const getFromIPFS = async (hash, retries = 2) => {
    try {
        // Always check local storage first
        const localPosts = JSON.parse(localStorage.getItem('localPosts') || '{}');
        if (localPosts[hash]) {
            console.log("Using cached post from localStorage:", hash);
            // Return the data from localStorage directly as a Buffer
            return Buffer.from(JSON.stringify(localPosts[hash]));
        }
        
        // Try local IPFS node if in development environment
        if (isLocalEnvironment() && ipfs) {
            try {
                const stream = ipfs.cat(hash);
                const chunks = [];
                
                // Add a timeout mechanism
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("IPFS request timeout")), 5000);
                });
                
                const streamPromise = (async () => {
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    return chunks;
                })();
                
                // Race between the IPFS fetch and the timeout
                const fetchedChunks = await Promise.race([streamPromise, timeoutPromise]);
                
                if (fetchedChunks.length === 0) {
                    throw new Error("No data received from local IPFS");
                }
                
                const validChunks = fetchedChunks.filter(chunk => Buffer.isBuffer(chunk));
                
                if (validChunks.length === 0) {
                    throw new Error("No valid buffer chunks received from local IPFS");
                }
                
                return Buffer.concat(validChunks);
            } catch (error) {
                console.log(`Local IPFS access failed (attempt ${3-retries}/2):`, error.message);
                
                // Try gateway as fallback for local development
                if (retries > 0) {
                    console.log("Trying public gateway as fallback...");
                    const response = await fetch(`${IPFS_GATEWAY}/${hash}`);
                    if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    return Buffer.from(arrayBuffer);
                }
                
                throw error;
            }
        } else {
            // In production, use a proxy approach to avoid CORS issues
            // First, try to use our Netlify function as a proxy
            try {
                console.log(`Using Netlify function to proxy IPFS content: ${hash}`);
                
                // Create a request to our Netlify function
                const response = await fetch('/.netlify/functions/ipfs-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ hash })
                });
                
                if (!response.ok) {
                    throw new Error(`Proxy error: ${response.status}`);
                }
                
                const arrayBuffer = await response.arrayBuffer();
                console.log(`Successfully retrieved from proxy`);
                return Buffer.from(arrayBuffer);
            } catch (proxyError) {
                console.warn(`Proxy retrieval failed:`, proxyError.message);
                
                // Fallback to client-side approach using Image/Video objects to avoid CORS
                // This works for media files but not for JSON data
                console.log(`Trying client-side approach with <img> tag for hash: ${hash}`);
                
                // Create a promise that resolves when the image loads
                const mediaPromise = new Promise((resolve, reject) => {
                    // Try each gateway
                    let gatewayIndex = 0;
                    const tryNextGateway = () => {
                        if (gatewayIndex >= IPFS_GATEWAYS.length) {
                            reject(new Error('All gateways failed'));
                            return;
                        }
                        
                        const gateway = IPFS_GATEWAYS[gatewayIndex];
                        const url = `${gateway}/${hash}`;
                        console.log(`Trying IPFS gateway ${gatewayIndex+1}/${IPFS_GATEWAYS.length}:`, url);
                        
                        // Create an image element to test loading
                        const img = new Image();
                        img.crossOrigin = 'anonymous'; // Try to avoid CORS issues
                        
                        img.onload = () => {
                            console.log(`Successfully loaded image from gateway ${gatewayIndex+1}`);
                            resolve(url);
                        };
                        
                        img.onerror = () => {
                            console.warn(`Gateway ${gatewayIndex+1} failed to load image`);
                            gatewayIndex++;
                            setTimeout(tryNextGateway, 100); // Try next gateway with a small delay
                        };
                        
                        img.src = url;
                    };
                    
                    tryNextGateway();
                });
                
                try {
                    // Wait for a working gateway URL
                    const workingUrl = await mediaPromise;
                    
                    // Now fetch the content using no-cors mode
                    // This won't give us the actual content, but at least we know the URL works
                    console.log(`Found working URL: ${workingUrl}, storing in localStorage`);
                    
                    // Store the working URL in localStorage for future use
                    const gatewayCache = JSON.parse(localStorage.getItem('ipfsGatewayCache') || '{}');
                    gatewayCache[hash] = workingUrl;
                    localStorage.setItem('ipfsGatewayCache', JSON.stringify(gatewayCache));
                    
                    // Return a simple buffer with the URL
                    // The actual content will be loaded by the <img> or <video> tag
                    return Buffer.from(workingUrl);
                } catch (mediaError) {
                    console.error(`All client-side approaches failed:`, mediaError.message);
                    throw new Error('Failed to retrieve content from IPFS');
                }
            }
        }
    } catch (error) {
        console.error("IPFS retrieval failed completely:", error);
        throw error;
    }
};

export default ipfs;
