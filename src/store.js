/**
 * store.js — Buddy AI Assistant Zustand Store
 *
 * Handles only:
 *   - UI preferences (theme, accent color, notifications)
 *   - Ephemeral toasts
 *   - Notification inbox (front-end only)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString();

// ── Default UI settings ──────────────────────────────────────────────────────
const DEFAULT_UI_SETTINGS = {
  darkMode:    true,
  accentColor: '#38bdf8',
};

// ── Store ────────────────────────────────────────────────────────────────────
export const useStore = create(
  persist(
    (set, get) => ({
      // ── UI Settings ────────────────────────────────────────────────────────
      settings: DEFAULT_UI_SETTINGS,

      updateSettings: (patch) => {
        set(s => ({ settings: { ...s.settings, ...patch } }));
      },

      // ── Notifications (front-end inbox only) ──────────────────────────────
      notifications: [],

      addNotification: ({ title, message = '', type = 'info', icon = 'Bell' }) => {
        const n = { id: uid(), title, message, type, icon, timestamp: todayISO(), read: false };
        set(s => ({ notifications: [n, ...s.notifications].slice(0, 100) }));
      },

      markAllRead:        () => set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
      markRead:           (id) => set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
      deleteNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
      clearNotifications: () => set({ notifications: [] }),

      // ── Toasts (ephemeral, never persisted) ──────────────────────────────
      toasts: [],

      addToast: (message, type = 'info', duration = 4500) => {
        const id = uid();
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
      },

      removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    }),
    {
      name:    'buddy-ai-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        settings:      s.settings,
        notifications: s.notifications,
      }),
    }
  )
);
