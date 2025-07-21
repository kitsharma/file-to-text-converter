#!/bin/bash
cd /home/kitsh/projects/a-w-ai
source venv/bin/activate
export PYTHONPATH=/home/kitsh/projects/a-w-ai:$PYTHONPATH
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload