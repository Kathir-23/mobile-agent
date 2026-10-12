import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, Battery, BatteryCharging, Wifi, CheckCircle2, Zap, 
  RefreshCw, QrCode, Copy, Check, Radio, Play, BellRing, Tv, Volume2
} from 'lucide-react';
import './ConnectedDevices.css';

export default function ConnectedDevices() {
  const [devicesStatus, setDevicesStatus] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);

  const [showQr, setShowQr] = useState(false);

  // Try to fetch current active Cloudflare tunnel URL from backend
  useEffect(() => {
    fetch('http://localhost:5000/api/buddy/tunnel-url')
      .then(r => r.json())
      .then(d => { if (d.url) setTunnelUrl(d.url); })
      .catch(() => {});
  }, []);

  const serverIp = window.location.hostname || '127.0.0.1';
  const localAgentUrl = `http://${serverIp}:5000/agent`;
  const agentUrl = tunnelUrl ? `${tunnelUrl}/agent` : localAgentUrl;

  const fetchDevices = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('http://localhost:5000/api/buddy/status');
      const data = await res.json();
      if (data.success) {
        setDevicesStatus(data.data);
        // Filter out laptop/desktop agents - only show real mobile devices
        // A real mobile agent has platform containing 'Android'/'iPhone' OR
        // the model is not 'laptop'/'MacIntel'/'Win32' (desktop platforms)
        const mobileOnly = (data.active_agents || []).filter(agent => {
          const model = (agent.model || '').toLowerCase();
          const id = (agent.device_id || '').toLowerCase();
          // Keep if it looks like a real mobile device ID (android_ prefix)
          // or model doesn't contain desktop keywords
          return !model.includes('laptop') && 
                 !model.includes('macintel') && 
                 !model.includes('win32') &&
                 !model.includes('mobile device') === false ||
                 id.startsWith('android_') ||
                 id.startsWith('phone_');
        });
        setActiveAgents(mobileOnly);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectDevice = async (deviceId) => {
    try {
      const res = await fetch('http://localhost:5000/api/buddy/agent/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDeviceId(deviceId);
        setActionFeedback(`Switched active phone target to ${deviceId}`);
        fetchDevices();
      }
    } catch (err) {
      setActionFeedback('Failed to switch active device');
    }
  };

  const handleQuickCommand = async (deviceId, intent, entity = null) => {
    setActionFeedback(`Sending ${intent} to device...`);
    try {
      const res = await fetch('http://localhost:5000/api/buddy/quick-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, entity, device_id: deviceId })
      });
      const data = await res.json();
      setActionFeedback(data.message || 'Action executed successfully');
    } catch (err) {
      setActionFeedback('Failed to send command');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(agentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="connected-devices-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 Connected Mobile Devices</h1>
          <p className="page-subtitle">Manage, Switch, and Control All Active Phones (ADB & Buddy Mobile Agents)</p>
        </div>
        <button className="btn btn-glass" onClick={fetchDevices} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} style={{ marginRight: 6 }} />
          Refresh Devices
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="feedback-banner glass">
          <Zap size={16} color="#38bdf8" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Mobile Connect Helper Card */}
      <div className="mobile-agent-card glass-strong">
        <div className="agent-card-header">
          <div className="qr-badge" onClick={() => setShowQr(!showQr)} style={{ cursor: 'pointer' }} title="Click to view QR Code">
            <QrCode size={24} color="#38bdf8" />
          </div>
          <div>
            <h3>Connect Any New Phone (Scan QR Code or Open Link)</h3>
            <p>Point any phone camera at the QR code below or open the web link to connect instantly!</p>
          </div>
        </div>

        {/* Scannable QR Code Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
            <QRCodeSVG 
              value={agentUrl} 
              size={160}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={true}
            />
          </div>
          <span style={{ fontSize: '12px', color: '#38bdf8', marginTop: '10px', fontFamily: 'monospace' }}>
            📷 Point any phone camera at this QR Code to connect
          </span>
        </div>

        {tunnelUrl && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '8px 14px', marginBottom: 8, fontSize: 12, color: '#10b981' }}>
            🌍 <strong>Global URL (works from anywhere):</strong> {tunnelUrl}/agent
          </div>
        )}
        <div className="link-copy-box">
          <input type="text" readOnly value={agentUrl} className="link-input font-mono" />
          <button className="copy-btn btn-glass" onClick={handleCopyLink}>
            {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </button>
          <a href={`http://${serverIp}:5000/download/agent.apk`} className="copy-btn btn-glass" style={{ textDecoration: 'none', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }} download>
            📥 Download APK
          </a>
        </div>
      </div>

      {/* Connected Devices Grid */}
      <h2 className="section-title">
        <Radio size={18} color="#10b981" style={{ marginRight: 8 }} />
        Active Phones List ({ (devicesStatus?.connected ? 1 : 0) + activeAgents.length })
      </h2>

      <div className="devices-grid">
        {/* ADB Connected Device */}
        {devicesStatus && devicesStatus.connected && (
          <div className={`device-card glass-strong ${!selectedDeviceId || selectedDeviceId === 'adb' ? 'selected' : ''}`}>
            <div className="card-header">
              <div className="device-avatar adb">
                <Smartphone size={24} color="#38bdf8" />
              </div>
              <div className="device-meta">
                <div className="meta-title-row">
                  <h3>{devicesStatus.model || 'ADB Phone'}</h3>
                  <span className="type-badge adb">Wireless ADB</span>
                </div>
                <span className="device-sub">{devicesStatus.ip || '10.94.194.199:5555'}</span>
              </div>
            </div>

            <div className="card-stats">
              <div className="stat-item">
                <Battery size={16} color={devicesStatus.battery > 50 ? '#10b981' : '#f59e0b'} />
                <span>Battery: <strong>{devicesStatus.battery !== null ? `${devicesStatus.battery}%` : 'N/A'}</strong></span>
              </div>
              <div className="stat-item">
                <Wifi size={16} color="#38bdf8" />
                <span>Status: <strong>Connected</strong></span>
              </div>
            </div>

            <div className="card-actions">
              <button 
                className={`switch-btn ${!selectedDeviceId || selectedDeviceId === 'adb' ? 'active' : ''}`}
                onClick={() => handleSelectDevice('adb')}
              >
                {!selectedDeviceId || selectedDeviceId === 'adb' ? (
                  <>
                    <CheckCircle2 size={15} style={{ marginRight: 6 }} /> Active Target
                  </>
                ) : (
                  'Switch to this Phone'
                )}
              </button>

              <div className="quick-test-row">
                <button className="test-btn" onClick={() => handleQuickCommand('adb', 'RING_PHONE')} title="Ring Alarm">
                  <BellRing size={14} color="#ef4444" /> Ring
                </button>
                <button className="test-btn" onClick={() => handleQuickCommand('adb', 'OPEN_APP', 'youtube')} title="Open YouTube">
                  <Tv size={14} color="#ff0000" /> YouTube
                </button>
                <button className="test-btn" onClick={() => handleQuickCommand('adb', 'SET_VOLUME', 'max')} title="Max Volume">
                  <Volume2 size={14} color="#38bdf8" /> Max Vol
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buddy Mobile Agent Devices */}
        {activeAgents.map(agent => {
          const isSelected = agent.is_selected || selectedDeviceId === agent.device_id;
          return (
            <div key={agent.device_id} className={`device-card glass-strong ${isSelected ? 'selected' : ''}`}>
              <div className="card-header">
                <div className="device-avatar agent">
                  <Smartphone size={24} color="#10b981" />
                </div>
                <div className="device-meta">
                  <div className="meta-title-row">
                    <h3>{agent.model || 'Mobile Phone'}</h3>
                    <span className="type-badge agent">Mobile Agent</span>
                  </div>
                  <span className="device-sub">ID: {agent.device_id}</span>
                </div>
              </div>

              <div className="card-stats">
                <div className="stat-item">
                  <Battery size={16} color={agent.battery > 50 ? '#10b981' : '#f59e0b'} />
                  <span>Battery: <strong>{agent.battery ? `${agent.battery}%` : 'N/A'}</strong></span>
                </div>
                <div className="stat-item">
                  <Radio size={16} color="#10b981" />
                  <span>Heartbeat: <strong>{agent.last_seen}s ago</strong></span>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className={`switch-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectDevice(agent.device_id)}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={15} style={{ marginRight: 6 }} /> Active Target
                    </>
                  ) : (
                    'Switch to this Phone'
                  )}
                </button>

                <div className="quick-test-row">
                  <button className="test-btn" onClick={() => handleQuickCommand(agent.device_id, 'RING_PHONE')} title="Ring Alarm">
                    <BellRing size={14} color="#ef4444" /> Ring
                  </button>
                  <button className="test-btn" onClick={() => handleQuickCommand(agent.device_id, 'OPEN_APP', 'youtube')} title="Open YouTube">
                    <Tv size={14} color="#ff0000" /> YouTube
                  </button>
                  <button className="test-btn" onClick={() => handleQuickCommand(agent.device_id, 'SET_VOLUME', 'max')} title="Max Volume">
                    <Volume2 size={14} color="#38bdf8" /> Max Vol
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State when no devices */}
        {!devicesStatus?.connected && activeAgents.length === 0 && !loading && (
          <div className="no-devices-box glass">
            <Smartphone size={36} color="#9ca3af" />
            <h3>No Active Phones Connected</h3>
            <p>Open <code>{agentUrl}</code> on your mobile phone browser to connect it instantly!</p>
          </div>
        )}
      </div>
    </div>
  );
}
