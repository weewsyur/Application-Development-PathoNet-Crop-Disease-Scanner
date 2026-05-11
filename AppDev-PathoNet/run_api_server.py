#!/usr/bin/env python3
"""
PathoNet API Server Launcher v2
Runs the PlantGuardCNN Flask API with v2 improvements on http://localhost:5000
"""
import sys
import os

# Add the app/components directory to the path so we can import plant_disease modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'components'))

# Import from plant_disease_improvements (now standalone)
from plant_disease_improvements import run_flask_server_v2

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
    
    # Uncomment the line below if you have trained model weights
    # run_flask_server_v2(weights_path="path/to/your/weights.pt", port=5000)
    
    # For now, run without pre-loaded weights (model initialized randomly)
    # NOTE: Without trained weights, the API uses STUB mode with pseudo-random predictions
    # To get accurate plant disease detection, you need to train the model and provide weights
    print("⚠️  WARNING: Running in STUB mode (no trained weights)")
    print("   Predictions will be pseudo-random, NOT actual plant analysis")
    print("   To fix: Train the model and provide weights_path='plantguard.pt'")
    print()
    run_flask_server_v2(weights_path=None, port=5000)
