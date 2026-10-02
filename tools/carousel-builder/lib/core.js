const fs = require('node:fs/promises');
const path = require('node:path');

const PRESETS = {
  square: { id: 'square', label: 'Square · 1:1', width: 1080, height: 1080, ratio: 'square' },
  portrait: { id: 'portrait', label: 'Portrait · 4:5', width: 1080, height: 1350, ratio: '4x5' },
  story: { id: 'story', label: 'Story · 9:16', width: 1080, height: 1920, ratio: '9x16', safeTop: 0.14, safeBottom: 0.20 },
};

function slug(value, fallback = 'creative') {
  return String(value || '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '-').slice(0, 48) || fallback;
}

async function appendManifest(directory, entries, metadata = {}) {
  await fs.mkdir(directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; manifest = { offer: metadata.offer || 'student-offer', format: 'carousel', ratio: metadata.ratio || 'square', files: [] }; }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Creative manifest must be a JSON object.');
  if (!Array.isArray(manifest.files)) manifest.files = [];
  if (metadata.offer) manifest.offer = metadata.offer;
  if (metadata.ratio) manifest.ratio = metadata.ratio;
  manifest.files.push(...entries);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function makeSpec({ title = 'Offer carousel', pageId = 'FILL_IN_META_PAGE_ID', message = 'FILL_IN_PRIMARY_MESSAGE', link = 'FILL_IN_LANDING_PAGE_URL', slides = [] } = {}) {
  if (slides.length < 2 || slides.length > 10) throw new Error('A carousel needs 2 to 10 cards.');
  return {
    name: `${title} carousel`,
    pageId,
    message,
    link,
    callToAction: 'LEARN_MORE',
    optimizeOrder: false,
    endCard: true,
    cards: slides.map((slide, index) => ({ image: `./${slide.file}`, headline: slide.heading || `Slide ${index + 1}` })),
  };
}

module.exports = { PRESETS, slug, appendManifest, makeSpec };
