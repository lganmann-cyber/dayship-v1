'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { OutputFile } from '@/lib/types';

interface GenerateParams {
  projectId: string;
  mode: 'figma' | 'url';
  source: string;
  figmaToken: string;
  projectName: string;
  client?: string;
}

// Simulated progress steps shown while Claude works
const FIGMA_STEPS = [
  [5,  'Connecting to Figma API…'],
  [15, 'Extracting colours, typography & components…'],
  [28, 'Generating design system (tokens.css + style.css)…'],
  [50, 'Generating WordPress PHP templates…'],
  [72, 'Generating ACF fields and JavaScript…'],
  [90, 'Packaging files…'],
] as const;

const URL_STEPS = [
  [5,  'Crawling site pages…'],
  [18, 'Analysing structure, colours & fonts…'],
  [32, 'Generating HTML pages…'],
  [65, 'Generating stylesheet and JavaScript…'],
  [90, 'Packaging files…'],
] as const;

export function useGenerate() {
  const setProgress = useStore(s => s.setProjectProgress);
  const completeWithFiles = useStore(s => s.completeProjectWithFiles);
  const failProject = useStore(s => s.failProject);

  const generate = useCallback(async (params: GenerateParams) => {
    const { projectId, mode, source, figmaToken, projectName, client } = params;
    const steps = mode === 'figma' ? FIGMA_STEPS : URL_STEPS;

    // Animate progress locally while API works
    let stepIdx = 0;
    const advance = () => {
      if (stepIdx >= steps.length) return;
      const [pct, msg] = steps[stepIdx++];
      setProgress(projectId, msg, pct);
    };

    advance(); // step 0 immediately
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule remaining steps at increasing intervals
    steps.slice(1).forEach((_, i) => {
      const delay = (i + 1) * (mode === 'figma' ? 9000 : 10000);
      timers.push(setTimeout(advance, delay));
    });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, source, figmaToken, projectName, client }),
      });

      timers.forEach(clearTimeout);

      const data = await res.json() as { files?: OutputFile[]; error?: string };

      if (!res.ok || data.error) {
        failProject(projectId, data.error ?? `API error ${res.status}`);
        return;
      }

      if (!data.files?.length) {
        failProject(projectId, 'No files returned from generation.');
        return;
      }

      completeWithFiles(projectId, data.files);

    } catch (err) {
      timers.forEach(clearTimeout);
      failProject(projectId, err instanceof Error ? err.message : 'Network error');
    }
  }, [setProgress, completeWithFiles, failProject]);

  return { generate };
}
