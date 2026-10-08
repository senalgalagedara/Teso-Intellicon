import sys
from pathlib import Path

# Add Agentic root to Python path so 'app' can be resolved
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app
