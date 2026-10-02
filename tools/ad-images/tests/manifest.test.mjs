import test from 'node:test';
import assert from 'node:assert/strict';
import { makeManifest } from '../scripts/batch.mjs';

test('batch manifest uses predictable names, sizes, hooks, and statuses', () => {
  const input = { offer: 'Studio offer', format: 'carousel', ratio: 'square', variations: Array.from({ length: 5 }, (_, i) => ({ hookNumber: i + 1, template: 'hook-card', hook: `Hook ${i + 1}` })) };
  const files = makeManifest(input, 'creatives/outputs');
  assert.equal(files.length, 5);
  assert.equal(files[0].file, 'outputs/studio-offer_01_carousel_square.png');
  assert.equal(files[4].status, 'pending');
  assert.deepEqual([files[0].width, files[0].height], [1080, 1080]);
  assert.equal(files[0].hook, 'Hook 1');
});

test('batch manifest accepts any positive number of variants', () => {
  const input = { offer: 'Three Ideas', format: 'single', ratio: 'feed', variations: Array.from({ length: 3 }, () => ({ template: 'offer-card' })) };
  const files = makeManifest(input, 'creatives/outputs');
  assert.equal(files.length, 3);
  assert.equal(files[2].file, 'outputs/three-ideas_03_offer-card_feed.png');
  assert.deepEqual([files[0].width, files[0].height], [1080, 1350]);
});
