# Vercel Deployment Guide

## Configuration File
The `vercel.json` file is already configured for this React + Vite application.

## Environment Variables Setup in Vercel

Before deploying, make sure to add these environment variables in your Vercel project settings:

### Required Environment Variables:

1. **VITE_API_URL**
   - Production: Your backend API URL (e.g., `https://your-backend-api.vercel.app/api` or your custom domain)
   - Development: `http://localhost:5001/api`

2. **Firebase Configuration** (if using Firebase):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

## How to Add Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its value
4. Select the environment (Production, Preview, Development)
5. Click **Save**

## Deployment Steps:

1. **Connect your repository to Vercel:**
   - Import your Git repository
   - Select the `frontend` folder as the root directory (or configure it in Vercel settings)

2. **Configure Build Settings:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (already in vercel.json)
   - Output Directory: `dist` (already in vercel.json)
   - Install Command: `npm install` (already in vercel.json)

3. **Add Environment Variables** (as listed above)

4. **Deploy:**
   - Click **Deploy**
   - Vercel will automatically build and deploy your app

## What the vercel.json File Does:

1. **SPA Routing:** All routes are rewritten to `/index.html` to support React Router client-side routing
2. **Caching:** Static assets (JS, CSS, images) are cached for 1 year for better performance
3. **CORS Headers:** API routes have proper CORS headers configured
4. **Build Configuration:** Automatically detects Vite framework and uses correct build settings

## Troubleshooting:

### Issue: 404 errors on routes
- **Solution:** The `rewrites` configuration in `vercel.json` should handle this. Make sure the file is in the `frontend` directory root.

### Issue: API calls failing
- **Solution:** Check that `VITE_API_URL` is set correctly in Vercel environment variables and points to your backend API.

### Issue: Build fails
- **Solution:** Check build logs in Vercel dashboard. Common issues:
  - Missing environment variables
  - Node version mismatch (Vercel uses Node 18+ by default)
  - Build command errors

## Notes:

- The `vercel.json` file handles all routing automatically
- No additional server configuration needed
- All client-side routes will work correctly
- Static assets are optimized and cached automatically

