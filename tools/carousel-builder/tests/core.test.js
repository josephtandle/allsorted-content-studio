const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const fsSync = require('node:fs');
function browserPaths() {
  const home=process.env.HOME||require('node:os').homedir();const pathVar=process.env.PATH||'';const dirs=pathVar.split(require('node:path').delimiter).filter(Boolean);
  const chrome=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`]:process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA||''}/Google/Chrome/Application/chrome.exe`]:dirs.flatMap(d=>[`${d}/google-chrome`,`${d}/google-chrome-stable`]);
  const edge=process.platform==='darwin'?['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:process.platform==='win32'?['C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',`${process.env.LOCALAPPDATA||''}/Microsoft/Edge/Application/msedge.exe`]:dirs.map(d=>`${d}/microsoft-edge`);
  return [...chrome,...edge].filter((candidate)=>candidate&&fsSync.existsSync(candidate));
}
function browserPath() { return browserPaths()[0]||null; }

async function launchBrowser() { for(const executablePath of browserPaths()){try{return await chromium.launch({executablePath,headless:true});}catch{}}throw new Error('Install Google Chrome to run the browser renderer.'); }
const { PRESETS, appendManifest, makeSpec } = require('../lib/core');
const { renderSlides, slideMarkup } = require('../lib/slide-renderer');

const testRoot = path.join(__dirname, '..', '..', '..', '.test-data', 'carousel-builder');

test('Meta presets use the required pixel dimensions and safe zones', () => {
  assert.deepEqual([PRESETS.square.width, PRESETS.square.height], [1080, 1080]);
  assert.deepEqual([PRESETS.portrait.width, PRESETS.portrait.height], [1080, 1350]);
  assert.deepEqual([PRESETS.story.width, PRESETS.story.height], [1080, 1920]);
  assert.equal(PRESETS.story.safeTop, 0.14);
  assert.equal(PRESETS.story.safeBottom, 0.20);
});


test('carousel CSS uses brand colors and fonts without an off-brand gradient', () => {
  const brand={background:'#FFF8EC',ink:'#25443B',accent:'#E98256',fonts:{display:'Georgia',body:'Arial'}};
  const html=slideMarkup({eyebrow:'FIRST',headline:'Start gently',body:'One short supporting idea.',cta:'Book now'},0,3,PRESETS.square,brand);
  assert.match(html,/linear-gradient\(140deg,#FFF8EC,#FFF8EC\)/);
  assert.match(html,/color:#25443B/);
  assert.match(html,/background:#E98256/);
  assert.match(html,/font:700 120px\/1\.04 Georgia,serif/);
  assert.match(html,/font:400 44px\/1\.25 Arial,sans-serif/);
});
test('dark theme maps canvas, text, and button to the shared brand roles; blank headlines stay blank',()=>{
  const html=slideMarkup({headline:'',body:'No headline on this card.',cta:'Learn more'},1,3,PRESETS.square,{background:'#25443B',ink:'#FFF8EC',accent:'#E98256',buttonInk:'#25443B'});
  assert.match(html,/linear-gradient\(140deg,#25443B,#25443B\)/);assert.match(html,/color:#FFF8EC/);assert.match(html,/#cta\{[^}]*background:#E98256;color:#25443B/);assert.match(html,/id="headline"><\/div>/);assert.doesNotMatch(html,/Slide 2/);
});
test('CTA appears on the last slide by default and earlier slides can opt in', () => {
  const first = slideMarkup({ headline: 'First', cta: 'Book now' }, 0, 3, PRESETS.square, 'ocean');
  const optedIn = slideMarkup({ headline: 'Second', cta: 'Book now', showCta: true }, 1, 3, PRESETS.square, 'ocean');
  const last = slideMarkup({ headline: 'Last', cta: 'Book now' }, 2, 3, PRESETS.square, 'ocean');
  assert.doesNotMatch(first, /id="cta"/);
  assert.match(optedIn, /id="cta">Book now/);
  assert.match(last, /id="cta">Book now/);
});
test('rendered slides meet the phone legibility floors and stay within measured safe boxes', async () => {
  const slides = [
    { stepLabel: 'A BETTER WAY', heading: 'Small steps make mornings easier', body: 'Choose one part of your morning to make easier.', cta: 'Book a class' },
    { stepLabel: 'ONE PRACTICE', heading: 'Make room for a slower start', body: 'Pick one change you can repeat tomorrow.', cta: 'Book a class', showCta: true },
    { stepLabel: 'THE OUTCOME', heading: 'Begin with one gentle class', body: 'Try one class before changing your whole routine.', cta: 'Book a class' },
  ];
  const browser = await launchBrowser();
  let rendered;
  try {
    rendered = await renderSlides(slides, PRESETS.square, 'ocean', browser);
    const [rescued] = await renderSlides([{ stepLabel: 'A CLEAR IDEA', heading: 'Small practical steps can make busy mornings feel calmer and easier to manage', body: 'Choose one habit to repeat tomorrow.', cta: 'Book a class' }], PRESETS.square, 'ocean', browser);
    assert.ok(rescued.headlineFontSize < 120);
    assert.equal((120 - rescued.headlineFontSize) % 4, 0);
    assert.equal(rescued.overflow.headline, false);
    await assert.rejects(
      renderSlides([{ heading: 'Small '.repeat(1000), body: 'Choose one step.' }], PRESETS.square, 'ocean', browser),
      /Headline does not fit inside the safe margins\. Please shorten the headline\./,
    );
  } finally { await browser.close(); }
  for (const result of rendered) {
    assert.ok(result.headlineFontSize >= 72 && result.headlineFontSize <= 120);
    assert.ok(result.elements.headline.fontSize >= 72);
    assert.ok(result.elements.body.fontSize >= 44);
    assert.ok(result.elements.content);
    assert.ok(Math.abs(result.elements.contentGroup.centerY - 510) <= 1);
    assert.equal(Boolean(result.elements.cta), result === rendered[1] || result === rendered[2]);
    if (result.elements.cta) assert.ok(result.elements.cta.background !== 'rgba(0, 0, 0, 0)');
    assert.equal(result.overflow.textOverlap, false);
    assert.ok(result.elements.eyebrow.fontSize >= 32);
    assert.ok(result.elements.counter.fontSize >= 28);
    assert.equal(result.elements.counter.y + result.elements.counter.height, 1032);
    assert.deepEqual(Object.values(result.overflow).filter(Boolean), []);
    for (const name of ['eyebrow', 'headline', 'body', 'counter', ...(result.elements.cta ? ['cta'] : [])]) {
      const box = result.elements[name];
      assert.ok(box.x >= 64 && box.x + box.width <= 1016, `${name} remains inside 64px safe margins`);
      assert.ok(box.scrollWidth <= box.clientWidth && box.scrollHeight <= box.clientHeight + 4, `${name} fits its measured client box`);
    }
  }
});

test('manifest append preserves prior records and matches the studio schema', async () => {
  const dir = path.join(testRoot, 'manifest-case');
  await fs.rm(dir, { recursive: true, force: true });
  const measurements = { headline: { fontSize: 96, scrollWidth: 800, scrollHeight: 200, clientWidth: 820, clientHeight: 390 } };
  const overflow = { headline: false, body: false, eyebrow: false, counter: false, circleTextOverlap: false };
  const first = await appendManifest(dir, [{ file: 'offer_01_carousel_square.png', hook: 'A good start', width: 1080, height: 1080, status: 'rendered', template: 'ocean', fontSize: 96, minFontSize: 72, measurements, overflow }], { offer: 'sample-offer', ratio: 'square' });
  const second = await appendManifest(dir, [{ file: 'offer_02_carousel_square.png', hook: 'Next step', width: 1080, height: 1080, status: 'rendered', template: 'ocean', fontSize: 96, minFontSize: 72, measurements, overflow }]);
  assert.equal(first.files.length, 1);
  assert.equal(second.files.length, 2);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')).ratio, 'square');
  assert.deepEqual(second.files[0].overflow, overflow);
  assert.equal(second.files[0].measurements.headline.fontSize, 96);
});

test('handoff spec has the exact carousel card fields and explicit fill-in values', () => {
  const spec = makeSpec({ title: 'Sample', slides: [{ file: 'sample_01_carousel_square.png', heading: 'First idea' }, { file: 'sample_02_carousel_square.png', heading: 'Next step' }, { file: 'sample_03_carousel_square.png', heading: 'Start here' }] });
  assert.equal(spec.pageId, 'FILL_IN_META_PAGE_ID');
  assert.equal(spec.message, 'FILL_IN_PRIMARY_MESSAGE');
  assert.equal(spec.cards.length, 3);
  for (const card of spec.cards) assert.deepEqual(Object.keys(card), ['image', 'headline']);
  assert.equal(spec.cards[0].image, './sample_01_carousel_square.png');
  assert.equal(spec.cards[0].headline, 'First idea');
});

test('generated handoff conforms to the packaged carousel spec shape after blanks are filled', async () => {
  const spec = makeSpec({ title: 'Practice offer', slides: [1,2,3].map((n) => ({ file: `card-${n}.png`, heading: `Card ${n}` })) });
  const hydrated = { ...spec, pageId: '1234567', message: 'A sample primary message', link: 'https://example.com/offer' };
  assert.deepEqual(Object.keys(hydrated), ['name', 'pageId', 'message', 'link', 'callToAction', 'optimizeOrder', 'endCard', 'cards']);
  assert.equal(hydrated.cards.length, 3);
  assert.equal(hydrated.callToAction, 'LEARN_MORE');
  assert.equal(hydrated.pageId, '1234567');
  assert.equal(hydrated.link, 'https://example.com/offer');
  for (const card of hydrated.cards) assert.deepEqual(Object.keys(card), ['image', 'headline']);
});

test('source files contain no personal identifiers and no local secret file exists', async () => {
  const root = path.resolve(__dirname, '..');
  const forbidden = [String.fromCharCode(47,85,115,101,114,115,47), ['m','y','o','s'].join(''), ['n','e','w','y','o','r','k','1'].join(''), ['j','o','e','@'].join(''), ['@','g','m','a','i','l'].join(''), ['i','l','l','y'].join(''), ['m','a','s','t','e','r','m','i','n','d','s'].join('')];
  async function walk(dir) {
    const out=[];
    for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
      if (entry.name === 'node_modules' || entry.name === 'workspace' || entry.name === '.git') continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) out.push(...await walk(full)); else if(entry.name!=='LICENSE') out.push(full);
    }
    return out;
  }
  const files = await walk(root);
  for (const file of files) {
    const text=await fs.readFile(file,'utf8');
    for (const needle of forbidden) assert.equal(text.toLowerCase().includes(needle.toLowerCase()),false,`${path.relative(root,file)} contains a personal marker`);
    assert.equal(/\d{15,}/.test(text),false,`${path.relative(root,file)} contains a long numeric identifier`);
  }
  assert.equal((await fs.readdir(root)).includes('.env'),false,'local API keys must not ship');
});
