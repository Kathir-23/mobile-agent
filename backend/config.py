"""
config.py — Centralized configuration for Buddy AI Assistant backend.

All settings can be overridden via environment variables.
"""

import os
import secrets
from pathlib import Path

# ── Directory Layout ──────────────────────────────────────────────────────────
BASE_DIR  = Path(__file__).resolve().parent.parent   # project root (e:/door unlock)
MODELS_DIR = BASE_DIR / "models"
LOGS_DIR   = BASE_DIR / "logs"
DB_PATH    = BASE_DIR / "buddy.db"

for _d in (MODELS_DIR, LOGS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ── Buddy Phone ADB Settings ──────────────────────────────────────────────────
BUDDY_PHONE_IP   = os.environ.get("BUDDY_PHONE_IP",   "100.99.222.50")
BUDDY_PHONE_PORT = int(os.environ.get("BUDDY_PHONE_PORT", "5555"))
CANDIDATE_PHONE_IPS = ["100.99.222.50", "10.94.194.199"]

# ── Flask ─────────────────────────────────────────────────────────────────────
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))
FLASK_DEBUG      = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
FLASK_HOST       = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT       = int(os.environ.get("FLASK_PORT", "5000"))

# Allow all local network IPs so any phone on the same Wi-Fi can connect
_DEFAULT_ORIGINS = (
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
    "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,"
    "http://10.94.194.80:5000,http://10.94.194.80:5173"
)
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
ALLOWED_ORIGINS.append("*")  # Allow all phone browsers on local network

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL        = os.environ.get("LOG_LEVEL", "INFO")
LOG_FORMAT       = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
LOG_FILE         = LOGS_DIR / "buddy.log"
MAX_LOG_BYTES    = 10 * 1024 * 1024   # 10 MB rotate
LOG_BACKUP_COUNT = 5
