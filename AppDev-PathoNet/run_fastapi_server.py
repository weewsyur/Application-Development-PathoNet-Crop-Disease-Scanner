#!/usr/bin/env python3
"""
PathoNet FastAPI Server Launcher
Starts the FastAPI server with proper configuration
"""

import sys
import os
import subprocess
from pathlib import Path

def main():
    """Start the FastAPI server"""
    print("🚀 Starting PathoNet FastAPI Server...")
    print("=" * 60)
    
    # Add current directory to Python path
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    try:
        # Check if FastAPI dependencies are available
        import fastapi
        import uvicorn
        print(f"✅ FastAPI {fastapi.__version__} available")
        print(f"✅ Uvicorn {uvicorn.__version__} available")
        
        # Import the FastAPI app
        from app.components.PathoNetFastAPI import app
        print("✅ PathoNet FastAPI app loaded successfully")
        
        print("\n🌐 Server Information:")
        print("   📚 API Docs: http://localhost:8000/docs")
        print("   🔍 ReDoc: http://localhost:8000/redoc")
        print("   💚 Health: http://localhost:8000/health/v3")
        print("   🏠 Root: http://localhost:8000/")
        print("\n🔧 Starting server on http://0.0.0.0:8000")
        print("   Press Ctrl+C to stop the server")
        print("=" * 60)
        
        # Run the server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("💡 Install with: pip install fastapi uvicorn[standard] pydantic")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
