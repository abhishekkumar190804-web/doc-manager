import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
