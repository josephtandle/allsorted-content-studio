import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCarouselSpec } from '../scripts/spec-handoff.mjs';

test('carousel handoff matches the Meta Ads agent input shape', () => {
  const spec = makeCarouselSpec({ cards: [{ image: './sample_01_carousel_square.png', headline: 'First' }, { image: './sample_02_carousel_square.png', headline: 'Next' }] });
  assert.deepEqual(Object.keys(spec), ['name', 'pageId', 'message', 'link', 'callToAction', 'optimizeOrder', 'endCard', 'cards']);
  assert.equal(spec.pageId, 'FILL_IN_META_PAGE_ID');
  assert.equal(spec.link, 'FILL_IN_LANDING_PAGE_URL');
  assert.equal(spec.cards.length, 2);
  for (const card of spec.cards) { assert.equal(typeof card.image, 'string'); assert.equal(typeof card.headline, 'string'); }
});
