import Anthropic from '@anthropic-ai/sdk';
import { FigmaDesignData } from './figma';
import { SiteData, PageData } from './scraper';

export type ProgressFn = (message: string, pct: number) => void;
export interface GenFile { name: string; content: string }

/* ── Parse <file name="...">...</file> blocks from Claude output ── */
function parseFiles(text: string): GenFile[] {
  const out: GenFile[] = [];
  // Primary: tagged format
  const re = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const content = m[2].replace(/^[\r\n]+|[\r\n]+$/g, '');
    if (content) out.push({ name: m[1].trim(), content });
  }
  if (out.length > 0) return out;

  // Fallback: fenced code blocks preceded by a filename comment
  const blocks = [...text.matchAll(/```[\w-]*\n([\s\S]*?)```/g)];
  for (const b of blocks) {
    const before = text.slice(Math.max(0, b.index! - 120), b.index!);
    const fnMatch = before.match(/[`*_]?([a-z0-9._/-]+\.[a-z]{2,5})[`*_]?\s*[:–-]?\s*$/i);
    if (fnMatch) out.push({ name: fnMatch[1], content: b[1].trim() });
  }
  return out;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Ask Claude with automatic retry + exponential backoff on rate-limit / overload errors */
async function ask(client: Anthropic, prompt: string, attempt = 0): Promise<string> {
  try {
    // 25s per-call hard timeout — protects against Vercel's 60s function limit
    const timeoutId = setTimeout(() => { throw new Error('Claude call timed out after 25s'); }, 25000);
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    clearTimeout(timeoutId);
    return msg.content[0].type === 'text' ? msg.content[0].text : '';
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    const isRateLimit =
      err instanceof Anthropic.RateLimitError ||
      (err instanceof Anthropic.APIError && (status === 429 || status === 529 || status === 503));

    if (isRateLimit && attempt < 4) {
      // Exponential backoff: 8s, 16s, 32s, 64s
      const delay = 8000 * Math.pow(2, attempt);
      console.warn(`[claude] Rate limited — retrying in ${delay / 1000}s (attempt ${attempt + 1}/4)`);
      await sleep(delay);
      return ask(client, prompt, attempt + 1);
    }
    throw err;
  }
}

/** Pause between consecutive Claude calls to stay under TPM/RPM limits */
const INTER_CALL_DELAY = 800; // ms — kept short to fit within Vercel 60s limit

/* ═══════════════════════════════════════════════════════════════════
   FIGMA → WORDPRESS THEME
═══════════════════════════════════════════════════════════════════ */

export async function generateFigmaTheme(
  projectName: string,
  figmaData: FigmaDesignData,
  onProgress: ProgressFn,
): Promise<GenFile[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const themeSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fnPrefix = themeSlug.replace(/-/g, '_');

  // Summarise design data for prompts
  const topColors = figmaData.colors.slice(0, 20);
  const colorList = topColors
    .map(c => `  ${c.name}: ${c.hex}`)
    .join('\n');
  const primaryHex = topColors[0]?.hex ?? '#1a3cff';
  const secondaryHex = topColors[1]?.hex ?? '#ff6b2b';
  const primaryFont = figmaData.textStyles[0]?.fontFamily ?? 'Inter';
  const headingFont =
    figmaData.textStyles.find(t => t.fontSize >= 28)?.fontFamily ?? primaryFont;
  const fontList = [...new Set(figmaData.textStyles.map(t => t.fontFamily))].join(', ');
  const pageNames = figmaData.pages.map(p => p.name).join(', ');
  const sectionList = figmaData.pages
    .flatMap(p => p.sections)
    .slice(0, 20)
    .join(', ');
  const componentList = figmaData.components
    .slice(0, 20)
    .map(c => c.name)
    .join(', ');
  const textStylesList = figmaData.textStyles
    .slice(0, 10)
    .map(t => `  ${t.name}: ${t.fontFamily} ${t.fontSize}px / weight ${t.fontWeight}`)
    .join('\n');

  const files: GenFile[] = [];

  /* ── Call 1: Design System (tokens.css + style.css) ── */
  onProgress('Generating design system from Figma colours & typography…', 28);
  const dsPrompt = `You are a senior WordPress theme developer. Generate a complete design system based on this Figma design.

## Figma File: "${figmaData.fileName}"
## Theme: ${projectName} (slug: ${themeSlug})

### Colours extracted from Figma:
${colorList}

### Typography extracted from Figma:
${textStylesList}
Primary body font: ${primaryFont}
Primary heading font: ${headingFont}
All fonts used: ${fontList}

### Pages / Sections: ${pageNames}
### Component names: ${componentList}

## Generate EXACTLY these two files using the output format below.

RULES:
- tokens.css: define every Figma color as a CSS custom property (--color-name: hex). Also define spacing scale, radii, shadows, and font stacks using ONLY the Figma values.
- style.css: MUST start with the WordPress theme comment block (Theme Name, Description, Version, Text Domain). Then import tokens.css. Build a COMPLETE, production-quality stylesheet. Cover: reset, body, container, header/nav with sticky behaviour, hamburger toggle, hero section, features grid, services, pricing cards, testimonials, team grid, FAQ accordion, contact form, blog grid, footer grid, responsive breakpoints, utility classes.
- Use the EXACT hex values from the Figma data above — do NOT invent colors.
- Font stack: body uses "${primaryFont}", headings use "${headingFont}".
- BEM class names. No Tailwind. No frameworks.

OUTPUT FORMAT — use exactly this XML-like tag format:
<file name="tokens.css">
/* full content */
</file>
<file name="style.css">
/* full content */
</file>`;

  const dsText = await ask(client, dsPrompt);
  files.push(...parseFiles(dsText));
  onProgress('Design system complete ✓', 45);

  const sharedPhpCtx = `Theme: "${projectName}" (slug: ${themeSlug}, text-domain: ${themeSlug})
Primary: ${primaryHex} | Secondary: ${secondaryHex} | Font: ${primaryFont}
Figma sections: ${sectionList} | Components: ${componentList}
RULES: esc_html()/esc_url()/esc_attr()/wp_kses_post() on all output. __()/${themeSlug} for strings. get_field() for ACF. No TODOs.`;

  /* ── Call 2a: Setup + Layout templates (functions, header, footer) ── */
  await sleep(INTER_CALL_DELAY);
  onProgress('Generating functions.php, header.php, footer.php…', 48);

  const tpl2aText = await ask(client, `WordPress theme developer. Generate 3 COMPLETE PHP files.
${sharedPhpCtx}

<file name="functions.php">
<?php
Complete functions.php: theme_setup() (title-tag, post-thumbnails, html5, custom-logo, nav-menus primary+footer, wide-alignment, responsive-embeds). wp_enqueue_scripts: tokens.css, style.css (dep tokens), js/main.js defer. Register CPTs: ${themeSlug}_service, ${themeSlug}_team, ${themeSlug}_testimonial (all public, has_archive, title+editor+thumbnail). Register sidebar primary-sidebar. Image sizes: hero 1600x600 crop, card-thumbnail 800x500 crop, team-avatar 400x400 crop. Excerpt 25 words. Remove generator. wp_localize_script ajaxurl+nonce.
</file>

<file name="header.php">
<?php Complete header.php: DOCTYPE html, html language_attributes(), head (charset, viewport, title-tag, wp_head()). body_class(). Sticky <header class="site-header js-header">: .container .nav__inner > .nav__logo (custom_logo fallback bloginfo name+tagline), <button class="nav__toggle js-nav-toggle" aria-expanded="false">☰</button>, <ul class="nav__links" id="nav-links"> wp_nav_menu(primary, depth 2, li_class nav__item, a_class nav__link). Open <main id="main" class="site-main">.
</file>

<file name="footer.php">
<?php Complete footer.php: </main>. <footer class="site-footer"> .container .footer__grid (footer__brand: logo+tagline+social links from get_theme_mod; footer__nav: wp_nav_menu footer; footer__services: WP_Query ${themeSlug}_service 4 items; footer__contact: get_theme_mod phone+email). .footer__bottom: copyright year + bloginfo name + privacy/terms pages. wp_footer(). </body></html>.
</file>`);

  files.push(...parseFiles(tpl2aText));
  onProgress('Layout templates done ✓', 55);

  /* ── Call 2b: Page templates ── */
  await sleep(INTER_CALL_DELAY);
  onProgress('Generating page.php, single.php, archive.php, index.php…', 57);

  const tpl2bText = await ask(client, `WordPress theme developer. Generate 4 COMPLETE PHP template files.
${sharedPhpCtx}

<file name="page.php">
<?php get_header(); the_post(); ACF have_rows('page_sections') flexible content loop. Cases: 'hero' (get_field heading/subtext/bg_image/cta_primary_label+url/cta_secondary_label+url), 'features_grid' (get_rows items: icon/title/desc), 'testimonials' (get_rows: quote/author/role/photo), 'cta_banner' (heading/desc/cta_label/cta_url), 'services_grid' (WP_Query ${themeSlug}_service 6 posts), 'team_grid' (WP_Query ${themeSlug}_team 8 posts), 'content_block' (wysiwyg). Fallback to the_content(). get_footer();
</file>

<file name="single.php">
<?php get_header(); the_post(); Full single post: featured image hero, .container article with post_class, breadcrumb (Home > Category > Title), .post__header (h1 the_title, .post__meta: author avatar+name, get_the_date, reading-time from str_word_count/200), the_content(), .post__tags get_the_tags(), related posts WP_Query same first category 3 posts exclude current using get_template_part, comments_template(); get_footer();
</file>

<file name="archive.php">
<?php get_header(); .archive-hero: the_archive_title h1, the_archive_description p. .container .blog__grid: while have_posts() { the_post(); get_template_part('template-parts/card-post'); } No posts: esc_html 'No posts found'. the_posts_pagination. get_footer();
</file>

<file name="index.php">
<?php get_header(); .blog-page-hero: h1 'Blog', bloginfo tagline. .container .blog__layout: .blog__grid (while have_posts() get_template_part) + .blog__sidebar (if is_active_sidebar primary-sidebar: dynamic_sidebar; else: WP_Query recent 5 posts list + wp_list_categories). the_posts_pagination. get_footer();
</file>`);

  files.push(...parseFiles(tpl2bText));
  onProgress('Page templates done ✓', 63);

  /* ── Call 2c: Utility templates ── */
  await sleep(INTER_CALL_DELAY);
  onProgress('Generating search.php, 404.php, card-post.php…', 65);

  const tpl2cText = await ask(client, `WordPress theme developer. Generate 3 COMPLETE PHP files.
${sharedPhpCtx}

<file name="search.php">
<?php get_header(); .search-hero: h1 sprintf Results for: get_search_query(), p found_posts count. get_search_form(). .container .blog__grid: while have_posts() get_template_part. No results: h2 Nothing found, suggestions: check spelling, try fewer keywords, browse categories. the_posts_pagination. get_footer();
</file>

<file name="404.php">
<?php get_header(); .error-page .container: 🔍 emoji, h1 Page not found, descriptive paragraph. Two .btn links: Back to Home (home_url()) and Contact Us (get_permalink(get_page_by_path('contact'))). get_search_form(). .error-suggestions h3 You might like: wp_list_pages recent 6 pages. get_footer();
</file>

<file name="template-parts/card-post.php">
<?php // Card partial — call via get_template_part('template-parts/card-post')
Full <article class="blog__card <?php echo esc_attr(implode(' ',get_post_class('',get_the_ID()))); ?>">: .blog__card-thumb a (the_post_thumbnail card-thumbnail or placeholder div), .blog__card-body (.blog__card-meta: category link esc_html + time datetime), h2 .blog__card-title > a the_title, p .blog__card-excerpt wp_trim_words(get_the_excerpt(),20), a .btn.btn--ghost Read more →. All escaping. ?>
</file>`);

  files.push(...parseFiles(tpl2cText));
  onProgress('Utility templates done ✓', 70);

  /* ── Call 3: Config & JS ── */
  await sleep(INTER_CALL_DELAY);
  onProgress('Generating ACF field groups and JavaScript…', 73);
  const cfgPrompt = `Generate three config/asset files for WordPress theme "${projectName}" (slug: ${themeSlug}).

Figma components found: ${componentList}
Figma pages/sections: ${sectionList}
Primary colour: ${primaryHex}, secondary: ${secondaryHex}

<file name="acf-fields.json">
Complete ACF v6 JSON array. Include these field groups:
1. Hero Section (location: page) — fields: eyebrow text, heading, subtext, bg_image, cta_primary_label+url, cta_secondary_label+url
2. Page Sections flexible content (location: all pages) — layouts: features_grid (eyebrow+heading+desc+items repeater with icon/title/desc), testimonials (heading+items repeater with quote/author/role/photo), cta_banner (heading+desc+cta_label+cta_url), team_grid (heading+items repeater with photo/name/role/bio), services_list (heading+items repeater), content_block (wysiwyg)
3. Service Details (location: post_type==${themeSlug}_service) — icon emoji, tagline, features repeater, starting_price, cta_label
4. Team Member (location: post_type==${themeSlug}_team) — job_role, bio, linkedin_url, twitter_url, email

All field keys must use format: field_${themeSlug}_{unique_id}
All group keys: group_${themeSlug}_{name}
Valid ACF v6 JSON format — array of group objects with key, title, fields[], location[][], active:true
</file>

<file name="js/main.js">
'use strict';
Complete vanilla JS with:
1. Mobile nav toggle (aria-expanded, click outside to close)
2. Sticky header shadow on scroll
3. FAQ accordion (click to expand/collapse, only one open at a time)
4. Smooth scroll for anchor links
5. IntersectionObserver fade-in for .features__card, .pricing__card, .testimonial__card, .team__card, .blog__card, .services__item (staggered delay)
6. Contact form submit handler (.js-contact-form) — prevent default, show loading, simulate success after 1.2s, reset form
7. Back-to-top button (.js-back-top) — show after 400px scroll
8. Reading progress bar — optional thin bar at top of page that fills as user scrolls
All wrapped in self-invoking functions, no globals, clean event listener cleanup
</file>

<file name="README.md">
# ${projectName} WordPress Theme
Generated by DayShip Studio

## Requirements
- WordPress 6.0+, PHP 8.0+, Advanced Custom Fields PRO 6.x

## Installation
1. Upload ${themeSlug}/ to /wp-content/themes/
2. Activate in Appearance > Themes
3. Import acf-fields.json via Custom Fields > Tools > Import
4. Create menus in Appearance > Menus — assign Primary, Footer
5. Set static front page in Settings > Reading

## Design System
Primary colour: ${primaryHex}
Secondary colour: ${secondaryHex}
Body font: ${primaryFont}
Heading font: ${headingFont}

## File Structure
${themeSlug}/
+-- style.css (theme header + styles)
+-- tokens.css (design tokens)
+-- functions.php
+-- header.php / footer.php
+-- page.php / single.php / archive.php / search.php / 404.php / index.php
+-- template-parts/card-post.php
+-- js/main.js
+-- acf-fields.json
+-- README.md

## Custom Post Types
- ${themeSlug}_service -> /services/
- ${themeSlug}_team -> /team/
- ${themeSlug}_testimonial (admin only)

## ACF Field Groups
Hero Section, Page Sections (flexible), Service Details, Team Member
</file>`;

  const cfgText = await ask(client, cfgPrompt);
  files.push(...parseFiles(cfgText));
  onProgress('All files generated ✓', 95);

  return files;
}

/* ═══════════════════════════════════════════════════════════════════
   URL → HTML / CSS  (one HTML file per discovered page)
═══════════════════════════════════════════════════════════════════ */

/** Summarise a page for the Claude prompt */
function summarisePage(p: PageData): string {
  const headings = p.headings.slice(0, 6).join(' | ');
  const sections = p.sections.slice(0, 4).map(s => `"${s.heading}": ${s.body.slice(0, 120)}`).join(' · ');
  return `${p.filename} — "${p.title}" — headings: ${headings || '(none)'} — sections: ${sections || p.bodyPreview.slice(0, 200)}`;
}

export async function generateUrlSite(
  projectName: string,
  siteData: SiteData,
  onProgress: ProgressFn,
): Promise<GenFile[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const colorStr = siteData.colors.slice(0, 15).join(', ');
  const fontStr  = siteData.fonts.slice(0, 4).join(', ');
  const navStr   = siteData.navLinks.map(l => `${l.text} → ${l.href}`).join(', ');
  const allPages = siteData.pages;
  const totalPages = allPages.length;

  /* Shared context injected into every HTML batch prompt */
  const sharedCtx = `
## Site Context
Root URL: ${siteData.rootUrl}
Site name: ${siteData.siteTitle}
Description: ${siteData.siteDescription}
Language: ${siteData.lang}
Colours detected: ${colorStr || '(none — choose a brand-appropriate palette)'}
Fonts detected:   ${fontStr  || '(none — use Inter for body)'}

## Full site navigation (all ${totalPages} pages):
${allPages.map(p => `  ${p.navLabel} → ${p.filename}`).join('\n')}

## Nav HTML to reuse in EVERY page (update class="active" per page):
<nav class="site-nav">
  <div class="container nav__inner">
    <a href="index.html" class="nav__logo">${siteData.siteTitle || projectName}</a>
    <button class="nav__toggle js-nav-toggle" aria-expanded="false" aria-label="Menu">☰</button>
    <ul class="nav__links" id="nav-links">
${allPages.map(p => `      <li><a href="${p.filename}">${p.navLabel}</a></li>`).join('\n')}
    </ul>
  </div>
</nav>

## Footer HTML to reuse in EVERY page:
<footer class="site-footer">
  <div class="container footer__grid">
    <div class="footer__brand"><strong>${siteData.siteTitle || projectName}</strong><p>${siteData.siteDescription.slice(0, 120)}</p></div>
    <div class="footer__links"><h4>Pages</h4><ul>${allPages.map(p => `<li><a href="${p.filename}">${p.navLabel}</a></li>`).join('')}</ul></div>
    <div class="footer__contact"><h4>Contact</h4><p>hello@${new URL(siteData.rootUrl).hostname}</p></div>
  </div>
  <div class="footer__bottom"><div class="container"><p>© ${new Date().getFullYear()} ${siteData.siteTitle || projectName}. All rights reserved.</p></div></div>
</footer>

RULES FOR ALL PAGES:
- Link <link rel="stylesheet" href="tokens.css"> then <link rel="stylesheet" href="styles.css"> then <script src="main.js" defer> in every <head>
- lang="${siteData.lang}", meta charset, viewport, unique meta description per page
- Mark current page nav link: class="active" aria-current="page"
- Semantic HTML5: <header><nav>, <main>, <section>, <article>, <footer>
- BEM class names. NO Lorem ipsum — write relevant copy matching the site's industry/tone
- Use emoji for icons (no icon libraries)`.trim();

  const files: GenFile[] = [];

  /* ── Generate HTML pages in batches of 6 (fewer calls = faster on Vercel) ── */
  const BATCH = 6;
  const batches: PageData[][] = [];
  for (let i = 0; i < allPages.length; i += BATCH) batches.push(allPages.slice(i, i + BATCH));

  const htmlProgressStart = 25;
  const htmlProgressEnd   = 75;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const pct = Math.round(htmlProgressStart + ((bi / batches.length) * (htmlProgressEnd - htmlProgressStart)));
    onProgress(`Generating HTML pages ${bi * BATCH + 1}–${Math.min((bi + 1) * BATCH, totalPages)} of ${totalPages}…`, pct);

    const fileInstructions = batch.map(p => {
      const src = summarisePage(p);
      return `<file name="${p.filename}">
Complete, full HTML page for: ${p.navLabel}
Source page data: ${src}
Generate a full page with appropriate sections for this page type. Include the shared nav (mark ${p.filename} as active) and shared footer.
</file>`;
    }).join('\n\n');

    const batchPrompt = `You are a senior frontend developer rebuilding a website as clean semantic HTML.

${sharedCtx}

## Generate these ${batch.length} HTML page(s) — each as a COMPLETE standalone HTML document:

${fileInstructions}

Each file must be a complete <!DOCTYPE html> document with <head> (charset, viewport, title, meta description, css/js links) and full <body> content relevant to that specific page's data. NEVER truncate — output the full page.`;

    const batchText = await ask(client, batchPrompt);
    files.push(...parseFiles(batchText));
    if (bi < batches.length - 1) await sleep(INTER_CALL_DELAY);
  }

  onProgress('All HTML pages generated ✓', 77);

  /* ── CSS + JS (single call) ── */
  await sleep(INTER_CALL_DELAY);
  onProgress('Generating design system and JavaScript…', 80);

  const cssPrompt = `Generate the complete CSS, design tokens, and JavaScript for a ${totalPages}-page static site rebuild of "${siteData.siteTitle}".

Site: ${siteData.siteTitle} — ${siteData.siteDescription}
Pages: ${allPages.map(p => p.navLabel).join(', ')}
Detected colours: ${colorStr || '(none — choose a modern professional palette)'}
Detected fonts: ${fontStr || '(none — use Inter)'}
Key headings from site: ${allPages.flatMap(p => p.headings.slice(0, 2)).slice(0, 10).join(' | ')}

<file name="tokens.css">
Complete CSS custom properties. Define:
- --color-primary, --color-secondary, --color-accent using DETECTED colours (or a brand-appropriate palette)
- Neutral scale (50–900), semantic colours (success/warning/danger/info)
- Font stacks (body: "${fontStr || 'Inter'}", heading variant)
- Type scale (xs through 5xl with clamp() for fluid headings)
- Font weights, spacing scale (space-1 through space-24), border radii, box-shadows, transitions, z-index scale, container widths
</file>

<file name="styles.css">
COMPLETE production stylesheet covering ALL elements used across ${totalPages} pages:
Reset, body, .container, sticky header + backdrop-blur, .site-nav, .nav__links, .nav__toggle (hamburger), .nav__logo, .active nav state with underline indicator, hero section (gradient bg, grid, clamp headings), .hero__eyebrow pill, .hero__actions, .hero__stats, .features__grid + .features__card (hover lift), .services__grid + .services__item, .pricing__grid (3-col) + .pricing__card + .pricing__card--featured, .testimonials__grid + .testimonial__card, .team__grid + .team__card (circular avatar), .blog__grid + .blog__card, .faq__item + .faq__question + .faq__answer, contact section (.contact__grid, .contact__form, .form__group, .form__input, .form__label, .form__submit), .cta-banner, .site-footer + .footer__grid + .footer__brand + .footer__links + .footer__contact + .footer__bottom, .btn + .btn--primary + .btn--outline + .btn--ghost, utility classes, scroll progress bar (.scroll-progress), back-to-top (.js-back-top), IntersectionObserver fade-in animations (.fade-in, .fade-in--visible), responsive breakpoints at 1024px / 768px / 640px / 480px.
BEM throughout. No frameworks.
</file>

<file name="main.js">
'use strict';
Complete vanilla JS covering all ${totalPages} pages:
1. Mobile nav toggle — aria-expanded, outside click close, Escape key close
2. Sticky header box-shadow after 10px scroll
3. Scroll progress bar (.scroll-progress width%)
4. FAQ accordion — one open at a time, + / × toggle, smooth height
5. Smooth scroll for a[href^="#"]
6. IntersectionObserver fade-in with stagger for: .features__card, .pricing__card, .testimonial__card, .team__card, .blog__card, .services__item, .team__card
7. Contact form (.js-contact-form) — preventDefault, loading state, success banner after 1.2s, reset
8. Back-to-top button — show after 400px, smooth scroll
9. Active nav link highlight based on current filename
No globals. IIFE per feature. No external libraries.
</file>`;

  const cssText = await ask(client, cssPrompt);
  files.push(...parseFiles(cssText));
  onProgress('All files generated ✓', 95);

  return files;
}
