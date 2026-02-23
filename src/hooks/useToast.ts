'use client';

import { useState, useCallback } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  ok: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, ok = false) => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, ok }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
