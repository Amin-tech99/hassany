# Hassaniya Transcriber

A collaborative platform for transcribing Hassaniya audio recordings.

## Features

- Audio file upload and automatic segmentation
- Assignment of segments to transcribers
- Collaborative transcription workflow
- Admin review and verification
- Export of verified transcriptions

## Deployment to Render

### Using the Dashboard

1. Create a new Render account or log in to your existing account.
2. Click "New +" and select "Web Service".
3. Connect your GitHub repository or use public Git URL.
4. Fill in the following information:
   - **Name**: hassaniya-transcriber (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `NODE_ENV`: production
6. Click "Create Web Service".

### Using the render.yaml

Alternatively, you can use the provided `render.yaml` file:

1. In the Render dashboard, go to "Blueprints".
2. Connect your GitHub repository.
3. The blueprint configuration in the `render.yaml` file will be detected automatically.
4. Follow the prompts to deploy the service.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

4. Start the production server:
   ```
   npm start
   ```

## Requirements

- Node.js 18+
- FFMPEG for audio processing 