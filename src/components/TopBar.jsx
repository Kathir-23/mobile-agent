import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Search, User, X, CheckCircle2, AlertTriangle, Info, Smartphone
} from 'lucide-react';
import DeviceSelector from './DeviceSelector';
import { useApp } from '../context';
import './TopBar.css';

const NOTIF_ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
};

const pageLabels = {
  buddy: 'Buddy Assistant',
  devices: 'Connected Devices',
  device: 'Device Control',
  logs: 'Command Logs',
  settings: 'Settings',
};

export default function TopBar({ activePage, onNavigate }) {
  const {
    toasts, removeToast,
    notifications,
    markAllRead, markRead, deleteNotification,
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef();

  // Unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global search by keyword
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (q.includes('buddy') || q.includes('voice') || q.includes('assistant')) onNavigate('buddy');
      else if (q.includes('device') || q.includes('phone') || q.includes('control')) onNavigate('device');
      else if (q.includes('log') || q.includes('history')) onNavigate('logs');
      else if (q.includes('setting')) onNavigate('settings');
      setSearchQuery('');
    }
  };

  const handleOpenNotifs = () => {
    setShowNotifs(p => !p);
  };

  return (
    <>
      <header className="topbar glass-strong">
        {/* Page Title */}
        <div className="topbar-title">
          <motion.h1 key={activePage}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="page-title">
            {pageLabels[activePage] || 'Buddy Assistant'}
          </motion.h1>
        </div>

        {/* Search */}
        <div className="topbar-search">
          <Search size={14} className="search-icon" />
          <input type="search" placeholder="Search pages… (press Enter)" className="input-glass search-input"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
        </div>

        {/* Actions */}
        <div className="topbar-actions">
          {/* Wi-Fi Style Available Devices Selector */}
          <DeviceSelector />
          {/* Notifications */}
          <div className="notif-btn" ref={notifRef}>
            <button id="notif-btn" className="btn btn-glass btn-icon" onClick={handleOpenNotifs} title="Notifications">
              <Bell size={18} />
            </button>
            {unreadCount > 0 && (
              <motion.span className="notif-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}

            {/* Notification Panel */}
            <AnimatePresence>
              {showNotifs && (
                <motion.div className="notif-panel glass-strong"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}>
                  <div className="notif-panel-header">
                    <span className="font-semibold text-sm">Notifications</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {unreadCount > 0 && (
                        <button className="btn-link text-xs" onClick={markAllRead}>Mark all read</button>
                      )}
                    </div>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={28} className="text-muted" />
                        <span className="text-xs text-muted">No notifications yet</span>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(n => {
                        const Icon = NOTIF_ICONS[n.type] || Info;
                        const iconColor = n.type === 'success' ? 'var(--success)' : n.type === 'warning' ? 'var(--warning)' : n.type === 'danger' ? 'var(--danger)' : 'var(--text-muted)';
                        return (
                          <motion.div key={n.id}
                            className={`notif-item ${n.read ? 'notif-read' : 'notif-unread'}`}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            onClick={() => markRead(n.id)}>
                            <div className="notif-icon" style={{ background: `${iconColor}22`, color: iconColor }}>
                              <Icon size={14} />
                            </div>
                            <div className="notif-text">
                              <span className="notif-title">{n.title}</span>
                              {n.message && <span className="notif-msg text-muted">{n.message}</span>}
                              <span className="notif-time text-muted">{new Date(n.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <button className="notif-delete" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}>
                              <X size={12} />
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id} className={`toast toast-${toast.type}`}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className={`toast-dot toast-dot-${toast.type}`} />
              <span className="toast-msg">{toast.message}</span>
              <button className="toast-close" onClick={() => removeToast(toast.id)}><X size={14} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
