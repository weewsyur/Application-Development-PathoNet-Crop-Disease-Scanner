# Python API Setup Guide

## Quick Setup (Recommended)

Run the automated setup script:

```bash
npm run setup:python
```

This will:
- Check Python installation (requires Python 3.8+)
- Create a virtual environment in `.venv/`
- Install all required dependencies from `requirements.txt`
- Verify the installation

## Manual Setup

If the automated script doesn't work, follow these steps:

### 1. Install Python

Ensure Python 3.8+ is installed and in your PATH:
```bash
python --version
# or
python3 --version
```

Download from: https://python.org

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify Installation

```bash
python -c "import numpy; import torch; import flask; print('All dependencies OK')"
```

## Dependencies

The following packages are required:

- numpy>=1.24.0
- torch>=2.0.0
- torchvision>=0.15.0
- pillow>=10.0.0
- Flask>=2.3.0
- flask-cors>=4.0.0
- Werkzeug>=2.3.0

## Starting the API Server

### With npm (Recommended)

```bash
npm start          # Start API + Expo dev server
npm run web        # Start API + Expo web
npm run android    # Start API + Expo Android
npm run ios        # Start API + Expo iOS
```

### Direct Python

```bash
# Make sure virtual environment is activated
python run_api_server.py
```

## Troubleshooting

### "No module named 'numpy'"

Run the setup script:
```bash
npm run setup:python
```

Or manually:
```bash
pip install -r requirements.txt
```

### "plant_disease_cnn not importable"

This should be fixed now - a stub module has been created. If you still see this error:
1. Ensure you're in the project root directory
2. Check that `app/components/plant_disease_cnn.py` exists
3. Run the setup script again

### "Could not find platform independent libraries <prefix>"

This indicates a corrupted Python installation or virtual environment:
1. Delete the `.venv` folder
2. Reinstall Python from python.org
3. Run the setup script again

### Virtual Environment Issues

If the virtual environment is corrupted:
```bash
# Delete the old venv
rmdir /s /q .venv  # Windows
rm -rf .venv        # Mac/Linux

# Recreate it
npm run setup:python
```

## API Endpoints

Once running, the API will be available at:

- Health Check: `GET http://localhost:5000/health/v2`
- Predict: `POST http://localhost:5000/predict/v2`
- Validate: `POST http://localhost:5000/validate`
- Benchmark: `GET http://localhost:5000/benchmark` (dev only)

## STUB Mode

The API runs in STUB mode by default (no trained model required). It will return pseudo-random predictions for testing.

To use a trained model:
1. Place your model file at `./models/plantguard_final.pt`
2. The API will automatically detect and load it

## Production Deployment

For Vercel or other production deployments:

1. Set environment variables:
   - `PORT` (default: 5000)
   - `HOST` (default: 0.0.0.0)

2. Ensure Python dependencies are installed in the deployment environment

3. The API will auto-detect the production environment and use appropriate settings
