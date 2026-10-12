import re
import logging

logger = logging.getLogger(__name__)

# Wake word aliases
WAKE_WORDS = {"buddy", "buddies", "bud", "body", "budi", "baddy"}

# Intent definitions with non-capturing groups for optional words
INTENT_PATTERNS = {
    "OPEN_URL": [
        r"(?:open|go to|visit)\s+(https?://\S+|www\.\S+|\w+\.(?:com|org|in|net|io|co))",
        r"(https?://\S+|www\.\S+|\w+\.(?:com|org|in|net|io|co))"
    ],
    "OPEN_APP": [
        r"(?:open|launch|start|show)\s+(youtube|whatsapp|chrome|maps|camera|settings|calculator|photos|gallery|dialer|contacts|clock)"
    ],
    "RING_PHONE": [
        r"(?:ring|find|locate|search|sound alarm|alarm|alert|where is)\s*(?:the|my)?\s*(phone|device|mobile)",
        r"ring phone",
        r"find my phone",
        r"where is my phone"
    ],
    "LOCK_SCREEN": [
        r"lock\s*(?:the|my)?\s*(phone|screen|device)",
        r"turn off\s*(?:the|my)?\s*screen",
        r"screen lock",
        r"sleep phone"
    ],
    "WAKE_SCREEN": [
        r"(?:wake|turn on|unlock|light up)\s*(?:the|my)?\s*(phone|screen|device)",
        r"wake up phone",
        r"screen on"
    ],
    "NAV_HOME": [
        r"(?:go to|go)?\s*home\s*(?:screen)?",
        r"main screen",
        r"minimize all"
    ],
    "NAV_BACK": [
        r"(?:go)?\s*back",
        r"previous screen"
    ],
    "SET_VOLUME": [
        r"(?:set|change|increase|decrease|mute|turn up|turn down)\s+volume",
        r"(?:max|maximum|high|full|loud|low|min|minimum|mute|silent|zero|up|down)\s+volume",
        r"volume\s+(?:to\s+)?(max|maximum|high|full|loud|low|min|minimum|mute|silent|zero|up|down)",
        r"(?:mute|unmute)\s+(?:the|my)?\s*(?:phone|device|sound|volume)",
        r"volume\s+up\s*\*?\s*3",
        r"volume\s+up\s+3",
        r"volume\s+up\s+three",
        r"volume\s+up\s+times\s+3",
        r"volume\s+up\s+3\s+times",
        r"volume\s+up\s+three\s+times",
        r"volume\s+up\s+up\s+up",
        r"volume\s+up",
        r"volume\s+down",
        r"volume\s+max",
        r"max\s+volume",
        r"low\s+volume",
        r"mute\s+volume"
    ],
    "SCREENSHOT": [
        r"(?:take|capture|make|grab)\s*(?:a)?\s*screenshot",
        r"screen capture",
        r"snapshot"
    ],
    "CHECK_STATUS": [
        r"(?:check|get|show|what is)\s*(?:the|my)?\s*(battery|status|phone status|device status|connection)",
        r"battery level",
        r"phone status"
    ]
}

# Entity extraction dictionary for known Android apps
KNOWN_APPS = {
    "youtube": ["youtube", "yt"],
    "whatsapp": ["whatsapp", "wa"],
    "chrome": ["chrome", "google chrome", "browser"],
    "maps": ["maps", "google maps", "navigation"],
    "camera": ["camera", "cam"],
    "settings": ["settings", "setting"],
    "calculator": ["calculator", "calc"],
    "photos": ["photos", "photo", "gallery"],
    "gallery": ["gallery"],
    "dialer": ["dialer", "phone dialer", "phone call"],
    "contacts": ["contacts", "people"],
    "clock": ["clock", "alarm clock", "timer"]
}

def clean_text(text: str) -> str:
    """Normalize text: lowercase, strip extra whitespace and special punctuation."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s\.:/-]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text

def check_wake_word(tokens: list) -> bool:
    """Check if the speech includes the wake word 'Buddy'."""
    if not tokens:
        return False
    for t in tokens[:3]:
        if t in WAKE_WORDS:
            return True
    return False

def parse_nlp_command(raw_text: str):
    """
    Full NLP Pipeline:
    1. Preprocessing & Tokenization
    2. Wake-word detection (removes wake word ONLY when at the beginning)
    3. Intent Classification
    4. Named Entity Recognition (NER)
    5. Confidence calculation
    """
    cleaned = clean_text(raw_text)
    tokens = cleaned.split() if cleaned else []

    if not tokens:
        return {
            "raw_text": raw_text,
            "cleaned_text": "",
            "content_text": "",
            "has_wake_word": False,
            "intent": "UNKNOWN",
            "entity": None,
            "parameters": {},
            "confidence": 0.0,
            "tokens": [],
            "message": "Empty voice command"
        }

    # Check wake word presence
    has_wake_word = check_wake_word(tokens)
    
    # Remove wake word ONLY if it appears at the beginning of the command
    content_tokens = tokens.copy()
    if content_tokens and content_tokens[0] in WAKE_WORDS:
        content_tokens = content_tokens[1:]
    content_text = " ".join(content_tokens) if content_tokens else cleaned

    best_intent = "UNKNOWN"
    best_confidence = 0.0
    extracted_entity = None
    extracted_params = {}

    # 1. Evaluate Intent Patterns
    for intent, patterns in INTENT_PATTERNS.items():
        for pat in patterns:
            match = re.search(pat, content_text, re.IGNORECASE)
            if match:
                best_intent = intent
                best_confidence = 0.95 if has_wake_word else 0.85
                
                # Extract captured group safely if present and not None
                if match.groups():
                    for group_val in match.groups():
                        if group_val is not None:
                            extracted_entity = str(group_val).lower()
                            break
                break
        if best_intent != "UNKNOWN":
            break

    # 2. Refine Entity for URL (if matched OPEN_URL or if URL domain present)
    if best_intent == "OPEN_URL" or (best_intent == "UNKNOWN" and re.search(r"https?://\S+|www\.\S+|\w+\.(com|org|in|net|io|co)", content_text)):
        url_match = re.search(r"(https?://\S+|www\.\S+|\w+\.(?:com|org|in|net|io|co))", content_text)
        if url_match:
            best_intent = "OPEN_URL"
            extracted_entity = url_match.group(0)
            extracted_params["url"] = extracted_entity
            best_confidence = 0.95

    # 3. Refine Entity Extraction (NER for Apps)
    if best_intent == "OPEN_APP" or (best_intent == "UNKNOWN" and any(w in content_text for w in ["open", "launch", "start", "show"])):
        for app_name, aliases in KNOWN_APPS.items():
            for alias in aliases:
                if re.search(rf"\b{re.escape(alias)}\b", content_text):
                    best_intent = "OPEN_APP"
                    extracted_entity = app_name
                    best_confidence = 0.98 if has_wake_word else 0.90
                    break
            if extracted_entity and best_intent == "OPEN_APP":
                break

    # 4. Refine Entity for Volume (normalize to: up, down, max, low, mute)
    if best_intent == "SET_VOLUME":
        if re.search(r"up\s*\*?\s*3|up\s+three|up\s+times\s+3|up\s+3\s+times|up\s+three\s+times|up\s+up\s+up", raw_text, re.IGNORECASE) or \
           re.search(r"up\s*3|up\s+three|up\s+times\s+3|up\s+3\s+times|up\s+three\s+times|up\s+up\s+up", content_text, re.IGNORECASE):
            extracted_entity = "max"
        elif any(w in content_text for w in ["max", "maximum", "full", "loud", "100"]):
            extracted_entity = "max"
        elif any(w in content_text for w in ["down", "decrease", "lower", "turn down"]):
            extracted_entity = "down"
        elif any(w in content_text for w in ["low", "min", "minimum", "quiet"]):
            extracted_entity = "low"
        elif any(w in content_text for w in ["mute", "silent", "zero", "off"]):
            extracted_entity = "mute"
        elif any(w in content_text for w in ["up", "increase", "raise", "higher", "turn up"]):
            extracted_entity = "up"
        else:
            extracted_entity = "up"

    # 5. Precise Fallback intent checking
    if best_intent == "UNKNOWN" and content_tokens:
        if re.search(r"\b(volume|mute|unmute)\b", content_text):
            best_intent = "SET_VOLUME"
            extracted_entity = "max" if any(w in content_text for w in ["max", "full", "100"]) else ("mute" if "mute" in content_text else "up")
            best_confidence = 0.75
        elif any(w in content_text for w in ["lock", "turn off screen"]):
            best_intent = "LOCK_SCREEN"
            best_confidence = 0.70
        elif any(w in content_text for w in ["ring", "find", "where is"]):
            best_intent = "RING_PHONE"
            best_confidence = 0.80

    return {
        "raw_text": raw_text,
        "cleaned_text": cleaned,
        "content_text": content_text,
        "has_wake_word": has_wake_word,
        "intent": best_intent,
        "entity": extracted_entity,
        "parameters": extracted_params,
        "confidence": round(best_confidence, 2),
        "tokens": tokens
    }
