import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest } from '../scripts/heygen.mjs';

test('adds relative video record without duplicate entries or damaging existing format', () => {
  const original = { offer: 'sample', format: 'video', ratio: 'portrait', files: [] };
  const record = { file: 'video/sample_script-01_9x16_v1.mp4', hook: 'A hook', width: 1080, height: 1920, status: 'rendered', format: 'mp4' };
  const next = buildManifest(original, record);
  assert.equal(next.files.length, 1); assert.equal(buildManifest(next, record).files.length, 1);
  assert.equal(original.files.length, 0); assert.equal(next.files[0].file.startsWith('/'), false);
});
