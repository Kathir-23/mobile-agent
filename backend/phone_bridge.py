import subprocess
import shutil
import logging
import os
from .config import BUDDY_PHONE_IP, BUDDY_PHONE_PORT, CANDIDATE_PHONE_IPS

logger = logging.getLogger(__name__)

DEFAULT_PHONE_IP = BUDDY_PHONE_IP
DEFAULT_PHONE_PORT = BUDDY_PHONE_PORT

# Set to False so commands only execute on real connected phone and report accurate status
ALLOW_OFFLINE_SIMULATION = False

def get_adb_path():
    """Find adb executable path dynamically."""
    if shutil.which("adb"):
        return "adb"
    if os.path.exists(r"C:\platform-tools\adb.exe"):
        return r"C:\platform-tools\adb.exe"
    return "adb"

def run_adb_cmd(cmd_list, timeout=5, ip=DEFAULT_PHONE_IP, port=DEFAULT_PHONE_PORT, target_device=True):
    """
    Execute an ADB command line list and return (success, stdout, stderr).
    Dynamically finds active device transport if multiple ADB interfaces exist.
    """
    adb_bin = get_adb_path()
    target = f"{ip}:{port}"
    
    if target_device and cmd_list and cmd_list[0] not in ("connect", "disconnect", "devices"):
        active_target = target
        try:
            dev_res = subprocess.run([adb_bin, "devices"], capture_output=True, text=True, timeout=3)
            if dev_res.stdout:
                devices = [l.split()[0] for l in dev_res.stdout.splitlines() if "\tdevice" in l]
                if devices:
                    active_target = target if target in devices else devices[0]
        except Exception:
            pass
        full_cmd = [adb_bin, "-s", active_target] + cmd_list
    else:
        full_cmd = [adb_bin] + cmd_list
        
    try:
        res = subprocess.run(
            full_cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False
        )
        stdout = res.stdout.strip()
        stderr = res.stderr.strip()
        
        out_err_combined = (stdout + " " + stderr).lower()
        if "device offline" in out_err_combined or "device not found" in out_err_combined:
            logger.warning("ADB reported device offline for %s", target)
            return False, stdout, stderr or "device offline"

        return res.returncode == 0, stdout, stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def get_phone_ip():
    """Dynamically get active phone IP from environment or default."""
    return os.environ.get("BUDDY_PHONE_IP", BUDDY_PHONE_IP)

def connect_device(ip=None, port=None):
    """Connect to Android phone over ADB TCP/IP, trying candidate IPs if unspecified."""
    target_port = port or BUDDY_PHONE_PORT
    raw_ips = [ip] if ip else [get_phone_ip()] + CANDIDATE_PHONE_IPS
    
    # Deduplicate candidate IPs preserving order
    candidate_ips = []
    for _ip in raw_ips:
        if _ip and _ip not in candidate_ips:
            candidate_ips.append(_ip)
    
    last_msg = ""
    for target_ip in candidate_ips:
        target = f"{target_ip}:{target_port}"
        success, stdout, stderr = run_adb_cmd(["connect", target], target_device=False, timeout=3)
        out_lower = (stdout + " " + stderr).lower()
        if success and ("connected to" in out_lower or "already connected" in out_lower):
            os.environ["BUDDY_PHONE_IP"] = target_ip
            return True, f"Connected to {target}"
        last_msg = f"Connection to {target} failed: {stdout or stderr or 'No response from device'}"
        
    return False, last_msg

def get_device_status(ip=None, port=None):
    """Check ADB connection status and phone battery/info dynamically."""
    adb_bin = get_adb_path()
    success, stdout, stderr = run_adb_cmd(["devices"], target_device=False, timeout=3)
    
    active_device_str = None
    is_connected = False
    if success and stdout:
        for line in stdout.splitlines():
            if "\tdevice" in line:
                active_device_str = line.split()[0]
                is_connected = True
                break
                
    if not is_connected:
        target_ip = ip or BUDDY_PHONE_IP
        target_port = port or BUDDY_PHONE_PORT
        is_connected, msg = connect_device(target_ip, target_port)
        if is_connected:
            active_device_str = f"{target_ip}:{target_port}"
        else:
            return {
                "connected": False,
                "ip": f"{target_ip}:{target_port}",
                "battery": None,
                "model": "No Device Connected",
                "message": f"Phone not connected via ADB ({target_ip}:{target_port})"
            }

    battery_level = None
    b_ok, b_out, _ = run_adb_cmd(["shell", "dumpsys", "battery"], ip=active_device_str, timeout=3)
    if b_ok and b_out:
        for line in b_out.splitlines():
            if "level:" in line:
                try:
                    battery_level = int(line.split(":")[-1].strip())
                    break
                except ValueError:
                    pass

    m_ok, m_out, _ = run_adb_cmd(["shell", "getprop", "ro.product.model"], ip=active_device_str, timeout=3)
    model_name = m_out.strip() if (m_ok and m_out.strip()) else "Android Device"

    return {
        "connected": True,
        "ip": active_device_str,
        "battery": battery_level,
        "model": model_name,
        "message": f"Connected to {model_name} ({active_device_str})"
    }

# State variable to track consecutive volume up commands
_consecutive_up_count = 0

APP_PACKAGE_CANDIDATES = {
    "youtube": [["shell", "am", "start", "-n", "com.google.android.youtube/.HomeActivity"]],
    "whatsapp": [["shell", "am", "start", "-n", "com.whatsapp/.HomeActivity"]],
    "chrome": [["shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main"]],
    "maps": [["shell", "am", "start", "-n", "com.google.android.apps.maps/.MapsActivity"]],
    "camera": [
        ["shell", "am", "start", "-a", "android.media.action.IMAGE_CAPTURE"],
        ["shell", "monkey", "-p", "com.vivo.alphacamera", "-c", "android.intent.category.LAUNCHER", "1"]
    ],
    "settings": [["shell", "am", "start", "-n", "com.android.settings/.Settings"]],
    "calculator": [
        ["shell", "monkey", "-p", "com.vivo.calculator", "-c", "android.intent.category.LAUNCHER", "1"],
        ["shell", "am", "start", "-n", "com.google.android.calculator/.Calculator"]
    ],
    "photos": [
        ["shell", "am", "start", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.APP_GALLERY"],
        ["shell", "am", "start", "-n", "com.google.android.apps.photos/.PhotosActivity"]
    ],
    "gallery": [
        ["shell", "am", "start", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.APP_GALLERY"]
    ],
    "dialer": [
        ["shell", "am", "start", "-a", "android.intent.action.DIAL"]
    ],
    "contacts": [
        ["shell", "am", "start", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.APP_CONTACTS"]
    ],
    "clock": [
        ["shell", "am", "start", "-a", "android.intent.action.SHOW_ALARMS"]
    ]
}

def set_hardware_volume_max(is_connected=True):
    results = []
    if is_connected:
        streams = [(3, 15), (2, 7), (4, 15), (0, 5), (1, 7), (5, 7)]
        for stream_id, level in streams:
            ok, _, _ = run_adb_cmd(["shell", "cmd", "media_session", "volume", "--stream", str(stream_id), "--set", str(level)])
            results.append(ok)
        for _ in range(2):
            ok, _, _ = run_adb_cmd(["shell", "input", "keyevent", "24"])
            results.append(ok)
        overall_ok = any(results)
    else:
        overall_ok = True
    return overall_ok, "Volume set to MAXIMUM", {"action": "set_volume_max"}

def set_hardware_volume_up(steps=5, is_connected=True):
    if is_connected:
        success_count = 0
        for _ in range(steps):
            ok, _, _ = run_adb_cmd(["shell", "input", "keyevent", "24"])
            if ok: success_count += 1
        overall_ok = (success_count > 0)
        msg = f"Volume increased by {success_count} steps (+{success_count})" if overall_ok else f"Failed to increase volume"
    else:
        overall_ok = True
        msg = f"Volume increased by {steps} steps (+{steps})"
    return overall_ok, msg, {"action": "set_volume_up", "steps": steps}

def set_hardware_volume_down(steps=5, is_connected=True):
    if is_connected:
        success_count = 0
        for _ in range(steps):
            ok, _, _ = run_adb_cmd(["shell", "input", "keyevent", "25"])
            if ok: success_count += 1
        overall_ok = (success_count > 0)
        msg = f"Volume decreased by {success_count} steps (-{success_count})" if overall_ok else f"Failed to decrease volume"
    else:
        overall_ok = True
        msg = f"Volume decreased by {steps} steps (-{steps})"
    return overall_ok, msg, {"action": "set_volume_down", "steps": steps}

def set_hardware_volume_mute(is_connected=True):
    if is_connected:
        results = []
        for stream_id in [3, 2, 4, 0, 1, 5]:
            ok, _, _ = run_adb_cmd(["shell", "cmd", "media_session", "volume", "--stream", str(stream_id), "--set", "0"])
            results.append(ok)
        ok_key, _, _ = run_adb_cmd(["shell", "input", "keyevent", "164"])
        results.append(ok_key)
        overall_ok = any(results)
    else:
        overall_ok = True
    return overall_ok, "Phone muted", {"action": "set_volume_mute"}

def execute_phone_action(intent, entity=None, parameters=None):
    """
    Execute a specific phone action based on NLP intent and extracted entity.
    Returns (success, message, action_details).
    """
    adb_bin = get_adb_path()
    target_str = f"{adb_bin} -s {DEFAULT_PHONE_IP}:{DEFAULT_PHONE_PORT}"

    # Check device connection
    status = get_device_status()
    is_connected = status["connected"]

    if not is_connected and not ALLOW_OFFLINE_SIMULATION:
        return False, f"Phone offline: {status['message']}", {"intent": intent, "adb_command": f"{target_str} connect {DEFAULT_PHONE_IP}:{DEFAULT_PHONE_PORT}"}

    intent = (intent or "").upper()
    entity = (entity or "").lower()

    global _consecutive_up_count
    if intent != "SET_VOLUME":
        _consecutive_up_count = 0

    mode_prefix = "" if is_connected else "[Simulated ADB] "

    if intent == "OPEN_APP":
        candidates = APP_PACKAGE_CANDIDATES.get(entity)
        cmd_str = f"{target_str} shell monkey -p {entity} -c android.intent.category.LAUNCHER 1"
        if candidates:
            cmd_str = f"{target_str} " + " ".join(candidates[0])
            
        if is_connected:
            if candidates:
                for cmd in candidates:
                    ok, out, err = run_adb_cmd(cmd)
                    if ok and "error:" not in out.lower() and "does not exist" not in out.lower():
                        return True, f"Opened {entity.capitalize()} on phone", {"action": "open_app", "app": entity, "adb_command": f"{target_str} " + " ".join(cmd)}
            fallback_cmd = ["shell", "monkey", "-p", entity, "-c", "android.intent.category.LAUNCHER", "1"]
            ok, out, err = run_adb_cmd(fallback_cmd)
            if ok:
                return True, f"Launched {entity} on phone", {"action": "open_app", "app": entity, "adb_command": f"{target_str} " + " ".join(fallback_cmd)}
            return False, f"Failed to launch app '{entity}': {out or err}", {"action": "open_app", "app": entity, "adb_command": cmd_str}
        else:
            return True, f"{mode_prefix}Opened {entity.capitalize()} on phone", {"action": "open_app", "app": entity, "adb_command": cmd_str}

    elif intent == "OPEN_URL":
        url = parameters.get("url") if parameters else entity
        if url:
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
            full_cmd_str = f"{target_str} shell am start -a android.intent.action.VIEW -d {url}"
            if is_connected:
                ok, out, err = run_adb_cmd(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url])
                if ok:
                    return True, f"Opened website {url} on phone", {"action": "open_url", "url": url, "adb_command": full_cmd_str}
                return False, f"Failed to open URL {url}: {err or out}", {"action": "open_url", "url": url, "adb_command": full_cmd_str}
            else:
                return True, f"{mode_prefix}Opened website {url} on phone", {"action": "open_url", "url": url, "adb_command": full_cmd_str}
        return False, "No URL specified to open", {"action": "open_url", "adb_command": ""}

    elif intent == "RING_PHONE":
        full_cmd_summary = f"{target_str} shell settings put global zen_mode 0 ; shell settings put global mode_ringer 2 ; set_hardware_volume_max() ; shell am start -a android.intent.action.VIEW -d content://settings/system/alarm_alert -t audio/* ; shell svc torch enable ; shell cmd vibrator vibrate 10000"
        if is_connected:
            # 1. Disable DND and set ringer mode to NORMAL (2)
            run_adb_cmd(["shell", "settings", "put", "global", "zen_mode", "0"])
            run_adb_cmd(["shell", "settings", "put", "global", "mode_ringer", "2"])
            run_adb_cmd(["shell", "service", "call", "audio", "8", "i32", "2", "i32", "0"])
            
            # 2. Maximize volume streams and keyevent pulse
            set_hardware_volume_max(is_connected=True)

            # 3. Trigger alarm audio sound playback
            run_adb_cmd(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "content://settings/system/alarm_alert", "-t", "audio/*"])
            run_adb_cmd(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "content://settings/system/ringtone", "-t", "audio/*"])

            # 4. Turn on Flashlight, Vibration, Wake Screen, Screen Brightness 100%
            run_adb_cmd(["shell", "svc", "torch", "enable"])
            run_adb_cmd(["shell", "cmd", "vibrator", "vibrate", "10000"])
            run_adb_cmd(["shell", "input", "keyevent", "224"])
            run_adb_cmd(["shell", "settings", "put", "system", "screen_brightness_mode", "0"])
            run_adb_cmd(["shell", "settings", "put", "system", "screen_brightness", "255"])
            run_adb_cmd(["shell", "input", "swipe", "500", "1500", "500", "500"])
            
            return True, "Locator beacon activated: Ringer NORMAL, Max Volume set, Alarm Sound playing, Torch ON & Vibration triggered!", {"action": "ring_phone", "adb_command": full_cmd_summary}
        else:
            return True, f"{mode_prefix}Locator beacon activated: Ringer NORMAL, Max Volume set, Alarm Sound playing, Torch ON & Vibration triggered!", {"action": "ring_phone", "adb_command": full_cmd_summary}

    elif intent == "LOCK_SCREEN":
        full_cmd_str = f"{target_str} shell input keyevent 26 && {target_str} shell svc torch disable"
        if is_connected:
            ok1, out1, err1 = run_adb_cmd(["shell", "input", "keyevent", "26"])
            run_adb_cmd(["shell", "svc", "torch", "disable"])
            return True, "Phone screen locked and flashlight disabled", {"action": "lock_screen", "adb_command": full_cmd_str}
        else:
            return True, f"{mode_prefix}Phone screen locked and flashlight disabled", {"action": "lock_screen", "adb_command": full_cmd_str}

    elif intent == "WAKE_SCREEN":
        full_cmd_str = f"{target_str} shell input keyevent 224 && {target_str} shell input swipe 500 1500 500 500"
        if is_connected:
            ok1, out1, err1 = run_adb_cmd(["shell", "input", "keyevent", "224"])
            run_adb_cmd(["shell", "input", "swipe", "500", "1500", "500", "500"])
            return True, "Phone screen awakened", {"action": "wake_screen", "adb_command": full_cmd_str}
        else:
            return True, f"{mode_prefix}Phone screen awakened", {"action": "wake_screen", "adb_command": full_cmd_str}

    elif intent == "NAV_HOME":
        full_cmd_str = f"{target_str} shell input keyevent 3"
        if is_connected:
            ok, out, err = run_adb_cmd(["shell", "input", "keyevent", "3"])
            return True, "Navigated to Home screen", {"action": "nav_home", "adb_command": full_cmd_str}
        else:
            return True, f"{mode_prefix}Navigated to Home screen", {"action": "nav_home", "adb_command": full_cmd_str}

    elif intent == "NAV_BACK":
        full_cmd_str = f"{target_str} shell input keyevent 4"
        if is_connected:
            ok, out, err = run_adb_cmd(["shell", "input", "keyevent", "4"])
            return True, "Pressed Back button", {"action": "nav_back", "adb_command": full_cmd_str}
        else:
            return True, f"{mode_prefix}Pressed Back button", {"action": "nav_back", "adb_command": full_cmd_str}

    elif intent == "SET_VOLUME":
        entity_str = (entity or "").lower()
        if any(k in entity_str for k in ["max", "full", "100", "high", "loud", "top"]):
            _consecutive_up_count = 0
            ok, msg, details = set_hardware_volume_max(is_connected=is_connected)
            return ok, f"{mode_prefix}{msg}", {"action": "set_volume", "level": 15, "steps": 15, "adb_command": f"{target_str} shell cmd media_session volume --stream 3 --set 15"}
        elif any(k in entity_str for k in ["down", "decrease", "lower"]):
            _consecutive_up_count = 0
            ok, msg, details = set_hardware_volume_down(5, is_connected=is_connected)
            return ok, f"{mode_prefix}{msg}", {"action": "set_volume", "steps": -5, "adb_command": f"{target_str} shell input keyevent 25 (5x)"}
        elif any(k in entity_str for k in ["low", "min", "quiet"]):
            _consecutive_up_count = 0
            ok, msg, details = set_hardware_volume_down(10, is_connected=is_connected)
            return ok, f"{mode_prefix}{msg}", {"action": "set_volume", "steps": -10, "adb_command": f"{target_str} shell input keyevent 25 (10x)"}
        elif any(k in entity_str for k in ["mute", "silent", "zero", "off"]):
            _consecutive_up_count = 0
            ok, msg, details = set_hardware_volume_mute(is_connected=is_connected)
            return ok, f"{mode_prefix}{msg}", {"action": "set_volume", "level": 0, "adb_command": f"{target_str} shell input keyevent 164"}
        else:
            _consecutive_up_count += 1
            if _consecutive_up_count >= 3:
                _consecutive_up_count = 0
                ok, msg, details = set_hardware_volume_max(is_connected=is_connected)
                return ok, f"{mode_prefix}Volume set to 100% MAXIMUM (+15)", {"action": "set_volume", "level": 15, "steps": 15, "adb_command": f"{target_str} shell cmd media_session volume --stream 3 --set 15"}
            else:
                ok, msg, details = set_hardware_volume_up(5, is_connected=is_connected)
                return ok, f"{mode_prefix}{msg}", {"action": "set_volume", "steps": 5, "adb_command": f"{target_str} shell input keyevent 24 (5x)"}

    elif intent == "SCREENSHOT":
        full_cmd_str = f"{target_str} shell screencap -p /sdcard/buddy_screenshot.png"
        if is_connected:
            ok, out, err = run_adb_cmd(["shell", "screencap", "-p", "/sdcard/buddy_screenshot.png"])
            return True, "Screenshot saved to phone (/sdcard/buddy_screenshot.png)", {"action": "screenshot", "adb_command": full_cmd_str}
        else:
            return True, f"{mode_prefix}Screenshot captured (/sdcard/buddy_screenshot.png)", {"action": "screenshot", "adb_command": full_cmd_str}

    elif intent == "CHECK_STATUS":
        bat = f"{status['battery']}%" if status['battery'] is not None else ("84%" if not is_connected else "Unknown")
        full_cmd_str = f"{target_str} shell dumpsys battery"
        return True, f"{mode_prefix}Phone status: Connected ({status['model']}), Battery: {bat}", {"action": "check_status", "status": status, "adb_command": full_cmd_str}

    else:
        return False, f"Unknown intent: {intent}", {"action": "unknown", "adb_command": ""}

import threading
import time

_keepalive_thread_started = False

def _keepalive_loop():
    while True:
        try:
            time.sleep(8)
            status = get_device_status()
            if status.get("connected"):
                # Lightweight ping to keep TCP connection & Tailscale tunnel active
                run_adb_cmd(["shell", "echo", "1"], timeout=2)
            else:
                # Auto-heal: Attempt reconnection across candidate IPs
                connect_device()
        except Exception:
            pass

def start_keepalive_daemon():
    global _keepalive_thread_started
    if not _keepalive_thread_started:
        _keepalive_thread_started = True
        t = threading.Thread(target=_keepalive_loop, daemon=True)
        t.start()
        logger.info("[OK] ADB Background Auto-Keepalive Daemon active")

# Start daemon on module load
start_keepalive_daemon()
