#!/bin/bash

# Set environment variables
export NODE_OPTIONS=--openssl-legacy-provider
export CI=false
export SKIP_PREFLIGHT_CHECK=true

# Clean up previous build
rm -rf build

# Run the build
echo "Starting build process..."
npx react-app-rewired build

echo "Build process completed!"
