import React, { useState, useEffect, Component } from 'react';
import {
  Palette, Smartphone, RefreshCw, Info, Save, ShieldAlert, Database, Download, Trash2, Zap
} from 'lucide-react';
import { useApp } from '../context';
import { settingsApi, healthApi, buddyApi, systemApi } from '../api';
import './Settings.css';

class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('SettingsErrorBoundary caught error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem', border: '1px solid #ef4444' }}>
          <h2>⚠️ Settings Page Error</h2>
          <p><strong>Error:</strong> {this.state.error?.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#f87171' }}>
            {this.state.info?.componentStack || this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Section({ title, icon: Icon, color = '#38bdf8', children }) {
  return (
    <div className="glass settings-section card-hover">
      <div className="section-head">
        <div className="section-icon" style={{ background: `${color}22`, color }}>
          {Icon ? <Icon size={18}/> : <Zap size={18}/>}
        </div>
        <h3 className="section-title">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, id }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <span className="setting-label">{label}</span>
        {desc && <span className="setting-desc text-muted text-xs">{desc}</span>}
      </div>
      <label className="toggle-switch" htmlFor={id}>
        <input id={id} type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}/>
        <span className="toggle-slider"/>
      </label>
    </div>
  );
}

const ACCENTS = [
  { color: '#38bdf8', label: 'Cyan'    },
  { color: '#4F46E5', label: 'Indigo'  },
  { color: '#7C3AED', label: 'Violet'  },
  { color: '#10B981', label: 'Emerald' },
  { color: '#EC4899', label: 'Pink'    },
  { color: '#F59E0B', label: 'Amber'   },
];

function SettingsContent() {
  const appCtx = useApp() || {};
  const storeSettings = appCtx.settings || {};
  const updateSettings = appCtx.updateSettings || (() => {});
  const addToast = appCtx.addToast || (() => {});

  const [local, setLocal] = useState({
    darkMode: true,
    accentColor: '#38bdf8',
    phoneIp: '100.105.217.111',
    phonePort: '5555',
    adbTimeout: 5,
    allowSimulation: true,
    nlpConfidence: 0.7,
    strictNlp: false,
    beaconOverrideDnd: true,
    beaconDuration: 10,
    ...storeSettings
  });

  const [saving, setSaving] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState({ connected: false, model: 'Unknown', battery: null, ip: '' });
  const [reconnecting, setReconnecting] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [stats, setStats] = useState({ db_size_mb: 0, total_logs: 0, success_logs: 0, failed_logs: 0 });
  const [clearingLogs, setClearingLogs] = useState(false);

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    try {
      const [statusRes, healthRes, statsRes, dbSettingsRes] = await Promise.all([
        buddyApi.getStatus().catch(() => null),
        healthApi.get().catch(() => null),
        systemApi.getStats().catch(() => null),
        settingsApi.getAll().catch(() => null),
      ]);

      if (statusRes?.data) setPhoneStatus(statusRes.data);
      if (healthRes) setBackendHealth(healthRes);
      if (statsRes?.data) setStats(statsRes.data);
      
      if (dbSettingsRes?.data) {
        const s = dbSettingsRes.data;
        setLocal(prev => ({
          ...prev,
          darkMode: s.dark_mode !== undefined ? s.dark_mode === 'true' : prev.darkMode,
          accentColor: s.accent_color || prev.accentColor,
          phoneIp: s.phone_ip || prev.phoneIp,
          phonePort: s.phone_port || prev.phonePort,
          adbTimeout: s.adb_timeout ? parseInt(s.adb_timeout) : prev.adbTimeout,
          allowSimulation: s.allow_simulation !== undefined ? s.allow_simulation === 'true' : prev.allowSimulation,
          nlpConfidence: s.nlp_confidence ? parseFloat(s.nlp_confidence) : prev.nlpConfidence,
          strictNlp: s.strict_nlp !== undefined ? s.strict_nlp === 'true' : prev.strictNlp,
          beaconOverrideDnd: s.beacon_override_dnd !== undefined ? s.beacon_override_dnd === 'true' : prev.beaconOverrideDnd,
          beaconDuration: s.beacon_duration ? parseInt(s.beacon_duration) : prev.beaconDuration,
        }));
      }
    } catch (e) {
      console.error('fetchInfo error:', e);
    }
  };

  const applyPreview = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    const root = document.documentElement;
    if (patch.darkMode !== undefined) {
      if (patch.darkMode) {
        root.classList.remove('light-mode');
        root.style.setProperty('--bg-primary', '#0F172A');
        root.style.setProperty('--bg-secondary', '#1E293B');
        root.style.setProperty('--text-primary', '#F1F5F9');
        root.style.setProperty('--text-secondary', '#94A3B8');
        root.style.setProperty('--border', 'rgba(255,255,255,0.08)');
        root.style.setProperty('--bg-card', 'rgba(255,255,255,0.06)');
      } else {
        root.classList.add('light-mode');
        root.style.setProperty('--bg-primary', '#F0F4FF');
        root.style.setProperty('--bg-secondary', '#E8EEFF');
        root.style.setProperty('--text-primary', '#0F172A');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--border', 'rgba(0,0,0,0.08)');
        root.style.setProperty('--bg-card', 'rgba(255,255,255,0.7)');
      }
    }
    if (patch.accentColor) root.style.setProperty('--primary', patch.accentColor);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      updateSettings(local);
      await settingsApi.update({
        dark_mode: (local?.darkMode ?? true).toString(),
        accent_color: local?.accentColor || '#38bdf8',
        phone_ip: local?.phoneIp || '100.105.217.111',
        phone_port: local?.phonePort || '5555',
        adb_timeout: (local?.adbTimeout || 5).toString(),
        allow_simulation: (local?.allowSimulation ?? true).toString(),
        nlp_confidence: (local?.nlpConfidence || 0.7).toString(),
        strict_nlp: (local?.strictNlp ?? false).toString(),
        beacon_override_dnd: (local?.beaconOverrideDnd ?? true).toString(),
        beacon_duration: (local?.beaconDuration || 10).toString(),
      });
      addToast('Settings & System Configuration saved ✓', 'success');
    } catch (err) {
      updateSettings(local);
      addToast('Settings saved locally', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleReconnectADB = async () => {
    setReconnecting(true);
    try {
      const res = await buddyApi.connect();
      if (res?.data) setPhoneStatus(res.data);
      addToast(res?.message || 'ADB Reconnect initiated', res?.success ? 'success' : 'error');
    } catch (err) {
      addToast(`ADB Connection error: ${err.message}`, 'error');
    } finally {
      setReconnecting(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const res = await buddyApi.getHistory();
      const logs = res?.data || [];
      const jsonStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buddy_execution_logs_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Logs exported successfully ✓', 'success');
    } catch (err) {
      addToast('Failed to export logs', 'error');
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all command history logs? This cannot be undone.')) return;
    setClearingLogs(true);
    try {
      await systemApi.clearLogs();
      addToast('Command history cleared ✓', 'success');
      fetchInfo();
    } catch (err) {
      addToast('Failed to clear history', 'error');
    } finally {
      setClearingLogs(false);
    }
  };

  const safeStats = stats || { db_size_mb: 0, total_logs: 0, success_logs: 0, failed_logs: 0 };
  const safePhone = phoneStatus || { connected: false, model: 'Unknown', battery: null, ip: '' };
  const confPercent = Math.round((local?.nlpConfidence || 0.7) * 100);

  return (
    <div className="settings-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">⚙️ Buddy Control & Engineering Settings</h1>
        <p className="page-subtitle">Configure ADB Target Network, Voice NLP Engine, Beacon Rules & System Diagnostics</p>
      </div>

      <div className="settings-grid">
        
        {/* Module 1: ADB Phone & Network Configuration */}
        <Section title="1. ADB Target & Network Bridge" icon={Smartphone} color="#38bdf8">
          <div className="setting-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Status Banner */}
            <div className="status-box glass" style={{ padding: '0.85rem', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Target Device Status</span>
                <span className="font-semibold text-sm">
                  {safePhone.connected ? `${safePhone.model || 'Device'} (${safePhone.ip || ''})` : 'Offline / TCP Pending'}
                </span>
              </div>
              <span className={`badge ${safePhone.connected ? 'badge-success' : 'badge-danger'}`}>
                {safePhone.connected ? 'ONLINE' : 'DISCONNECTED'}
              </span>
            </div>

            {/* Target IP & Port Inputs */}
            <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div className="input-group">
                <label className="input-label">Target Phone IP</label>
                <input
                  type="text"
                  className="setting-input"
                  value={local?.phoneIp || ''}
                  onChange={e => applyPreview({ phoneIp: e.target.value })}
                  placeholder="100.105.217.111"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Port</label>
                <input
                  type="text"
                  className="setting-input"
                  value={local?.phonePort || ''}
                  onChange={e => applyPreview({ phonePort: e.target.value })}
                  placeholder="5555"
                />
              </div>
            </div>

            {/* ADB Command Timeout Slider */}
            <div className="setting-row">
              <div className="setting-text">
                <span className="setting-label">ADB Command Timeout</span>
                <span className="setting-desc text-muted text-xs">Maximum wait time for ADB response ({local?.adbTimeout || 5} seconds)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={local?.adbTimeout || 5}
                onChange={e => applyPreview({ adbTimeout: parseInt(e.target.value) || 5 })}
                className="setting-range"
              />
            </div>

            {/* Simulation Fallback */}
            <Toggle 
              id="toggle-sim" 
              label="Offline Simulation Fallback" 
              desc="Allow command simulation & logging when physical phone is disconnected"
              checked={local?.allowSimulation ?? true} 
              onChange={v => applyPreview({ allowSimulation: v })}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-primary" onClick={handleReconnectADB} disabled={reconnecting}>
                <RefreshCw size={14} className={reconnecting ? 'spin' : ''} style={{ marginRight: 6 }}/>
                {reconnecting ? 'Pinging Device...' : 'Test & Connect ADB'}
              </button>
            </div>
          </div>
        </Section>

        {/* Module 2: Voice NLP Engine Tuning */}
        <Section title="2. NLP Engine & Voice Tuning" icon={Zap} color="#a855f7">
          <div className="setting-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Confidence Threshold Slider */}
            <div className="setting-row">
              <div className="setting-text">
                <span className="setting-label">Minimum Intent Confidence</span>
                <span className="setting-desc text-muted text-xs">Require at least {confPercent}% pattern match score</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={local?.nlpConfidence || 0.7}
                onChange={e => applyPreview({ nlpConfidence: parseFloat(e.target.value) || 0.7 })}
                className="setting-range"
              />
            </div>

            {/* Strict NLP Matching */}
            <Toggle 
              id="toggle-strict-nlp" 
              label="Strict Intent Precision" 
              desc="Reject low-confidence voice commands instead of best-guess fallback"
              checked={local?.strictNlp ?? false} 
              onChange={v => applyPreview({ strictNlp: v })}
            />

            <div className="info-callout glass" style={{ padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              ℹ️ Buddy NLP uses regex tokenization and direct entity extraction for instant, low-latency command resolution.
            </div>
          </div>
        </Section>

        {/* Module 3: Security & Beacon Rules */}
        <Section title="3. Beacon & Alarm Safety Rules" icon={ShieldAlert} color="#ef4444">
          <div className="setting-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            <Toggle 
              id="toggle-dnd-override" 
              label="Force Override Silent & DND" 
              desc="Unmute phone sound streams automatically during Ring Phone beacon"
              checked={local?.beaconOverrideDnd ?? true} 
              onChange={v => applyPreview({ beaconOverrideDnd: v })}
            />

            {/* Beacon Duration Slider */}
            <div className="setting-row">
              <div className="setting-text">
                <span className="setting-label">Beacon Duration</span>
                <span className="setting-desc text-muted text-xs">Flashlight and vibration run time ({local?.beaconDuration || 10} seconds)</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={local?.beaconDuration || 10}
                onChange={e => applyPreview({ beaconDuration: parseInt(e.target.value) || 10 })}
                className="setting-range"
              />
            </div>
          </div>
        </Section>

        {/* Module 4: Database & Diagnostics */}
        <Section title="4. Database & Diagnostics" icon={Database} color="#10b981">
          <div className="setting-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            <div className="stats-box-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="stat-card glass" style={{ padding: '0.65rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <span className="text-xs text-muted" style={{ display: 'block' }}>DB Size</span>
                <span className="font-bold text-sm" style={{ color: '#38bdf8' }}>{safeStats.db_size_mb || 0} MB</span>
              </div>
              <div className="stat-card glass" style={{ padding: '0.65rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Total Logs</span>
                <span className="font-bold text-sm" style={{ color: '#10b981' }}>{safeStats.total_logs || 0}</span>
              </div>
              <div className="stat-card glass" style={{ padding: '0.65rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Success Rate</span>
                <span className="font-bold text-sm" style={{ color: '#a855f7' }}>
                  {safeStats.total_logs > 0 ? `${Math.round(((safeStats.success_logs || 0) / safeStats.total_logs) * 100)}%` : '100%'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={handleExportLogs}>
                <Download size={14} style={{ marginRight: 6 }}/>
                Export Logs (JSON)
              </button>
              <button className="btn btn-danger" onClick={handleClearLogs} disabled={clearingLogs}>
                <Trash2 size={14} style={{ marginRight: 6 }}/>
                {clearingLogs ? 'Purging...' : 'Purge History'}
              </button>
            </div>
          </div>
        </Section>

        {/* Module 5: Appearance & Theme */}
        <Section title="5. Appearance & UI Theme" icon={Palette} color="#38bdf8">
          <div className="setting-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            <Toggle id="toggle-dark-mode" label="Dark Theme" desc="Toggle application interface dark mode"
              checked={local?.darkMode ?? true} onChange={v => applyPreview({ darkMode: v })}/>
            
            <div className="setting-divider"/>
            
            <div className="setting-row">
              <div className="setting-text">
                <span className="setting-label">Accent Color Theme</span>
                <span className="setting-desc text-muted text-xs">Select custom interface primary highlight</span>
              </div>
              <div className="color-swatches" style={{ display: 'flex', gap: 8 }}>
                {ACCENTS.map(a => (
                  <button key={a.color} id={`accent-${a.label.toLowerCase()}`}
                    className={`swatch ${(local?.accentColor || '#38bdf8') === a.color ? 'swatch-active' : ''}`}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: a.color,
                      boxShadow: (local?.accentColor || '#38bdf8') === a.color ? `0 0 10px ${a.color}` : 'none',
                      border: (local?.accentColor || '#38bdf8') === a.color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                    title={a.label}
                    onClick={() => applyPreview({ accentColor: a.color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

      </div>

      {/* Save Button Floating Bar */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
          <Save size={18} style={{ marginRight: 8 }}/>
          {saving ? 'Saving System Config...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

export default function Settings(props) {
  return (
    <SettingsErrorBoundary>
      <SettingsContent {...props} />
    </SettingsErrorBoundary>
  );
}
