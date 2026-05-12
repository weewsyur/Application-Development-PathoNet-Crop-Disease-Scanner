# PathoNet API Auto-Run Configuration

This document explains how to configure the PathoNet Flask API server to run automatically on your system.

## Option 1: Windows Startup Folder (Easiest)

1. Copy `start-api-minimized.bat` to your Windows startup folder:
   - Press `Win + R`, type `shell:startup`, and press Enter
   - Copy `start-api-minimized.bat` to that folder
2. The API will start automatically when you log in to Windows
3. It runs in a minimized window

## Option 2: Windows Service (Recommended)

Using NSSM (Non-Sucking Service Manager):

1. Download NSSM from https://nssm.cc/download
2. Extract and run `nssm.exe` as Administrator
3. Configure the service:
   - **Path**: `C:\Python310\python.exe` (or your Python path)
   - **Startup directory**: `C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet`
   - **Arguments**: `run_api_server.py`
   - **Service name**: `PathoNetAPI`
4. Click "Install service"
5. Start the service: `nssm start PathoNetAPI`

Or use the provided XML configuration with NSSM:
```bash
nssm install PathoNetAPI pathonet-service.xml
nssm start PathoNetAPI
```

## Option 3: PM2 (Cross-Platform)

1. Install PM2 globally:
```bash
npm install -g pm2
npm install -g pm2-windows-startup
```

2. Install PM2 as a Windows service:
```bash
pm2-startup install
```

3. Start the API with PM2:
```bash
cd C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet
pm2 start ecosystem.config.json
pm2 save
```

4. PM2 will automatically start the API on system boot

## Option 4: Docker (Best for Production)

1. Install Docker Desktop from https://www.docker.com/products/docker-desktop

2. Build and run the container:
```bash
cd C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet
docker-compose up -d
```

3. The API will start automatically and restart if it crashes

4. View logs:
```bash
docker-compose logs -f pathonet-api
```

5. Stop the API:
```bash
docker-compose down
```

## Verification

After starting the API, verify it's running:

```bash
curl http://localhost:5000/health/v2
```

Or open in browser: http://localhost:5000/health/v2

## Troubleshooting

**Port 5000 already in use:**
- Check what's using the port: `netstat -ano | findstr :5000`
- Kill the process or change the port in `run_api_server.py`

**Python not found:**
- Ensure Python is installed and added to PATH
- Update the Python path in the batch files

**Service won't start:**
- Check Windows Event Viewer for error logs
- Run the batch file manually to see error messages
- Ensure all dependencies are installed: `pip install -r requirements.txt`

## Recommended Setup

For development: **Option 1 (Startup Folder)**
For production: **Option 4 (Docker)**
For robust service: **Option 2 (Windows Service with NSSM)**
