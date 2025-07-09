# test_env.py
import os
from dotenv import load_dotenv
load_dotenv()
print(os.getenv("XAI_API_KEY"))
