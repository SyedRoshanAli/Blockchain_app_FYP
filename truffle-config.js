module.exports = {
  networks: {
    // Configuration for the development network (Ganache)
    development: {
      host: "127.0.0.1",     // Localhost
      port: 7545,            // Standard Ethereum port for Ganache
      network_id: "5777",    // Explicitly set the Ganache network ID
    },

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
