import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Smartphone, ScrollText, Settings, Shield, ChevronLeft, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { id: 'buddy',    label: 'Buddy AI Assistant', icon: Bot },
  { id: 'devices',  label: 'Connected Devices',  icon: Smartphone },
  { id: 'device',   label: 'Command Matrix',     icon: Shield },
  { id: 'logs',     label: 'Command Logs',       icon: ScrollText },
  { id: 'settings', label: 'Settings',           icon: Settings },
];

export default function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = (id, e) => {
    onNavigate(id);
  };

  return (
    <motion.aside
      className={`sidebar glass-strong ${collapsed ? 'collapsed' : ''}`}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Bot size={22} color="#38bdf8" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="logo-text"
            >
              <span className="aurora-text font-bold">Buddy</span>
              <span className="logo-sub">NLP</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <motion.button
              key={item.id}
              className={`nav-item ripple-container ${isActive ? 'active' : ''}`}
              onClick={(e) => handleClick(item.id, e)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              title={collapsed ? item.label : ''}
            >
              <div className={`nav-icon ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="nav-label"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  className="active-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        className="collapse-btn btn-glass btn-icon"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  );
}
