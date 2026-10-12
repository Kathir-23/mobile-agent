import React, { useState, useEffect } from 'react';
import './CommandLog.css';

const CommandLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/buddy/history');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopyCommand = (cmdText, id) => {
    if (!cmdText) return;
    navigator.clipboard.writeText(cmdText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="command-log-page">
      <div className="log-header">
        <div>
          <h1 className="log-title">📜 Database Command Logs & ADB History</h1>
          <p className="log-subtitle">Stored Permanently in Database (buddy.db) with Low-Level ADB Commands</p>
        </div>
        <button className="btn-refresh" onClick={fetchLogs}>
          🔄 Refresh Logs
        </button>
      </div>

      {loading ? (
        <div className="log-loading">Loading log history...</div>
      ) : logs.length === 0 ? (
        <div className="log-empty">No commands logged yet. Speak to Buddy on the Assistant page!</div>
      ) : (
        <div className="table-wrapper">
          <table className="log-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Spoken Command</th>
                <th>Intent</th>
                <th>Entity</th>
                <th>Conf</th>
                <th>Status</th>
                <th>Backend ADB Command (PowerShell)</th>
                <th>Execution Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td className="time-col">{log.timestamp}</td>
                  <td className="cmd-col">"{log.command}"</td>
                  <td>
                    <span className="badge intent">{log.intent}</span>
                  </td>
                  <td>{log.entity ? <span className="badge entity">{log.entity}</span> : '-'}</td>
                  <td>
                    <span className="conf-bar">
                      {(log.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge status ${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="adb-cmd-col">
                    {log.adb_command ? (
                      <div className="adb-code-badge" onClick={() => handleCopyCommand(log.adb_command, log.id)} title="Click to copy ADB command">
                        <code>{log.adb_command}</code>
                        <span className="copy-icon">{copiedId === log.id ? '✓ Copied' : '📋'}</span>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="msg-col">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CommandLog;
