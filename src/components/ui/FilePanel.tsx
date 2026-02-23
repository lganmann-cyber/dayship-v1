'use client';

import { useState } from 'react';
import { Project, OutputFile } from '@/lib/types';
import { downloadFile, downloadProjectZip } from '@/lib/download';

interface FilePanelProps {
  project: Project;
}

export function FilePanel({ project }: FilePanelProps) {
  const [selIdx, setSelIdx] = useState(0);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const sel: OutputFile | undefined = project.files[selIdx];

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: 'var(--sh)',
      display: 'grid',
      gridTemplateColumns: '210px 1fr',
    }}>
      {/* File list */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>Output Files</span>
          <button
            onClick={() => downloadProjectZip(project)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: '#fff',
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            ↓ All
          </button>
        </div>
        <div>
          {project.files.map((f, i) => (
            <div
              key={f.name}
              onClick={() => setSelIdx(i)}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: selIdx === i ? 'var(--or-lt)' : 'transparent',
                transition: 'background .1s',
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>{f.icon}</span>
              <span style={{
                flex: 1,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11.5,
                color: selIdx === i ? 'var(--or-d)' : 'var(--text2)',
                fontWeight: selIdx === i ? 500 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {f.name}
              </span>
              <span style={{
                fontSize: 10,
                color: 'var(--muted2)',
                fontFamily: "'DM Mono', monospace",
                flexShrink: 0,
              }}>
                {f.size}
              </span>
              <button
                onClick={e => { e.stopPropagation(); downloadFile(f); }}
                style={{
                  opacity: hovIdx === i ? 1 : 0,
                  background: 'none',
                  border: 'none',
                  color: 'var(--or)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 4px',
                  transition: 'opacity .1s',
                  flexShrink: 0,
                }}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Code preview */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            color: 'var(--muted)',
          }}>
            {sel?.name || '—'}
          </span>
          <button
            onClick={() => sel && downloadFile(sel)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: '#fff',
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            ↓ Download
          </button>
        </div>
        <pre style={{
          padding: 16,
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          lineHeight: 1.85,
          color: 'var(--text2)',
          overflow: 'auto',
          maxHeight: 340,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
          flex: 1,
        }}>
          {sel?.type === 'zip'
            ? `Binary archive — click ↓ Download to save.\n\nBundle contains:\n${project.files
                .filter(f => f.type !== 'zip')
                .map(f => `  ${f.icon}  ${f.name.padEnd(36)} ${f.size}`)
                .join('\n')}`
            : sel?.content || 'Select a file to preview its contents.'}
        </pre>
      </div>
    </div>
  );
}
