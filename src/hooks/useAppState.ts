'use client';

import { useState, useCallback } from 'react';
import { ProjectMode } from '@/lib/types';

type Screen = 'home' | 'project';

export function useAppState() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModalState] = useState<ProjectMode | null>(null);

  const setModal = useCallback((mode: ProjectMode | null) => {
    setModalState(mode);
  }, []);

  return { screen, activeId, modal, setScreen, setActiveId, setModal };
}
