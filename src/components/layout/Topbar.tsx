'use client';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 12,
      height: 54,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
        {title}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '7px 12px',
        flex: 1,
        maxWidth: 280,
        margin: '0 auto',
      }}>
        <span style={{ color: 'var(--muted2)', fontSize: 13 }}>🔍</span>
        <input
          placeholder="Search projects…"
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--text2)',
            flex: 1,
            minWidth: 0,
          }}
        />
        <span style={{
          fontSize: 10,
          color: 'var(--muted2)',
          background: '#fff',
          border: '1px solid var(--border2)',
          borderRadius: 4,
          padding: '1px 6px',
          fontFamily: "'DM Mono', monospace",
        }}>
          ⌘K
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--or)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '7px 14px',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          📅 Today ▾
        </button>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          cursor: 'pointer',
          color: 'var(--muted)',
        }}>
          🔔
        </div>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          cursor: 'pointer',
          color: 'var(--muted)',
        }}>
          💬
        </div>
      </div>
    </div>
  );
}
