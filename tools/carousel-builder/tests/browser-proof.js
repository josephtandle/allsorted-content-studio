const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const fsSync = require('node:fs');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { makeSpec } = require('../lib/core');
function browserPaths() {
  const home=process.env.HOME||require('node:os').homedir();const pathVar=process.env.PATH||'';const dirs=pathVar.split(require('node:path').delimiter).filter(Boolean);
  const chrome=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`]:process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA||''}/Google/Chrome/Application/chrome.exe`]:dirs.flatMap(d=>[`${d}/google-chrome`,`${d}/google-chrome-stable`]);
  const edge=process.platform==='darwin'?['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:process.platform==='win32'?['C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',`${process.env.LOCALAPPDATA||''}/Microsoft/Edge/Application/msedge.exe`]:dirs.map(d=>`${d}/microsoft-edge`);
  return [...chrome,...edge].filter((candidate)=>candidate&&fsSync.existsSync(candidate));
}
function browserPath() { return browserPaths()[0]||null; }

async function launchBrowser() { for(const executablePath of browserPaths()){try{return await chromium.launch({executablePath,headless:true});}catch{}}throw new Error('Install Google Chrome to run the browser renderer.'); }
const sharp = require('sharp');

function validateCarouselSpec(spec) {
  if (!spec || typeof spec !== 'object' || !/^\d{5,}$/.test(String(spec.pageId || ''))) throw new Error('Carousel spec needs a numeric Meta Page ID.');
  if (!String(spec.message || '').trim() || !/^https?:\/\//.test(String(spec.link || ''))) throw new Error('Carousel spec needs a primary message and landing page URL.');
  if (!Array.isArray(spec.cards) || spec.cards.length < 2 || spec.cards.length > 10) throw new Error('Carousel spec needs 2 to 10 cards.');
  for (const [index, card] of spec.cards.entries()) {
    if (!card || Object.keys(card).sort().join(',') !== 'headline,image' || !String(card.headline || '').trim() || !String(card.image || '').trim()) throw new Error(`Carousel card ${index + 1} needs exactly image and headline fields.`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(root, '../..');
  const workspace = path.join(repoRoot, '.test-data/browser-workspace');
  await fs.rm(workspace, { recursive: true, force: true });
  await fs.mkdir(workspace, { recursive: true });
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env: { ...process.env, PORT: String(port), CAROUSEL_WORKSPACE: workspace }, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = '';
  server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
  server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });
  try {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error(`Carousel server exited early: ${serverOutput}`);
      try { const response = await fetch(`${base}/api/config`); if (response.ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (Date.now() >= deadline) throw new Error(`Carousel server did not become ready: ${serverOutput}`);
    await runBrowserFlow({ base, root, workspace });
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => { if (server.exitCode !== null) return resolve(); const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 3000); server.once('exit', () => { clearTimeout(timer); resolve(); }); });
  }
}

async function runBrowserFlow({ base, root, workspace }) {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#offer').fill('sunrise-yoga-intro');
    await page.locator('#audience');
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.locator('#audience').fill('People starting a gentle morning yoga practice');
    await page.locator('#pain').fill('Busy mornings make it hard to begin');
    await page.locator('#transformation').fill('Build a calmer start to the day');
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.locator('#generate-text').click();
    await page.locator('[data-slide-heading="2"]').waitFor();
    const firstBody = await page.locator('[data-slide-body="0"]').inputValue();
    if (!firstBody.startsWith('For people starting')) throw new Error(`Audience casing regression: ${firstBody}`);
    const draftedBodies = await page.locator('[data-slide-body]').evaluateAll(elements => elements.map(element => element.value));
    if (draftedBodies.some(body => /A practical shift, built around your needs|Learn more when you are ready/i.test(body))) throw new Error('Generic fallback copy remains in the generated slides.');
    await page.locator('[data-slide-heading="0"]').fill('Make room for a slower start');
    await page.locator('[data-slide-heading="1"]').fill('Small steps make mornings easier');
    await page.locator('[data-slide-heading="2"]').fill('Begin with one gentle class');
    await page.getByRole('button', { name: /Continue/ }).click();
    const rejected = await page.evaluate(async () => {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offer: 'overflow-check', slides: [{ heading: 'Too long '.repeat(1000), body: 'A short supporting line.' }, { heading: 'Second slide', body: 'A short supporting line.' }] }) });
      return { status: response.status, body: await response.json() };
    });
    if (rejected.status !== 500 || !/Please shorten the headline\./.test(rejected.body.error || '')) throw new Error(`Overflow export did not fail with the required message: ${JSON.stringify(rejected)}`);
    await page.getByRole('button', { name: /Export PNGs/ }).click();
    await page.getByText(/Slides exported at 1080 × 1080/).waitFor();
    const manifestPath = path.join(workspace, 'creatives/manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const specLink = page.locator('a[download]').getAttribute('href');
    const specHref = await specLink;
    const specName = decodeURIComponent(new URL(specHref, base).pathname.split('/').pop());
    const specPath = path.join(workspace, 'creatives', specName);
    const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
    if (spec.cards.length !== 3) throw new Error(`Expected 3 cards, found ${spec.cards.length}`);
    if (manifest.files.length < 3) throw new Error('The manifest does not contain the three exported slides.');
    const exported = spec.cards.map(card => path.resolve(path.dirname(specPath), card.image));
    for (const file of exported) {
      const meta = await sharp(file).metadata();
      if (meta.width !== 1080 || meta.height !== 1080) throw new Error(`${path.basename(file)} has unexpected dimensions ${meta.width}x${meta.height}`);
    }
    const proofEntries = manifest.files.filter(entry => exported.some(file => path.basename(file) === entry.file)).slice(-3);
    if (proofEntries.length !== 3) throw new Error('The manifest is missing per-slide measurement records.');
    for (const [index, entry] of proofEntries.entries()) {
      if (entry.fontSize < 72 || entry.fontSize > 120 || entry.minFontSize !== 72) throw new Error(`${entry.file} has an invalid headline size floor.`);
      if (entry.measurements.headline.fontSize !== entry.fontSize || entry.measurements.body.fontSize < 44 || entry.measurements.eyebrow.fontSize < 32 || entry.measurements.counter.fontSize < 28) throw new Error(`${entry.file} has invalid measured text sizes.`);
      if (entry.showCta !== (index === 2) || Boolean(entry.measurements.cta) !== (index === 2)) throw new Error(`${entry.file} has unexpected CTA placement.`);
      if (Math.abs(entry.measurements.contentGroup.centerY - 510) > 1 || entry.measurements.counter.y + entry.measurements.counter.height !== 1032) throw new Error(`${entry.file} content is not centered or its counter is not pinned at the bottom.`);
      if (Object.values(entry.overflow).some(Boolean)) throw new Error(`${entry.file} records text overflow.`);
    }
    const readySpec = { ...spec, pageId: '1234567', message: 'A sample primary message', link: 'https://example.com/offer', cards: spec.cards.map((card, i) => ({ ...card, image: exported[i] })) };
    if (spec.cards.length !== makeSpec({ slides: spec.cards.map(card => ({ file: card.image, heading: card.headline })) }).cards.length) throw new Error('Exported carousel shape differs from the packaged handoff builder.');
    validateCarouselSpec(readySpec);
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ status: 'PASS', slides: exported, spec: specPath, manifest: manifestPath, specCards: spec.cards.length, pixels: '1080x1080', measurements: proofEntries.map(({ file, fontSize, measurements, overflow }) => ({ file, fontSize, eyebrow: measurements.eyebrow.fontSize, body: measurements.body.fontSize, counter: measurements.counter.fontSize, overflow })), validator: 'Meta carousel validator passed after replacing the marked blanks' }, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
