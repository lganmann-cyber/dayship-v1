import { NextRequest } from 'next/server';
import { fetchFigmaData } from '@/lib/figma';
import { crawlSite } from '@/lib/scraper';
import { generateFigmaTheme, generateUrlSite, GenFile } from '@/lib/claude';
import { buildFiles } from '@/lib/files';
import { Project } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — configured in vercel.json

/* ── SSE helpers ── */
function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  const line = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(line));
}

function toOutputFiles(genFiles: GenFile[]) {
  const EXT_TYPE: Record<string, 'html' | 'css' | 'php' | 'json' | 'zip' | 'js' | 'md'> = {
    html: 'html', css: 'css', php: 'php', json: 'json', js: 'js', md: 'md',
  };
  const ICON: Record<string, string> = {
    html: '📄', css: '🎨', php: '⚙️', json: '📋', js: '📜', md: '📄', zip: '📦',
  };

  return genFiles.map(f => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'txt';
    const type = EXT_TYPE[ext] ?? 'html';
    const lines = f.content.split('\n').length;
    const bytes = new TextEncoder().encode(f.content).length;
    const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    return { name: f.name, icon: ICON[ext] ?? '📄', type, size, content: f.content };
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    mode: 'figma' | 'url';
    source: string;
    figmaToken?: string;
    projectName: string;
    client?: string;
  };

  const { mode, source, figmaToken, projectName } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => sseEvent(controller, data);

      try {
        /* ── Guard: API key ── */
        if (!process.env.ANTHROPIC_API_KEY) {
          send({ type: 'error', message: 'ANTHROPIC_API_KEY is not set in .env.local. Add your key and restart the dev server.' });
          controller.close();
          return;
        }

        send({ type: 'status', message: 'Starting generation…', progress: 5 });

        let genFiles: GenFile[] = [];

        /* ── FIGMA mode ── */
        if (mode === 'figma') {
          if (!figmaToken?.trim()) {
            send({ type: 'error', message: 'A Figma API token is required. Generate one at figma.com → Account Settings → Personal access tokens.' });
            controller.close();
            return;
          }

          send({ type: 'status', message: 'Connecting to Figma API…', progress: 8 });
          const figmaData = await fetchFigmaData(source, figmaToken);
          send({
            type: 'status',
            message: `Figma file "${figmaData.fileName}" loaded — ${figmaData.colors.length} colours, ${figmaData.textStyles.length} text styles, ${figmaData.components.length} components`,
            progress: 22,
          });

          genFiles = await generateFigmaTheme(projectName, figmaData, (msg, pct) => {
            send({ type: 'status', message: msg, progress: pct });
          });

        /* ── URL mode ── */
        } else {
          if (!source?.trim()) {
            send({ type: 'error', message: 'A target URL is required.' });
            controller.close();
            return;
          }

          send({ type: 'status', message: `Crawling ${source}…`, progress: 8 });

          let siteData;
          try {
            siteData = await crawlSite(source, 30, (msg) => {
              send({ type: 'status', message: msg, progress: 12 });
            });
            send({
              type: 'status',
              message: `Crawl complete — ${siteData.pages.length} pages discovered on ${new URL(siteData.rootUrl).hostname}`,
              progress: 22,
            });
          } catch (fetchErr) {
            // Site blocked server-side fetches — generate from URL hints only
            const urlHint = new URL(source.startsWith('http') ? source : `https://${source}`);
            const hostname = urlHint.hostname.replace('www.', '');
            const siteName = hostname.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            siteData = {
              rootUrl: source,
              origin: urlHint.origin,
              siteTitle: siteName,
              siteDescription: `Website rebuild for ${hostname}`,
              navLinks: [],
              colors: [],
              fonts: [],
              footerLinks: [],
              lang: 'en',
              pages: [
                { url: source, path: '/', filename: 'index.html', navLabel: 'Home', title: siteName, description: '', headings: [], sections: [], bodyPreview: '' },
                { url: `${urlHint.origin}/about`, path: '/about', filename: 'about.html', navLabel: 'About', title: `About — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
                { url: `${urlHint.origin}/services`, path: '/services', filename: 'services.html', navLabel: 'Services', title: `Services — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
                { url: `${urlHint.origin}/blog`, path: '/blog', filename: 'blog.html', navLabel: 'Blog', title: `Blog — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
                { url: `${urlHint.origin}/contact`, path: '/contact', filename: 'contact.html', navLabel: 'Contact', title: `Contact — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
              ],
            };
            send({
              type: 'status',
              message: `Could not crawl ${source} (site may block robots) — generating 5 standard pages from URL metadata.`,
              progress: 22,
            });
          }

          genFiles = await generateUrlSite(projectName, siteData, (msg, pct) => {
            send({ type: 'status', message: msg, progress: pct });
          });
        }

        /* ── Validate & enrich output ── */
        if (genFiles.length === 0) {
          throw new Error('Claude did not return any parseable files. Try again.');
        }

        // Add zip placeholder
        const zipName = mode === 'figma' ? 'wp-theme.zip' : 'site.zip';
        const totalSize = genFiles.reduce((s, f) => s + f.content.length, 0);
        genFiles.push({ name: zipName, content: '' });

        const outputFiles = toOutputFiles(genFiles).map(f =>
          f.name === zipName
            ? { ...f, type: 'zip' as const, icon: '📦', size: `${(totalSize / 1024 * 1.2).toFixed(1)} KB` }
            : f,
        );

        send({ type: 'status', message: 'Packaging files…', progress: 97 });
        send({ type: 'complete', files: outputFiles });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  });
}
