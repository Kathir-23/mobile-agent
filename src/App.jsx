import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import BuddyAssistant from './pages/BuddyAssistant';
import ConnectedDevices from './pages/ConnectedDevices';
import DeviceControl from './pages/DeviceControl';
import CommandLog from './pages/CommandLog';
import Settings from './pages/Settings';
import './App.css';

const pages = {
  buddy: BuddyAssistant,
  devices: ConnectedDevices,
  device: DeviceControl,
  logs: CommandLog,
  settings: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState('buddy');
  const PageComponent = pages[activePage] || BuddyAssistant;

  return (
    <div className="app-layout">
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main-wrapper">
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              className="page-container"
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <PageComponent onNavigate={setActivePage} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
