import os
import sys

# Ensure root directory and backend directory are in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app_server import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
