from flask import Blueprint, request, jsonify
import logging
from backend.buddy_nlp import parse_nlp_command
from backend.phone_bridge import execute_phone_action, get_device_status, connect_device
from backend.database import db

from backend.agent_manager import (
    register_agent_heartbeat,
    get_active_agents,
    select_agent,
    push_command_to_agent,
    poll_agent_commands,
    get_agent_status as get_mobile_agent_status
)

logger = logging.getLogger(__name__)

buddy_bp = Blueprint("buddy", __name__, url_prefix="/api/buddy")

@buddy_bp.route("/status", methods=["GET"])
def device_status():
    """Get current phone connection & battery status (ADB or Buddy Mobile Agent)."""
    status = get_device_status()
    if not status.get("connected"):
        agent_status = get_mobile_agent_status()
        if agent_status.get("connected"):
            status = agent_status
    return jsonify({
        "success": True,
        "data": status,
        "active_agents": get_active_agents()
    }), 200

@buddy_bp.route("/agent/heartbeat", methods=["POST"])
def agent_heartbeat():
    """Mobile Agent heartbeat endpoint called by any Android phone."""
    data = request.get_json() or {}
    device_id = data.get("device_id") or request.remote_addr
    model = data.get("model") or "Mobile Phone"
    battery = data.get("battery")
    platform = data.get("platform")

    status = register_agent_heartbeat(device_id, model, battery, platform)
    cmds = poll_agent_commands(device_id)

    return jsonify({
        "success": True,
        "status": status,
        "commands": cmds
    }), 200

@buddy_bp.route("/agents", methods=["GET"])
def list_agents():
    """List all online Buddy Mobile Agents."""
    return jsonify({
        "success": True,
        "data": get_active_agents()
    }), 200

@buddy_bp.route("/tunnel-url", methods=["GET", "POST"])
def tunnel_url():
    """Get or set the current active Cloudflare tunnel URL."""
    from backend.agent_manager import get_tunnel_url, set_tunnel_url
    if request.method == "POST":
        data = request.get_json() or {}
        url = data.get("url", "").rstrip("/")
        if url:
            set_tunnel_url(url)
            return jsonify({"success": True, "url": url}), 200
        return jsonify({"success": False}), 400
    return jsonify({"url": get_tunnel_url()}), 200

from flask import send_file
from backend.config import BASE_DIR

@buddy_bp.route("/mobile", methods=["GET"])
def serve_mobile_agent():
    """Serve the Buddy Mobile Agent web interface for any phone browser."""
    return send_file(str(BASE_DIR / "public" / "agent.html"))

@buddy_bp.route("/agent/select", methods=["POST"])
def set_active_agent():
    """Select active device from UI dashboard."""
    data = request.get_json() or {}
    device_id = data.get("device_id")
    if device_id and select_agent(device_id):
        return jsonify({"success": True, "message": f"Selected device {device_id}"}), 200
    return jsonify({"success": False, "message": "Device not found"}), 404

import socket

@buddy_bp.route("/network-info", methods=["GET"])
def network_info():
    """Return local Wi-Fi and Tailscale server IPs for display in UI link generator."""
    ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.getaddrinfo(hostname, None):
            addr = ip[4][0]
            if not addr.startswith("127.") and ":" not in addr and addr not in ips:
                ips.append(addr)
    except Exception:
        pass
        
    local_ip = next((ip for ip in ips if not ip.startswith("100.")), ips[0] if ips else "127.0.0.1")
    tailscale_ip = next((ip for ip in ips if ip.startswith("100.")), None)
    
    return jsonify({
        "success": True,
        "ips": ips,
        "local_ip": local_ip,
        "tailscale_ip": tailscale_ip,
        "local_agent_url": f"http://{local_ip}:5000/agent",
        "tailscale_agent_url": f"http://{tailscale_ip}:5000/agent" if tailscale_ip else None
    }), 200

@buddy_bp.route("/connect", methods=["POST"])
def reconnect_device():
    """Trigger manual reconnection to ADB phone."""
    data = request.get_json() or {}
    custom_ip = data.get("ip")
    ok, msg = connect_device(ip=custom_ip)
    status = get_device_status()
    return jsonify({
        "success": ok,
        "message": msg,
        "data": status
    }), 200 if ok else 500

@buddy_bp.route("/command", methods=["POST"])
def process_command():
    """
    Process incoming voice/text command through NLP pipeline and execute on phone.
    Expects JSON: { "command": "Buddy, open YouTube" }
    """
    data = request.get_json() or {}
    raw_command = data.get("command") or data.get("text") or ""
    
    if not raw_command.strip():
        return jsonify({
            "success": False,
            "message": "No command text provided"
        }), 400

    # 1. Run NLP Pipeline
    nlp_result = parse_nlp_command(raw_command)
    intent = nlp_result["intent"]
    entity = nlp_result["entity"]
    confidence = nlp_result["confidence"]

    if intent == "UNKNOWN":
        return jsonify({
            "success": False,
            "message": f"Sorry, Buddy didn't understand the command '{raw_command}'",
            "nlp": nlp_result
        }), 200

    # 2. Execute Phone Action via ADB Bridge or Mobile Agent
    action_success, action_msg, action_details = execute_phone_action(
        intent=intent,
        entity=entity,
        parameters=nlp_result.get("parameters")
    )

    if not action_success:
        # Fallback to Buddy Mobile Agent if active
        pushed = push_command_to_agent(intent, entity or "", nlp_result.get("parameters"))
        if pushed:
            action_success = True
            action_msg = f"Dispatched command '{intent}' to Buddy Mobile Agent"
            action_details = {"action": "agent_dispatch", "intent": intent, "entity": entity}

    # 3. Log to SQLite Database
    try:
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
            try:
                conn.execute("ALTER TABLE buddy_logs ADD COLUMN adb_command TEXT")
            except Exception:
                pass  # Column already exists

            adb_cmd_text = action_details.get("adb_command", "")
            conn.execute("""
                INSERT INTO buddy_logs (raw_command, intent, entity, confidence, status, message, adb_command)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (raw_command, intent, entity or "", confidence, "SUCCESS" if action_success else "FAILED", action_msg, adb_cmd_text))
    except Exception as e:
        logger.error(f"Error logging buddy command to database: {e}")

    return jsonify({
        "success": action_success,
        "message": action_msg,
        "nlp": nlp_result,
        "execution": action_details
    }), 200

@buddy_bp.route("/quick-action", methods=["POST"])
def quick_action():
    """Trigger direct manual action buttons from frontend dashboard."""
    data = request.get_json() or {}
    intent = data.get("intent")
    entity = data.get("entity")
    device_id = data.get("device_id")  # Which phone to target

    if not intent:
        return jsonify({"success": False, "message": "Missing intent parameter"}), 400

    action_success = False
    action_msg = ""
    action_details = {}

    # Route to specific mobile agent if device_id is provided and it's not ADB
    if device_id and device_id != "adb":
        pushed = push_command_to_agent(intent, entity or "", None, target_device_id=device_id)
        if pushed:
            action_success = True
            action_msg = f"Dispatched '{intent}' to device {device_id}"
            action_details = {"action": "agent_dispatch", "intent": intent, "entity": entity, "device_id": device_id}
        else:
            action_success = False
            action_msg = f"Device {device_id} not found or offline"
    else:
        # Default: Try ADB first
        action_success, action_msg, action_details = execute_phone_action(
            intent=intent,
            entity=entity
        )
        # Fallback to selected mobile agent if ADB fails
        if not action_success:
            pushed = push_command_to_agent(intent, entity or "", None)
            if pushed:
                action_success = True
                action_msg = f"Dispatched '{intent}' to active mobile agent"
                action_details = {"action": "agent_dispatch", "intent": intent, "entity": entity}

    # Log Quick Action
    try:
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
            try:
                conn.execute("ALTER TABLE buddy_logs ADD COLUMN adb_command TEXT")
            except Exception:
                pass

            adb_cmd_text = action_details.get("adb_command", "")
            conn.execute("""
                INSERT INTO buddy_logs (raw_command, intent, entity, confidence, status, message, adb_command)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Quick Action: {intent}", intent, entity or "", 1.0, "SUCCESS" if action_success else "FAILED", action_msg, adb_cmd_text))
    except Exception as e:
        logger.error(f"Error logging quick action: {e}")

    return jsonify({
        "success": action_success,
        "message": action_msg,
        "execution": action_details
    }), 200

@buddy_bp.route("/history", methods=["GET"])
def command_history():
    """Retrieve command execution logs."""
    try:
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
            try:
                conn.execute("ALTER TABLE buddy_logs ADD COLUMN adb_command TEXT")
            except Exception:
                pass

            rows = conn.execute("SELECT id, timestamp, raw_command, intent, entity, confidence, status, message, adb_command FROM buddy_logs ORDER BY id DESC LIMIT 50").fetchall()
        logs = []
        for r in rows:
            logs.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "command": r["raw_command"],
                "intent": r["intent"],
                "entity": r["entity"],
                "confidence": r["confidence"],
                "status": r["status"],
                "message": r["message"],
                "adb_command": r["adb_command"] or ""
            })
        return jsonify({
            "success": True,
            "data": logs
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
