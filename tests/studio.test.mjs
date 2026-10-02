import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const node=process.execPath;
function exec(args,env={}){return spawnSync(node,args,{cwd:root,encoding:'utf8',env:{...process.env,CONTENT_STUDIO_DIR:root,...env}})}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.name!=='.git'&&e.name!=='node_modules').flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p]})}
test('all eight agents inherit the host model and include no model pin',()=>{const files=fs.readdirSync(path.join(root,'agents')).filter(f=>f.endsWith('.md'));assert.equal(files.length,8);for(const f of files){const text=fs.readFileSync(path.join(root,'agents',f),'utf8');assert.match(text,/^model: inherit$/m,f);for(const token of ['fa'+'ble','op'+'us','son'+'net','hai'+'ku','g'+'pt'])assert.doesNotMatch(text,new RegExp(token,'i'),f)}});
test('the five packaged tools include the pinned Video Editor module',()=>{for(const [name,file] of [['HookLab','tools/hooklab/SKILL.md'],['Ad Images','tools/ad-images/scripts/render.mjs'],['Carousel Builder','tools/carousel-builder/lib/slide-renderer.js'],['HeyGen Ad Videos','tools/heygen-ad-videos/scripts/heygen.mjs'],['Video Editor','tools/video-editor/index.js']])assert.ok(fs.existsSync(path.join(root,file)),`${name} is packaged`);const pin=fs.readFileSync(path.join(root,'tools/video-editor/PINNED'),'utf8');assert.match(pin,/version: 1\.2\.1/);assert.match(pin,/commit: 8ce7d20/);assert.match(pin,/date: 2026-10-02/)});
test('self-test names all five tools and treats missing ffmpeg as optional',()=>{const result=exec(['scripts/studio.mjs','self-test'],{FFMPEG_BIN:'/definitely-not-installed'});assert.equal(result.status,0,result.stderr||result.stdout);for(const name of ['Node: working','Chrome/Edge: working','HookLab: working','Ad Images: working','Carousel Builder: working','HeyGen Ad Videos: working','Video Editor: ffmpeg not installed (optional)'])assert.ok(result.stdout.includes(name),`${name} appears in self-test`)});
test('brand source generates the shared JSON consumed by tools',()=>{const md=`# Brand Brain\n\n- Brand name: Sunrise Yoga Studio\n- Offer: Beginner yoga classes\n- Specific audience: Adults trying yoga\n- Current situation: Curious and cautious\n- Problem in their words: Unsure how to start\n- Desired supported outcome: Learn gentle movements\n- Approved facts and proof: none\n- Testimonials with permission: none\n- Claims to avoid: guaranteed health outcomes\n- Voice: Calm and practical\n- Background color: #FFF8EC\n- Ink color: #25443B\n- Accent color: #E98256\n- Display font: Georgia\n- Body font: Arial\n- Image direction: Morning light\n- CTA wording: See the class schedule\n`;fs.writeFileSync(path.join(root,'brand/BRAND-BRAIN.md'),md);try{const result=exec(['scripts/studio.mjs','brand-json']);assert.equal(result.status,0,result.stderr||result.stdout);const brand=JSON.parse(fs.readFileSync(path.join(root,'brand/brand.json'),'utf8'));assert.equal(brand.brandName,'Sunrise Yoga Studio');assert.equal(brand.colors.accent,'#E98256');assert.equal(brand.cta,'See the class schedule');}finally{fs.rmSync(path.join(root,'brand/BRAND-BRAIN.md'),{force:true});fs.rmSync(path.join(root,'brand/brand.json'),{force:true});}});

test('use-example-brand creates matching example files and refuses to overwrite them',()=>{
  const md=path.join(root,'brand/BRAND-BRAIN.md'),json=path.join(root,'brand/brand.json');
  fs.rmSync(md,{force:true});fs.rmSync(json,{force:true});
  try {
    const made=exec(['scripts/studio.mjs','use-example-brand']);assert.equal(made.status,0,made.stderr||made.stdout);
    const brand=JSON.parse(fs.readFileSync(json,'utf8'));const example=JSON.parse(fs.readFileSync(path.join(root,'brand/brand.example.json'),'utf8'));
    for(const key of ['brandName','offer','priceOrTerms','destination','audience','problem','supportedOutcome','voice','colors','fonts','imageDirection','primaryAction','cta'])assert.deepEqual(brand[key],example[key],`${key} is consistent`);
    const before=fs.readFileSync(md,'utf8');const refused=exec(['scripts/studio.mjs','use-example-brand']);assert.notEqual(refused.status,0);assert.equal(fs.readFileSync(md,'utf8'),before);
  } finally {fs.rmSync(md,{force:true});fs.rmSync(json,{force:true});}
});
test('source files contain no private paths, prohibited identity markers, or em dashes',()=>{for(const f of walk(root)){if(f.startsWith(path.join(root,'.test-data'))||/\.png$|\.jpg$|\.webp$/.test(f)||f.includes(`${path.sep}node_modules${path.sep}`))continue;const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/\/(?:Users|home)\//,path.relative(root,f));const blocked=[['my','os'].join(''),['new','york','1'].join(''),['master','minds','hq'].join(''),['joe','@'].join(''),['illy','@'].join(''),['@','gmail'].join('')];for(const token of blocked)assert.equal(s.toLowerCase().includes(token.toLowerCase()),false,path.relative(root,f));const blockedPatterns=[new RegExp(['act','_','\\d+'].join(''),'i'),new RegExp(['E','AA','[A-Za-z0-9_-]{8,}'].join(''),'i'),new RegExp(['sk-','[A-Za-z0-9_-]{12,}'].join(''),'i')];for(const pattern of blockedPatterns)assert.equal(pattern.test(s),false,path.relative(root,f));assert.equal(s.includes(String.fromCharCode(0x2014)),false,path.relative(root,f));if(f.endsWith('.md'))assert.equal(s.includes(String.fromCharCode(0x2014)),false,path.relative(root,f));const owner=['joseph','tandle'].join('');if(new RegExp(owner,'i').test(s)){const allowed=[`https://github.com/${owner}/allsorted-content-studio`,`https://github.com/${owner}/hooklab`];assert.equal(allowed.some(url=>s.includes(url)),true,path.relative(root,f));}}});
test('install twice preserves source and installed file bytes, brand, runs, and learnings', () => {
  const home = path.join(root, '.test-data', 'install-home');
  fs.mkdirSync(home, { recursive: true });
  const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  try {
    const pre = path.join(home, '.claude/skills/hooklab/personal');
    fs.mkdirSync(pre, { recursive: true });
    fs.writeFileSync(path.join(pre, 'private-notes.md'), 'preserve this personal file');
    const args = ['install.sh', '--home', home];
    const first = spawnSync('sh', args, { cwd: root, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const dest = path.join(home, 'allsorted-content-studio');
    fs.mkdirSync(path.join(dest, 'brand'), { recursive: true });
    fs.mkdirSync(path.join(dest, 'runs', 'keep'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'brand/BRAND-BRAIN.md'), 'keep-brand');
    fs.writeFileSync(path.join(dest, 'brand/brand.json'), '{}');
    fs.writeFileSync(path.join(dest, 'runs/keep/brief.md'), 'keep-run');
    fs.writeFileSync(path.join(dest, 'learnings/LEARNINGS.md'), 'keep-learning');
    const target = path.join(dest, 'README.md');
    const installedAgent = path.join(home, '.claude/agents/content-director.md');
    const installedSkill = path.join(home, '.claude/skills/content-studio/SKILL.md');
    const preserved = ['brand/BRAND-BRAIN.md', 'brand/brand.json', 'runs/keep/brief.md', 'learnings/LEARNINGS.md'].map((p) => path.join(dest, p));
    const preservedHashes = preserved.map(hash);
    const installedHashes = [target, installedAgent, installedSkill].map(hash);
    assert.equal(fs.readFileSync(installedAgent, 'utf8').includes('CONTENT_STUDIO_DIR'), false);
    assert.ok(fs.existsSync(installedSkill));
    assert.ok(fs.existsSync(path.join(home, '.claude/skills/ad-images/SKILL.md')));
    assert.ok(fs.existsSync(path.join(home, '.claude/skills/heygen-ad-videos/SKILL.md')));
    assert.ok(fs.existsSync(path.join(dest,'learnings/LEARNINGS.md')),'installer creates learnings from the shipped template');
    assert.equal(fs.readFileSync(path.join(pre, 'private-notes.md'), 'utf8'), 'preserve this personal file');
    assert.ok(fs.existsSync(path.join(pre, 'my-brand-voice.md')));
    const second = spawnSync('sh', args, { cwd: root, encoding: 'utf8' });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.deepEqual([target, installedAgent, installedSkill].map(hash), installedHashes);
    assert.deepEqual(preserved.map(hash), preservedHashes);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
test('mixed offline run renders one button image and a three-slide button carousel, then creates complete handoff',async()=>{
  const run=path.join(root,'examples/proof-run');
  fs.rmSync(path.join(run,'images'),{recursive:true,force:true});fs.rmSync(path.join(run,'carousel'),{recursive:true,force:true});fs.writeFileSync(path.join(run,'run-log.jsonl'),'');
  fs.mkdirSync(path.join(run,'images'),{recursive:true});fs.mkdirSync(path.join(run,'carousel'),{recursive:true});fs.mkdirSync(path.join(run,'copy'),{recursive:true});
  fs.writeFileSync(path.join(run,'brief.md'),'# Sunrise Yoga Studio\n\nFictional example. Beginner-friendly yoga classes.\n');
  const setup=exec(['scripts/studio.mjs','use-example-brand']);assert.equal(setup.status,0,setup.stderr||setup.stdout);
  const brand=JSON.parse(fs.readFileSync(path.join(root,'brand/brand.example.json'),'utf8'));
  const imageData={brandName:brand.brandName,brand,hook:'A calmer start begins here',headline:'A calmer start begins here',body:'Try one gentle beginner class this week.',cta:brand.cta};
  const dataPath=path.join(run,'image-data.json');fs.writeFileSync(dataPath,JSON.stringify(imageData));
  const imagePath=path.join(run,'images/sunrise-yoga_01_offer-card_square.png');
  const render=exec(['tools/ad-images/scripts/render.mjs','--template','tools/ad-images/templates/offer-card.html','--data',dataPath,'--out',imagePath,'--width','1080','--height','1080','--manifest',path.join(run,'images/manifest.json')]);assert.equal(render.status,0,render.stderr||render.stdout);
  const carouselData={title:'sunrise-yoga',preset:'square',palette:{background:brand.colors.background,ink:brand.colors.ink,accent:brand.colors.accent,fonts:brand.fonts},slides:[
    {eyebrow:'WHAT GETS IN THE WAY',headline:'Starting yoga can feel unfamiliar',body:'A first class is easier when you know what to expect.'},
    {eyebrow:'A BETTER WAY',headline:'Begin with a gentle class',body:'A small-group introduction gives you room to learn.'},
    {eyebrow:'THE OUTCOME',headline:'Learn a few new movements',body:'Try one welcoming class at your own pace.',cta:brand.cta}
  ]};fs.writeFileSync(path.join(run,'carousel-data.json'),JSON.stringify(carouselData));
  fs.writeFileSync(path.join(run,'copy/ads.json'),JSON.stringify({primaryText:'A welcoming first yoga class, at your own pace.',headline:'A calmer start',callToAction:'Book a class'}));
  const car=exec(['scripts/carousel.mjs',run]);assert.equal(car.status,0,car.stderr||car.stdout);
  const carouselManifest=JSON.parse(fs.readFileSync(path.join(run,'carousel/manifest.json'),'utf8'));assert.deepEqual(carouselManifest.files.map(file=>file.showCta),[false,false,true]);assert.deepEqual(carouselManifest.files.map(file=>Boolean(file.measurements.cta)),[false,false,true]);
  const check=exec(['scripts/studio.mjs','check',run]);assert.equal(check.status,0,check.stderr||check.stdout);
  const sheet=exec(['scripts/studio.mjs','contact-sheet',run]);assert.equal(sheet.status,0,sheet.stderr||sheet.stdout);
  const handoff=exec(['scripts/studio.mjs','handoff',run]);assert.equal(handoff.status,0,handoff.stderr||handoff.stdout);
  const spec=JSON.parse(fs.readFileSync(path.join(run,'handoff.json'),'utf8'));
  assert.equal(spec.status,'PAUSED');assert.equal(spec.ads.length,2);assert.equal(spec.ads[0].type,'carousel');assert.equal(spec.ads[1].type,'image');
  assert.equal(spec.ads[0].cards.length,3);assert.equal(spec.ads[0].child_attachments.length,3);assert.equal(spec.ads[0].callToAction,'BOOK_NOW');assert.equal(spec.ads[1].callToAction,'BOOK_NOW');
  assert.equal(spec.ads[0].status,'PAUSED');assert.equal(spec.ads[1].status,'PAUSED');assert.equal(spec.ads[0].message,'FILL_IN_PRIMARY_MESSAGE');assert.equal(spec.ads[1].message,'FILL_IN_PRIMARY_MESSAGE');assert.ok(spec.ads[1].image.endsWith('sunrise-yoga_01_offer-card_square.png'));
  assert.equal(spec.blanks.pageId,'FILL_IN_META_PAGE_ID');assert.equal(spec.blanks.message,'FILL_IN_PRIMARY_MESSAGE');assert.equal(spec.blanks.link,'FILL_IN_LANDING_PAGE_URL');
  for(const f of ['contact-sheet.png','handoff.json','run-log.jsonl'])assert.ok(fs.existsSync(path.join(run,f)),`${f} exists`);
  const log=fs.readFileSync(path.join(run,'run-log.jsonl'),'utf8').trim().split('\n').at(-1);assert.equal(JSON.parse(log).qaErrors,0);assert.ok(fs.statSync(path.join(run,'contact-sheet.png')).size>10000);
  fs.rmSync(path.join(root,'brand/BRAND-BRAIN.md'),{force:true});fs.rmSync(path.join(root,'brand/brand.json'),{force:true});
  try{fs.rmSync(path.join(root,'.test-data'),{recursive:true});}catch{}
});
