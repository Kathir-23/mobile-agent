import React, { useState } from 'react';
import { 
  BellRing, Lock, Sun, Tv, MessageSquare, Globe, MapPin, Camera, 
  Settings as SettingsIcon, Calculator, Image, PhoneCall, Users, Clock, 
  Volume2, Volume1, VolumeX, Home, ArrowLeft, Activity, Search, Copy, 
  Check, Play, Zap, Info, ShieldAlert, AppWindow, Compass, Sparkles, ExternalLink
} from 'lucide-react';
import './DeviceControl.css';

const ALL_COMMAND_ITEMS = [
  // Security & Beacon
  {
    title: 'Ring Phone',
    category: 'Security & Beacon',
    icon: BellRing,
    emoji: '🚨',
    intent: 'RING_PHONE',
    entity: null,
    color: '#ef4444',
    phrases: ['Buddy, ring my phone', 'Buddy, find my device', 'Buddy, sound alarm'],
    desc: 'Unmutes DND, sets 100% Volume, Flashlight ON, Vibrates & plays Alarm sound.'
  },
  {
    title: 'Lock Screen',
    category: 'Security & Beacon',
    icon: Lock,
    emoji: '🔒',
    intent: 'LOCK_SCREEN',
    entity: null,
    color: '#8b5cf6',
    phrases: ['Buddy, lock screen', 'Buddy, turn off screen', 'Buddy, sleep phone'],
    desc: 'Locks display immediately and turns off flashlight.'
  },
  {
    title: 'Wake Screen',
    category: 'Security & Beacon',
    icon: Sun,
    emoji: '☀️',
    intent: 'WAKE_SCREEN',
    entity: null,
    color: '#f59e0b',
    phrases: ['Buddy, wake screen', 'Buddy, turn on screen', 'Buddy, unlock phone'],
    desc: 'Awakens phone display and swipes up automatically.'
  },

  // App Launchers
  {
    title: 'YouTube',
    category: 'App Launchers',
    icon: Tv,
    emoji: '📺',
    intent: 'OPEN_APP',
    entity: 'youtube',
    color: '#ff0000',
    phrases: ['Buddy, open YouTube', 'Buddy, launch YT'],
    desc: 'Launches YouTube video application.'
  },
  {
    title: 'WhatsApp',
    category: 'App Launchers',
    icon: MessageSquare,
    emoji: '💬',
    intent: 'OPEN_APP',
    entity: 'whatsapp',
    color: '#25d366',
    phrases: ['Buddy, open WhatsApp', 'Buddy, launch WA'],
    desc: 'Launches WhatsApp instant messaging app.'
  },
  {
    title: 'Google Chrome',
    category: 'App Launchers',
    icon: Globe,
    emoji: '🌐',
    intent: 'OPEN_APP',
    entity: 'chrome',
    color: '#38bdf8',
    phrases: ['Buddy, open Chrome', 'Buddy, launch browser'],
    desc: 'Opens Chrome web browser.'
  },
  {
    title: 'Google Maps',
    category: 'App Launchers',
    icon: MapPin,
    emoji: '🗺️',
    intent: 'OPEN_APP',
    entity: 'maps',
    color: '#10b981',
    phrases: ['Buddy, open Maps', 'Buddy, open navigation'],
    desc: 'Launches Google Maps GPS navigation.'
  },
  {
    title: 'Camera',
    category: 'App Launchers',
    icon: Camera,
    emoji: '📷',
    intent: 'OPEN_APP',
    entity: 'camera',
    color: '#06b6d4',
    phrases: ['Buddy, open Camera', 'Buddy, launch cam'],
    desc: 'Opens system camera app.'
  },
  {
    title: 'Settings',
    category: 'App Launchers',
    icon: SettingsIcon,
    emoji: '⚙️',
    intent: 'OPEN_APP',
    entity: 'settings',
    color: '#94a3b8',
    phrases: ['Buddy, open Settings', 'Buddy, launch config'],
    desc: 'Opens Android system configuration menu.'
  },
  {
    title: 'Calculator',
    category: 'App Launchers',
    icon: Calculator,
    emoji: '🧮',
    intent: 'OPEN_APP',
    entity: 'calculator',
    color: '#f97316',
    phrases: ['Buddy, open Calculator', 'Buddy, open calc'],
    desc: 'Launches calculator app.'
  },
  {
    title: 'Photos / Gallery',
    category: 'App Launchers',
    icon: Image,
    emoji: '🖼️',
    intent: 'OPEN_APP',
    entity: 'photos',
    color: '#ec4899',
    phrases: ['Buddy, open Photos', 'Buddy, open gallery'],
    desc: 'Opens photo gallery album.'
  },
  {
    title: 'Phone Dialer',
    category: 'App Launchers',
    icon: PhoneCall,
    emoji: '📞',
    intent: 'OPEN_APP',
    entity: 'dialer',
    color: '#10b981',
    phrases: ['Buddy, open dialer', 'Buddy, phone call'],
    desc: 'Opens phone dialer app.'
  },
  {
    title: 'Contacts',
    category: 'App Launchers',
    icon: Users,
    emoji: '👥',
    intent: 'OPEN_APP',
    entity: 'contacts',
    color: '#3b82f6',
    phrases: ['Buddy, open contacts', 'Buddy, address book'],
    desc: 'Opens contact list.'
  },
  {
    title: 'Clock & Alarm',
    category: 'App Launchers',
    icon: Clock,
    emoji: '⏰',
    intent: 'OPEN_APP',
    entity: 'clock',
    color: '#a855f7',
    phrases: ['Buddy, open clock', 'Buddy, open alarms'],
    desc: 'Launches clock and alarm timers.'
  },

  // Volume & Audio
  {
    title: 'Volume 100% Max',
    category: 'Volume & Audio',
    icon: Volume2,
    emoji: '🔊',
    intent: 'SET_VOLUME',
    entity: 'max',
    color: '#ef4444',
    phrases: ['Buddy, volume max', 'Buddy, full volume'],
    desc: 'Sets all audio streams to 100% max level.'
  },
  {
    title: 'Volume Up (+5)',
    category: 'Volume & Audio',
    icon: Volume1,
    emoji: '🔉',
    intent: 'SET_VOLUME',
    entity: 'up',
    color: '#38bdf8',
    phrases: ['Buddy, volume up', 'Buddy, turn up sound'],
    desc: 'Increases volume by 5 steps (+5).'
  },
  {
    title: 'Volume Down (-5)',
    category: 'Volume & Audio',
    icon: Volume1,
    emoji: '🔈',
    intent: 'SET_VOLUME',
    entity: 'down',
    color: '#64748b',
    phrases: ['Buddy, volume down', 'Buddy, lower volume'],
    desc: 'Decreases volume by 5 steps (-5).'
  },
  {
    title: 'Mute Sound',
    category: 'Volume & Audio',
    icon: VolumeX,
    emoji: '🔇',
    intent: 'SET_VOLUME',
    entity: 'mute',
    color: '#f59e0b',
    phrases: ['Buddy, mute volume', 'Buddy, silent mode'],
    desc: 'Silences all audio streams immediately.'
  },

  // Navigation & System
  {
    title: 'Go Home',
    category: 'Navigation & System',
    icon: Home,
    emoji: '🏠',
    intent: 'NAV_HOME',
    entity: null,
    color: '#38bdf8',
    phrases: ['Buddy, go home', 'Buddy, main screen'],
    desc: 'Returns to home desktop (Keyevent 3).'
  },
  {
    title: 'Go Back',
    category: 'Navigation & System',
    icon: ArrowLeft,
    emoji: '⬅️',
    intent: 'NAV_BACK',
    entity: null,
    color: '#64748b',
    phrases: ['Buddy, go back', 'Buddy, previous screen'],
    desc: 'Executes Back button (Keyevent 4).'
  },
  {
    title: 'Take Screenshot',
    category: 'Navigation & System',
    icon: Camera,
    emoji: '📸',
    intent: 'SCREENSHOT',
    entity: null,
    color: '#6366f1',
    phrases: ['Buddy, take a screenshot', 'Buddy, screen capture'],
    desc: 'Captures screen PNG image to phone.'
  },
  {
    title: 'Check Status',
    category: 'Navigation & System',
    icon: Activity,
    emoji: '📊',
    intent: 'CHECK_STATUS',
    entity: null,
    color: '#a855f7',
    phrases: ['Buddy, check phone status', 'Buddy, battery level'],
    desc: 'Checks ADB connection, phone model & battery.'
  },

  // Web Navigation
  {
    title: 'Open Website URL',
    category: 'Web Navigation',
    icon: ExternalLink,
    emoji: '🌐',
    intent: 'OPEN_URL',
    entity: 'github.com',
    color: '#10b981',
    phrases: ['Buddy, visit github.com', 'Buddy, open google.com'],
    desc: 'Opens web URL inside default browser.'
  }
];

const CATEGORIES = ['ALL', 'Security & Beacon', 'App Launchers', 'Volume & Audio', 'Navigation & System', 'Web Navigation'];

export default function DeviceControl() {
  const [loadingAction, setLoadingAction] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedPhrase, setCopiedPhrase] = useState(null);

  const handleExecute = async (intent, entity = null, samplePhrase = null) => {
    const actionKey = `${intent}_${entity || ''}`;
    setLoadingAction(actionKey);
    setActionMessage('');

    try {
      let res;
      if (samplePhrase) {
        res = await fetch('http://localhost:5000/api/buddy/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: samplePhrase })
        });
      } else {
        res = await fetch('http://localhost:5000/api/buddy/quick-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, entity })
        });
      }
      const data = await res.json();
      setActionMessage(data.message || 'Command executed on phone');
    } catch (err) {
      console.error('Command execution failed:', err);
      setActionMessage('Failed to send command to phone');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopyPhrase = (phrase) => {
    navigator.clipboard.writeText(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase(null), 2000);
  };

  // Filter items
  const filteredItems = ALL_COMMAND_ITEMS.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.intent.toLowerCase().includes(q) ||
      (item.entity && item.entity.toLowerCase().includes(q)) ||
      item.phrases.some(p => p.toLowerCase().includes(q)) ||
      item.desc.toLowerCase().includes(q)
    );
  });

  return (
    <div className="device-control-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 Visual Command Matrix & Icon Controls</h1>
          <p className="page-subtitle">Instant Icon Cards for Every Recognized Buddy AI Command & Remote Trigger</p>
        </div>
      </div>

      {/* Execution Banner */}
      {actionMessage && (
        <div className="action-feedback">
          <Zap size={18} style={{ marginRight: 8, color: '#38bdf8' }} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search Bar & Category Pill Filters */}
      <div className="control-toolbar glass">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search commands by name, icon, phrase, or intent..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-pills">
          {CATEGORIES.map(cat => {
            const count = cat === 'ALL' 
              ? ALL_COMMAND_ITEMS.length 
              : ALL_COMMAND_ITEMS.filter(i => i.category === cat).length;
            return (
              <button
                key={cat}
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon Cards Grid */}
      <div className="icon-cards-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <Info size={36} className="text-muted" />
            <span>No command icons match "{searchQuery}"</span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const ItemIcon = item.icon;
            const actionKey = `${item.intent}_${item.entity || ''}`;
            const isLoading = loadingAction === actionKey;

            return (
              <div 
                key={item.title} 
                className={`icon-cmd-card ${isLoading ? 'loading' : ''}`}
                style={{ '--accent-color': item.color }}
              >
                {/* Visual Icon Header */}
                <div className="card-top-icon" style={{ background: `${item.color}22`, border: `1px solid ${item.color}44`, color: item.color }}>
                  <ItemIcon size={26} />
                  <span className="card-emoji">{item.emoji}</span>
                </div>

                {/* Command Title & Intent Code */}
                <div className="card-info">
                  <h3 className="card-name">{item.title}</h3>
                  <div className="badge-row">
                    <span className="intent-tag">{item.intent}</span>
                    {item.entity && <span className="entity-tag">{item.entity}</span>}
                  </div>
                </div>

                <p className="card-desc">{item.desc}</p>

                {/* Voice Command Phrase Box */}
                <div className="phrase-box">
                  <span className="phrase-label">Speak phrase:</span>
                  <div className="phrase-value-row">
                    <span className="phrase-text">"{item.phrases[0]}"</span>
                    <button
                      className="icon-action-btn copy"
                      onClick={() => handleCopyPhrase(item.phrases[0])}
                      title="Copy voice command"
                    >
                      {copiedPhrase === item.phrases[0] ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Direct Execute Trigger Button */}
                <button
                  className="exec-trigger-btn"
                  style={{ background: item.color }}
                  onClick={() => handleExecute(item.intent, item.entity, item.phrases[0])}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="btn-spin">⚡ Executing...</span>
                  ) : (
                    <>
                      <Play size={13} style={{ fill: '#ffffff', color: '#ffffff', marginRight: 6 }} />
                      Run Command
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
