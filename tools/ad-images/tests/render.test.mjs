import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser, render, pngDimensions } from '../scripts/render.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const browser = findBrowser();
const sizes = [[1080, 1080], [1080, 1350], [1080, 1920]];
const testRoot = path.join(root, '..', '..', '.test-data', 'ad-images');
fs.mkdirSync(testRoot, { recursive: true });


test('all six image templates render a separate accent button CTA in the content flow', () => {
  const templates=fs.readdirSync(path.join(root,'templates')).filter(name=>name.endsWith('.html'));
  assert.equal(templates.length,6);
  for(const filename of templates){
    const html=fs.readFileSync(path.join(root,'templates',filename),'utf8');
    assert.match(html,/<[^>]+class="cta"[^>]*>\{\{CTA\}\}<\//,filename);
    assert.match(html,/\.cta\{[^}]*background:var\(--accent\)[^}]*color:var\(--ink\)[^}]*padding:[^}]*border-radius:/,filename);
    assert.match(html,/\.canvas\{[^}]*display:flex[^}]*flex-direction:column/,filename);
  }
});

test('refuses to overwrite an existing image before starting a browser', async () => {
  const temp=fs.mkdtempSync(path.join(testRoot,'creative-no-overwrite-'));const target=path.join(temp,'existing.png');fs.writeFileSync(target,'preserve');
  await assert.rejects(render({templatePath:path.join(root,'templates/offer-card.html'),outPath:target,width:1080,height:1080,browser:null}),/Refusing to overwrite existing creative/);
  assert.equal(fs.readFileSync(target,'utf8'),'preserve');fs.rmSync(temp,{recursive:true,force:true});
});
test('renders a template at each Meta size when Chromium is available', { skip: !browser && 'SKIP: no supported Chromium browser found; renderer fallback is documented.' }, async () => {
  const temp = fs.mkdtempSync(path.join(testRoot, 'creative-render-test-'));
  for (const [width, height] of sizes) {
    const out = path.join(temp, `${width}x${height}.png`);
    const dimensions = await render({ templatePath: path.join(root, 'templates/hook-card.html'), outPath: out, width, height, browser, data: { hook: 'A clear sample hook', body: 'One useful detail.', cta: 'Learn more', brandName: 'Sample Studio' } });
    assert.deepEqual({width:dimensions.width,height:dimensions.height}, { width, height });
    assert.ok(Array.isArray(dimensions.measurements));
    assert.equal(typeof dimensions.headlineFontSize,'number');
    assert.deepEqual(pngDimensions(out), { width, height });
  }
  fs.rmSync(temp, { recursive: true, force: true });
});

test('shrinks a moderately long headline and fails a headline that still overflows at the floor', { skip: !browser && 'SKIP: no supported Chromium browser found.' }, async () => {
  const temp=fs.mkdtempSync(path.join(testRoot,'creative-fit-test-'));
  const templatePath=path.join(root,'templates/problem-solution.html');
  const rescued=await render({templatePath,outPath:path.join(temp,'rescued.png'),width:1080,height:1080,browser,data:{hook:'A thoughtful morning practice can fit into a busy week',body:'Join a welcoming class.',cta:'Learn more'}});
  assert.ok(rescued.headlineFontSize<110,'moderately long headline should shrink from its initial size');
  assert.ok(rescued.measurements.every(element=>!element.overflow));
  await assert.rejects(render({templatePath,outPath:path.join(temp,'too-long.png'),width:1080,height:1080,browser,data:{hook:Array(80).fill('morning').join(' '),body:'Body',cta:'Learn more'}}),/Headline still overflows at 72px.*12 words maximum/);
  fs.rmSync(temp,{recursive:true,force:true});
});

test('fails with one Chrome installation sentence when no browser is available', async () => {
  const temp=fs.mkdtempSync(path.join(testRoot,'creative-no-browser-'));
  await assert.rejects(render({templatePath:path.join(root,'templates/offer-card.html'),outPath:path.join(temp,'creative.png'),width:1080,height:1080,browser:null}),/Install Google Chrome to run the browser renderer\./);
  fs.rmSync(temp,{recursive:true,force:true});
});
