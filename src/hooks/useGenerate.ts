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

export function useGenerate() {
  const setProgress = useStore(s => s.setProjectProgress);
  const completeWithFiles = useStore(s => s.completeProjectWithFiles);
  const failProject = useStore(s => s.failProject);

  const generate = useCallback(async (params: GenerateParams) => {
    const { projectId, mode, source, figmaToken, projectName, client } = params;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, source, figmaToken, projectName, client }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'status') {
            setProgress(
              projectId,
              event.message as string,
              event.progress as number,
            );
          } else if (event.type === 'complete') {
            completeWithFiles(projectId, event.files as OutputFile[]);
          } else if (event.type === 'error') {
            failProject(projectId, event.message as string);
          }
        }
      }
    } catch (err) {
      failProject(projectId, err instanceof Error ? err.message : 'Generation failed');
    }
  }, [setProgress, completeWithFiles, failProject]);

  return { generate };
}
