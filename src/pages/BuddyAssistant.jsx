import React, { useState, useEffect, useRef } from 'react';
import BuddyOrb from '../components/BuddyOrb';
import DeviceSelector from '../components/DeviceSelector';
import './BuddyAssistant.css';

const BuddyAssistant = () => {
  const [orbState, setOrbState] = useState('idle'); // idle | listening | processing | success | error
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [nlpResult, setNlpResult] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [phoneStatus, setPhoneStatus] = useState({ connected: false, model: 'Checking...', battery: null });
  const [statusLoading, setStatusLoading] = useState(true);

  const recognitionRef = useRef(null);

  // Fetch Phone Connection Status
  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/buddy/status');
      const data = await res.json();
      if (data.success) {
        setPhoneStatus(data.data);
      }
    } catch (err) {
      console.error('Error fetching phone status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const latestTranscriptRef = useRef('');

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setOrbState('listening');
        setTranscript('Listening...');
        latestTranscriptRef.current = '';
      };

      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
        latestTranscriptRef.current = text;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setOrbState('error');
        if (event.error !== 'no-speech') {
          setTranscript(`Speech error: ${event.error}`);
        } else {
          setTranscript('No speech detected. Try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalPhrase = latestTranscriptRef.current.trim();
        if (finalPhrase && finalPhrase !== 'Listening...') {
          sendCommandToBackend(finalPhrase);
        } else {
          setOrbState('idle');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Start Mic Recording
  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setNlpResult(null);
        setExecutionResult(null);
        recognitionRef.current.start();
      } catch (err) {
        console.error('Recognition already started:', err);
      }
    } else {
      alert('Web Speech API is not supported in this browser. Please use Google Chrome or type your command below.');
    }
  };

  // Stop Mic Recording & Send to NLP Server
  const stopListeningAndProcess = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    const textToSend = latestTranscriptRef.current.trim();
    if (textToSend && textToSend !== 'Listening...') {
      await sendCommandToBackend(textToSend);
    }
  };

  // Send Command to Backend API
  const sendCommandToBackend = async (commandText) => {
    if (!commandText.trim()) return;

    setOrbState('processing');
    try {
      const res = await fetch('http://localhost:5000/api/buddy/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText })
      });
      const data = await res.json();
      
      setNlpResult(data.nlp);
      setExecutionResult(data);

      if (data.success) {
        setOrbState('success');
        // Speak back response using browser Speech Synthesis
        speakResponse(data.message);
      } else {
        setOrbState('error');
      }
    } catch (err) {
      console.error('Error executing command:', err);
      setOrbState('error');
      setExecutionResult({ success: false, message: 'Failed to connect to backend server' });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualText.trim()) {
      setTranscript(manualText);
      sendCommandToBackend(manualText);
      setManualText('');
    }
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const sampleCommands = [
    'Buddy, open YouTube',
    'Buddy, ring my phone',
    'Buddy, lock the screen',
    'Buddy, open WhatsApp',
    'Buddy, open Chrome',
    'Buddy, check device status'
  ];

  return (
    <div className="buddy-page">
      {/* Header Bar */}
      <div className="buddy-header">
        <div>
          <h1 className="buddy-title">🤖 Buddy AI Assistant</h1>
          <p className="buddy-subtitle">NLP-Powered Remote Phone Controller (ADB over Tailscale)</p>
        </div>
        
        {/* Interactive Wi-Fi Style Available Devices Selector */}
        <DeviceSelector />
      </div>

      {/* Main Orb Visualizer */}
      <div className="orb-section">
        <BuddyOrb state={orbState} isListening={isListening} />
        
        <div className="transcript-display">
          <p className="transcript-label">Speech Input:</p>
          <p className="transcript-text">
            {transcript || 'Say "Buddy, open YouTube" or click the microphone to speak'}
          </p>
        </div>

        {/* Controls Bar */}
        <div className="controls-bar">
          {!isListening ? (
            <button className="mic-btn record" onClick={startListening}>
              <span className="mic-icon">🎙️</span> Start Speaking
            </button>
          ) : (
            <button className="mic-btn stop" onClick={stopListeningAndProcess}>
              <span className="mic-icon">⏹️</span> Send Command
            </button>
          )}
        </div>

        {/* Fallback Text Input */}
        <form onSubmit={handleManualSubmit} className="manual-input-form">
          <input
            type="text"
            placeholder="Or type a command (e.g. Buddy open YouTube)..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="manual-input"
          />
          <button type="submit" className="btn-send">Execute NLP</button>
        </form>

        {/* Quick Sample Commands */}
        <div className="sample-chips">
          <span className="chip-label">Try Voice Commands:</span>
          {sampleCommands.map((cmd, idx) => (
            <button
              key={idx}
              className="sample-chip"
              onClick={() => {
                setTranscript(cmd);
                sendCommandToBackend(cmd);
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* NLP Stage Pipeline Analysis Breakdown */}
      {nlpResult && (
        <div className="nlp-pipeline-card">
          <h3 className="pipeline-title">🧠 Real-Time NLP Stage Pipeline Analysis</h3>
          <div className="pipeline-grid">
            <div className="stage-item">
              <span className="stage-num">Stage 1</span>
              <span className="stage-name">ASR Speech-to-Text</span>
              <span className="stage-val">"{nlpResult.cleaned_text}"</span>
            </div>

            <div className="stage-item">
              <span className="stage-num">Stage 2</span>
              <span className="stage-name">Wake Word</span>
              <span className={`stage-badge ${nlpResult.has_wake_word ? 'pass' : 'fail'}`}>
                {nlpResult.has_wake_word ? '✅ "Buddy" Detected' : '⚠️ No Wake Word'}
              </span>
            </div>

            <div className="stage-item">
              <span className="stage-num">Stage 3</span>
              <span className="stage-name">Intent Classification</span>
              <span className="stage-val intent">{nlpResult.intent}</span>
            </div>

            <div className="stage-item">
              <span className="stage-num">Stage 4</span>
              <span className="stage-name">NER Entity</span>
              <span className="stage-val entity">{nlpResult.entity || 'None'}</span>
            </div>

            <div className="stage-item">
              <span className="stage-num">Stage 5</span>
              <span className="stage-name">Confidence Score</span>
              <span className="stage-val conf">{(nlpResult.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Execution Result Banner */}
          {executionResult && (
            <div className={`execution-banner ${executionResult.success ? 'success' : 'error'}`}>
              <span className="banner-icon">{executionResult.success ? '✅' : '❌'}</span>
              <span className="banner-msg">{executionResult.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuddyAssistant;
