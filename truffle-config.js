// Load environment variables from .env file (create this file with your mnemonic and project ID)
require('dotenv').config();

// HDWalletProvider for managing accounts
const HDWalletProvider = require('@truffle/hdwallet-provider');

// Get mnemonic and provider URL from environment variables
const mnemonic = process.env.MNEMONIC || 'replace with your mnemonic phrase';
const infuraUrl = process.env.INFURA_URL || 'replace with your infura url';

module.exports = {
  networks: {
    // Configuration for the development network (Ganache)
    development: {
      host: "127.0.0.1",     // Localhost
      port: 7545,            // Standard Ethereum port for Ganache
      network_id: "5777",    // Explicitly set the Ganache network ID
    },

    // Configuration for Sepolia testnet with Infura
    sepolia: {
      provider: () => new HDWalletProvider(
        mnemonic, 
        infuraUrl
      ),
      network_id: 11155111,  // Sepolia's network id
      gas: 5500000,          // Gas limit used for deployments
      confirmations: 2,      // # of confirmations to wait between deployments
      timeoutBlocks: 200,    // # of blocks before a deployment times out
      skipDryRun: true       // Skip dry run before migrations
    },

    // Configuration for mainnet (uncomment when ready for production)
    // mainnet: {
    //   provider: () => new HDWalletProvider(mnemonic, alchemyUrl.replace('sepolia', 'mainnet')),
    //   network_id: 1,        // Mainnet's network id
    //   gas: 5500000,         // Gas limit used for deployments
    //   gasPrice: 50000000000, // Higher gas price for mainnet
    //   confirmations: 2,     // # of confirmations to wait between deployments
    //   timeoutBlocks: 200,   // # of blocks before a deployment times out
    //   skipDryRun: false     // Run validation before deployment
    // },

    // You can add other network configurations here
    // Configuration for Goerli, Mainnet, or other testnets if needed:
    // goerli: {
    //   provider: () => new HDWalletProvider(MNEMONIC, `https://goerli.infura.io/v3/${PROJECT_ID}`),
    //   network_id: 5,       // Goerli's network id
    //   confirmations: 2,    // # of confirmations to wait between deployments
    //   timeoutBlocks: 200,  // # of blocks before a deployment times out
    //   skipDryRun: true     // Skip dry run before migrations
    // },
  },

  mocha: {
    timeout: 100000, // Default timeout value for tests
  },

  compilers: {
    solc: {
      version: "0.8.21", // Use Solidity compiler version 0.8.21
      settings: {
        optimizer: {
          enabled: true, // Enable optimizer
          runs: 200      // Set optimizer runs
        },
        evmVersion: "byzantium" // Set Ethereum Virtual Machine (EVM) version (optional)
      }
    }
  },

  db: {
    enabled: false, // Disable Truffle DB
  }
};
