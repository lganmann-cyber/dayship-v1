export interface FigmaColor {
  name: string;
  hex: string;
  r: number; g: number; b: number; a: number;
}

export interface FigmaTextStyle {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeightPx?: number;
  letterSpacing?: number;
}

export interface FigmaDesignData {
  fileName: string;
  colors: FigmaColor[];
  textStyles: FigmaTextStyle[];
  pages: Array<{ name: string; sections: string[] }>;
  components: Array<{ name: string; description?: string }>;
  hasError?: boolean;
  error?: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('');
}

function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'color';
}

/** Extract file key from any Figma URL variant */
export function extractFigmaFileKey(url: string): string | null {
  // Figma file keys are alphanumeric, may include hyphens, typically 10-40 chars
  // Handles: /design/KEY, /file/KEY, /proto/KEY, /board/KEY, /slides/KEY
  const m = url.match(/figma\.com\/(?:design|file|proto|board|slides)\/([a-zA-Z0-9_-]{5,60})/);
  return m ? m[1] : null;
}

/** Walk the document tree extracting colors and text styles */
function extractFromNode(
  node: Record<string, unknown>,
  colors: Map<string, FigmaColor>,
  textStyles: Map<string, FigmaTextStyle>,
  depth = 0,
) {
  if (depth > 6) return;

  // Colors from fills
  const fills = node.fills as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(fills)) {
    for (const fill of fills) {
      if (fill.type === 'SOLID' && fill.color && fill.opacity !== 0) {
        const c = fill.color as { r: number; g: number; b: number; a?: number };
        const hex = rgbToHex(c.r, c.g, c.b);
        if (!colors.has(hex)) {
          colors.set(hex, {
            name: normalizeName((node.name as string) || 'color'),
            hex, r: c.r, g: c.g, b: c.b, a: c.a ?? 1,
          });
        }
      }
    }
  }

  // Text styles
  if (node.type === 'TEXT' && node.style) {
    const s = node.style as Record<string, unknown>;
    const ff = (s.fontFamily as string) || 'Inter';
    const fs = (s.fontSize as number) || 16;
    const fw = (s.fontWeight as number) || 400;
    const key = `${ff}-${fs}-${fw}`;
    if (!textStyles.has(key)) {
      textStyles.set(key, {
        name: (node.name as string) || 'text',
        fontFamily: ff, fontSize: fs, fontWeight: fw,
        lineHeightPx: s.lineHeightPx as number | undefined,
        letterSpacing: s.letterSpacing as number | undefined,
      });
    }
  }

  const children = node.children as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(children)) {
    for (const child of children) extractFromNode(child, colors, textStyles, depth + 1);
  }
}

export async function fetchFigmaData(
  fileUrl: string,
  token: string,
): Promise<FigmaDesignData> {
  const fileKey = extractFigmaFileKey(fileUrl);
  if (!fileKey) {
    throw new Error(
      'Invalid Figma URL. Use a link like: https://www.figma.com/design/FILEID/Project-Name',
    );
  }

  // Race the fetch against a 20s timeout
  let res: Response;
  try {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Figma API timed out. Check your connection and try again.')); }, 20000);
    });
    res = await Promise.race([
      fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: { 'X-Figma-Token': token },
        signal: controller.signal,
      }),
      timeoutPromise,
    ]).finally(() => clearTimeout(timer!));
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('timed out')) throw new Error(msg);
    throw new Error(`Could not reach Figma API: ${msg}`);
  }

  if (res.status === 400) throw new Error(`Figma API rejected the request. The file key "${fileKey}" may be invalid — copy the URL directly from your browser while the file is open.`);
  if (res.status === 401) throw new Error('Figma token invalid. Generate a new one at figma.com → Account Settings → Personal access tokens.');
  if (res.status === 403) throw new Error('No access to this Figma file. Make sure you have at least "can view" permission.');
  if (res.status === 404) throw new Error('Figma file not found. Check the URL is correct and the file exists.');
  if (res.status === 405) throw new Error(`Figma API returned 405 for key "${fileKey}". Try opening the file in Figma and copying the full URL from the browser address bar.`);
  if (!res.ok) throw new Error(`Figma API error ${res.status} — ${res.statusText || 'unknown error'}. Try again or check your token.`);

  const data = await res.json() as Record<string, unknown>;

  const colorMap = new Map<string, FigmaColor>();
  const textStyleMap = new Map<string, FigmaTextStyle>();
  const pages: Array<{ name: string; sections: string[] }> = [];
  const components: Array<{ name: string; description?: string }> = [];

  // Walk document
  const doc = data.document as Record<string, unknown> | undefined;
  if (doc?.children && Array.isArray(doc.children)) {
    for (const page of (doc.children as Array<Record<string, unknown>>).slice(0, 8)) {
      const sections: string[] = [];
      const pageChildren = page.children as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(pageChildren)) {
        for (const frame of pageChildren.slice(0, 20)) {
          if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'GROUP'].includes(frame.type as string)) {
            sections.push(frame.name as string);
          }
          // Extract design data from top-level frames only (depth limit keeps it fast)
          extractFromNode(frame, colorMap, textStyleMap, 0);
        }
      }
      pages.push({ name: page.name as string, sections: sections.slice(0, 12) });
    }
  }

  // Components from global map
  const compsMap = data.components as Record<string, Record<string, unknown>> | undefined;
  if (compsMap) {
    Object.values(compsMap).slice(0, 40).forEach(c => {
      if (c.name) components.push({ name: c.name as string, description: c.description as string | undefined });
    });
  }

  // Named styles (colors/text) from the styles map
  const stylesMap = data.styles as Record<string, Record<string, unknown>> | undefined;
  if (stylesMap) {
    for (const [, style] of Object.entries(stylesMap).slice(0, 80)) {
      if (style.styleType === 'FILL' && style.name) {
        // Styles map only has metadata; actual values come from node traversal above
      }
    }
  }

  return {
    fileName: (data.name as string) || 'Figma Design',
    colors: Array.from(colorMap.values()).slice(0, 40),
    textStyles: Array.from(textStyleMap.values())
      .sort((a, b) => b.fontSize - a.fontSize)
      .slice(0, 20),
    pages,
    components,
  };
}
