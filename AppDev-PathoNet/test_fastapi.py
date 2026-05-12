#!/usr/bin/env python3
"""
Simple FastAPI test script
"""

import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(__file__)
sys.path.insert(0, current_dir)

try:
    import fastapi
    import uvicorn
    import pydantic
    print(f"✅ FastAPI {fastapi.__version__} available")
    print(f"✅ Uvicorn {uvicorn.__version__} available")
    print(f"✅ Pydantic {pydantic.__version__} available")
    
    # Try to import the app
    from app.components.PathoNetFastAPI import app
    print("✅ PathoNet FastAPI app imported successfully")
    
    print("\n🚀 Starting FastAPI server...")
    print("📚 API Docs: http://localhost:8000/docs")
    print("💚 Health: http://localhost:8000/health/v3")
    
    uvicorn.run("app.components.PathoNetFastAPI:app", host="0.0.0.0", port=8000, reload=True)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Try installing with: pip install fastapi uvicorn[standard] pydantic")
except Exception as e:
    print(f"❌ Error: {e}")
