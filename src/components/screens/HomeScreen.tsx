'use client';

import { Project, ProjectMode } from '@/lib/types';
import { Pill, Badge } from '@/components/ui/Badge';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MODE_CARDS = [
  {
    mode: 'figma' as ProjectMode,
    badge: '⬡ Figma → WordPress',
    title: 'Design to production WP theme',
    desc: 'Convert a Figma file into a WordPress classic theme with ACF field wiring, tokens.css, and PHP templates.',
    steps: ['Name your project', 'Paste Figma URL + tokens.json', 'Download WP theme zip'],
  },
  {
    mode: 'url' as ProjectMode,
    badge: '◎ URL → HTML/CSS',
    title: 'Reverse-engineer any site',
    desc: 'Paste a URL or upload a screenshot and get clean, semantic HTML & CSS — BEM naming, no framework noise.',
    steps: ['Name your project', 'Paste URL or upload screenshot', 'Download clean HTML/CSS'],
  },
];

interface HomeScreenProps {
  projects: Project[];
  onOpenModal: (mode: ProjectMode) => void;
  onProject: (id: string) => void;
}

export function HomeScreen({ projects, onOpenModal, onProject }: HomeScreenProps) {
  return (
    <div style={{ padding: 24 }} className="fade-up">
      {/* Hero */}
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '36px 0 26px' }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-.02em',
          lineHeight: 1.25,
          marginBottom: 8,
          color: 'var(--text)',
        }}>
          Build faster.<br />
          <span style={{ color: 'var(--or)' }}>Figma → WP.</span>{' '}
          <span style={{ color: 'var(--tl)' }}>URL → Code.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
          Name a project, drop in your source, and get clean output files ready to ship.
        </p>
      </div>

      {/* Mode cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 640, margin: '22px auto 0' }}>
        {MODE_CARDS.map(({ mode, badge, title, desc, steps }) => {
          const f = mode === 'figma';
          return (
            <ModeCard
              key={mode}
              mode={mode}
              badge={badge}
              title={title}
              desc={desc}
              steps={steps}
              isFigma={f}
              onClick={() => onOpenModal(mode)}
            />
          );
        })}
      </div>

      {/* Recent projects */}
      <div style={{ maxWidth: 640, margin: '24px auto 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Recent Projects</span>
          <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>No projects yet</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>Create your first project above.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => onProject(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ModeCardProps {
  mode: ProjectMode;
  badge: string;
  title: string;
  desc: string;
  steps: string[];
  isFigma: boolean;
  onClick: () => void;
}

function ModeCard({ badge, title, desc, steps, isFigma, onClick }: ModeCardProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = isFigma ? 'var(--or)' : 'var(--tl)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.09)';
    e.currentTarget.style.transform = 'translateY(-2px)';
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.boxShadow = 'var(--sh)';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 22,
        cursor: 'pointer',
        boxShadow: 'var(--sh)',
        transition: 'all .18s',
      }}
    >
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        marginBottom: 12,
        padding: '3px 10px',
        borderRadius: 20,
        background: isFigma ? 'var(--or-lt)' : 'var(--tl-lt)',
        color: isFigma ? 'var(--or-d)' : 'var(--tl)',
        border: `1px solid ${isFigma ? 'var(--or-bdr)' : 'var(--tl-bdr)'}`,
      }}>
        {badge}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 14 }}>{desc}</div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{
              width: 17,
              height: 17,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              flexShrink: 0,
              background: isFigma ? 'var(--or-lt)' : 'var(--tl-lt)',
              color: isFigma ? 'var(--or-d)' : 'var(--tl)',
            }}>
              {i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project: p, onClick }: ProjectCardProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--or)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.09)';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.boxShadow = 'var(--sh)';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        boxShadow: 'var(--sh)',
        transition: 'all .14s',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
      {p.client && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{p.client}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
        <Pill mode={p.mode} />
        <Badge status={p.status} />
        <span style={{ fontSize: 11, color: 'var(--muted2)', marginLeft: 'auto' }}>
          {fmtDate(p.createdAt)}
        </span>
      </div>
    </div>
  );
}
