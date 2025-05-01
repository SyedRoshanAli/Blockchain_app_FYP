#!/bin/bash

# Set Node.js to use legacy OpenSSL provider
export NODE_OPTIONS=--openssl-legacy-provider

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the development server
npm run start
