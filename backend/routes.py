import logging
import os
from flask import Blueprint, jsonify, request, Response
from .database import get_all_settings, get_setting, set_setting, db
from .config import DB_PATH

log = logging.getLogger(__name__)

bp = Blueprint("api", __name__, url_prefix="/api")

@bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Buddy AI Assistant"
    }), 200

@bp.route("/settings", methods=["GET"])
def get_settings():
    return jsonify({
        "success": True,
        "data": get_all_settings()
    }), 200

@bp.route("/settings", methods=["PUT"])
def update_settings():
    data = request.get_json() or {}
    for k, v in data.items():
        set_setting(k, str(v))
    return jsonify({
        "success": True,
        "message": "Settings updated successfully"
    }), 200

@bp.route("/system/stats", methods=["GET"])
def system_stats():
    """Retrieve system diagnostics, DB metrics & log statistics."""
    try:
        db_size_bytes = os.path.getsize(str(DB_PATH)) if os.path.exists(str(DB_PATH)) else 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 2)
        
        total_logs = 0
        success_logs = 0
        failed_logs = 0
        
        with db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS buddy_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    raw_command TEXT,
                    intent TEXT,
                    entity TEXT,
                    confidence REAL,
                    status TEXT,
                    message TEXT,
                    adb_command TEXT
                )
            """)
            r_tot = conn.execute("SELECT COUNT(*) FROM buddy_logs").fetchone()
            total_logs = r_tot[0] if r_tot else 0
            
            r_succ = conn.execute("SELECT COUNT(*) FROM buddy_logs WHERE status='SUCCESS'").fetchone()
            success_logs = r_succ[0] if r_succ else 0
            
            r_fail = conn.execute("SELECT COUNT(*) FROM buddy_logs WHERE status='FAILED'").fetchone()
            failed_logs = r_fail[0] if r_fail else 0

        return jsonify({
            "success": True,
            "data": {
                "db_size_mb": db_size_mb,
                "total_logs": total_logs,
                "success_logs": success_logs,
                "failed_logs": failed_logs,
                "db_path": str(DB_PATH)
            }
        }), 200
    except Exception as e:
        log.error("Error fetching system stats: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500

@bp.route("/logs/clear", methods=["POST"])
def clear_logs():
    """Purge all command execution history from buddy.db."""
    try:
        with db() as conn:
            conn.execute("DELETE FROM buddy_logs")
        return jsonify({
            "success": True,
            "message": "All command execution logs cleared from database."
        }), 200
    except Exception as e:
        log.error("Error clearing logs: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500
