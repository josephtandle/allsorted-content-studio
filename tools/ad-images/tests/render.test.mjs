import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findBrowser, render, pngDimensions, makeHtml } from '../scripts/render.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url);
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

test('explicit light and dark themes consistently apply brand canvas and ink roles',()=>{
  const template=fs.readFileSync(path.join(root,'templates/offer-card.html'),'utf8');
  const brand={colors:{canvas:'#FFF8EC',ink:'#25443B',accent:'#E98256',darkVariant:{canvas:'#25443B',ink:'#FFF8EC',accent:'#E98256'}}};
  const light=makeHtml(template,{brand,theme:'light'},1080,1080),dark=makeHtml(template,{brand,theme:'dark'},1080,1080);
  assert.match(light,/body\{background:#FFF8EC!important;color:#25443B!important\}/);
  assert.match(dark,/body\{background:#25443B!important;color:#FFF8EC!important\}/);
});

test('all six image templates and carousel share the brand default and run theme canvases', async (t) => {
  if (!browser) return t.skip('Chrome or Edge is required for pixel theme integration');
  const sharp = require(path.join(root, '../carousel-builder/node_modules/sharp'));
  const { PRESETS } = require(path.join(root, '../carousel-builder/lib/core.js'));
  const { renderSlides } = require(path.join(root, '../carousel-builder/lib/slide-renderer.js'));
  const files=fs.readdirSync(path.join(root,'templates')).filter(name=>name.endsWith('.html'));
  const brand={theme:'dark',brandName:'Theme Test',colors:{canvas:'#FFF8EC',ink:'#25443B',accent:'#E98256',darkVariant:{canvas:'#25443B',ink:'#FFF8EC',accent:'#E98256'}},fonts:{display:'Georgia',body:'Arial'}};
  const pixel=async input=>[...await sharp(input).extract({left:40,top:40,width:1,height:1}).removeAlpha().raw().toBuffer()];
  const carouselSlides=[{headline:'A shared canvas',body:'Theme role pixel check.'},{headline:'Across each format',body:'One visual family.',cta:'Continue'}];
  for(const [theme,expected] of [['dark','#25443B'],['light','#FFF8EC']]){
    const samples=[];
    for(const filename of files){
      const out=path.join(testRoot,'theme-family',theme,filename.replace('.html','.png'));
      const rendered=await render({templatePath:path.join(root,'templates',filename),data:{brand,theme:theme==='dark'?undefined:theme,brandName:brand.brandName,hook:'A shared canvas',body:'Theme role pixel check.',proof:'One role across every format.',tips:['First idea','Second idea','Third idea'],cta:'Continue'},outPath:out,width:1080,height:1080,browser,overwrite:true});
      assert.ok(rendered.measurements.length,`${filename} rendered`);
      samples.push(await pixel(out));
    }
    const palette=theme==='dark'?{background:brand.colors.darkVariant.canvas,ink:brand.colors.darkVariant.ink,accent:brand.colors.darkVariant.accent,buttonInk:brand.colors.darkVariant.ink,fonts:brand.fonts}:{background:brand.colors.canvas,ink:brand.colors.ink,accent:brand.colors.accent,buttonInk:brand.colors.ink,fonts:brand.fonts};
    const slides=await renderSlides(carouselSlides,PRESETS.square,palette);
    for(const slide of slides)samples.push(await pixel(slide.png));
    const hex=expected.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16));
    for(const sample of samples)assert.deepEqual(sample,hex,`${theme} canvas sample`);
  }
});

test('legacy image headline remains an alias for the on-image hook', () => {
  const template=fs.readFileSync(path.join(root,'templates/offer-card.html'),'utf8');
  assert.match(makeHtml(template,{headline:'Legacy image headline'},1080,1080),/<h1>Legacy image headline<\/h1>/);
});

test('refuses to overwrite an existing image before starting a browser', async () => {
  const temp=fs.mkdtempSync(path.join(testRoot,'creative-no-overwrite-'));const target=path.join(temp,'existing.png');fs.writeFileSync(target,'preserve');
  await assert.rejects(render({templatePath:path.join(root,'templates/offer-card.html'),outPath:target,width:1080,height:1080,browser:null}),/Refusing to overwrite existing creative/);
  assert.equal(fs.readFileSync(target,'utf8'),'preserve');fs.rmSync(temp,{recursive:true,force:true});
});
test('CLI resolves brand colors from a spaced installed root and standalone skill marker, and supports explicit overwrite', { skip: !browser && 'SKIP: no supported Chromium browser found.' }, async () => {
  const home=path.join(root,'..','..','.test-data','home dir'), dest=path.join(home,'All Sorted Studio');
  const install=path.join(root,'..','..','scripts','install-files.mjs');
  const source=path.join(root,'..','..');
  fs.rmSync(home,{recursive:true,force:true});fs.mkdirSync(home,{recursive:true});
  try {
    const copied=spawnSync(process.execPath,[install,source,dest,home],{cwd:source,encoding:'utf8'});
    assert.equal(copied.status,0,copied.stderr||copied.stdout);
    const installedDeps=path.join(dest,'tools/carousel-builder/node_modules');
    if(!fs.existsSync(installedDeps))fs.symlinkSync(path.join(source,'tools/carousel-builder/node_modules'),installedDeps,'dir');
    fs.mkdirSync(path.join(dest,'brand'),{recursive:true});
    fs.writeFileSync(path.join(dest,'brand/brand.json'),JSON.stringify({brandName:'Test brand',colors:{canvas:'#12AB34',ink:'#173B35',accent:'#E47C52'}}));
    const standalone=path.join(home,'.claude/skills/ad-images');
    assert.equal(fs.readFileSync(path.join(standalone,'studio-root'),'utf8').trim(),dest);
    assert.ok(fs.existsSync(path.join(dest,'brand/brand.json')));
    assert.equal(require(path.join(standalone,'scripts/studio-root.cjs')).resolveStudioRoot(path.join(standalone,'scripts'),standalone),dest);
    const data=path.join(home,'render-data.json'), template=path.join(standalone,'templates/offer-card.html');
    fs.writeFileSync(data,JSON.stringify({theme:'light',headline:'A clear headline',hook:'A clear headline',body:'One useful detail',cta:'Learn more'}));
    const outRoot=path.join(home,'root-render.png'),outSkill=path.join(home,'skill-render.png');
    const cleanEnv={...process.env};delete cleanEnv.CONTENT_STUDIO_DIR;
    const run=(cwd,out,extra=[])=>spawnSync(process.execPath,[cwd==='skill'?path.join(standalone,'scripts/render.mjs'):path.join(dest,'tools/ad-images/scripts/render.mjs'),'--template',template,'--data',data,'--out',out,'--width','1080','--height','1080',...extra],{cwd:cwd==='skill'?standalone:dest,encoding:'utf8',env:cleanEnv});
    const fromRoot=run('root',outRoot);assert.equal(fromRoot.status,0,fromRoot.stderr||fromRoot.stdout);
    const fromSkill=run('skill',outSkill);assert.equal(fromSkill.status,0,fromSkill.stderr||fromSkill.stdout);assert.doesNotMatch(fromSkill.stdout,/Brand file not found/);
    const sharp=require(require.resolve('sharp',{paths:[path.join(source,'tools/carousel-builder')]}));
    for(const image of [outRoot,outSkill]){const {data:pixel,info}=await sharp(image).raw().toBuffer({resolveWithObject:true});const channels=info.channels,at=(25*info.width+25)*channels;assert.deepEqual([...pixel.subarray(at,at+channels)].slice(0,3),[0x12,0xAB,0x34],`${path.basename(image)} background uses the shared brand canvas`);}
    const preserved=fs.readFileSync(outRoot);const refused=run('root',outRoot);assert.notEqual(refused.status,0);assert.match(refused.stderr,/Use --overwrite to replace it/);
    assert.deepEqual(fs.readFileSync(outRoot),preserved,'refusal preserves the existing output');
    const replaced=run('root',outRoot,['--overwrite']);assert.equal(replaced.status,0,replaced.stderr||replaced.stdout);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
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
  await assert.rejects(render({templatePath,outPath:path.join(temp,'too-long.png'),width:1080,height:1080,browser,data:{hook:Array(80).fill('morning').join(' '),body:'Body',cta:'Learn more'}}),/hook\/headline to 12 words maximum/);
  await assert.rejects(render({templatePath,outPath:path.join(temp,'body-too-long.png'),width:1080,height:1080,browser,data:{hook:'A short hook',body:Array(160).fill('supporting').join(' '),cta:'Learn more'}}),/Shorten body to 24 words maximum/);
  await assert.rejects(render({templatePath,outPath:path.join(temp,'cta-too-long.png'),width:1080,height:1080,browser,data:{hook:'A short hook',body:'A short body',cta:Array(100).fill('action').join('')}}),/Shorten CTA to 36 characters maximum/);
  fs.rmSync(temp,{recursive:true,force:true});
});

test('fails with one Chrome installation sentence when no browser is available', async () => {
  const temp=fs.mkdtempSync(path.join(testRoot,'creative-no-browser-'));
  await assert.rejects(render({templatePath:path.join(root,'templates/offer-card.html'),outPath:path.join(temp,'creative.png'),width:1080,height:1080,browser:null}),/Install Google Chrome to run the browser renderer\./);
  fs.rmSync(temp,{recursive:true,force:true});
});
