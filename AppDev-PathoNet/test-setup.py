#!/usr/bin/env python3
"""
PathoNet Setup Verification Script
Tests if all dependencies are installed and the system is ready to run.
"""
import sys
import os

def check_python_version():
    """Check if Python version is 3.8 or higher."""
    print(f"Python version: {sys.version}")
    if sys.version_info < (3, 8):
        print("❌ ERROR: Python 3.8 or higher required")
        return False
    print("✓ Python version OK")
    return True

def check_imports():
    """Check if all required packages can be imported."""
    required_packages = [
        "torch",
        "torchvision",
        "PIL",
        "numpy",
        "flask",
        "flask_cors",
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print("Install with: pip install -r requirements.txt")
        return False
    print("✓ All packages installed")
    return True

def check_pathonet_module():
    """Check if PathoNetV1 module can be imported."""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'components'))
    try:
        from PathoNetV1 import run_flask_server_v2
        print("✓ PathoNetV1 module OK")
        return True
    except Exception as e:
        print(f"❌ PathoNetV1 module error: {e}")
        return False

def check_model_file():
    """Check if trained model file exists."""
    weights_path = "./models/plantguard_final.pt"
    if os.path.exists(weights_path):
        print(f"✓ Model file found: {weights_path}")
        return True
    else:
        print(f"⚠️  Model file not found: {weights_path}")
        print("   Server will run in STUB mode with pseudo-random predictions")
        return True  # Not a critical error

def check_env_file():
    """Check if .env file exists."""
    env_path = "./.env"
    if os.path.exists(env_path):
        print(f"✓ .env file found: {env_path}")
        return True
    else:
        print(f"⚠️  .env file not found: {env_path}")
        print("   Create .env with EXPO_PUBLIC_API_URL=http://localhost:5000")
        return True  # Not a critical error

def main():
    print("=" * 70)
    print("  🔍 PathoNet Setup Verification")
    print("=" * 70)
    print()
    
    checks = [
        ("Python Version", check_python_version),
        ("Required Packages", check_imports),
        ("PathoNetV1 Module", check_pathonet_module),
        ("Model File", check_model_file),
        ("Environment File", check_env_file),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n--- {name} ---")
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} check failed with exception: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 70)
    print("  Summary")
    print("=" * 70)
    
    all_passed = all(result for _, result in results)
    for name, result in results:
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print()
    if all_passed:
        print("✓ All checks passed! System is ready to run.")
        print("\nStart the API server:")
        print("  python run_api_server.py")
        return 0
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
