# Pinata IPFS Setup Instructions

This app now uses Pinata for IPFS storage in production, which means users can upload files and data without needing to run a local IPFS node.

## Setup Steps

1. **Create a Pinata Account**:
   - Go to [Pinata](https://www.pinata.cloud/) and sign up for an account
   - Once logged in, go to the API Keys section and create a new API key
   - Make sure to give the key permissions for pinning

2. **Set Environment Variables in Netlify**:
   - In your Netlify dashboard, go to your site settings
   - Navigate to "Environment variables"
   - Add the following variables:
     - `PINATA_API_KEY`: Your Pinata API key
     - `PINATA_SECRET_KEY`: Your Pinata API secret

3. **Redeploy Your Application**:
   - Trigger a new build in Netlify to ensure the environment variables are used

## Testing IPFS Functionality

After setup, your deployed application should be able to:
1. Upload data to IPFS through Pinata
2. Retrieve content from IPFS via the Pinata gateway
3. Function without requiring users to run a local IPFS node

## Troubleshooting

If you experience issues:
1. Check the browser console for error messages
2. Verify your Pinata API key permissions
3. Confirm the environment variables are correctly set in Netlify
4. Check the Netlify function logs for details on serverless function errors

## Local Development

When running the app locally:
1. The app will still try to use a local IPFS node first
2. If you want to test the Pinata integration locally:
   - Create a `.env` file in the root directory with your Pinata credentials
   - Run the app with `netlify dev` instead of `npm start` to enable the serverless functions 