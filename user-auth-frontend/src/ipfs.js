import { create } from 'ipfs-http-client';

// Connect to a local IPFS node
const ipfs = create({ url: 'http://127.0.0.1:5004/api/v0' });

// Function to upload data to IPFS
export const uploadToIPFS = async (data) => {
    try {
        const result = await ipfs.add(data);
        console.log("Uploaded to IPFS. CID:", result.path);
        return result.path; // Return the CID (IPFS hash)
    } catch (error) {
        console.error("IPFS upload failed:", error);
        throw error;
    }
};

// Function to upload multiple files to IPFS
export const uploadFilesToIPFS = async (files) => {
    try {
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
        console.log("Uploaded files to IPFS:", results);
        return results;
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
        
        // Only try IPFS if localStorage doesn't have the data
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
            console.log(`IPFS access failed (attempt ${3-retries}/2):`, error.message);
            
            // Retry logic if we have retries left
            if (retries > 0) {
                console.log("Retrying IPFS request...");
                return getFromIPFS(hash, retries - 1);
            }
            
            // If we've used all retries, throw the error
            throw error;
        }
    } catch (error) {
        console.error("IPFS retrieval failed completely:", error);
        throw error;
    }
};

export default ipfs;
