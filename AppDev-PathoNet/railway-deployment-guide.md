# Railway Deployment Guide for PathoNet API

## Prerequisites
- Railway account (free tier available)
- GitHub repository with your code
- Trained model file (`models/plantguard_final.pt`)

## Step 1: Prepare Your Repository

1. **Add model to git** (if not already):
   ```bash
   git add models/plantguard_final.pt
   git commit -m "Add trained model"
   git push
   ```

2. **Ensure all files are committed**:
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push
   ```

## Step 2: Deploy to Railway

1. **Go to [railway.app](https://railway.app)** and sign in
2. **Click "New Project" → "Deploy from GitHub repo"**
3. **Select your repository**
4. **Railway will automatically detect the Python service**

## Step 3: Configure Environment Variables

In your Railway project settings, add these environment variables:

```
PORT=5000
HOST=0.0.0.0
CNN_BACKBONE=mobilenet_v2
```

## Step 4: Deployment Process

1. **Railway will build using your Dockerfile**
2. **Install dependencies from requirements.txt**
3. **Start the Flask server**
4. **Health check will verify `/health/v2` endpoint**

## Step 5: Get Your API URL

After deployment, Railway will provide a URL like:
```
https://your-app-name.up.railway.app
```

Your API endpoints will be:
- Health: `https://your-app-name.up.railway.app/health/v2`
- Predict: `https://your-app-name.up.railway.app/predict/v2`
- Validate: `https://your-app-name.up.railway.app/validate`

## Step 6: Update Frontend

In your Vercel deployment, set the environment variable:
```
EXPO_PUBLIC_PRODUCTION_API_URL=https://your-app-name.up.railway.app
```

## Troubleshooting

### Build Issues
- Check that all requirements are in `requirements.txt`
- Ensure model file is committed to git

### Runtime Issues
- Check Railway logs for errors
- Verify health check is passing
- Ensure PORT environment variable is set

### Model Loading Issues
- Confirm `models/plantguard_final.pt` exists in the repository
- Check file permissions

## Monitoring

- Railway provides built-in logs and metrics
- Health check runs every 30 seconds
- Automatic restarts on failure

## Costs

- Railway free tier: $5/month credit
- Typical usage: $0-10/month depending on traffic
- Scale automatically with demand
