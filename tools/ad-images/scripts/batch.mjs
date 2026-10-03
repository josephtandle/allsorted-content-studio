import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { render, contrastRatio } from './render.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptDir);
const { resolveStudioRoot } = createRequire(import.meta.url)('./studio-root.cjs');
const studioRoot = resolveStudioRoot(scriptDir, skillRoot);
const root = studioRoot ? path.join(studioRoot, 'tools/ad-images') : skillRoot;
const sizes = { square: [1080, 1080], feed: [1080, 1350], story: [1080, 1920] };
const templates = new Set(['offer-card','question-card','hook-card','proof-card','problem-solution','three-tips']);
const safeSlug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'offer';

export function makeManifest(input, outDir, skillRoot = root) {
  if (!input || !Array.isArray(input.variations) || input.variations.length < 1) throw new Error('Batch input needs at least one variation.');
  if (!sizes[input.ratio]) throw new Error('ratio must be square, feed, or story.');
  if (!['single', 'carousel'].includes(input.format)) throw new Error('format must be single or carousel.');
  for(const [index,item] of input.variations.entries())if(!templates.has(item?.template))throw new Error(`Variation ${index+1} has an unknown template. Choose one of: ${[...templates].join(', ')}.`);
  const [width, height] = sizes[input.ratio];
  const layoutFor = (template) => {
    if (input.ratio === 'story') return [0.08, 0.14, 0.84, 0.66];
    const html = fs.readFileSync(path.join(skillRoot, 'templates', `${template}.html`), 'utf8');
    const match = html.match(/data-layout-box="([^"]+)"/);
    return match ? match[1].split(',').map(Number) : null;
  };
  return input.variations.map((item, index) => ({
    file: `${safeSlug(input.offer)}_${String(index + 1).padStart(2, '0')}_${input.format === 'carousel' ? 'carousel' : item.template}_${input.ratio}.png`,
    hook: item.hook || '', width, height, status: 'pending', template: item.template,
    fontSize: item.fontSize || 104, minFontSize: 72,
    headlineFontSize: item.headlineFontSize || item.fontSize || 104,
    bodyFontSize: item.bodyFontSize || 44,
    visibleFontSize: item.visibleFontSize || 32,
    layoutBox: layoutFor(item.template)
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv=process.argv.slice(2); const overwrite=argv.includes('--overwrite'); const batchArg=argv.find(arg=>arg!=='--overwrite'); const batchPath = path.resolve(batchArg || '');
  if (!batchArg) { console.error('Usage: node batch.mjs RUN_DIR/images/batch.json [--overwrite]'); process.exit(2); }
  try {
    const input = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    const sharedBrandPath=studioRoot&&path.join(studioRoot,'brand/brand.json');const sharedBrand=sharedBrandPath&&fs.existsSync(sharedBrandPath)?JSON.parse(fs.readFileSync(sharedBrandPath,'utf8')):{};
    const projectDir = path.dirname(path.dirname(batchPath)); const imageDir=path.join(projectDir,'images'); const dataDir=path.join(projectDir,'data');
    const briefText = fs.existsSync(path.join(projectDir, 'brief.md')) ? fs.readFileSync(path.join(projectDir, 'brief.md'), 'utf8') : '';
    const briefTheme = briefText.match(/^\s*(?:visual\s+)?theme\s*:\s*(light|dark)\s*$/im)?.[1]?.toLowerCase();
    fs.mkdirSync(imageDir, { recursive: true }); fs.mkdirSync(dataDir,{recursive:true});
    const manifest = { offer: input.offer, format: input.format, ratio: input.ratio, files: makeManifest(input, imageDir) };
    const [width, height] = sizes[input.ratio];
    for(const entry of manifest.files){if(fs.existsSync(path.join(imageDir,entry.file))&&!overwrite)throw new Error(`Refusing to overwrite existing creative: ${path.join(imageDir,entry.file)}. Use --overwrite to replace it.`);}
    for (let i = 0; i < input.variations.length; i++) {
      const item = input.variations[i];
      const entry = manifest.files[i];
      const brand={...sharedBrand,...(input.brand||{}),colors:{...(sharedBrand.colors||{}),...(input.brand?.colors||{}),...(item.colors||{})}};
      const data = { ...item, theme: item.theme || input.theme || briefTheme || brand.theme || 'dark', brand, brandName: input.brand?.brandName||sharedBrand.brandName };
      const dataName=entry.file.replace(/\.png$/i,'.json'); const dataPath=path.join(dataDir,dataName); fs.writeFileSync(dataPath,`${JSON.stringify(data,null,2)}\n`);
      const rendered=await render({ templatePath: path.join(root, 'templates', `${item.template}.html`), dataPath, outPath: path.join(imageDir, entry.file), width, height, browser: undefined, data, overwrite });
      entry.headlineFontSize=rendered.headlineFontSize;
      entry.measurements=rendered.measurements;
      const colors=data.brand.colors||{};const theme=data.theme;const canvasColor=theme==='dark'?(colors.darkVariant?.canvas||colors.ink||'#173B35'):(colors.canvas||colors.background||'#F7F2E8');entry.canvasColor=canvasColor;const foregrounds=rendered.measurements.filter(m=>m.text&&m.selector!=='div.cta').map(m=>contrastRatio(m.color,canvasColor)).filter(Number.isFinite);entry.textContrastRatio=foregrounds.length?Math.min(...foregrounds):null;
      const cta=rendered.measurements.find(m=>m.selector==='div.cta');if(cta)cta.contrastRatio=contrastRatio(cta.color,cta.background);
      entry.overflow=rendered.measurements.some(element=>element.overflow);
      entry.status = 'rendered';
    }
    fs.writeFileSync(path.join(imageDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Rendered ${manifest.files.length} creatives. Manifest: ${path.join(imageDir, 'manifest.json')}`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
