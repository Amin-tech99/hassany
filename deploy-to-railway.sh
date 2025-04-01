#!/bin/bash

# Script to help deploy Hassaniya Transcriber to Railway

echo "=== Hassaniya Transcriber Railway Deployment Helper ==="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm i -g @railway/cli
fi

# Login to Railway
echo "Please login to Railway:"
railway login

# Initialize Railway project
echo ""
echo "Initializing Railway project..."
railway init

# Set environment variables
echo ""
echo "Setting up environment variables..."
railway variables set NODE_ENV=production

# Prompt for JWT secret
echo ""
echo "Enter a secure JWT secret (or press enter to generate one):"
read jwt_secret

if [ -z "$jwt_secret" ]; then
    jwt_secret=$(openssl rand -hex 32)
    echo "Generated JWT secret: $jwt_secret"
fi

railway variables set JWT_SECRET="$jwt_secret"

# Deploy the application
echo ""
echo "Deploying application to Railway..."
railway up

echo ""
echo "=== Deployment Complete ==="
echo "Your application is now being deployed to Railway."
echo "Visit https://railway.app/dashboard to monitor your deployment."
echo ""
echo "Don't forget to set up a persistent volume for uploads:"
echo "1. Go to your project settings in Railway dashboard"
echo "2. Navigate to the 'Volumes' tab"
echo "3. Create a new volume with mount path: /opt/render/project/src/uploads"
echo "4. Set an appropriate size (recommended: 5GB)"
echo ""
echo "Once deployment is complete, you can open your application with:"
echo "railway open"