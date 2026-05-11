#!/usr/bin/env python3
"""
PathoNet API Server Launcher v2
Runs the PlantGuardCNN Flask API with v2 improvements on http://localhost:5000
"""
import sys
import os

# Add the app/components directory to the path so we can import plant_disease modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'components'))

# Import from PathoNetV1 (new API)
from PathoNetV1 import run_flask_server_v2

if __name__ == "__main__":
    print("=" * 70)
    print("  🌱 PathoNet Disease Detection API Server v2")
    print("=" * 70)
    print("\n✓ Starting Flask server on http://localhost:5000")
    print("✓ Health check v2: GET  http://localhost:5000/health/v2")
    print("✓ Predict v2:     POST http://localhost:5000/predict/v2")
    print("✓ Validate:       POST http://localhost:5000/validate")
    print("✓ Benchmark:      GET  http://localhost:5000/benchmark (dev only)")
    print("\nPress Ctrl+C to stop the server.\n")
    
    # Check if trained model exists
    weights_path = "./models/plantguard_final.pt"
    if os.path.exists(weights_path):
        print(f"✓ Loading trained model from: {weights_path}")
        run_flask_server_v2(weights_path=weights_path, port=5000)
    else:
        print("⚠️  WARNING: No trained model found")
        print(f"   Expected weights at: {weights_path}")
        print("   Running in STUB mode with pseudo-random predictions")
        print("\n   To train the model:")
        print("   1. Prepare your dataset in ./data directory")
        print("   2. Run: python train_model.py --data_dir ./data --epochs 50")
        print("   3. The trained model will be saved to ./models/plantguard_final.pt")
        print()
        run_flask_server_v2(weights_path=None, port=5000)
