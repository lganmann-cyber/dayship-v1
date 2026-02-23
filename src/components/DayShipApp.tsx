'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/useToast';
import { useGenerate } from '@/hooks/useGenerate';
import { ProjectMode } from '@/lib/types';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { Modal } from './ui/Modal';
import { ToastContainer } from './ui/Toast';
import { HomeScreen } from './screens/HomeScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { useAppState } from '@/hooks/useAppState';

export function DayShipApp() {
  const { projects, addProject, deleteProject } = useStore();
  const { toasts, toast, dismiss } = useToast();
  const { generate } = useGenerate();
  const { screen, activeId, modal, setScreen, setActiveId, setModal } = useAppState();

  const activeProject = projects.find(p => p.id === activeId) ?? null;

  const goHome = useCallback(() => {
    setScreen('home');
    setActiveId(null);
  }, [setScreen, setActiveId]);

  const goProject = useCallback((id: string) => {
    setActiveId(id);
    setScreen('project');
  }, [setActiveId, setScreen]);

  const handleCreate = useCallback((data: {
    name: string; client: string; source: string; figmaToken: string; mode: ProjectMode;
  }) => {
    const id = addProject(data);
    setModal(null);
    goProject(id);
    toast(`"${data.name}" created — generating files…`);

    // Kick off real generation via the API route
    generate({
      projectId: id,
      mode: data.mode,
      source: data.source,
      figmaToken: data.figmaToken,
      projectName: data.name,
      client: data.client,
    }).then(() => {
      // Check if the project errored (store will have set error field)
      const p = useStore.getState().projects.find(x => x.id === id);
      if (p?.error) {
        toast(`⚠ Generation error — template files used. ${p.error}`, false);
      } else {
        toast(`✓ Files ready for "${data.name}"`, true);
      }
    });
  }, [addProject, generate, goProject, setModal, toast]);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this project?')) return;
    deleteProject(id);
    goHome();
    toast('Project deleted.');
  }, [deleteProject, goHome, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setModal('figma');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setModal]);

  const topbarTitle = screen === 'home'
    ? 'Overview'
    : (activeProject?.name ?? 'Project');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '228px 1fr',
      height: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: 'var(--bg)',
      color: 'var(--text)',
      fontSize: 14,
      lineHeight: 1.5,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <Sidebar
        projects={projects}
        activeId={activeId}
        screen={screen}
        onHome={goHome}
        onProject={goProject}
        onOpenModal={setModal}
      />

      <div style={{ display: 'grid', gridTemplateRows: '54px 1fr', overflow: 'hidden' }}>
        <Topbar title={topbarTitle} />
        <div style={{ overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)' }}>
          {screen === 'home' && (
            <HomeScreen
              projects={projects}
              onOpenModal={setModal}
              onProject={goProject}
            />
          )}
          {screen === 'project' && activeProject && (
            <ProjectScreen project={activeProject} onDelete={handleDelete} />
          )}
        </div>
      </div>

      {modal && (
        <Modal
          mode={modal}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
