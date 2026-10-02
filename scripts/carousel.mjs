import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { resolveStudioRoot } = createRequire(import.meta.url)('./studio-root.cjs');
const studio = resolveStudioRoot(path.dirname(fileURLToPath(import.meta.url)), path.dirname(fileURLToPath(import.meta.url))) || path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(studio, 'tools/carousel-builder/server.js'));
const { PRESETS, makeSpec } = require(path.join(studio, 'tools/carousel-builder/lib/core.js'));
const { renderSlides } = require(path.join(studio, 'tools/carousel-builder/lib/slide-renderer.js'));
const run = path.resolve(process.argv[2] || '');
const overwrite = process.argv.includes('--overwrite');
const safeSlug = (value) => String(value || 'creative').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '-').slice(0, 48) || 'creative';
if (!run || !fs.existsSync(path.join(run, 'brief.md'))) throw new Error('Usage: node scripts/carousel.mjs RUN_DIR (run must contain brief.md)');
const data = JSON.parse(fs.readFileSync(path.join(run, 'carousel-data.json'), 'utf8'));
let sharedBrand = null; try { sharedBrand = JSON.parse(fs.readFileSync(path.join(studio, 'brand/brand.json'), 'utf8')); } catch {}
if (!sharedBrand) {
  for (const filename of ['image-data.json', 'image-data-2.json']) {
    try { sharedBrand = JSON.parse(fs.readFileSync(path.join(run, filename), 'utf8')).brand || null; } catch {}
    if (sharedBrand) break;
  }
}
const colors = sharedBrand?.colors || {};
const light = { background: colors.canvas || colors.background, ink: colors.ink, accent: colors.accent, buttonInk: colors.ink };
const dark = { background: colors.darkVariant?.canvas || colors.ink, ink: colors.darkVariant?.ink || colors.canvas || colors.background, accent: colors.darkVariant?.accent || colors.accent, buttonInk: colors.darkVariant?.ink || colors.canvas || colors.background };
const briefText = fs.existsSync(path.join(run, 'brief.md')) ? fs.readFileSync(path.join(run, 'brief.md'), 'utf8') : '';
const briefTheme = briefText.match(/^\s*(?:visual\s+)?theme\s*:\s*(light|dark)\s*$/im)?.[1]?.toLowerCase();
const theme = data.theme || briefTheme || sharedBrand?.theme || 'dark';
const themed = theme === 'light' ? light : dark;
const palette = { ...themed, fonts: sharedBrand?.fonts };
const slides = data.slides;
if (!Array.isArray(slides) || slides.length < 2 || slides.length > 10) throw new Error('carousel-data.json needs 2 to 10 slides');
const out = path.join(run, 'carousel'); fs.mkdirSync(out, { recursive: true });
const renderSlidesData = slides.map((slide, index) => ({ ...slide, showCta: slide.showCta === true || (slide.showCta !== false && index === slides.length - 1) }));
const rendered = await renderSlides(renderSlidesData, PRESETS[data.preset || 'square'], palette);
const slug = safeSlug(data.title);
const ratio = PRESETS[data.preset || 'square'].ratio;
const names = slides.map((_, i) => `${slug}_${String(i + 1).padStart(2, '0')}_carousel_${ratio}.png`);
for (let i = 0; i < rendered.length; i++) { const target=path.join(out,names[i]);if(fs.existsSync(target)&&!overwrite)throw new Error(`Refusing to overwrite existing creative: ${target}. Use --overwrite to replace it.`);fs.writeFileSync(target,rendered[i].png); }
const spec = makeSpec({ title: data.title || 'Creative', pageId: 'FILL_IN_META_PAGE_ID', message: 'FILL_IN_PRIMARY_MESSAGE', link: 'FILL_IN_LANDING_PAGE_URL', slides: slides.map((s, i) => ({file:names[i], heading:s.headline||s.heading})) });
fs.writeFileSync(path.join(out, 'carousel-spec.json'), `${JSON.stringify(spec,null,2)}\n`);
const preset = PRESETS[data.preset || 'square'];
const manifest = { offer: data.title || 'creative', ratio, files: slides.map((s, i) => ({file:names[i], hook:s.headline||s.heading, width:preset.width, height:preset.height, status:'rendered', showCta:renderSlidesData[i].showCta, overflow:Object.values(rendered[i].overflow||{}).some(Boolean), fontSize:rendered[i].headlineFontSize, minFontSize:72, measurements:rendered[i].elements})) };
fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest,null,2)}\n`);
console.log(`Rendered ${slides.length} carousel slides in ${out}`);
