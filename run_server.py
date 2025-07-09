#!/usr/bin/env python3
"""
Career Resilience Platform Server
Runs the FastAPI backend server
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Start the server"""
    print("🚀 Starting Career Resilience Platform...")
    print("📊 Backend services: Skill matching, Career recommendations, Learning paths")
    print("🔒 Bias monitoring: Fairness analysis enabled")
    print("🌐 Web interface: http://localhost:8000")
    print("-" * 60)
    
    # Set environment variables
    os.environ.setdefault("PYTHONPATH", str(project_root))
    
    # Configure uvicorn
    config = {
        "app": "main:app",
        "host": "127.0.0.1",
        "port": 8000,
        "reload": True,
        "reload_dirs": [str(project_root)],
        "log_level": "info",
        "access_log": True
    }
    
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()