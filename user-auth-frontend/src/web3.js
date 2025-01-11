import Web3 from 'web3';

let web3;

async function initializeWeb3() {
    if (window.ethereum) {
        try {
            // Request account access from MetaMask
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Create a new Web3 instance with the Ethereum provider
            web3 = new Web3(window.ethereum);

            // Check the connected network ID
            const networkId = await window.ethereum.request({ method: 'net_version' });

            // Replace '1337' with your desired network ID (e.g., Ganache or other network)
            const requiredNetworkId = '1337';

            if (networkId !== requiredNetworkId) {
                alert(`Please connect to the correct Ethereum network. Expected network ID: ${requiredNetworkId}`);
            } else {
                console.log('Connected to the correct network:', networkId);
            }

            // Check if the network supports EIP-1559
            const latestBlock = await web3.eth.getBlock('latest');
            if (latestBlock.baseFeePerGas) {
                console.log('EIP-1559 is supported on this network.');
            } else {
                console.log('EIP-1559 is NOT supported on this network.');
            }
        } catch (error) {
            console.error('Error accessing MetaMask:', error);
        }
    } else {
        console.warn('No Ethereum provider found. Install MetaMask.');
        
        // Fallback to a local provider (e.g., Ganache)
        web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
        console.log('Using fallback local provider at http://127.0.0.1:8545');
    }

    return web3;
}

// Ensure the function initializes and exports the Web3 instance properly
export const getWeb3 = async () => {
    if (!web3) {
        web3 = await initializeWeb3();
    }
    return web3;
};
