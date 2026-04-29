#!/usr/bin/env python3
"""
Flask API Server Launcher & Diagnostics
Run: python run_api_server.py
"""
import sys
import os
import socket

# Add the app/components directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'AppDev-PathoNet', 'app', 'components'))

def check_port_available(port=5000):
    """Check if port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result != 0

def main():
    port = 5000
    
    print("\n" + "="*70)
    print("  🌱 PathoNet Disease Detection API Server")
    print("="*70)
    
    # Check if port is already in use
    if not check_port_available(port):
        print(f"\n❌ ERROR: Port {port} is already in use!")
        print("   This usually means Flask is already running.")
        print("   To fix: pkill -f 'plant_disease_cnn' or restart your terminal")
        sys.exit(1)
    
    print("\n✓ Port 5000 is available")
    print("✓ Starting Flask server...\n")
    
    # Import and run Flask
    try:
        from plant_disease_cnn import run_flask_server
        
        print(f"✓ Starting Flask server on http://0.0.0.0:{port}")
        print(f"✓ Local: http://localhost:{port}")
        print(f"✓ Network: http://<your-ip>:{port}")
        print("\n" + "-"*70)
        print("Available Endpoints:")
        print("-"*70)
        print(f"  GET  /health    →  Check server status & model info")
        print(f"  POST /predict   →  Predict disease (send base64 image)")
        print(f"  GET  /classes   →  Get disease class names")
        print(f"  GET  /stats     →  Get server statistics")
        print("-"*70)
        print("\n🎯 To test from your machine:")
        print(f"  curl http://localhost:{port}/health")
        print(f"  curl http://localhost:{port}/classes")
        print("\n📱 For Expo app:")
        print("  Android Emulator: http://10.0.2.2:5000")
        print("  iOS Simulator: http://localhost:5000")
        print("  Physical Device: http://<your-machine-ip>:5000")
        print("\n⏹️  Press Ctrl+C to stop the server\n")
        print("="*70 + "\n")
        
        # Run Flask server without pre-loaded weights (model initialized randomly for demo)
        run_flask_server(weights_path=None, port=port)
        
    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("\nMake sure you have the required packages installed:")
        print("  pip install flask flask-cors torch torchvision pillow")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease check the error message above and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()
