import JSZip from 'jszip';
import { OutputFile, Project } from './types';

const MIME: Record<string, string> = {
  html: 'text/html',
  css:  'text/css',
  php:  'application/x-httpd-php',
  json: 'application/json',
  js:   'text/javascript',
  md:   'text/markdown',
};

export function downloadFile(file: OutputFile): void {
  if (file.type === 'zip' || !file.content) return;
  const mime = MIME[file.type] || 'text/plain';
  const blob = new Blob([file.content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name.split('/').pop() || file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadProjectZip(project: Project): Promise<void> {
  const zip = new JSZip();
  const themeName = project.name.toLowerCase().replace(/\s+/g, '-');
  const folder = zip.folder(themeName)!;
  const textFiles = project.files.filter(f => f.type !== 'zip');
  textFiles.forEach(f => {
    // Preserve sub-folder paths (e.g. template-parts/card-post.php, js/main.js)
    folder.file(f.name, f.content);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${themeName}-files.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
