"""
agent_manager.py — Multi-Device Buddy Agent Manager for wireless phone control.

Allows any phone (Phone A, Phone B, etc.) to connect wirelessly over HTTP/WebSockets
without needing USB cables or Wireless Debugging.
"""

import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Registered active devices: { device_id: { "model": str, "battery": int, "last_seen": float, "pending_commands": [] } }
_ACTIVE_AGENTS: Dict[str, Dict[str, Any]] = {}
_SELECTED_AGENT_ID: Optional[str] = None
_TUNNEL_URL: Optional[str] = None

def get_tunnel_url() -> Optional[str]:
    return _TUNNEL_URL

def set_tunnel_url(url: str) -> None:
    global _TUNNEL_URL
    _TUNNEL_URL = url
    logger.info("Cloudflare tunnel URL updated: %s", url)

def register_agent_heartbeat(device_id: str, model: str, battery: Optional[int], platform_info: Optional[str] = None) -> Dict[str, Any]:
    """Register or refresh an active mobile agent's heartbeat."""
    global _SELECTED_AGENT_ID
    now = time.time()
    
    if device_id not in _ACTIVE_AGENTS:
        logger.info("New Buddy Agent connected: %s (%s) platform=%s", model, device_id, platform_info)
        _ACTIVE_AGENTS[device_id] = {
            "device_id": device_id,
            "model": model or "Mobile Agent Device",
            "battery": battery,
            "platform": platform_info or "Unknown",
            "first_seen": now,
            "last_seen": now,
            "pending_commands": []
        }
    else:
        _ACTIVE_AGENTS[device_id]["last_seen"] = now
        _ACTIVE_AGENTS[device_id]["battery"] = battery
        if model:
            _ACTIVE_AGENTS[device_id]["model"] = model
        if platform_info:
            _ACTIVE_AGENTS[device_id]["platform"] = platform_info

    if not _SELECTED_AGENT_ID:
        _SELECTED_AGENT_ID = device_id

    # Clean up stale devices (older than 30 seconds)
    stale_ids = [d for d, info in _ACTIVE_AGENTS.items() if now - info["last_seen"] > 30]
    for sid in stale_ids:
        del _ACTIVE_AGENTS[sid]
        if _SELECTED_AGENT_ID == sid:
            _SELECTED_AGENT_ID = next(iter(_ACTIVE_AGENTS), None)

    return get_agent_status(device_id)

def get_active_agents() -> List[Dict[str, Any]]:
    """Return a list of all currently active Buddy mobile agents (mobile only, no desktops)."""
    now = time.time()
    active = []
    for dev_id, info in list(_ACTIVE_AGENTS.items()):
        if now - info["last_seen"] <= 30:
            platform = info.get("platform", "").lower()
            model = info.get("model", "").lower()
            # Skip desktop/laptop browsers — only show real mobile devices
            is_desktop = any(p in platform for p in ["win32", "macintel", "linux x86_64", "macppc"])
            is_laptop_model = any(m in model for m in ["laptop", "desktop", "pc", "computer"])
            if is_desktop and is_laptop_model:
                continue  # Skip this — it's a desktop browser, not a phone
            active.append({
                "device_id": dev_id,
                "model": info["model"],
                "battery": info["battery"],
                "platform": info.get("platform"),
                "is_selected": (dev_id == _SELECTED_AGENT_ID),
                "last_seen": int(now - info["last_seen"])
            })
    return active

def select_agent(device_id: str) -> bool:
    """Set the primary active agent device."""
    global _SELECTED_AGENT_ID
    if device_id in _ACTIVE_AGENTS:
        _SELECTED_AGENT_ID = device_id
        return True
    return False

def push_command_to_agent(intent: str, entity: str = "", parameters: Optional[dict] = None, target_device_id: Optional[str] = None) -> bool:
    """Queue a command for execution on the target mobile agent."""
    global _SELECTED_AGENT_ID
    target_id = target_device_id or _SELECTED_AGENT_ID
    
    if not target_id and _ACTIVE_AGENTS:
        target_id = next(iter(_ACTIVE_AGENTS))

    if not target_id or target_id not in _ACTIVE_AGENTS:
        return False

    cmd_payload = {
        "id": f"cmd_{int(time.time()*1000)}",
        "intent": intent,
        "entity": entity,
        "parameters": parameters or {},
        "timestamp": time.time()
    }

    _ACTIVE_AGENTS[target_id]["pending_commands"].append(cmd_payload)
    logger.info("Queued command '%s' for agent %s", intent, target_id)
    return True

def poll_agent_commands(device_id: str) -> List[Dict[str, Any]]:
    """Retrieve and clear pending commands for a specific mobile agent."""
    if device_id in _ACTIVE_AGENTS:
        cmds = list(_ACTIVE_AGENTS[device_id]["pending_commands"])
        _ACTIVE_AGENTS[device_id]["pending_commands"].clear()
        return cmds
    return []

def get_agent_status(device_id: Optional[str] = None) -> Dict[str, Any]:
    """Get status summary for the selected agent or all agents."""
    target_id = device_id or _SELECTED_AGENT_ID
    if target_id and target_id in _ACTIVE_AGENTS:
        info = _ACTIVE_AGENTS[target_id]
        return {
            "connected": True,
            "device_id": target_id,
            "model": f"[Buddy Agent] {info['model']}",
            "battery": info["battery"],
            "message": f"Buddy Mobile Agent connected ({info['model']})"
        }
    return {
        "connected": False,
        "device_id": None,
        "model": "No Mobile Agent Connected",
        "battery": None,
        "message": "No Buddy Agent active"
    }
