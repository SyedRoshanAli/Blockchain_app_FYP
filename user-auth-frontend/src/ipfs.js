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

// Public gateway URL
export const IPFS_GATEWAY = isLocalEnvironment() 
    ? 'http://127.0.0.1:8083/ipfs' 
    : 'https://gateway.pinata.cloud/ipfs';

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
            // Use Pinata for production
            console.log("Using Pinata for IPFS files upload...");
            
            // For simplicity, we'll just handle the first file for now
            // Convert the file to base64
            const file = files[0];
            const fileBuffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(fileBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            // Prepare the payload with the base64 encoded file
            const payload = {
                jsonData: {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    fileContent: base64
                },
                metadata: {
                    name: 'User File',
                    keyvalues: {
                        type: 'user-file',
                        fileName: file.name,
                        fileType: file.type,
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
                throw new Error(`Pinata files upload failed: ${errorData.error || response.statusText}`);
            }
            
            const result = await response.json();
            console.log("Uploaded files to Pinata IPFS. CID:", result.ipfsHash);
            
            // For compatibility with the existing code
            return [{
                hash: result.ipfsHash,
                name: file.name,
                type: file.type,
                size: file.size
            }];
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
            // In production, use Pinata gateway
            console.log("Using Pinata IPFS gateway:", `${IPFS_GATEWAY}/${hash}`);
            const response = await fetch(`${IPFS_GATEWAY}/${hash}`);
            if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (error) {
        console.error("IPFS retrieval failed completely:", error);
        throw error;
    }
};

export default ipfs;
