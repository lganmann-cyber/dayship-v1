'use client';

import { Project } from '@/lib/types';
import { Pill, Badge } from '@/components/ui/Badge';
import { FilePanel } from '@/components/ui/FilePanel';
import { downloadFile, downloadProjectZip } from '@/lib/download';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 18,
  boxShadow: 'var(--sh)',
};

interface ProjectScreenProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectScreen({ project, onDelete }: ProjectScreenProps) {
  const isFigma = project.mode === 'figma';
  const isGenerating = project.status === 'generating';

  return (
    <div
      className="fade-up"
      style={{
        padding: 24,
        display: 'grid',
        gridTemplateColumns: '1fr 256px',
        gap: 18,
        alignItems: 'start',
      }}
    >
      {/* Main column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header card */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em', marginBottom: 4 }}>
              {project.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
              <Pill mode={project.mode} />
              {project.client && <span>{project.client}</span>}
              <span>Created {fmtDate(project.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={() => onDelete(project.id)}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--rd-lt)',
              color: 'var(--rd)',
              border: '1px solid var(--rd-bdr)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Delete
          </button>
        </div>

        {/* Status strip */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: isGenerating ? 'var(--am)' : 'var(--gr)',
            animation: isGenerating ? 'pulse 1.1s infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: isGenerating ? 'var(--am)' : 'var(--gr)', flex: 1, minWidth: 0 }}>
            {isGenerating
              ? (project.progressMessage ?? 'Generating output files…')
              : '✓ All files ready'}
          </span>
          {isGenerating ? (
            <div style={{ width: 140, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                width: `${project.progressPct ?? 8}%`,
                background: isFigma
                  ? 'linear-gradient(90deg, var(--or), var(--or-d))'
                  : 'linear-gradient(90deg, var(--tl), #0284c7)',
                borderRadius: 2,
                transition: 'width .6s ease',
              }} />
            </div>
          ) : (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted2)', flexShrink: 0 }}>
              {project.files.length} files generated
            </span>
          )}
        </div>

        {/* Error banner (template fallback used) */}
        {!isGenerating && project.error && (
          <div style={{
            ...cardStyle,
            padding: '12px 16px',
            background: 'var(--am-lt)',
            border: '1px solid #fde68a',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--am)', marginBottom: 3 }}>
                Generation error — template files used as fallback
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{project.error}</div>
            </div>
          </div>
        )}

        {/* File panel or loading */}
        {isGenerating ? (
          <div style={{ ...cardStyle, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--muted)', maxWidth: 340 }}>
              <div style={{ fontSize: 40, opacity: 0.35, marginBottom: 12 }}>⚙️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
                {isFigma ? 'Generating your WordPress theme…' : 'Rebuilding site from URL…'}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--muted)' }}>
                {project.progressMessage
                  ? project.progressMessage
                  : isFigma
                    ? 'Connecting to Figma API, extracting colours & typography, then generating all theme files with Claude.'
                    : 'Fetching site HTML, analysing structure & design, then generating clean HTML/CSS with Claude.'}
              </div>
            </div>
          </div>
        ) : (
          <FilePanel project={project} />
        )}
      </div>

      {/* Side column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Info card */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 14 }}>Project Info</div>
          {([
            ['Mode', (
              <span key="mode" style={{ color: isFigma ? 'var(--or)' : 'var(--tl)', fontWeight: 500 }}>
                {isFigma ? 'Figma → WordPress' : 'URL → HTML/CSS'}
              </span>
            )],
            project.source ? ['Source', (
              <span key="src" style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                maxWidth: 130,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}>
                {project.source}
              </span>
            )] : null,
            ['Status', <Badge key="status" status={project.status} />],
            ['Files', <span key="files" style={{ fontWeight: 500, color: 'var(--text2)' }}>{project.files.length}</span>],
            ['Created', <span key="created" style={{ fontWeight: 500, color: 'var(--text2)' }}>{fmtDate(project.createdAt)}</span>],
          ] as ([string, React.ReactNode] | null)[])
            .filter(Boolean)
            .map(row => {
              const [lbl, val] = row!;
              return (
                <div key={lbl as string} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                }}>
                  <span style={{ color: 'var(--muted)' }}>{lbl}</span>
                  {val}
                </div>
              );
            })}
        </div>

        {/* Download card */}
        {project.files.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 14 }}>Download</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.files.filter(f => f.type === 'zip').map(f => (
                <button
                  key={f.name}
                  onClick={() => downloadProjectZip(project)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isFigma ? 'var(--or)' : 'var(--tl)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: isFigma ? '0 1px 3px rgba(249,115,22,.28)' : 'none',
                  }}
                >
                  ↓ {f.name}
                </button>
              ))}
              <button
                onClick={() => downloadProjectZip(project)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border2)',
                  background: '#fff',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: 'var(--sh)',
                }}
              >
                ↓ Download All Files
              </button>
            </div>
          </div>
        )}

        {/* Contains card */}
        {project.files.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 14 }}>
              {isFigma ? 'WP Theme Contains' : 'Output Contains'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {project.files.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {f.name}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted2)' }}>{f.size}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
