#!/bin/bash
export NODE_OPTIONS=--openssl-legacy-provider
export DEBUG=*
cd "$(dirname "$0")"
echo "Starting React app..."
npx react-scripts start 