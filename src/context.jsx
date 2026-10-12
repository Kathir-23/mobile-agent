/**
 * context.jsx — Thin bridge between Zustand store and the React tree.
 * All pages import useApp() which reads from the centralized Zustand store.
 * This preserves backward-compatibility while the store is the real data source.
 */
import { createContext, useContext, useEffect } from 'react';
import { useStore } from './store';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const store = useStore();

  // Apply theme to DOM whenever settings change
  useEffect(() => {
    const { darkMode, accentColor } = store.settings;
    const root = document.documentElement;

    if (darkMode) {
      root.classList.remove('light-mode');
      root.style.setProperty('--bg-primary', '#0F172A');
      root.style.setProperty('--bg-secondary', '#1E293B');
      root.style.setProperty('--text-primary', '#F1F5F9');
      root.style.setProperty('--text-secondary', '#94A3B8');
      root.style.setProperty('--text-muted', '#64748B');
      root.style.setProperty('--border', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--border-hover', 'rgba(255, 255, 255, 0.15)');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.06)');
      root.style.setProperty('--bg-card-hover', 'rgba(255, 255, 255, 0.10)');
    } else {
      root.classList.add('light-mode');
      root.style.setProperty('--bg-primary', '#F0F4FF');
      root.style.setProperty('--bg-secondary', '#E8EEFF');
      root.style.setProperty('--text-primary', '#0F172A');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748B');
      root.style.setProperty('--border', 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--border-hover', 'rgba(0, 0, 0, 0.18)');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--bg-card-hover', 'rgba(255, 255, 255, 0.9)');
    }

    root.style.setProperty('--primary', accentColor);
    // Simple lighter shade for primary-light
    root.style.setProperty('--primary-light', accentColor);
  }, [store.settings.darkMode, store.settings.accentColor]);

  return (
    <AppContext.Provider value={store}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
