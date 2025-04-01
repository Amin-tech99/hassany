# Deploying Hassaniya Transcriber to Railway

This guide will walk you through deploying the Hassaniya Transcriber application to Railway.

## Prerequisites

1. A [Railway](https://railway.app/) account
2. Your project code in a GitHub repository

## Deployment Steps

### 1. Connect Your Repository

1. Log in to your Railway account
2. Click on "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if you haven't already
5. Select the repository containing your Hassaniya Transcriber code

### 2. Configure Environment Variables

After connecting your repository, you'll need to set up the following environment variables:

1. Click on the "Variables" tab in your project
2. Add the following variables:
   - `NODE_ENV`: Set to `production`
   - `PORT`: Railway will automatically assign a port, but you can set it to `3000` if needed
   - `JWT_SECRET`: Set a secure random string for JWT token generation
   - `DATABASE_URL`: If you're using a database, add your database connection string

### 3. Configure Project Settings

Railway will automatically detect your Node.js project. The `railway.toml` file in your repository provides the necessary configuration:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Required packages: Node.js and ffmpeg

### 4. Deploy Your Application

1. Railway will automatically start deploying your application after you've connected your repository
2. You can monitor the deployment progress in the "Deployments" tab
3. Once deployed, Railway will provide you with a URL to access your application

### 5. Set Up Persistent Storage

The application requires persistent storage for uploaded audio files. Railway provides persistent disk storage:

1. Go to your project settings
2. Navigate to the "Volumes" tab
3. Create a new volume with the following settings:
   - Mount path: `/opt/render/project/src/uploads`
   - Size: 5GB (or as needed)

### 6. Verify Deployment

1. Visit the provided URL to ensure your application is running correctly
2. Test the audio upload and transcription features

## Troubleshooting

- If you encounter build errors, check the build logs in the "Deployments" tab
- For runtime errors, check the logs in the "Logs" tab
- Ensure all required environment variables are set correctly
- Verify that the persistent storage volume is mounted correctly

## Updating Your Application

When you push changes to your GitHub repository, Railway will automatically rebuild and redeploy your application.