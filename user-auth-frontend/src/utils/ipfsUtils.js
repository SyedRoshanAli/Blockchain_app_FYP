import { IPFS_GATEWAY, IPFS_GATEWAYS, getFromIPFS } from '../ipfs';
import ipfs from '../ipfs';

// Function to determine if we're in a local environment
const isLocalEnvironment = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Get a properly formatted IPFS URL for a hash
 * @param {string} hash - IPFS content hash
 * @param {number} gatewayIndex - Index of gateway to use (0 = default)
 * @returns {string} - Formatted URL
 */
export const getIpfsUrl = (hash, gatewayIndex = 0) => {
  // Return null if hash is null or undefined
  if (!hash) return null;
  
  // Clean the hash by removing any ipfs:// or /ipfs/ prefix
  const cleanHash = hash.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '');
  
  // Use the gateway at the specified index, or the first one if out of bounds
  if (gatewayIndex >= 0 && gatewayIndex < IPFS_GATEWAYS.length) {
    return `${IPFS_GATEWAYS[gatewayIndex]}/${cleanHash}`;
  }
  
  // Default to the primary gateway if the index is out of bounds
  return `${IPFS_GATEWAY}/${cleanHash}`;
};

/**
 * Extract media URLs from post content
 * @param {Object} content - Post content object
 * @returns {Array} - Array of media URLs
 */
export const extractMediaUrls = (content) => {
  if (!content) return [];
  
  const mediaUrls = [];
  
  // Handle direct mediaUrl property
  if (content.mediaUrl) {
    mediaUrls.push(content.mediaUrl);
  }
  
  // Handle media array
  if (content.media && Array.isArray(content.media)) {
    content.media.forEach(media => {
      if (media.hash) {
        mediaUrls.push(getIpfsUrl(media.hash));
      }
    });
  }
  
  return mediaUrls;
};

/**
 * Create a data URL for an image
 * @param {string} type - Image MIME type
 * @param {string} content - Base64 encoded content
 * @returns {string} - Data URL
 */
export const createDataUrl = (type, content) => {
  return `data:${type};base64,${content}`;
};

/**
 * Generate a placeholder image for when media fails to load
 * @param {string} text - Text to display in the placeholder
 * @returns {string} - Data URL for placeholder image
 */
export const generatePlaceholderImage = (text = 'Image Unavailable') => {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3E" + text + "%3C/text%3E%3C/svg%3E";
};

/**
 * Check if a URL is accessible
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - True if accessible
 */
export const isUrlAccessible = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get a working media URL or fallback
 * @param {Object} media - Media object with hash and type
 * @returns {string} - URL to display
 */
export const getWorkingMediaUrl = async (media) => {
  if (!media || !media.hash) {
    return generatePlaceholderImage();
  }
  
  // Try each gateway
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const url = getIpfsUrl(media.hash, i);
    try {
      const isAccessible = await isUrlAccessible(url);
      if (isAccessible) {
        return url;
      }
    } catch (error) {
      console.error(`Error checking gateway ${url}:`, error);
    }
  }
  
  // If we have a local preview, use that
  if (media.preview) {
    return media.preview;
  }
  
  // Last resort - return placeholder
  return generatePlaceholderImage();
};

/**
 * Function to try loading an image from multiple IPFS gateways
 * @param {string} hash - IPFS hash
 * @returns {Promise<string|null>} - URL of working gateway or null
 */
export const findWorkingIpfsUrl = async (hash) => {
  if (!hash) return null;
  
  // Clean the hash if it has an ipfs:// prefix
  const cleanHash = hash.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '');
  
  // Validate the hash format (basic validation)
  if (!cleanHash.startsWith('Qm') || cleanHash.length < 46) {
    console.error(`Invalid IPFS hash format: ${cleanHash}`);
    return null;
  }
  
  // Special case for the example IPFS hash
  if (cleanHash === 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB') {
    return `${IPFS_GATEWAY}/${cleanHash}`;
  }
  
  // If we're in a local environment and have a local IPFS node, try that first
  if (isLocalEnvironment() && ipfs) {
    try {
      console.log(`Trying local IPFS node for ${cleanHash}`);
      // Just check if the hash exists in the local node
      await ipfs.cat(cleanHash, { timeout: 2000, length: 1 });
      return `${IPFS_GATEWAY}/${cleanHash}`;
    } catch (error) {
      console.log(`Local IPFS node failed for ${cleanHash}:`, error);
    }
  }
  
  // Try each gateway in sequence
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    try {
      const gateway = IPFS_GATEWAYS[i];
      const url = `${gateway}/${cleanHash}`;
      console.log(`Trying IPFS gateway ${i+1}/${IPFS_GATEWAYS.length}: ${url}`);
      
      // Use an image object to test if the URL works
      // This approach avoids CORS issues that can happen with fetch
      const result = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ success: true, url });
        img.onerror = () => resolve({ success: false });
        
        // Set a timeout in case the request hangs
        const timeout = setTimeout(() => {
          resolve({ success: false });
        }, 5000);
        
        // Start loading the image
        img.src = url;
        
        // Clean up timeout if image loads or errors
        img.onload = () => {
          clearTimeout(timeout);
          resolve({ success: true, url });
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve({ success: false });
        };
      });
      
      if (result.success) {
        console.log(`Gateway ${i+1} succeeded for ${cleanHash}`);
        return result.url;
      }
    } catch (error) {
      console.log(`Gateway ${i+1} failed for ${cleanHash}:`, error);
    }
  }
  
  // If all gateways failed, return null
  console.error(`All gateways failed for ${cleanHash}`);
  return null;
};

/**
 * Safely fetch JSON data from IPFS with CORS handling and caching
 * @param {string} hash - IPFS hash
 * @param {string} cacheKey - Key to use for localStorage caching
 * @returns {Promise<Object|null>} - Parsed JSON data or null if failed
 */
export const safelyFetchIpfsJson = async (hash, cacheKey = null) => {
  if (!hash) return null;
  
  // Clean the hash if it has an ipfs:// prefix
  const cleanHash = hash.replace('ipfs://', '');
  
  // Check cache first if a cacheKey is provided
  if (cacheKey) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log(`Using cached data for ${cleanHash}`);
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
  }
  
  try {
    // Use the getFromIPFS function from ipfs.js
    const buffer = await getFromIPFS(cleanHash);
    if (!buffer) {
      throw new Error('No data returned from IPFS');
    }
    
    // Convert buffer to string
    const dataStr = buffer.toString();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      // If parsing fails, use the text as is
      console.warn('Failed to parse IPFS data as JSON:', e);
      data = { content: dataStr };
    }
    
    // Cache the result if a cacheKey is provided
    if (cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching data:', error);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching JSON from IPFS for ${cleanHash}:`, error);
    
    // Try all available gateways if the main method fails
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      try {
        const url = `${IPFS_GATEWAYS[i]}/${cleanHash}`;
        console.log(`Attempting fallback fetch from gateway ${i}: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          },
          cache: 'force-cache'
        });
        
        if (response.ok) {
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // If not JSON, try to parse it as JSON anyway
            try {
              const text = await response.text();
              data = JSON.parse(text);
            } catch (e) {
              // If parsing fails, use the text as is
              data = { content: await response.text() };
            }
          }
          
          console.log(`Successfully fetched data from fallback gateway ${i}`);
          
          // Cache the result if a cacheKey is provided
          if (cacheKey) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                data,
                timestamp: Date.now()
              }));
            } catch (error) {
              console.error('Error caching data:', error);
            }
          }
          
          return data;
        }
      } catch (fallbackError) {
        console.log(`Fallback gateway ${i} failed:`, fallbackError);
      }
    }
    
    // If all methods fail, return null
    console.error(`Failed to fetch data from all sources for ${cleanHash}`);
    return null;
  }
};
