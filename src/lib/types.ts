export type ProjectMode = 'figma' | 'url';
export type ProjectStatus = 'generating' | 'done';

export interface OutputFile {
  name: string;
  icon: string;
  type: 'html' | 'css' | 'php' | 'json' | 'zip' | 'js' | 'md';
  size: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  mode: ProjectMode;
  source: string;
  figmaToken?: string;
  createdAt: string;
  status: ProjectStatus;
  files: OutputFile[];

  /** Live progress message from SSE stream */
  progressMessage?: string;
  /** 0–100 */
  progressPct?: number;
  /** Error message if generation failed (falls back to templates) */
  error?: string;
}
