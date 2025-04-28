# Blockchain Social Media App

A decentralized social media application built with Ethereum blockchain technology.

## Project Structure

- `contracts/` - Solidity smart contracts
- `migrations/` - Truffle migration scripts
- `user-auth-frontend/` - React frontend application
- `test/` - Smart contract tests

## Quick Start Deployment (Link for Mobile and Desktop)

For a quick deployment that works on both mobile and desktop:

1. Check deployment readiness:
   ```
   node deployment-checker.js
   ```

2. Create a `.env` file:
   ```
   MNEMONIC='your wallet mnemonic phrase here'
   PROJECT_ID='your infura or alchemy project id here'
   ```

3. Deploy smart contracts:
   ```
   npx truffle migrate --network sepolia
   ```

4. Update contract addresses in frontend (`user-auth-frontend/src/UserAuth.js`)

5. Deploy the frontend:
   ```
   cd user-auth-frontend
   ./deploy.sh
   ```

6. Use the provided Netlify URL to access your app on any device

For more detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Deployment Instructions

### 1. Smart Contract Deployment

#### Prerequisites
- Install Node.js and npm
- Install Truffle: `npm install -g truffle`
- Create an account with Infura or Alchemy to access Ethereum networks
- Have a wallet with test ETH for the target network (e.g., Sepolia testnet)

#### Configuration
1. Create a `.env` file in the root directory with your wallet mnemonic and Infura/Alchemy API key:
   ```
   MNEMONIC='your wallet mnemonic phrase here'
   PROJECT_ID='your infura or alchemy project id here'
   ```

2. Install HDWalletProvider:
   ```
   npm install @truffle/hdwallet-provider dotenv
   ```

3. Uncomment and configure the provider section in `truffle-config.js`

#### Deploy to Testnet
```
truffle migrate --network sepolia
```

#### Deploy to Mainnet
```
truffle migrate --network mainnet
```

### 2. Frontend Deployment

#### Prerequisites
- Complete the smart contract deployment
- Note the deployed contract addresses

#### Configuration
1. Update contract addresses in the frontend:
   - Navigate to `user-auth-frontend/src/UserAuth.js`
   - Update the contract addresses with the newly deployed addresses

2. Build the frontend:
   ```
   cd user-auth-frontend
   npm install
   npm run build
   ```

#### Deployment Options

##### Option 1: Deploy to Netlify
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Deploy: `netlify deploy --prod --dir=build`

##### Option 2: Deploy to Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`

##### Option 3: Deploy to AWS S3 + CloudFront
1. Configure AWS CLI with your credentials
2. Deploy: `aws s3 sync build/ s3://your-bucket-name --delete`
3. Invalidate CloudFront cache if using CloudFront

##### Option 4: Deploy to GitHub Pages
1. Update `package.json` with `"homepage": "https://yourusername.github.io/repo-name"`
2. Use the deploy script in `deploy.sh`

## Running Locally

1. Start a local blockchain (e.g., Ganache): `ganache-cli`
2. Deploy contracts to local network: `truffle migrate --network development`
3. Start the frontend: `cd user-auth-frontend && npm start`

## License

[Specify your license here] 