# Buddy AI Assistant

An AI-powered NLP voice assistant that controls your Android phone via ADB over Tailscale.

## Features
- 🎙️ Natural language voice command processing (NLP)
- 📱 Android phone control via ADB (open apps, volume, screen, find phone)
- 📋 Command history logging
- 🌐 React + Vite frontend with Flask backend

## Setup

### Backend
```bash
pip install -r requirements_backend.txt
python -m backend.app
```

### Frontend
```bash
npm install
npm run dev
```

### ADB Setup
1. Enable Developer Options on your Android phone
2. Enable ADB over Wi-Fi or connect via Tailscale
3. Set `BUDDY_PHONE_IP` in your `.env` file
