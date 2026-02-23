'use client';

import { ProjectMode, ProjectStatus } from '@/lib/types';

interface PillProps {
  mode: ProjectMode;
}

export function Pill({ mode }: PillProps) {
  const f = mode === 'figma';
  return (
    <span style={{
      padding: '2px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: f ? 'var(--or-lt)' : 'var(--tl-lt)',
      color: f ? 'var(--or-d)' : 'var(--tl)',
      border: `1px solid ${f ? 'var(--or-bdr)' : 'var(--tl-bdr)'}`,
      whiteSpace: 'nowrap' as const,
    }}>
      {f ? '⬡ Figma→WP' : '◎ URL→HTML'}
    </span>
  );
}

interface BadgeProps {
  status: ProjectStatus;
}

export function Badge({ status }: BadgeProps) {
  const done = status === 'done';
  return (
    <span style={{
      padding: '2px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: done ? 'var(--gr-lt)' : 'var(--am-lt)',
      color: done ? 'var(--gr)' : 'var(--am)',
      border: `1px solid ${done ? 'var(--gr-bdr)' : '#fde68a'}`,
      whiteSpace: 'nowrap' as const,
    }}>
      {done ? '✓ Done' : '⏳ Building'}
    </span>
  );
}
