"""
app.py — Buddy AI Assistant Flask application entry point.

Run: python -m backend.app   (from the project root: e:/door unlock)
"""

import logging
import logging.handlers
import sys
import io

# ── Logging (must be first) ───────────────────────────────────────────────────
from .config import LOG_LEVEL, LOG_FORMAT, LOG_FILE, MAX_LOG_BYTES, LOG_BACKUP_COUNT

_root_log = logging.getLogger()
_root_log.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

_fmt = logging.Formatter(LOG_FORMAT)

# Console handler — force UTF-8 on Windows to avoid CP-1252 UnicodeEncodeError
_stdout_utf8 = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'buffer') else sys.stdout
_ch = logging.StreamHandler(_stdout_utf8)
_ch.setFormatter(_fmt)
_root_log.addHandler(_ch)

# Rotating file handler
try:
    _fh = logging.handlers.RotatingFileHandler(
        str(LOG_FILE), maxBytes=MAX_LOG_BYTES, backupCount=LOG_BACKUP_COUNT
    )
    _fh.setFormatter(_fmt)
    _root_log.addHandler(_fh)
except Exception as _e:
    logging.warning("Could not open log file %s: %s", LOG_FILE, _e)

log = logging.getLogger(__name__)

# ── Flask & CORS ──────────────────────────────────────────────────────────────
from flask import Flask, jsonify
from flask_cors import CORS

from .config import (
    FLASK_SECRET_KEY, FLASK_DEBUG, FLASK_HOST, FLASK_PORT, ALLOWED_ORIGINS, BASE_DIR
)

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

CORS(
    app,
    origins="*",
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# ── Register Blueprints ───────────────────────────────────────────────────────
from .routes import bp as api_bp
from .buddy_routes import buddy_bp
app.register_blueprint(api_bp)
app.register_blueprint(buddy_bp)

from flask import send_file, redirect

@app.route("/")
def root():
    """Auto-redirect root URL to mobile agent page."""
    return redirect("/agent")

@app.route("/agent")
@app.route("/agent.html")
def serve_agent():
    return send_file(str(BASE_DIR / "public" / "agent.html"))

@app.route("/download/agent.apk")
def download_agent_apk():
    apk_path = BASE_DIR / "public" / "BuddyAgent.apk"
    if apk_path.exists():
        return send_file(str(apk_path), as_attachment=True)
    return """
    <html>
    <head><title>Buddy Agent APK Build Instructions</title></head>
    <body style="font-family: sans-serif; background: #090d16; color: #fff; padding: 40px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #131b2e; padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: #38bdf8;">📱 Buddy Native Android Project Ready!</h2>
            <p style="color: #9ca3af;">The complete Android source code is generated inside the <code>android_agent/</code> directory.</p>
            <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 12px; text-align: left; font-family: monospace; font-size: 13px; color: #10b981;">
                1. Open Android Studio<br>
                2. Click 'Open Existing Project' -> Select <b>android_agent</b> folder<br>
                3. Click <b>Build -> Build APK</b><br>
                4. Copy generated <code>BuddyAgent.apk</code> to <code>public/BuddyAgent.apk</code>
            </div>
            <br>
            <a href="/agent" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold;">
                🌐 Launch Mobile Web Agent Instant Link
            </a>
        </div>
    </body>
    </html>
    """, 200

# ── Error Handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "path": str(e)}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(e):
    log.exception("Unhandled server error")
    return jsonify({"error": "Internal server error"}), 500


# ── Startup Sequence ──────────────────────────────────────────────────────────

def _startup() -> None:
    log.info("=" * 60)
    log.info("  Buddy AI Assistant — Starting Up")
    log.info("=" * 60)

    # 1. Database
    from .database import init_db
    init_db()
    log.info("[OK] Database ready")

    # 2. ADB Phone Connection
    try:
        from .phone_bridge import connect_device, get_device_status
        ok, msg = connect_device()
        status = get_device_status()
        if status["connected"]:
            log.info("[OK] ADB Phone Connected: %s (Battery: %s%%)", status["model"], status["battery"])
        else:
            log.warning("[WARN] ADB Phone not connected: %s", msg)
    except Exception as e:
        log.warning("[WARN] ADB connection check error: %s", e)

    log.info("-" * 60)
    log.info("  Server: http://%s:%s", FLASK_HOST, FLASK_PORT)
    log.info("  Debug : %s", FLASK_DEBUG)
    log.info("-" * 60)


# Run startup when the module is imported (works for both direct & gunicorn)
with app.app_context():
    _startup()


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=FLASK_DEBUG,
        use_reloader=False,
    )
