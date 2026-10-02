import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { resolveStudioRoot } = createRequire(import.meta.url)('./studio-root.cjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const studio = resolveStudioRoot(here, here) || path.dirname(here);
const engine = path.join(studio, 'tools/carousel-builder/bin/carousel.js');
const safeSlug = value => String(value || 'creative').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '-').slice(0, 48) || 'creative';
const run = path.resolve(process.argv[2] || '');
if (!run || !fs.existsSync(path.join(run, 'brief.md'))) throw new Error('Usage: node scripts/carousel.mjs RUN_DIR (run must contain brief.md)');
const input = JSON.parse(fs.readFileSync(path.join(run, 'carousel-data.json'), 'utf8'));
if (!input.cta) {
  try {
    const copy = JSON.parse(fs.readFileSync(path.join(run, 'copy/ads.json'), 'utf8'));
    const carouselCopy = (copy.ads || []).find(ad => [ad.creative, ad.file].includes('carousel/carousel-spec.json'));
    input.cta = carouselCopy?.cta_type;
    input.message = carouselCopy?.primary_text;
  } catch {}
}
const slides = input.slides;
if (!Array.isArray(slides) || slides.length < 2 || slides.length > 10) throw new Error('carousel-data.json needs 2 to 10 slides');
if (slides.some((slide, index) => slide?.layout === '10-cta-comment-keyword' && index !== slides.length - 1 && slide.showCta !== true)) throw new Error('The engine CTA closing layout belongs on the last slide. Set showCta: true to opt into an earlier CTA.');
const brand = JSON.parse(fs.readFileSync(path.join(studio, 'brand/brand.json'), 'utf8'));
const themeText = fs.readFileSync(path.join(run, 'brief.md'), 'utf8').match(/^\s*(?:visual\s+)?theme\s*:\s*(light|dark)\s*$/im)?.[1]?.toLowerCase();
const theme = input.theme || themeText || brand.theme || 'dark';
const dark = theme === 'dark';
const colors = brand.colors || {};
const canvas = dark ? (colors.darkVariant?.canvas || colors.ink) : (colors.canvas || colors.background);
const text = dark ? (colors.darkVariant?.ink || colors.canvas || colors.background) : (colors.ink || '#173B35');
const engineBrand = {
  name: brand.brandName || '', byline: '',
  colors: { bg: canvas, bgDeep: canvas, bgAlt: canvas, text, accent: (dark ? colors.darkVariant?.accent : null) || colors.accent || '#E47C52', accentSoft: colors.accent || '#E47C52', highlight: colors.accent || '#E47C52' },
  fonts: { display: { family: brand.fonts?.display || 'Georgia' }, body: { family: brand.fonts?.body || 'Arial' } },
  chrome: { showByline: false, showCounter: true, showProgress: true, showCue: false, showCorners: false },
};
const layout = input.layout || '01-editorial-statement';
const deck = { title: input.title || 'Carousel', size: 'square', caption: input.message || '', slides: slides.map((slide, index) => {
  if (slide.layout) return { ...slide };
  const headline = slide.headline || slide.heading || slide.title || '';
  if (index === slides.length - 1) return { layout: '10-cta-comment-keyword', lead: slide.eyebrow || 'Take the next step', keyword: String(slide.keyword || headline).trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase(), promise: slide.body || headline, byline: '' };
  return { layout, headline, body: slide.body || '' };
}) };
const dataDir = path.join(run, '.carousel'); fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'brand.json'), `${JSON.stringify(engineBrand, null, 2)}\n`);
const deckFile = path.join(dataDir, 'studio-deck.json'); fs.writeFileSync(deckFile, `${JSON.stringify(deck, null, 2)}\n`);
const output = path.join(run, 'carousel'); fs.mkdirSync(output, { recursive: true });
const size = ['story', '9x16'].includes(input.preset) ? 'story' : (['feed', '4x5'].includes(input.preset) ? 'portrait' : 'square');
const env = { ...process.env, CONTENT_STUDIO_DIR: studio, CAROUSEL_HOME: dataDir, CAROUSEL_RENDER_CONCURRENCY: process.env.CAROUSEL_RENDER_CONCURRENCY || '1' };
const render = spawnSync(process.execPath, [engine, 'render', deckFile, '--size', size, '--data', dataDir, '--json'], { cwd: studio, env, encoding: 'utf8' });
if (render.status !== 0) throw new Error((render.stderr || render.stdout).trim());
let result; try { result = JSON.parse(render.stdout); } catch { throw new Error(`Carousel engine returned invalid JSON: ${render.stdout}`); }
if (result.status !== 'ok' || result.metadata?.qa?.ok === false) throw new Error(`Carousel render/QA failed: ${JSON.stringify(result.metadata || result)}`);
const engineExportDir = result.metadata?.exportDir;
const files = (result.metadata?.files || []).map((file, i) => {
  const source = typeof file === 'string' ? file : file.file || file.path;
  return { source: path.resolve(source), name: `${safeSlug(input.title)}_${String(i + 1).padStart(2, '0')}_carousel_${size === 'square' ? 'square' : size === 'story' ? 'story' : 'feed'}.png`, slide: slides[i] };
});
if (files.length !== slides.length) throw new Error(`Carousel engine rendered ${files.length} of ${slides.length} slides`);
const manifest = { offer: input.title || 'Carousel', format: 'carousel', ratio: size, files: [] };
for (const [index, file] of files.entries()) {
  const target = path.join(output, file.name);
  if (fs.existsSync(target) && !process.argv.includes('--overwrite')) throw new Error(`Refusing to overwrite existing creative: ${target}. Use --overwrite to replace it.`);
  if (file.source !== target) fs.copyFileSync(file.source, target);
  manifest.files.push({ file: file.name, hook: file.slide.headline || file.slide.heading || file.slide.title || file.slide.keyword || '', width: 1080, height: size === 'square' ? 1080 : size === 'story' ? 1920 : 1350, status: 'rendered', showCta: index === files.length - 1, overflow: !(result.metadata?.qa?.ok ?? true), measurements: { cta: index === files.length - 1 ? { background: engineBrand.colors.accent, border: '0px' } : undefined } });
}
fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const exportMeta = spawnSync(process.execPath, [engine, 'export-meta', result.metadata?.id, '--cta', input.cta || 'LEARN_MORE', '--data', dataDir, '--json'], { cwd: studio, env, encoding: 'utf8' });
if (exportMeta.status !== 0) throw new Error(`Engine export-meta failed: ${(exportMeta.stderr || exportMeta.stdout).trim()}`);
let handoff; try { handoff = JSON.parse(exportMeta.stdout); } catch { throw new Error('Engine export-meta returned invalid JSON'); }
const metaSpec = handoff.metadata?.spec || handoff.spec || handoff;
if (Array.isArray(metaSpec.cards)) metaSpec.cards = metaSpec.cards.map((card, index) => ({ ...card, image: files[index]?.name || card.image }));
fs.writeFileSync(path.join(output, 'carousel-spec.json'), `${JSON.stringify(metaSpec, null, 2)}\n`);
if (engineExportDir) {
  for (const file of fs.readdirSync(engineExportDir).filter(name => name === 'carousel.pdf')) {
    fs.copyFileSync(path.join(engineExportDir, file), path.join(output, file));
  }
}
console.log(`Rendered ${files.length} carousel slides via engine v1.2.0 in ${output}`);
