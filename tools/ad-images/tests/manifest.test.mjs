import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeManifest } from '../scripts/batch.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');

test('batch manifest uses predictable names, sizes, hooks, and statuses', () => {
  const input = { offer: 'Studio offer', format: 'carousel', ratio: 'square', variations: Array.from({ length: 5 }, (_, i) => ({ hookNumber: i + 1, template: 'hook-card', hook: `Hook ${i + 1}` })) };
  const files = makeManifest(input, 'creatives/outputs');
  assert.equal(files.length, 5);
  assert.equal(files[0].file, 'studio-offer_01_carousel_square.png');
  assert.equal(files[4].status, 'pending');
  assert.deepEqual([files[0].width, files[0].height], [1080, 1080]);
  assert.equal(files[0].hook, 'Hook 1');
});

test('batch writes named images, per-image data, and manifest into the run folders', { skip: !fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') && !process.env.PATH?.split(path.delimiter).some(dir=>['chromium','google-chrome','google-chrome-stable'].some(name=>fs.existsSync(path.join(dir,name)))) && 'No local Chromium browser available' }, () => {
  const run=fs.mkdtempSync(path.join(root,'.test-data/batch-run-'));fs.mkdirSync(path.join(run,'images'));
  const batchPath=path.join(run,'images/batch.json');fs.writeFileSync(batchPath,JSON.stringify({offer:'Yoga Offer',format:'single',ratio:'square',theme:'light',brand:{brandName:'Sample Studio',colors:{canvas:'#FFFFFF',ink:'#173B35',accent:'#E98256'}},variations:[{template:'offer-card',hook:'Start gently',body:'A welcoming first class.',cta:'View class times'}]}));
  try{const command=spawnSync(process.execPath,['tools/ad-images/scripts/batch.mjs',batchPath],{cwd:root,encoding:'utf8'});assert.equal(command.status,0,command.stderr||command.stdout);const manifest=JSON.parse(fs.readFileSync(path.join(run,'images/manifest.json'),'utf8'));assert.equal(manifest.files[0].file,'yoga-offer_01_offer-card_square.png');assert.ok(fs.existsSync(path.join(run,'images',manifest.files[0].file)));assert.ok(fs.existsSync(path.join(run,'data/yoga-offer_01_offer-card_square.json')));assert.ok(fs.existsSync(path.join(run,'images/manifest.json')));const refused=spawnSync(process.execPath,['tools/ad-images/scripts/batch.mjs',batchPath],{cwd:root,encoding:'utf8'});assert.notEqual(refused.status,0);assert.match(refused.stderr,/Use --overwrite/);const replaced=spawnSync(process.execPath,['tools/ad-images/scripts/batch.mjs',batchPath,'--overwrite'],{cwd:root,encoding:'utf8'});assert.equal(replaced.status,0,replaced.stderr||replaced.stdout);}
  finally{fs.rmSync(run,{recursive:true,force:true});}
});

test('batch manifest accepts any positive number of variants', () => {
  const input = { offer: 'Three Ideas', format: 'single', ratio: 'feed', variations: Array.from({ length: 3 }, () => ({ template: 'offer-card' })) };
  const files = makeManifest(input, 'creatives/outputs');
  assert.equal(files.length, 3);
  assert.equal(files[2].file, 'three-ideas_03_offer-card_feed.png');
  assert.deepEqual([files[0].width, files[0].height], [1080, 1350]);
});

test('batch rejects unrecognized template names before resolving template files',()=>{
  assert.throws(()=>makeManifest({offer:'Offer',format:'single',ratio:'square',variations:[{template:'../../outside'}]},'.test-data'),/unknown template/);
});
