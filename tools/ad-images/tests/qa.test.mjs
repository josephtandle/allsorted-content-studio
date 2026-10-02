import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkManifest, policyChecklist } from '../scripts/qa.mjs';

function header(width, height) {
  const bytes = Buffer.alloc(24); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20); return bytes;
}

test('fails plainly named elements below mobile legibility floors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creative-qa-'));
  fs.mkdirSync(path.join(dir, 'outputs'));
  fs.writeFileSync(path.join(dir, 'outputs/card.png'), header(1080, 1920));
  const manifest = { ratio: 'story', files: [{ file: 'outputs/card.png', width: 1080, height: 1920, headlineFontSize: 68, bodyFontSize: 38, visibleFontSize: 28, layoutBox: [0.08, 0.20, 0.84, 0.60], measurements: [{selector:'div.cta',text:'Book now',background:'rgb(233, 130, 86)',borderWidth:'2px',overlaps:[]}] }] };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const tooSmall = checkManifest(path.join(dir, 'manifest.json')).errors.join(' ');
  assert.match(tooSmall, /headline text is too small/);
  assert.match(tooSmall, /body text is too small/);
  assert.match(tooSmall, /visible text is too small/);
  manifest.files[0] = { ...manifest.files[0], headlineFontSize: 120, bodyFontSize: 52, visibleFontSize: 48 };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  assert.deepEqual(checkManifest(path.join(dir, 'manifest.json')).errors, []);
  manifest.files[0].layoutBox = [0.08, 0.1, 0.84, 0.7];
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  assert.match(checkManifest(path.join(dir, 'manifest.json')).errors.join(' '), /safe area/);
  manifest.files[0]={...manifest.files[0],layoutBox:[0.08,0.14,0.84,0.66],headlineFontSize:120,bodyFontSize:52,visibleFontSize:48,overflow:true,measurements:[{selector:'h1',fontSize:120,overflow:true,overlaps:[1]},{selector:'p',fontSize:52,overflow:false,overlaps:[0]}]};
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const overflowErrors=checkManifest(path.join(dir,'manifest.json')).errors.join(' ');
  assert.match(overflowErrors,/manifest reports text overflow/);
  assert.match(overflowErrors,/h1 overflows/);
  assert.match(overflowErrors,/overlaps another text block/);
  manifest.files[0]={...manifest.files[0],headlineFontSize:120,bodyFontSize:52,visibleFontSize:48,layoutBox:[0.08,0.14,0.84,0.66],measurements:[{selector:'div.cta',text:'Book now',background:'rgba(0, 0, 0, 0)',borderWidth:'0px',overlaps:[1]}]};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
  const ctaErrors=checkManifest(path.join(dir,'manifest.json')).errors.join(' ');
  assert.match(ctaErrors,/CTA has no distinct button background or border/);
  assert.match(ctaErrors,/CTA overlaps another text block/);
  manifest.files[0].measurements=[];fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
  assert.match(checkManifest(path.join(dir,'manifest.json')).errors.join(' '),/CTA button is missing/);
  assert.ok(policyChecklist().some((line) => line.includes('AI info')));
  fs.rmSync(dir, { recursive: true, force: true });
});
