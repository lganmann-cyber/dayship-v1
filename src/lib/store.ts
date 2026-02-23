'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, OutputFile } from './types';
import { buildFiles } from './files';

const DEMO_IDS = ['demo1', 'demo2'];

function makeDemos(): Project[] {
  const d1: Project = {
    id: 'demo1', name: 'Acme Corp Site', client: 'Acme Corp',
    mode: 'figma', source: 'https://figma.com/file/demo123',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'done', files: [],
  };
  d1.files = buildFiles(d1);

  const d2: Project = {
    id: 'demo2', name: 'Barlow Rebuild', client: 'Barlow & Co',
    mode: 'url', source: 'https://old.barlow.co',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'done', files: [],
  };
  d2.files = buildFiles(d2);

  return [d1, d2];
}

interface StoreState {
  projects: Project[];
  seeded: boolean;

  addProject: (partial: Omit<Project, 'id' | 'createdAt' | 'status' | 'files'>) => string;

  /** Called by SSE stream on each progress update */
  setProjectProgress: (id: string, message: string, pct: number) => void;

  /** Called by SSE stream when Claude finishes — uses real generated files */
  completeProjectWithFiles: (id: string, files: OutputFile[]) => void;

  /** Fallback: mark done with template files (no API key / demo mode) */
  completeProject: (id: string) => void;

  /** Called on stream error — stores error message, marks done with template fallback */
  failProject: (id: string, error: string) => void;

  deleteProject: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      projects: makeDemos(),
      seeded: false,

      addProject: (partial) => {
        const id = 'p' + Date.now();
        const project: Project = {
          ...partial,
          id,
          createdAt: new Date().toISOString(),
          status: 'generating',
          progressMessage: 'Initialising…',
          progressPct: 2,
          files: [],
        };
        set(s => ({ projects: [project, ...s.projects] }));
        return id;
      },

      setProjectProgress: (id, message, pct) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? { ...p, progressMessage: message, progressPct: pct }
              : p,
          ),
        }));
      },

      completeProjectWithFiles: (id, files) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? { ...p, status: 'done', files, progressMessage: undefined, progressPct: undefined }
              : p,
          ),
        }));
      },

      completeProject: (id) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? { ...p, status: 'done', files: buildFiles(p), progressMessage: undefined, progressPct: undefined }
              : p,
          ),
        }));
      },

      failProject: (id, error) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? {
                  ...p,
                  status: 'done',
                  files: buildFiles(p),
                  progressMessage: undefined,
                  progressPct: undefined,
                  error,
                }
              : p,
          ),
        }));
      },

      deleteProject: (id) => {
        set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
      },
    }),
    {
      name: 'dayship-v2',

      partialize: (state) => ({
        seeded: state.seeded,
        projects: state.projects.map(p => ({
          ...p,
          figmaToken: undefined,    // never persist API tokens
          progressMessage: undefined,
          progressPct: undefined,
          files: p.files.map(f => ({ ...f, content: '' })),
        })),
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (!state.seeded) {
          state.projects = makeDemos();
          state.seeded = true;
          return;
        }

        state.projects = state.projects.map(p => {
          // Project was stuck generating when browser closed → complete with templates
          if (p.status === 'generating') {
            return { ...p, status: 'done', files: buildFiles(p), progressMessage: undefined, progressPct: undefined };
          }
          // Rebuild file content (stripped on persist)
          if (p.status === 'done' && p.files.every(f => !f.content)) {
            return { ...p, files: buildFiles(p) };
          }
          return p;
        });

        // Refresh demo files to latest template version
        state.projects = state.projects.map(p =>
          DEMO_IDS.includes(p.id) && p.files.every(f => !f.content)
            ? { ...p, files: buildFiles(p) }
            : p,
        );
      },
    }
  )
);
