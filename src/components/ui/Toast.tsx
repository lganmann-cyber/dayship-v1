'use client';

import { useEffect } from 'react';
import { ToastItem } from '@/hooks/useToast';

interface ToastProps extends ToastItem {
  onDone: () => void;
}

export function Toast({ message, ok, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      background: '#fff',
      border: `1px solid var(--border2)`,
      borderLeft: ok ? '3px solid var(--gr)' : undefined,
      borderRadius: 8,
      padding: '10px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,.09)',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--text2)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 220,
      animation: 'slideUp .16s ease',
    }}>
      {ok && <span style={{ color: 'var(--gr)', fontWeight: 700 }}>✓</span>}
      {message}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {toasts.map(t => (
        <Toast key={t.id} {...t} onDone={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
