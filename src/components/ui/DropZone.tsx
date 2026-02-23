'use client';

import { useState, ReactNode } from 'react';

interface DropZoneProps {
  label: string;
  hint: ReactNode;
  teal?: boolean;
  onUpload?: () => void;
}

export function DropZone({ label, hint, teal = false, onUpload }: DropZoneProps) {
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleClick = () => {
    setDone(true);
    onUpload?.();
  };

  const getBorderColor = () => {
    if (done) return 'var(--gr)';
    if (drag) return teal ? 'var(--tl)' : 'var(--or)';
    return 'var(--border2)';
  };

  const getBg = () => {
    if (done) return 'var(--gr-lt)';
    if (drag) return teal ? 'var(--tl-lt)' : 'var(--or-lt)';
    return 'var(--bg3)';
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); setDone(true); onUpload?.(); }}
      style={{
        border: `1.5px dashed ${getBorderColor()}`,
        borderRadius: 12,
        padding: 22,
        textAlign: 'center',
        cursor: 'pointer',
        background: getBg(),
        transition: 'all .18s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6, opacity: done ? 1 : 0.4 }}>
        {done ? '✅' : teal ? '📸' : '📄'}
      </div>
      <div style={{
        fontSize: 12,
        color: done ? 'var(--gr)' : 'var(--muted)',
        fontWeight: done ? 600 : 400,
      }}>
        {done ? `${label} ready` : hint}
      </div>
    </div>
  );
}
