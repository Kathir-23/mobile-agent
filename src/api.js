/**
 * api.js — Buddy AI Assistant API layer
 *
 * Connects to the Flask backend for Buddy NLP phone control.
 * Failures are surfaced as rejected promises so the UI can display
 * meaningful error messages.
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Axios instance ──────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

// Global error normalizer
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ── Health ──────────────────────────────────────────────────────────────────
export const healthApi = {
  get: async () => (await http.get('/health')).data,
};

// ── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: async () => (await http.get('/settings')).data,
  update: async (updates) => (await http.put('/settings', updates)).data,
};

// ── System Diagnostics ─────────────────────────────────────────────────────
export const systemApi = {
  getStats: async () => (await http.get('/system/stats')).data,
  clearLogs: async () => (await http.post('/logs/clear')).data,
};

// ── Buddy AI ────────────────────────────────────────────────────────────────
export const buddyApi = {
  /** Get current phone ADB connection status */
  getStatus: async () => (await http.get('/buddy/status')).data,

  /** Reconnect ADB to phone */
  connect: async () => (await http.post('/buddy/connect')).data,

  /** Send a voice/text command through NLP pipeline */
  sendCommand: async (command) =>
    (await http.post('/buddy/command', { command })).data,

  /** Trigger a direct quick-action button */
  quickAction: async (intent, entity = null) =>
    (await http.post('/buddy/quick-action', { intent, entity })).data,

  /** Get command execution history */
  getHistory: async () => (await http.get('/buddy/history')).data,
};

export default buddyApi;
