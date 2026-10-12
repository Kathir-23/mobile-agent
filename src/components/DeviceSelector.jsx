import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Wifi, Smartphone, Battery, RefreshCw, ChevronDown, CheckCircle2, 
  Radio, Copy, Check, QrCode, AlertCircle, Signal, HelpCircle, Zap, Plus, Eye
} from 'lucide-react';
import './DeviceSelector.css';

export default function DeviceSelector({ onSelectDevice }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState({ connected: false, model: 'Checking...', battery: null });
  const [activeAgents, setActiveAgents] = useState([]);
  const [selectedId, setSelectedId] = useState('adb');
  const [copied, setCopied] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [netInfo, setNetInfo] = useState({ ips: [], tailscale_ip: null });
  const [adbIpInput, setAdbIpInput] = useState('100.99.222.50');
  const [connectingAdb, setConnectingAdb] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const dropdownRef = useRef(null);

  // Fetch current tunnel URL & network IPs
  useEffect(() => {
    fetch('http://localhost:5000/api/buddy/tunnel-url')
      .then(r => r.json())
      .then(d => { if (d.url) setTunnelUrl(d.url); })
      .catch(() => {});

    fetch('http://localhost:5000/api/buddy/network-info')
      .then(r => r.json())
      .then(d => { if (d.success) setNetInfo(d); })
      .catch(() => {});
  }, []);

  const [networkMode, setNetworkMode] = useState('wifi'); // 'wifi' | 'tailscale'

  // Determine best web link for phone (default to Local Wi-Fi IP for 100% compatibility)
  const wifiIp = netInfo.local_ip || (netInfo.ips && netInfo.ips.find(i => !i.startsWith('100.'))) || window.location.hostname || '127.0.0.1';
  const tailscaleIp = netInfo.tailscale_ip;
  const selectedIp = networkMode === 'tailscale' && tailscaleIp ? tailscaleIp : wifiIp;
  const agentUrl = tunnelUrl ? `${tunnelUrl}/agent` : `http://${selectedIp}:5000/agent`;

  const prevConnectedRef = useRef(null);

  // Fetch status and active devices
  const fetchDevices = async (manualScan = false) => {
    if (manualScan) setScanning(true);
    try {
      // Trigger ADB reconnect scan if manual scan requested
      if (manualScan) {
        await fetch('http://localhost:5000/api/buddy/connect', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: adbIpInput })
        }).catch(() => {});
      }
      
      const res = await fetch('http://localhost:5000/api/buddy/status');
      const data = await res.json();
      if (data.success) {
        const isNowConnected = data.data?.connected;

        // Detect connection state transitions
        if (prevConnectedRef.current !== null) {
          if (prevConnectedRef.current === true && !isNowConnected) {
            setFeedbackMsg('⚠️ Wi-Fi Disconnected — Phone went offline');
            setTimeout(() => setFeedbackMsg(''), 5000);
          } else if (prevConnectedRef.current === false && isNowConnected) {
            setFeedbackMsg('✅ Wi-Fi Reconnected — Phone online!');
            setTimeout(() => setFeedbackMsg(''), 5000);
          }
        }
        prevConnectedRef.current = isNowConnected;

        setPhoneStatus(data.data);
        
        // Filter mobile agents
        const mobileOnly = (data.active_agents || []).filter(agent => {
          const model = (agent.model || '').toLowerCase();
          const id = (agent.device_id || '').toLowerCase();
          return !model.includes('laptop') && 
                 !model.includes('macintel') && 
                 !model.includes('win32') ||
                 id.startsWith('android_') ||
                 id.startsWith('phone_');
        });
        setActiveAgents(mobileOnly);

        // Update selected device ID
        const activeSelected = mobileOnly.find(a => a.is_selected);
        if (activeSelected) {
          setSelectedId(activeSelected.device_id);
        } else if (data.data?.connected) {
          setSelectedId('adb');
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      if (manualScan) {
        setTimeout(() => setScanning(false), 800);
      }
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => fetchDevices(false), 4000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnectAdbIp = async (e) => {
    if (e) e.preventDefault();
    if (!adbIpInput.trim()) return;
    setConnectingAdb(true);
    setFeedbackMsg(`Connecting to ${adbIpInput}…`);
    try {
      const res = await fetch('http://localhost:5000/api/buddy/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: adbIpInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Connected to ${adbIpInput}!`);
        setSelectedId('adb');
        fetchDevices();
      } else {
        setFeedbackMsg(data.message || 'Connection failed');
      }
    } catch (err) {
      setFeedbackMsg('Failed to connect to IP');
    } finally {
      setConnectingAdb(false);
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  const handleSwitchDevice = async (deviceId, modelName) => {
    try {
      const res = await fetch('http://localhost:5000/api/buddy/agent/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedId(deviceId);
        setFeedbackMsg(`Connected to ${modelName || deviceId}`);
        setTimeout(() => setFeedbackMsg(''), 3000);
        if (onSelectDevice) onSelectDevice(deviceId);
        fetchDevices();
      }
    } catch (err) {
      setFeedbackMsg('Failed to switch device');
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(agentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine overall status
  const totalConnected = (phoneStatus.connected ? 1 : 0) + activeAgents.length;
  const isOnline = totalConnected > 0;
  
  let activeDeviceName = 'No Phone Connected';
  if (selectedId === 'adb' && phoneStatus.connected) {
    activeDeviceName = phoneStatus.model || 'ADB Phone';
  } else {
    const selectedAgent = activeAgents.find(a => a.device_id === selectedId);
    if (selectedAgent) {
      activeDeviceName = selectedAgent.model || 'Mobile Phone';
    } else if (phoneStatus.connected) {
      activeDeviceName = phoneStatus.model || 'ADB Phone';
    } else if (activeAgents.length > 0) {
      activeDeviceName = activeAgents[0].model || 'Mobile Phone';
    }
  }

  return (
    <div className="wifi-device-selector" ref={dropdownRef}>
      {/* Trigger Button (Wi-Fi Pill Style) */}
      <button 
        className={`device-pill-btn ${isOnline ? 'online' : 'offline'} ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Available Devices Network"
      >
        <div className="status-icon-wrapper">
          <Wifi size={16} className={`wifi-icon ${isOnline ? 'active-pulse' : ''}`} />
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        </div>

        <div className="pill-text-content">
          <div className="pill-title">
            <span>{isOnline ? activeDeviceName : 'Available Devices'}</span>
            <ChevronDown size={14} className={`arrow-icon ${isOpen ? 'rotated' : ''}`} />
          </div>
          <div className="pill-sub font-mono">
            {scanning ? (
              <span className="text-scanning">Scanning networks…</span>
            ) : isOnline ? (
              <span>{totalConnected} Phone{totalConnected > 1 ? 's' : ''} Ready • Click to change</span>
            ) : (
              <span className="text-offline">No Phone Connected • Click to connect</span>
            )}
          </div>
        </div>

        {phoneStatus.battery !== null && phoneStatus.connected && (
          <div className="pill-battery">
            <Battery size={13} color={phoneStatus.battery > 30 ? '#10b981' : '#f59e0b'} />
            <span>{phoneStatus.battery}%</span>
          </div>
        )}
      </button>

      {/* Flyout Wi-Fi Style Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="device-dropdown-panel glass-strong"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="panel-header">
              <div className="header-title">
                <Radio size={16} className="title-icon" />
                <span>Available Devices</span>
                {totalConnected > 0 && <span className="count-badge">{totalConnected}</span>}
              </div>

              <button 
                className={`scan-btn ${scanning ? 'scanning' : ''}`}
                onClick={() => fetchDevices(true)}
                disabled={scanning}
                title="Scan for nearby devices"
              >
                <RefreshCw size={13} className={scanning ? 'spin' : ''} />
                <span>{scanning ? 'Scanning...' : 'Scan'}</span>
              </button>
            </div>

            {/* Quick Feedback Toast */}
            {feedbackMsg && (
              <div className="panel-feedback">
                <Zap size={12} />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Devices List */}
            <div className="device-list-container">
              <div className="list-section-title">DETECTED PHONES</div>

              {/* 1. ADB Wireless Device */}
              {phoneStatus.connected ? (
                <div 
                  className={`device-list-item ${selectedId === 'adb' ? 'selected' : ''}`}
                  onClick={() => handleSwitchDevice('adb', phoneStatus.model)}
                >
                  <div className="device-item-left">
                    <div className="device-type-icon adb">
                      <Smartphone size={18} />
                    </div>
                    <div className="device-info">
                      <div className="device-name-row">
                        <span className="device-name">{phoneStatus.model || 'Wireless ADB Phone'}</span>
                        <span className="badge-tag adb">Wireless ADB</span>
                      </div>
                      <span className="device-subtext">{phoneStatus.ip || 'Local ADB'} • Battery {phoneStatus.battery ?? '--'}%</span>
                    </div>
                  </div>

                  <div className="device-item-right">
                    <Signal size={14} className="signal-icon full" />
                    {selectedId === 'adb' ? (
                      <span className="active-check"><CheckCircle2 size={16} /> Active</span>
                    ) : (
                      <button className="select-btn">Connect</button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 2. Buddy Mobile Web Agents */}
              {activeAgents.map((agent) => {
                const isSelected = selectedId === agent.device_id;
                return (
                  <div 
                    key={agent.device_id}
                    className={`device-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSwitchDevice(agent.device_id, agent.model)}
                  >
                    <div className="device-item-left">
                      <div className="device-type-icon agent">
                        <Radio size={18} />
                      </div>
                      <div className="device-info">
                        <div className="device-name-row">
                          <span className="device-name">{agent.model || 'Mobile Phone'}</span>
                          <span className="badge-tag agent">Web Agent</span>
                        </div>
                        <span className="device-subtext">ID: {agent.device_id.slice(0, 14)} • Online</span>
                      </div>
                    </div>

                    <div className="device-item-right">
                      <Signal size={14} className="signal-icon full" />
                      {isSelected ? (
                        <span className="active-check"><CheckCircle2 size={16} /> Active</span>
                      ) : (
                        <button className="select-btn">Connect</button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 3. Empty State if no device connected */}
              {!phoneStatus.connected && activeAgents.length === 0 && (
                <div className="empty-devices-notice">
                  <AlertCircle size={24} className="empty-icon" />
                  <div className="empty-title">No Devices Detected</div>
                  <p className="empty-desc">Connect any smartphone via web browser link or Tailscale ADB IP below.</p>
                </div>
              )}
            </div>

            {/* Quick ADB IP Direct Connect Box */}
            <form onSubmit={handleConnectAdbIp} className="adb-ip-connect-form">
              <div className="adb-form-title">⚡ Connect via Tailscale / Wireless ADB IP:</div>
              <div className="adb-ip-input-row">
                <input 
                  type="text" 
                  className="adb-ip-input font-mono" 
                  placeholder="e.g. 100.99.222.50" 
                  value={adbIpInput}
                  onChange={(e) => setAdbIpInput(e.target.value)}
                />
                <button type="submit" className="adb-connect-btn" disabled={connectingAdb}>
                  {connectingAdb ? <RefreshCw size={12} className="spin" /> : <Plus size={12} />}
                  <span>{connectingAdb ? 'Connecting…' : 'Connect IP'}</span>
                </button>
              </div>
            </form>

            {/* Zero-Setup Connect Hotspot Box with Scannable QR Code */}
            <div className="connect-guide-box">
              <div className="guide-header" onClick={() => setShowQr(!showQr)}>
                <div className="guide-title">
                  <QrCode size={15} color="#38bdf8" />
                  <span>Scan QR Code or Open Link</span>
                </div>
                <button className="qr-toggle-btn" title="Toggle QR Code">
                  {showQr ? 'Hide QR' : 'Show QR'}
                </button>
              </div>

              {/* Network Mode Switcher (Wi-Fi vs Tailscale) */}
              <div className="network-mode-tabs">
                <button 
                  className={`net-tab ${networkMode === 'wifi' ? 'active' : ''}`}
                  onClick={() => setNetworkMode('wifi')}
                  title="For phones on same Wi-Fi router (No Tailscale app required)"
                >
                  📶 Local Wi-Fi ({wifiIp})
                </button>
                {tailscaleIp && (
                  <button 
                    className={`net-tab ${networkMode === 'tailscale' ? 'active' : ''}`}
                    onClick={() => setNetworkMode('tailscale')}
                    title="For devices connected via Tailscale VPN"
                  >
                    🔒 Tailscale ({tailscaleIp})
                  </button>
                )}
              </div>

              {/* Scannable QR Code Card */}
              {showQr && (
                <div className="qr-code-card">
                  <div className="qr-svg-wrapper">
                    <QRCodeSVG 
                      key={agentUrl}
                      value={agentUrl} 
                      size={135}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="qr-hint font-mono">
                    📷 Point camera to scan & open link
                  </div>
                </div>
              )}

              <div className="link-share-bar">
                <input type="text" readOnly value={agentUrl} className="share-input font-mono" />
                <button className="copy-share-btn" onClick={handleCopyLink}>
                  {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="guide-steps">
                <div className="step-item">
                  <span className="step-num">1</span>
                  <span>Scan QR with camera or open link on phone</span>
                </div>
                <div className="step-item">
                  <span className="step-num">2</span>
                  <span>Your phone joins this device list instantly!</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
