import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate, submitAndTrack } from '../scripts/heygen.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('estimate reports cap and render refuses without explicit typed confirmation', async () => {
  const p = estimate('word '.repeat(500), '1080p', 1);
  assert.equal(p.overCap, true);
  await assert.rejects(submitAndTrack({ script: 'word '.repeat(500), avatar: 'a', voice: 'v', confirmation: '', spendCapUsd: 1 }), /above the \$1.00 cap/);
});
