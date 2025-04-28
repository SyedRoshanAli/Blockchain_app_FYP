# Complete Deployment Guide

This guide will help you deploy your blockchain social media application so it's accessible via a link on both mobile and desktop devices.

## Deployment Process Overview

1. Deploy smart contracts to the Ethereum blockchain (Sepolia testnet or mainnet)
2. Update contract addresses in the frontend
3. Deploy the frontend to Netlify
4. Test the application

## Prerequisites

- Ethereum wallet with Sepolia testnet ETH (for testnet deployment) or real ETH (for mainnet)
- Infura or Alchemy account for accessing Ethereum networks
- Node.js and npm installed
- Git installed (optional, for version control)

## Step 1: Deploy Smart Contracts

### Set up your wallet and node provider

1. Create a `.env` file in the project root (if not already created)
2. Add your wallet mnemonic and Infura/Alchemy project ID:
   ```
   MNEMONIC='your wallet 12-word mnemonic phrase'
   PROJECT_ID='your infura or alchemy project id'
   ```

### Deploy to Sepolia Testnet

```bash
# Ensure you have test ETH in your Sepolia wallet
# You can get test ETH from a Sepolia faucet like https://sepoliafaucet.com/

# Deploy contracts to Sepolia
npx truffle migrate --network sepolia
```

### Deploy to Mainnet (Only when your app is ready for production)

```bash
# Warning: This will use real ETH for gas fees!
npx truffle migrate --network mainnet
```

### Record Contract Addresses

After deployment, note the contract addresses displayed in the console. You'll need these to update your frontend.

## Step 2: Update Contract Addresses in Frontend

Open `user-auth-frontend/src/UserAuth.js` and update the contract addresses with the ones from your deployment:

```javascript
// Example (your addresses will be different)
export const UserAuthContractAddress = '0x1234...';
export const FollowRelationshipContractAddress = '0x5678...';
export const CreatePostContractAddress = '0x9abc...';
```

## Step 3: Deploy the Frontend

The easiest way to deploy your frontend is using Netlify, which provides a free tier and creates a unique URL that works on both mobile and desktop.

### Using the Deployment Script

We've prepared a deployment script that handles everything for you:

```bash
cd user-auth-frontend
./deploy.sh
```

This script will:
1. Install dependencies
2. Build the production version
3. Deploy to Netlify
4. Provide a unique URL for your application

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
cd user-auth-frontend
npm install
npm run build
npx netlify-cli deploy --prod --dir=build
```

## Step 4: Test Your Application

After deployment, Netlify will provide a URL for your application (e.g., `https://your-app-name.netlify.app`).

Test your application on:
- Desktop browsers
- Mobile browsers
- Different device orientations
- Different screen sizes

Ensure that:
- Users can connect with MetaMask
- Smart contract interactions work
- UI is responsive on all devices

## Troubleshooting

### Contract Deployment Issues

- **Gas Price Too Low**: Increase the gas price in truffle-config.js
- **Transaction Underpriced**: Increase gas price or check network congestion
- **Nonce Too Low**: Reset your MetaMask account transaction history

### Frontend Deployment Issues

- **Build Errors**: Check console output for specific errors
- **Missing Dependencies**: Make sure all dependencies are installed (`npm install`)
- **Contract Interaction Failing**: Verify contract addresses and ABI are correct

## Maintenance

- Monitor your application for any issues
- Update smart contracts and frontend as needed
- For major updates, consider deploying new contracts and updating references

## Custom Domain (Optional)

To use a custom domain instead of the Netlify URL:

1. Purchase a domain from a registrar (e.g., Namecheap, GoDaddy)
2. In Netlify dashboard, go to "Domain settings"
3. Add your custom domain
4. Configure DNS settings as instructed by Netlify

## Security Considerations

- Never commit your `.env` file to version control
- Use environment variables for sensitive information
- Regularly audit your smart contracts for vulnerabilities
- Consider having your contracts professionally audited before mainnet deployment

## Support

If you encounter issues during deployment, consult:
- Truffle documentation: https://trufflesuite.com/docs/
- Netlify documentation: https://docs.netlify.com/
- Ethereum documentation: https://ethereum.org/developers/ 