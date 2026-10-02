const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const express = require('express');
const sharp = require('sharp');
const { PRESETS, slug, appendManifest, makeSpec } = require('./lib/core');
const { renderSlides } = require('./lib/slide-renderer');

try { require('dotenv').config(); } catch {}
const app = express();
app.use(express.json({ limit: '20mb' }));
const root = path.resolve(process.env.CAROUSEL_WORKSPACE || path.join(__dirname, 'workspace'));
const assets = path.join(__dirname, 'public');
app.use(express.static(assets));
app.use('/workspace', express.static(root));
app.get('/api/config', (_req, res) => { let brand = null; try { const shared = path.join(process.env.CONTENT_STUDIO_DIR || path.join(__dirname, '..', '..'), 'brand', 'brand.json'); brand = require('node:fs').existsSync(shared) ? JSON.parse(require('node:fs').readFileSync(shared, 'utf8')) : null; } catch {} res.json({ brand, presets: PRESETS, pexelsEnabled: Boolean(process.env.PEXELS_API_KEY) && process.env.ENABLE_PEXELS === 'true', aiCaptionEnabled: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) && process.env.ENABLE_AI_CAPTIONS === 'true' }); });

app.post('/api/generate', (req, res) => {
  const { offer = 'your first yoga class', audience = 'people starting a gentle morning yoga practice', pain = 'mornings feel rushed', transformation = 'begin with a 10-minute stretch', cta = 'Try a class', slideCount = 3, framework = 'AIDA' } = req.body || {};
  const n = Math.min(10, Math.max(2, Number(slideCount) || 3));
  const lowerInitial = (value) => String(value).replace(/^([A-Z])/, (letter) => letter.toLowerCase());
  const seeds = [
    { stepLabel: 'WHAT GETS IN THE WAY', heading: lowerInitial(pain), body: `For ${lowerInitial(audience)}, this is where it feels hard to begin.` },
    { stepLabel: 'A BETTER WAY', heading: `${offer} starts with one small step`, body: 'Pick one change you can repeat tomorrow.' },
    { stepLabel: 'THE OUTCOME', heading: `${transformation}`, body: `Try one gentle class before changing your whole routine.` },
  ];
  while (seeds.length < n) seeds.splice(seeds.length - 1, 0, { stepLabel: `STEP ${seeds.length}`, heading: `Practice ${transformation}`, body: 'Set aside ten minutes and begin.' });
  res.json({ slides: seeds.slice(0, n).map((s, i) => ({ type: i === 0 ? 'cover' : i === n - 1 ? 'cta' : 'content', ...s })) });
});

app.post('/api/export', async (req, res) => {
  try {
    const { title = 'carousel', offer = title, slides = [], presetId = 'square', palette = 'brand', headlineHook = '', pageId, link, message } = req.body || {};
    const preset = PRESETS[presetId];
    if (!preset) return res.status(400).json({ error: 'Choose a supported image size.' });
    if (!Array.isArray(slides) || slides.length < 2 || slides.length > 10) return res.status(400).json({ error: 'Add between 2 and 10 slides before exporting.' });
    const id = crypto.randomUUID();
    const dir = path.join(root, 'creatives');
    await fs.mkdir(dir, { recursive: true });
    const offerSlug = slug(offer, 'offer');
    const files = [];
    let selectedPalette=palette;
    if(palette==='brand'){try{const sharedPath=path.join(process.env.CONTENT_STUDIO_DIR||path.join(__dirname,'..','..'),'brand','brand.json');const sharedBrand=JSON.parse(await fs.readFile(sharedPath,'utf8'));selectedPalette={...sharedBrand.colors,fonts:sharedBrand.fonts};}catch{selectedPalette=undefined;}}
    const renderedSlides = await renderSlides(slides, preset, selectedPalette);
    for (let i = 0; i < slides.length; i++) {
      const filename = `${offerSlug}_${String(i + 1).padStart(2, '0')}_carousel_${preset.ratio}.png`;
      if ((await fs.readdir(dir)).includes(filename)) throw new Error(`Refusing to overwrite existing creative: ${filename}`);
      const imageData = slides[i].imageData;
      let image = sharp(renderedSlides[i].png);
      if (typeof imageData === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(imageData)) {
        const source = Buffer.from(imageData.slice(imageData.indexOf(',') + 1), 'base64');
        image = sharp(source).resize(preset.width, preset.height, { fit: 'cover' }).composite([{ input: renderedSlides[i].png }]);
      }
      await image.png().toFile(path.join(dir, filename));
      files.push({ file: filename, hook: slides[i].heading || headlineHook || `Slide ${i + 1}`, width: preset.width, height: preset.height, status: 'rendered', template: selectedPalette||palette, fontSize: renderedSlides[i].headlineFontSize, minFontSize: 72, layoutBox: [64 / preset.width, 0.19, 820 / preset.width, 0.64], measurements: renderedSlides[i].elements, overflow: renderedSlides[i].overflow });
    }
    await appendManifest(dir, files, { offer, ratio: preset.ratio });
    const spec = makeSpec({ title, pageId, link, message, slides: files.map((file, i) => ({ ...file, heading: slides[i].heading })) });
    const specFile = `${offerSlug}_carousel-spec.json`;
    await fs.writeFile(path.join(dir, specFile), `${JSON.stringify(spec, null, 2)}\n`);
    const projectDir = path.join(root, 'projects');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, `${offerSlug}.json`), `${JSON.stringify({ offer, preset: presetId, palette: selectedPalette||palette, slides: slides.map(({ imageData, ...slide }) => slide), exportedFiles: files.map((file) => file.file), specFile }, null, 2)}\n`);
    res.status(201).json({ carouselId: id, files: files.map((f) => f.file), pngs: files.map((f) => f.file), folder: 'workspace/creatives', specFile, specPath: `workspace/creatives/${specFile}`, width: preset.width, height: preset.height, command: `creatives carousel ./workspace/creatives/${specFile} --dry-run` });
  } catch (error) { res.status(500).json({ error: error.message || 'Export failed.' }); }
});

app.get('/api/settings', async (_req, res) => { const dir = path.join(root, 'creatives'); await fs.mkdir(dir, { recursive: true }); const names = await fs.readdir(dir); let brand = null; try { const shared = path.join(process.env.CONTENT_STUDIO_DIR || path.join(__dirname, '..', '..'), 'brand', 'brand.json'); brand = require('node:fs').existsSync(shared) ? JSON.parse(require('node:fs').readFileSync(shared, 'utf8')) : null; } catch {} res.json({ brand, pexelsEnabled: Boolean(process.env.PEXELS_API_KEY) && process.env.ENABLE_PEXELS === 'true', aiCaptionEnabled: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) && process.env.ENABLE_AI_CAPTIONS === 'true', workspace: path.relative(__dirname, root) || '.' }); });
app.get('/api/images', async (req, res) => {
  if (!process.env.PEXELS_API_KEY || process.env.ENABLE_PEXELS !== 'true') return res.json({ photos: [], message: 'Stock photo search is off. Add a PEXELS_API_KEY and set ENABLE_PEXELS=true in your local environment to enable it.' });
  const q = String(req.query.q || '').slice(0, 180);
  if (!q) return res.status(400).json({ error: 'Add a search phrase.' });
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=8&orientation=square`, { headers: { Authorization: process.env.PEXELS_API_KEY }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Pexels returned ${response.status}`);
    const data = await response.json();
    res.json({ photos: (data.photos || []).map((p) => ({ url: p.src.large, thumb: p.src.medium, alt: p.alt || '', photographer: p.photographer })) });
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.post('/api/templates', async (req, res) => {
  try { const { name, data } = req.body || {}; const match = String(data || '').match(/^data:image\/(png|jpeg|webp);base64,([\s\S]+)$/); if (!match) return res.status(400).json({ error: 'Upload a PNG, JPEG, or WebP image.' }); const ext = match[1] === 'jpeg' ? 'jpg' : match[1]; const id = `template-${crypto.randomUUID()}.${ext}`; const dir = path.join(root, 'templates'); await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, id), Buffer.from(match[2], 'base64')); res.status(201).json({ id, name: String(name || id).slice(0, 80), url: `/workspace/templates/${id}` }); } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/templates', async (_req, res) => { const dir = path.join(root, 'templates'); await fs.mkdir(dir, { recursive: true }); const names = await fs.readdir(dir); res.json({ templates: names.filter((n) => /\.(png|jpe?g|webp)$/i.test(n)).map((filename) => ({ id: filename, filename, url: `/workspace/templates/${filename}` })) }); });
app.post('/api/caption', async (req, res) => {
  const { slides = [], offer = '', audience = '', cta = '' } = req.body || {};
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL || process.env.ENABLE_AI_CAPTIONS !== 'true') return res.json({ configured: false, prompt: `Write a clear, honest Meta ad caption for this carousel.\nOffer: ${offer}\nAudience: ${audience}\nSlides: ${slides.map((s) => s.heading).join(' | ')}\nCall to action: ${cta}\nUse a natural voice. Do not invent claims.` });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || '', max_tokens: 500, messages: [{ role: 'user', content: `Write a truthful, concise Meta carousel caption. Do not invent claims. Offer: ${offer}. Audience: ${audience}. Slides: ${slides.map((s) => s.heading).join(' | ')}. CTA: ${cta}. Return only the caption.` }] }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
    const data = await response.json(); res.json({ configured: true, caption: data.content?.[0]?.text || '' });
  } catch (error) { res.status(502).json({ error: error.message }); }
});

const port = Number(process.env.PORT || 4173);
app.listen(port, '127.0.0.1', () => console.log(`Carousel Builder is ready at http://localhost:${port}`));
