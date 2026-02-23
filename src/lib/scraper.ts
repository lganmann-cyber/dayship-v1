import { parse } from 'node-html-parser';

export interface PageData {
  url: string;
  path: string;
  filename: string;       // e.g. "about.html", "services-web-design.html"
  navLabel: string;       // human-readable name for nav
  title: string;
  description: string;
  headings: string[];
  sections: Array<{ heading: string; body: string }>;
  bodyPreview: string;
}

export interface SiteData {
  rootUrl: string;
  origin: string;
  siteTitle: string;
  siteDescription: string;
  navLinks: Array<{ text: string; href: string }>;
  colors: string[];
  fonts: string[];
  footerLinks: string[];
  lang: string;
  pages: PageData[];      // ALL discovered pages
}

/* ── Utilities ── */

function cleanText(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

function dedupeInsert<T>(arr: T[], item: T, max: number): void {
  if (!arr.includes(item) && arr.length < max) arr.push(item);
}

/** Convert a URL path to a flat filename, e.g. /services/web-design → services-web-design.html */
function pathToFilename(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
  return clean ? `${clean}.html` : 'index.html';
}

/** Human label from path segment, e.g. /about-us → About Us */
function pathToLabel(path: string): string {
  const seg = path.split('/').filter(Boolean).pop() ?? 'Home';
  return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Resolve + normalise an href relative to a base origin */
function resolveHref(href: string, origin: string, base: string): string | null {
  try {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    const resolved = new URL(href, base);
    if (resolved.origin !== origin) return null;          // external
    if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|zip|doc|docx|xml|rss|json)$/i.test(resolved.pathname)) return null; // non-HTML
    resolved.hash = '';
    resolved.search = '';
    return resolved.href;
  } catch {
    return null;
  }
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractPageData(html: string, url: string, origin: string): PageData {
  const root = parse(html);
  const path = new URL(url).pathname;

  const title = cleanText(root.querySelector('title')?.text ?? '');
  const descEl = root.querySelector('meta[name="description"]') ?? root.querySelector('meta[property="og:description"]');
  const description = cleanText(descEl?.getAttribute('content') ?? '');

  const headings: string[] = [];
  for (const el of root.querySelectorAll('h1, h2, h3')) {
    const t = cleanText(el.text);
    if (t && t.length > 2 && t.length < 120) dedupeInsert(headings, t, 20);
  }

  const sections: Array<{ heading: string; body: string }> = [];
  for (const h2 of root.querySelectorAll('h2').slice(0, 12)) {
    const heading = cleanText(h2.text);
    if (!heading || heading.length < 3) continue;
    let sib = h2.nextElementSibling;
    let body = '';
    while (sib && !body) {
      if (sib.tagName === 'P') body = cleanText(sib.text).slice(0, 300);
      sib = sib.nextElementSibling;
    }
    sections.push({ heading, body });
  }

  const bodyPreview = cleanText(
    root.querySelector('main, article, [role="main"], body')?.text ?? root.text,
  ).slice(0, 2000);

  // Collect outbound internal hrefs for BFS
  const links: string[] = [];
  for (const a of root.querySelectorAll('a[href]')) {
    const resolved = resolveHref(a.getAttribute('href') ?? '', origin, url);
    if (resolved) links.push(resolved);
  }

  return {
    url,
    path,
    filename: pathToFilename(path),
    navLabel: pathToLabel(path),
    title,
    description,
    headings,
    sections,
    bodyPreview,
    _links: links,         // internal — used by crawler, stripped later
  } as PageData & { _links: string[] };
}

function extractGlobalData(html: string, origin: string): Pick<SiteData, 'navLinks' | 'colors' | 'fonts' | 'footerLinks' | 'lang' | 'siteTitle' | 'siteDescription'> {
  const root = parse(html);

  const siteTitle = cleanText(root.querySelector('title')?.text ?? '');
  const descEl = root.querySelector('meta[name="description"]');
  const siteDescription = cleanText(descEl?.getAttribute('content') ?? '');
  const lang = root.querySelector('html')?.getAttribute('lang') ?? 'en';

  // Nav links
  const navLinks: Array<{ text: string; href: string }> = [];
  const navEl = root.querySelector('nav, header, [role="navigation"]');
  if (navEl) {
    for (const a of navEl.querySelectorAll('a')) {
      const text = cleanText(a.text);
      const href = a.getAttribute('href') ?? '';
      if (text && text.length < 50 && href && navLinks.length < 20) {
        navLinks.push({ text, href });
      }
    }
  }

  // Colors from embedded styles
  const colors: string[] = [];
  for (const tag of root.querySelectorAll('style')) {
    (tag.text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).forEach(h => dedupeInsert(colors, h.toLowerCase(), 30));
  }
  (html.match(/--[\w-]+:\s*(#[0-9a-fA-F]{3,8})/g) ?? []).forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,8}/)?.[0];
    if (hex) dedupeInsert(colors, hex.toLowerCase(), 30);
  });

  // Fonts
  const fonts: string[] = [];
  const gfMatches = html.match(/fonts\.googleapis\.com\/css[^"']+family=([^"'&]+)/gi) ?? [];
  for (const gf of gfMatches) {
    const fam = gf.match(/family=([^"'&]+)/)?.[1] ?? '';
    fam.split('|').forEach(f => {
      const name = f.split(':')[0].replace(/\+/g, ' ').trim();
      if (name) dedupeInsert(fonts, name, 8);
    });
  }
  for (const tag of root.querySelectorAll('style')) {
    (tag.text.match(/font-family\s*:\s*['"]?([^'";,}{]+)/gi) ?? []).forEach(m => {
      const name = m.replace(/font-family\s*:\s*/i, '').replace(/['"]/g, '').split(',')[0].trim();
      if (name && name.length < 40) dedupeInsert(fonts, name, 8);
    });
  }

  // Footer links
  const footerLinks: string[] = [];
  const footerEl = root.querySelector('footer');
  if (footerEl) {
    for (const a of footerEl.querySelectorAll('a')) {
      const t = cleanText(a.text);
      if (t && t.length < 60) dedupeInsert(footerLinks, t, 30);
    }
  }

  return { siteTitle, siteDescription, navLinks, colors, fonts, footerLinks, lang };
}

/** BFS crawler — fetches up to maxPages internal pages concurrently (batch of 5) */
export async function crawlSite(
  rawUrl: string,
  maxPages = 30,
  onProgress?: (msg: string) => void,
): Promise<SiteData> {
  const rootUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const origin = new URL(rootUrl).origin;

  onProgress?.(`Fetching ${rootUrl}…`);
  const rootHtml = await fetchPage(rootUrl);
  if (!rootHtml) throw new Error(`Could not fetch ${rootUrl} — server returned no HTML.`);

  const globalData = extractGlobalData(rootHtml, origin);
  const rootPageData = extractPageData(rootHtml, rootUrl, origin) as PageData & { _links?: string[] };

  const visited = new Set<string>([rootUrl]);
  const queue: string[] = [...(rootPageData as unknown as { _links: string[] })._links];
  const pages: PageData[] = [rootPageData];

  // BFS in batches of 5
  while (queue.length > 0 && pages.length < maxPages) {
    const batch = [...new Set(queue.splice(0, 5))].filter(u => !visited.has(u));
    if (batch.length === 0) continue;
    batch.forEach(u => visited.add(u));

    onProgress?.(`Crawling pages ${pages.length + 1}–${Math.min(pages.length + batch.length, maxPages)} of ${Math.min(visited.size + queue.length, maxPages)}…`);

    const results = await Promise.allSettled(
      batch.map(async (u) => {
        const html = await fetchPage(u);
        if (!html) return null;
        return extractPageData(html, u, origin) as PageData & { _links: string[] };
      }),
    );

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const pd = r.value;
      pages.push(pd);
      if (pages.length < maxPages) {
        queue.push(...(pd._links ?? []));
      }
    }
  }

  // Strip internal _links field
  const cleanPages: PageData[] = pages.map(({ ...p }) => {
    delete (p as Record<string, unknown>)._links;
    return p;
  });

  // Ensure homepage is first and has filename "index.html"
  cleanPages[0].filename = 'index.html';
  cleanPages[0].navLabel = 'Home';

  onProgress?.(`Crawl complete — ${cleanPages.length} page${cleanPages.length !== 1 ? 's' : ''} found`);

  return {
    rootUrl,
    origin,
    ...globalData,
    pages: cleanPages,
  };
}
