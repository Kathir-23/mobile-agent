"""
database.py — Minimal SQLite database for Buddy AI Assistant.

Only stores:
  - buddy_logs: command execution history
  - system_settings: key-value runtime config
"""

import sqlite3
import logging
from contextlib import contextmanager

from . import config

log = logging.getLogger(__name__)

# ── Schema ────────────────────────────────────────────────────────────────────

SCHEMA_SQL = """
-- Buddy command execution logs
CREATE TABLE IF NOT EXISTS buddy_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_command  TEXT,
    intent       TEXT,
    entity       TEXT,
    confidence   REAL,
    status       TEXT,
    message      TEXT,
    adb_command  TEXT
);

-- System settings: key-value store for runtime configuration
CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT NOT NULL
);
"""

DEFAULT_SETTINGS = [
    ("dark_mode",           "true",            "UI dark mode"),
    ("accent_color",        "#38bdf8",         "UI accent color"),
    ("phone_ip",            "100.105.217.111", "Target Android device IP"),
    ("phone_port",          "5555",            "Target ADB port"),
    ("adb_timeout",         "5",               "ADB command timeout seconds"),
    ("allow_simulation",    "true",            "Allow simulated execution when offline"),
    ("nlp_confidence",      "0.7",             "Minimum intent confidence score"),
    ("strict_nlp",          "false",           "Strict intent precision toggle"),
    ("beacon_override_dnd", "true",            "Force override DND and volume during beacon"),
    ("beacon_duration",     "10",              "Beacon flashlight and vibration duration"),
]

# ── Connection Management ─────────────────────────────────────────────────────

def get_connection():
    """Open a SQLite connection."""
    conn = sqlite3.connect(str(config.DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    """Context manager that auto-commits or rolls back."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create all tables and seed default data on first run."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    with db() as conn:
        conn.executescript(SCHEMA_SQL)
        for key, value, desc in DEFAULT_SETTINGS:
            conn.execute(
                """INSERT OR IGNORE INTO system_settings (key, value, description, updated_at)
                   VALUES (?, ?, ?, ?)""",
                (key, value, desc, now)
            )

    log.info("Database initialised at %s", config.DB_PATH)


# ── Settings Helpers ──────────────────────────────────────────────────────────

def get_setting(key: str, default=None) -> str | None:
    """Read a single setting from the database."""
    with db() as conn:
        row = conn.execute(
            "SELECT value FROM system_settings WHERE key=?", (key,)
        ).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    """Write / update a setting in the database."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    with db() as conn:
        conn.execute(
            """REPLACE INTO system_settings (key, value, description, updated_at)
               VALUES (?, ?, '', ?)""",
            (key, str(value), now)
        )


def get_all_settings() -> dict:
    """Return all settings as a dict, ensuring defaults exist."""
    with db() as conn:
        rows = conn.execute("SELECT key, value FROM system_settings").fetchall()
    res = {r["key"]: r["value"] for r in rows}
    
    # Fill in defaults if any keys are missing
    for k, v, _ in DEFAULT_SETTINGS:
        if k not in res:
            res[k] = v
    return res
