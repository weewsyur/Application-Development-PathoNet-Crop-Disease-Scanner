#!/usr/bin/env python3
"""
PathoNet API Server Launcher v2
Loads **app/components/PathoNetV1.py** explicitly (no accidental import shadowing)
and runs the Flask v2 API on http://0.0.0.0:PORT (default 5000).
"""
import importlib.util
import os
import sys


def _project_root() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _components_dir() -> str:
    return os.path.join(_project_root(), "app", "components")


def _pathonet_v1_file() -> str:
    return os.path.join(_components_dir(), "PathoNetV1.py")


def load_pathonet_v1():
    """
    Import PathoNetV1 **from this repo’s PathoNetV1.py only**.

    Uses importlib so a different `PathoNetV1` on PYTHONPATH cannot override
    the project file.
    """
    components = _components_dir()
    path_py = _pathonet_v1_file()

    if not os.path.isfile(path_py):
        print("=" * 70)
        print("  ERROR: PathoNetV1.py not found")
        print("=" * 70)
        print(f"Expected file:\n  {path_py}")
        print("\nEnsure you run this script from the AppDev-PathoNet project root.")
        sys.exit(1)

    if components not in sys.path:
        sys.path.insert(0, components)

    spec = importlib.util.spec_from_file_location("PathoNetV1", path_py)
    if spec is None or spec.loader is None:
        print("ERROR: Could not create import spec for PathoNetV1.py")
        sys.exit(1)

    mod = importlib.util.module_from_spec(spec)
    sys.modules["PathoNetV1"] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        print("=" * 70)
        print("  ERROR: PathoNetV1.py failed to execute (import/syntax/runtime)")
        print("=" * 70)
        print(f"{e}")
        print("\nPossible causes:")
        print("1. Python packages not installed: pip install -r requirements.txt")
        print("2. Corrupted or incomplete PathoNetV1.py")
        sys.exit(1)

    loaded_from = os.path.abspath(getattr(mod, "__file__", path_py))
    if os.path.normcase(loaded_from) != os.path.normcase(os.path.abspath(path_py)):
        print("WARNING: PathoNetV1 __file__ differs from expected path:")
        print(f"  expected: {os.path.abspath(path_py)}")
        print(f"  __file__: {loaded_from}")

    if not hasattr(mod, "run_flask_server_v2"):
        print("ERROR: PathoNetV1.py has no run_flask_server_v2 — wrong file?")
        sys.exit(1)

    return mod


_PATHONET = load_pathonet_v1()
run_flask_server_v2 = _PATHONET.run_flask_server_v2

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    
    # Production environment checks
    if os.getenv("VERCEL_ENV"):
        print("🚀 Production environment detected")
        host = "0.0.0.0"  # Ensure binding to all interfaces
    pathonet_abs = os.path.abspath(_pathonet_v1_file())

    print("=" * 70)
    print("  PathoNet Disease Detection API Server v2")
    print("=" * 70)
    print(f"\n✓ Backend module: {pathonet_abs}")
    print(f"\n✓ Starting Flask server on http://{host}:{port}")
    print(f"✓ Health check v2: GET  http://{host}:{port}/health/v2")
    print(f"✓ Predict v2:     POST http://{host}:{port}/predict/v2")
    print(f"✓ Validate:       POST http://{host}:{port}/validate")
    print(f"✓ Benchmark:      GET  http://{host}:{port}/benchmark (dev only)")
    print("\nPress Ctrl+C to stop the server.\n")

    weights_path = "./models/plantguard_final.pt"
    backbone = os.getenv("CNN_BACKBONE", "mobilenet_v2").strip() or "mobilenet_v2"
    if os.path.exists(weights_path):
        print(f"✓ Loading trained model from: {weights_path}")
        print(f"✓ Backbone: {backbone}")
        run_flask_server_v2(weights_path=weights_path, port=port, backbone=backbone)
    else:
        print("⚠️  WARNING: No trained model found")
        print(f"   Expected weights at: {weights_path}")
        print("   Running in STUB mode with pseudo-random predictions")
        print(f"   Backbone hint: {backbone}")
        print("\n   To train the model:")
        print("   1. Prepare your dataset in ./data directory")
        print("   2. Run: python train_model.py --data_dir ./data --epochs 50")
        print("   3. The trained model will be saved to ./models/plantguard_final.pt")
        print()
        run_flask_server_v2(weights_path=None, port=port, backbone=backbone)
