# PathoNet Setup Guide

## Prerequisites

### 1. Python Installation
- Python 3.8 or higher required
- Verify installation: `python --version`
- Add Python to system PATH

### 2. Required Python Packages
```bash
pip install -r requirements.txt
```

Required packages:
- torch>=2.0.0
- torchvision>=0.15.0
- Pillow>=10.0.0
- Flask>=2.3.0
- flask-cors>=4.0.0

## Setup Verification

Run the setup verification script to check if everything is configured correctly:
```bash
python test-setup.py
```

This will check:
- Python version
- Required packages
- PathoNetV1 module import
- Model file existence
- Environment file configuration

## Configuration Files

### 1. .env File
The `.env` file must exist with the following configuration:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

For physical devices, replace `localhost` with your PC's local IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:5000
```

Find your PC's IP:
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

### 2. Model File
- Trained model: `./models/plantguard_final.pt`
- If missing, server runs in STUB mode with pseudo-random predictions
- To train: See training instructions in run_api_server.py output

## Running the API Server

### Local Development
```bash
python run_api_server.py
```

### Custom Port
```bash
set PORT=8080
python run_api_server.py
```

### Docker (Recommended for Production)
```bash
docker-compose up -d
```

## API Endpoints

- `GET /health/v2` - Health check with device profile
- `POST /predict/v2` - Disease prediction (main endpoint)
- `POST /validate` - Image quality validation
- `GET /benchmark` - Performance benchmark (dev only)

## Common Issues

### Issue: "Python was not found"
**Fix:** Add Python to system PATH
1. Search "Environment Variables" in Windows
2. Edit system PATH
3. Add Python installation directory

### Issue: "Cannot import PathoNetV1 module"
**Fix:** Install required packages
```bash
pip install -r requirements.txt
```

### Issue: "NameError: name 'platform' is not defined"
**Fix:** This has been fixed with local imports in functions. Ensure you have the latest version of PathoNetV1.py

### Issue: "Cannot reach http://localhost:5000"
**Fix:** 
1. Start the API server: `python run_api_server.py`
2. Verify server is running: Check console output
3. For physical devices: Use PC's local IP in .env file
4. Restart Expo: `npx expo start --clear`

## Testing the System

### 1. Test API Server
```bash
curl http://localhost:5000/health/v2
```

### 2. Test Prediction
```bash
curl -X POST http://localhost:5000/predict/v2 \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```

### 3. Test Expo App
```bash
cd app
npx expo start
```

## Auto-Run Configuration

### Windows Startup Folder
1. Copy `start-api-minimized.bat` to Windows startup folder
2. Press `Win + R`, type `shell:startup`
3. Paste the file
4. API will start automatically on login

### Docker Auto-Restart
```bash
docker-compose up -d
```
The container will automatically restart on failure.

### PM2 (Cross-Platform)
```bash
npm install -g pm2
pm2 start ecosystem.config.json
pm2 save
pm2-startup install
```

## Troubleshooting

### Server won't start
1. Run `python test-setup.py` to verify setup
2. Check if port 5000 is already in use: `netstat -ano | findstr :5000`
3. Check console error messages
4. Ensure all dependencies are installed

### Expo app can't connect
1. Verify API server is running
2. Check .env file configuration
3. For physical devices: Use PC's local IP, not localhost
4. Restart Expo: `npx expo start --clear`
5. Check device and PC are on same WiFi network

### Model not found
- Server will run in STUB mode
- This is expected if you haven't trained the model
- Predictions will be pseudo-random for testing

## Support

For issues:
1. Run `python test-setup.py` first
2. Check console error messages
3. Review this setup guide
4. Check API server logs
