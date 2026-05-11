#!/usr/bin/env python3
"""
PathoNet API Server Launcher v2
Runs the PlantGuardCNN Flask API with v2 improvements on http://localhost:5000
Supports both local development and deployment environments.
"""
import sys
import os

# Add the app/components directory to the path so we can import plant_disease modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'components'))

try:
    # Import from PathoNetV1 (new API)
    from PathoNetV1 import run_flask_server_v2
except ImportError as e:
    print("=" * 70)
    print("  ❌ ERROR: Cannot import PathoNetV1 module")
    print("=" * 70)
    print(f"Error: {e}")
    print("\nPossible causes:")
    print("1. Python packages not installed: pip install -r requirements.txt")
    print("2. app/components/PathoNetV1.py file is missing or corrupted")
    print("3. Python version is incompatible (requires Python 3.8+)")
    print("\nRun setup verification:")
    print("  python test-setup.py")
    sys.exit(1)

if __name__ == "__main__":
    # Get port from environment variable (for deployment) or default to 5000 (for local)
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")

    print("=" * 70)
    print("  🌱 PathoNet Disease Detection API Server v2")
    print("=" * 70)
    print(f"\n✓ Starting Flask server on http://{host}:{port}")
    print(f"✓ Health check v2: GET  http://{host}:{port}/health/v2")
    print(f"✓ Predict v2:     POST http://{host}:{port}/predict/v2")
    print(f"✓ Validate:       POST http://{host}:{port}/validate")
    print(f"✓ Benchmark:      GET  http://{host}:{port}/benchmark (dev only)")
    print("\nPress Ctrl+C to stop the server.\n")

    # Check if trained model exists
    weights_path = "./models/plantguard_final.pt"
    if os.path.exists(weights_path):
        print(f"✓ Loading trained model from: {weights_path}")
        run_flask_server_v2(weights_path=weights_path, port=port)
    else:
        print("⚠️  WARNING: No trained model found")
        print(f"   Expected weights at: {weights_path}")
        print("   Running in STUB mode with pseudo-random predictions")
        print("\n   To train the model:")
        print("   1. Prepare your dataset in ./data directory")
        print("   2. Run: python train_model.py --data_dir ./data --epochs 50")
        print("   3. The trained model will be saved to ./models/plantguard_final.pt")
        print()
        run_flask_server_v2(weights_path=None, port=port)
