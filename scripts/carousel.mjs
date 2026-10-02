import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const studio = process.env.CONTENT_STUDIO_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(studio, 'tools/carousel-builder/server.js'));
const { PRESETS, makeSpec } = require(path.join(studio, 'tools/carousel-builder/lib/core.js'));
const { renderSlides } = require(path.join(studio, 'tools/carousel-builder/lib/slide-renderer.js'));
const run = path.resolve(process.argv[2] || '');
const safeSlug = (value) => String(value || 'creative').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '-').slice(0, 48) || 'creative';
if (!run || !fs.existsSync(path.join(run, 'brief.md'))) throw new Error('Usage: node scripts/carousel.mjs RUN_DIR (run must contain brief.md)');
const data = JSON.parse(fs.readFileSync(path.join(run, 'carousel-data.json'), 'utf8'));
let sharedBrand = null; try { sharedBrand = JSON.parse(fs.readFileSync(path.join(studio, 'brand/brand.json'), 'utf8')); } catch {}
const palette = data.palette || (sharedBrand?.colors ? { background: sharedBrand.colors.background, accent: sharedBrand.colors.accent, ink: sharedBrand.colors.ink, fonts: sharedBrand.fonts } : undefined);
const slides = data.slides;
if (!Array.isArray(slides) || slides.length < 2 || slides.length > 10) throw new Error('carousel-data.json needs 2 to 10 slides');
const out = path.join(run, 'carousel'); fs.mkdirSync(out, { recursive: true });
const rendered = await renderSlides(slides, PRESETS[data.preset || 'square'], palette);
const slug = safeSlug(data.title);
const ratio = PRESETS[data.preset || 'square'].ratio;
const names = slides.map((_, i) => `${slug}_${String(i + 1).padStart(2, '0')}_carousel_${ratio}.png`);
for (let i = 0; i < rendered.length; i++) { const target=path.join(out,names[i]);if(fs.existsSync(target))throw new Error(`Refusing to overwrite existing creative: ${target}`);fs.writeFileSync(target,rendered[i].png); }
const spec = makeSpec({ title: data.title || 'Creative', pageId: 'FILL_IN_META_PAGE_ID', message: 'FILL_IN_PRIMARY_MESSAGE', link: 'FILL_IN_LANDING_PAGE_URL', slides: slides.map((s, i) => ({file:names[i], heading:s.headline||s.heading})) });
fs.writeFileSync(path.join(out, 'carousel-spec.json'), `${JSON.stringify(spec,null,2)}\n`);
const preset = PRESETS[data.preset || 'square'];
const manifest = { offer: data.title || 'creative', ratio, files: slides.map((s, i) => ({file:names[i], hook:s.headline||s.heading, width:preset.width, height:preset.height, status:'rendered', overflow:Object.values(rendered[i].overflow||{}).some(Boolean), fontSize:rendered[i].headlineFontSize, minFontSize:44, measurements:rendered[i].elements})) };
fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest,null,2)}\n`);
console.log(`Rendered ${slides.length} carousel slides in ${out}`);
