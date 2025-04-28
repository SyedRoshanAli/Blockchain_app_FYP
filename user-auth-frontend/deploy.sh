#!/bin/bash

# Frontend Deployment Script

echo "Starting deployment process for the blockchain social media app..."

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Build the production version
echo "Building production version..."
npm run build

# 3. Prepare for deployment
echo "Preparing for deployment..."

# Deploy to Netlify (the easiest option for quick deployment)
echo "Deploying to Netlify..."
# First, check if netlify-cli is installed
if ! command -v netlify &> /dev/null
then
    echo "netlify-cli not found, installing..."
    npm install -g netlify-cli
fi

# Deploy to Netlify - will provide a unique URL that works on mobile and desktop
netlify deploy --prod --dir=build

echo "Deployment completed!"
echo "Your app is now accessible via the Netlify URL provided above."
echo "This URL works on both mobile and desktop devices."

# Uncomment and modify one of the following sections based on your hosting provider

# === For AWS S3 deployment ===
# echo "Deploying to AWS S3..."
# aws s3 sync build/ s3://your-bucket-name --delete
# echo "Invalidating CloudFront cache..."
# aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

# === For Vercel deployment ===
# echo "Deploying to Vercel..."
# vercel --prod

# === For GitHub Pages deployment ===
# echo "Deploying to GitHub Pages..."
# git add build -f
# git commit -m "Deploy to GitHub Pages"
# git subtree push --prefix build origin gh-pages

echo "Note: You need to configure your preferred deployment method by uncommenting the appropriate section in this script." 