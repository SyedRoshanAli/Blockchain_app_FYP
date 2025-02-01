import { create } from 'ipfs-http-client';

// Connect to a local IPFS node
const ipfs = create({ url: 'http://127.0.0.1:5004/api/v0' });

// Function to upload data to IPFS
export const uploadToIPFS = async (data) => {
    try {
        const result = await ipfs.add(data); // Directly add the data (no need to stringify JSON here if already handled)
        console.log("Uploaded to IPFS. CID:", result.path);
        return result.path; // Return the CID (IPFS hash)
    } catch (error) {
        console.error("IPFS upload failed:", error);
        throw error;
    }
};

export default ipfs;
