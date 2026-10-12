import React from 'react';
import './BuddyOrb.css';

const BuddyOrb = ({ state = 'idle', isListening = false }) => {
  // state: 'idle' | 'listening' | 'processing' | 'success' | 'error'
  
  return (
    <div className="buddy-orb-container">
      <div className={`buddy-orb ${state} ${isListening ? 'active-pulse' : ''}`}>
        <div className="orb-inner-core"></div>
        <div className="orb-ring ring-1"></div>
        <div className="orb-ring ring-2"></div>
        <div className="orb-ring ring-3"></div>
      </div>
      <div className="orb-status-badge">
        <span className={`status-dot ${state}`}></span>
        <span className="status-label">
          {state === 'listening' && 'Listening to your voice...'}
          {state === 'processing' && 'NLP Processing & Executing...'}
          {state === 'success' && 'Command Executed!'}
          {state === 'error' && 'Action Failed / Offline'}
          {state === 'idle' && 'Buddy AI Ready'}
        </span>
      </div>
    </div>
  );
};

export default BuddyOrb;
