'use client';

import { useState } from 'react';
import { Project, ProjectMode } from '@/lib/types';

interface SbBtnProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  iconBg?: string;
  iconColor?: string;
  teal?: boolean;
}

function SbBtn({ icon, label, active = false, onClick, iconBg, iconColor, teal = false }: SbBtnProps) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active
          ? (teal ? 'var(--tl)' : 'var(--or-d)')
          : hov ? 'var(--text2)' : 'var(--muted)',
        background: active
          ? (teal ? 'var(--tl-lt)' : 'var(--or-lt)')
          : hov ? 'var(--bg3)' : 'transparent',
        border: active
          ? `1px solid ${teal ? 'var(--tl-bdr)' : 'var(--or-bdr)'}`
          : '1px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all .11s',
      }}
    >
      <span style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        flexShrink: 0,
        background: active
          ? (teal ? '#ccfbf1' : 'var(--or-bg)')
          : (iconBg || 'var(--bg3)'),
        color: active
          ? (teal ? 'var(--tl)' : 'var(--or-d)')
          : (iconColor || 'var(--muted)'),
      }}>
        {icon}
      </span>
      {label}
      {!active && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted2)' }}>›</span>
      )}
    </button>
  );
}

interface SidebarProps {
  projects: Project[];
  activeId: string | null;
  screen: 'home' | 'project';
  onHome: () => void;
  onProject: (id: string) => void;
  onOpenModal: (mode: ProjectMode) => void;
}

export function Sidebar({ projects, activeId, screen, onHome, onProject, onOpenModal }: SidebarProps) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '.09em',
    textTransform: 'uppercase',
    color: 'var(--muted2)',
    padding: '8px 8px 4px',
  };

  return (
    <aside style={{
      background: '#fff',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{
        padding: '15px 18px 13px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--or)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800,
          color: '#fff',
          boxShadow: '0 2px 6px rgba(249,115,22,.35)',
          flexShrink: 0,
        }}>
          D
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)' }}>
          DayShip
        </div>
        <div style={{
          marginLeft: 'auto',
          fontSize: 10,
          color: 'var(--muted2)',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          padding: '1px 7px',
          borderRadius: 20,
        }}>
          v0.1
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <div style={sectionLabel}>Home</div>
        <SbBtn
          icon="🏠"
          label="Home"
          active={screen === 'home' && !activeId}
          onClick={onHome}
        />

        <div style={sectionLabel}>Convert</div>
        <SbBtn
          icon="⬡"
          label="Figma → WordPress"
          iconBg="var(--or-lt)"
          iconColor="var(--or)"
          onClick={() => onOpenModal('figma')}
        />
        <SbBtn
          icon="◎"
          label="URL → HTML/CSS"
          iconBg="var(--tl-lt)"
          iconColor="var(--tl)"
          teal
          onClick={() => onOpenModal('url')}
        />
      </nav>

      {/* Project list */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 10px',
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
      }}>
        <div style={sectionLabel}>Projects</div>
        {projects.length === 0 && (
          <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--muted2)' }}>No projects yet</div>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onProject(p.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: activeId === p.id ? 'var(--or-d)' : 'var(--muted)',
              background: activeId === p.id ? 'var(--or-lt)' : 'transparent',
              transition: 'all .11s',
            }}
          >
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: p.mode === 'figma' ? 'var(--or)' : 'var(--tl)',
              flexShrink: 0,
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <span style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 20,
              fontWeight: 600,
              flexShrink: 0,
              background: p.mode === 'figma' ? 'var(--or-lt)' : 'var(--tl-lt)',
              color: p.mode === 'figma' ? 'var(--or-d)' : 'var(--tl)',
              border: `1px solid ${p.mode === 'figma' ? 'var(--or-bdr)' : 'var(--tl-bdr)'}`,
            }}>
              {p.mode === 'figma' ? 'WP' : 'HTML'}
            </span>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--or), #f43f5e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}>
          E
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Ethan Hughes</div>
          <div style={{ fontSize: 11, color: 'var(--muted2)' }}>ethan@dayship.io</div>
        </div>
      </div>
    </aside>
  );
}
