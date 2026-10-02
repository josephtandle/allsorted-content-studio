import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function makeCarouselSpec({ name = 'Offer carousel v1', pageId = 'FILL_IN_META_PAGE_ID', message = 'Primary text shown above the carousel.', link = 'FILL_IN_LANDING_PAGE_URL', cards = [] } = {}) {
  if (cards.length < 2 || cards.length > 10) throw new Error('A carousel needs 2 to 10 cards.');
  return { name, pageId, message, link, callToAction: 'LEARN_MORE', optimizeOrder: false, endCard: true,
    cards: cards.map((card, i) => ({ image: card.image || `./creative_${String(i + 1).padStart(2, '0')}_carousel_square.png`, headline: card.headline || `Slide ${i + 1}` })) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2] || 'creatives/carousel-spec.json';
  const count = Number(process.argv[3] || 3);
  try {
    const spec = makeCarouselSpec({ cards: Array.from({ length: count }, (_, i) => ({ image: `./creative_${String(i + 1).padStart(2, '0')}_carousel_square.png` })) });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(spec, null, 2)}\n`);
    console.log(`Wrote ${output}. Fill in pageId and link, then run creatives carousel <spec> --dry-run.`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
