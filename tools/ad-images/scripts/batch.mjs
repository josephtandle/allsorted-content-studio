import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './render.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sizes = { square: [1080, 1080], feed: [1080, 1350], story: [1080, 1920] };
const safeSlug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'offer';

export function makeManifest(input, outDir, skillRoot = root) {
  if (!input || !Array.isArray(input.variations) || input.variations.length < 1) throw new Error('Batch input needs at least one variation.');
  if (!sizes[input.ratio]) throw new Error('ratio must be square, feed, or story.');
  if (!['single', 'carousel'].includes(input.format)) throw new Error('format must be single or carousel.');
  const [width, height] = sizes[input.ratio];
  const layoutFor = (template) => {
    if (input.ratio === 'story') return [0.08, 0.14, 0.84, 0.66];
    const html = fs.readFileSync(path.join(skillRoot, 'templates', `${template}.html`), 'utf8');
    const match = html.match(/data-layout-box="([^"]+)"/);
    return match ? match[1].split(',').map(Number) : null;
  };
  return input.variations.map((item, index) => ({
    file: `outputs/${safeSlug(input.offer)}_${String(index + 1).padStart(2, '0')}_${input.format === 'carousel' ? 'carousel' : item.template}_${input.ratio}.png`,
    hook: item.hook || '', width, height, status: 'pending', template: item.template,
    fontSize: item.fontSize || 104, minFontSize: 72,
    headlineFontSize: item.headlineFontSize || item.fontSize || 104,
    bodyFontSize: item.bodyFontSize || 44,
    visibleFontSize: item.visibleFontSize || 32,
    layoutBox: layoutFor(item.template)
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const batchPath = path.resolve(process.argv[2] || '');
  if (!process.argv[2]) { console.error('Usage: node batch.mjs creatives/batch.json'); process.exit(2); }
  try {
    const input = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    const projectDir = path.dirname(batchPath);
    const outDir = path.join(projectDir, 'outputs');
    fs.mkdirSync(outDir, { recursive: true });
    const manifest = { offer: input.offer, format: input.format, ratio: input.ratio, files: makeManifest(input, outDir) };
    const [width, height] = sizes[input.ratio];
    for(const entry of manifest.files){if(fs.existsSync(path.join(projectDir,entry.file)))throw new Error(`Refusing to overwrite existing creative: ${path.join(projectDir,entry.file)}`);}
    for (let i = 0; i < input.variations.length; i++) {
      const item = input.variations[i];
      const entry = manifest.files[i];
      const data = { ...item, brand: { ...(input.brand || {}), colors: { ...(input.brand?.colors || {}), ...(item.colors || {}) } }, brandName: input.brand?.brandName };
      const rendered=await render({ templatePath: path.join(root, 'templates', `${item.template}.html`), dataPath: null, outPath: path.join(projectDir, entry.file), width, height, browser: undefined, data });
      entry.headlineFontSize=rendered.headlineFontSize;
      entry.measurements=rendered.measurements;
      entry.overflow=rendered.measurements.some(element=>element.overflow);
      entry.status = 'rendered';
    }
    fs.writeFileSync(path.join(projectDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Rendered ${manifest.files.length} creatives. Manifest: ${path.join(projectDir, 'manifest.json')}`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
