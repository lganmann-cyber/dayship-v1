import { NextRequest, NextResponse } from 'next/server';
import { fetchFigmaData } from '@/lib/figma';
import { crawlSite } from '@/lib/scraper';
import { generateFigmaTheme, generateUrlSite, GenFile } from '@/lib/claude';
import { buildFiles } from '@/lib/files';
import { Project } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const bytes = new TextEncoder().encode(f.content).length;
    const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    return { name: f.name, icon: ICON[ext] ?? '📄', type, size, content: f.content };
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not set in environment variables.' },
        { status: 500 },
      );
    }

    const body = await req.json() as {
      mode: 'figma' | 'url';
      source: string;
      figmaToken?: string;
      projectName: string;
    };

    const { mode, source, figmaToken, projectName } = body;
    let genFiles: GenFile[] = [];

    if (mode === 'figma') {
      if (!figmaToken?.trim()) {
        return NextResponse.json(
          { error: 'A Figma API token is required.' },
          { status: 400 },
        );
      }
      const figmaData = await fetchFigmaData(source, figmaToken);
      genFiles = await generateFigmaTheme(projectName, figmaData, () => {});

    } else {
      let siteData;
      try {
        siteData = await crawlSite(source, 12);
      } catch {
        const urlHint = new URL(source.startsWith('http') ? source : `https://${source}`);
        const hostname = urlHint.hostname.replace('www.', '');
        const siteName = hostname.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        siteData = {
          rootUrl: source, origin: urlHint.origin,
          siteTitle: siteName, siteDescription: `Website for ${hostname}`,
          navLinks: [], colors: [], fonts: [], footerLinks: [], lang: 'en',
          pages: [
            { url: source, path: '/', filename: 'index.html', navLabel: 'Home', title: siteName, description: '', headings: [], sections: [], bodyPreview: '' },
            { url: `${urlHint.origin}/about`, path: '/about', filename: 'about.html', navLabel: 'About', title: `About — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
            { url: `${urlHint.origin}/services`, path: '/services', filename: 'services.html', navLabel: 'Services', title: `Services — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
            { url: `${urlHint.origin}/blog`, path: '/blog', filename: 'blog.html', navLabel: 'Blog', title: `Blog — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
            { url: `${urlHint.origin}/contact`, path: '/contact', filename: 'contact.html', navLabel: 'Contact', title: `Contact — ${siteName}`, description: '', headings: [], sections: [], bodyPreview: '' },
          ],
        };
      }
      genFiles = await generateUrlSite(projectName, siteData, () => {});
    }

    if (genFiles.length === 0) {
      return NextResponse.json({ error: 'No files were generated. Please try again.' }, { status: 500 });
    }

    const zipName = mode === 'figma' ? 'wp-theme.zip' : 'site.zip';
    const totalSize = genFiles.reduce((s, f) => s + f.content.length, 0);
    genFiles.push({ name: zipName, content: '' });

    const outputFiles = toOutputFiles(genFiles).map(f =>
      f.name === zipName
        ? { ...f, type: 'zip' as const, icon: '📦', size: `${(totalSize / 1024 * 1.2).toFixed(1)} KB` }
        : f,
    );

    return NextResponse.json({ files: outputFiles });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
