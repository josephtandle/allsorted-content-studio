import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngDimensions } from './render.mjs';

export function checkManifest(manifestPath) {
  const resolved = path.resolve(manifestPath);
  const base = path.dirname(resolved);
  const manifest = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const errors = [];
  for (const item of manifest.files || []) {
    const imagePath = path.resolve(base, item.file);
    if (!fs.existsSync(imagePath)) { errors.push(`${item.file}: file is missing`); continue; }
    const stat = fs.statSync(imagePath);
    if (stat.size > 30 * 1024 * 1024) errors.push(`${item.file}: exceeds 30 MB`);
    let dimensions;
    try { dimensions = pngDimensions(imagePath); } catch (error) { errors.push(`${item.file}: ${error.message}`); continue; }
    if (dimensions.width !== item.width || dimensions.height !== item.height) errors.push(`${item.file}: expected ${item.width}x${item.height}, got ${dimensions.width}x${dimensions.height}`);
    if (item.overflow === true) errors.push(`${item.file}: manifest reports text overflow`);
    for (const measurement of item.measurements || []) {
      if (measurement.overflow === true) errors.push(`${item.file}: ${measurement.selector || 'text element'} overflows its box or canvas`);
      if (Array.isArray(measurement.overlaps) && measurement.overlaps.length) errors.push(`${item.file}: ${measurement.selector || 'text element'} overlaps another text block`);
    }
    const measured = item.measurements || [];
    const cta = measured.find((element) => /(^|\.)cta($|\.)/.test(element.selector || '')) || measured.find((element) => /cta/i.test(element.text || ''));
    if (!cta || !cta.text) errors.push(`${item.file}: CTA button is missing`);
    else {
      const bg = String(cta.background || '').toLowerCase();
      const hasBackground = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
      const hasBorder = Number.parseFloat(cta.borderWidth || cta.border || 0) > 0;
      if (!hasBackground && !hasBorder) errors.push(`${item.file}: CTA has no distinct button background or border`);
      if (Array.isArray(cta.overlaps) && cta.overlaps.length) errors.push(`${item.file}: CTA overlaps another text block`);
      const ratio = Number(cta.contrastRatio);
      if (!Number.isFinite(ratio) || ratio < 4.5) errors.push(`${item.file}: CTA text contrast is below 4.5:1 (${Number.isFinite(ratio) ? ratio.toFixed(2) : 'unmeasured'}:1)`);
    }
    const canvas = measuredCanvas(item);
    const textContrast=Number(item.textContrastRatio);
    if (!canvas || !Number.isFinite(textContrast) || textContrast < 4.5) errors.push(`${item.file}: text/background contrast is below 4.5:1 (${Number.isFinite(textContrast)?textContrast.toFixed(2):'unmeasured'}:1)`);
    const scale = dimensions.width / 1080;
    const ratio=item.ratio||manifest.ratio;
    const story = ratio === 'story';
    const headlineFloor = (story ? 120 : 72) * scale;
    const bodyFloor = (story ? 52 : 40) * scale;
    const visibleFloor = (story ? 48 : 32) * scale;
    const bySelector = (re) => (item.measurements || []).filter(element => re.test(element.selector || '')).map(element => Number(element.fontSize)).filter(Number.isFinite);
    const headlineSize = Number(item.headlineFontSize ?? item.fontSize ?? 0);
    const bodySize = Number(item.bodyFontSize ?? item.minFontSize ?? 0);
    const visibleSize = Number(item.visibleFontSize ?? item.minFontSize ?? 0);
    if (headlineSize < headlineFloor) errors.push(`${item.file}: headline text is too small (${headlineSize}px; minimum ${headlineFloor}px)`);
    const measuredBody = bySelector(/^(p|.*\.proof|.*\.tip|.*\.foot)$/);
    const measuredVisible = bySelector(/.*\.(cta|brand)$/);
    if ((measuredBody.length ? Math.min(...measuredBody) : bodySize) < bodyFloor) errors.push(`${item.file}: body text is too small (${measuredBody.length ? Math.min(...measuredBody) : bodySize}px; minimum ${bodyFloor}px)`);
    if ((measuredVisible.length ? Math.min(...measuredVisible) : visibleSize) < visibleFloor) errors.push(`${item.file}: visible text is too small (${measuredVisible.length ? Math.min(...measuredVisible) : visibleSize}px; minimum ${visibleFloor}px)`);
    if (story) {
      const box = item.layoutBox;
      if (!Array.isArray(box) || box.length !== 4) errors.push(`${item.file}: missing template layout box for 9:16 safe-zone check`);
      else {
        const [x, y, w, h] = box.map(Number);
        if (y < 0.14 || y + h > 0.80 || x < 0 || w <= 0 || x + w > 1) errors.push(`${item.file}: text layout box extends outside the 9:16 safe area (top 14%, bottom 20%)`);
      }
    }
  }
  return { errors, count: (manifest.files || []).length };
}

function measuredCanvas(item) { return item.canvasColor || item.measurements?.find(element => /canvas|body/i.test(element.selector || ''))?.background; }

export function policyChecklist() {
  return [
    'Policy checklist: review personal-attribute wording, unsupported guarantees or deadlines, and possible special ad categories (housing, employment, credit, or social issues).',
    'Generative AI may cause Meta to show an “AI info” label. Keep provenance metadata; do not strip it.',
    'Confirm permission for logos, photos, testimonials, and proof. This checklist does not guarantee ad approval.'
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) { console.error('Usage: node qa.mjs creatives/manifest.json'); process.exit(2); }
  try {
    const result = checkManifest(process.argv[2]);
    for (const line of policyChecklist()) console.log(line);
    if (result.errors.length) { console.error(`QA found ${result.errors.length} issue(s):\n- ${result.errors.join('\n- ')}`); process.exit(1); }
    console.log(`QA passed for ${result.count} creative(s). Open and review each image before use.`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
