import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <AnimatePresence>
      <motion.div
        className="confirm-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="confirm-dialog glass-strong"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="confirm-icon"
            style={{
              background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              color: danger ? 'var(--danger)' : 'var(--warning)',
            }}
          >
            {danger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button className="btn btn-glass" onClick={onCancel}>Cancel</button>
            <button
              className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
