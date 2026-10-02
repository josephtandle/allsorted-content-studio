import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const STUDIO = process.env.CONTENT_STUDIO_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(STUDIO, 'tools/carousel-builder/server.js'));
const { chromium } = (() => { try { return require(path.join(STUDIO, 'tools/carousel-builder/node_modules/playwright-core')); } catch { return {}; } })();
const { pngDimensions, findBrowser, findBrowsers } = await import(pathToFileURL(path.join(STUDIO, 'tools/ad-images/scripts/render.mjs')));
const date = new Date().toISOString().slice(0, 10);
function say(x) { console.log(x); }
function filesBelow(dir) { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? filesBelow(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
function run(cmd, args, env={}) { return spawnSync(cmd,args,{cwd:STUDIO,encoding:'utf8',env:{...process.env,CONTENT_STUDIO_DIR:STUDIO,...env}}); }
function createSheet(runDir) {
  if (!chromium) throw new Error('Studio dependencies are missing. Run npm install in tools/carousel-builder.');
  const imgs = filesBelow(runDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f) && path.basename(f) !== 'contact-sheet.png');
  if (!imgs.length) throw new Error('No creative images found in run directory.');
  const cards = imgs.map(f => { const ext=path.extname(f).toLowerCase(); const mime=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.webp'?'image/webp':'image/png'; const data=fs.readFileSync(f).toString('base64'); return `<figure><img src="data:${mime};base64,${data}"><figcaption>${path.relative(runDir,f).replaceAll('&','&amp;').replaceAll('<','&lt;')}</figcaption></figure>`; }).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f2efe8;color:#20231f;font:16px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}figure{margin:0;padding:12px;background:white;border-radius:10px;box-shadow:0 2px 10px #0002}img{display:block;width:100%;height:450px;object-fit:contain;background:#ddd}figcaption{padding:10px 2px 2px;overflow-wrap:anywhere;font-size:13px}</style><main class="grid">${cards}</main>`;
  const out = path.join(runDir, 'contact-sheet.png');
  const browserPaths=findBrowsers();if(!browserPaths.length)throw new Error('Install Google Chrome to run the browser renderer.');const browser=(async()=>{for(const executablePath of browserPaths){try{return await chromium.launch({executablePath,headless:true});}catch{}}throw new Error('Install Google Chrome to run the browser renderer.');})();
  return browser.then(async b=>{try{const page=await b.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});await page.setContent(html,{waitUntil:'load'});const height=await page.locator('body').evaluate(e=>Math.max(e.scrollHeight,1100));await page.setViewportSize({width:1440,height:Math.min(height,12000)});await page.screenshot({path:out,fullPage:true});}finally{await b.close();}}).then(()=>out);
}
function check(runDir) {
  const errors=[], records=[];
  const manifests=filesBelow(runDir).filter(f=>path.basename(f)==='manifest.json');
  for(const manifestPath of manifests){
    const tool=manifestPath.includes(`${path.sep}carousel${path.sep}`)?'carousel-builder':'ad-images';
    if(tool==='ad-images'){
      const result=run(process.execPath,[path.join(STUDIO,'tools/ad-images/scripts/qa.mjs'),manifestPath]);
      records.push({tool,manifest:path.relative(runDir,manifestPath),status:result.status===0?'working':'broken',output:(result.stdout+result.stderr).trim()});
      if(result.status!==0) errors.push(`${path.relative(runDir,manifestPath)}: ${result.stderr||result.stdout}`);
      continue;
    }
    let m;try{m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}catch(e){errors.push(`${manifestPath}: invalid JSON ${e.message}`);continue;}
    const local=[];
    for(const item of m.files||[]){const file=path.resolve(path.dirname(manifestPath),item.file||'');if(!fs.existsSync(file)){local.push(`${item.file}: file missing`);continue;}try{const d=pngDimensions(file);if(d.width!==item.width||d.height!==item.height)local.push(`${item.file}: dimensions ${d.width}x${d.height}, expected ${item.width}x${item.height}`);if(item.overflow===true||(item.overflow&&Object.values(item.overflow).some(Boolean)))local.push(`${item.file}: overflow`);const measurements=item.measurements||{};if(!measurements.cta)local.push(`${item.file}: CTA button is missing`);else if(!measurements.cta.background||measurements.cta.background==='rgba(0, 0, 0, 0)'||Number.parseFloat(measurements.cta.border||0)<=0)local.push(`${item.file}: CTA has no distinct button background or border`);if(item.overflow?.textOverlap)local.push(`${item.file}: CTA or text overlaps another text block`);const measured=item.measurements||{};for(const [key,floor] of [['headline',72],['body',40],['eyebrow',32],['counter',28]]){const size=Number(measured[key]?.fontSize||0);if(size&&size<floor)local.push(`${item.file}: ${key} text is undersized (${size}px, minimum ${floor}px)`);}if(Number(item.fontSize||0)>0&&Number(item.fontSize)<72)local.push(`${item.file}: headline text is undersized (${item.fontSize}px, minimum 72px)`);}catch(e){local.push(`${item.file}: ${e.message}`);}}
    records.push({tool,manifest:path.relative(runDir,manifestPath),status:local.length?'broken':'working',errors:local}); errors.push(...local);
  }
  if(!manifests.length) errors.push('No tool manifest.json found.');
  const summary={time:new Date().toISOString(),checked:manifests.length,errors:errors.length,records};
  fs.appendFileSync(path.join(runDir,'run-log.jsonl'),`${JSON.stringify(summary)}\n`);
  for(const x of records) say(`${x.tool}: ${x.status}${x.errors?.length?` (${x.errors.join('; ')})`:''}`);
  if(errors.length) throw new Error(`QA failed: ${errors.join(' | ')}`);
  return summary;
}
const CTA_VALUES = new Set(['LEARN_MORE','SHOP_NOW','SIGN_UP','BOOK_NOW','GET_OFFER','CONTACT_US','SUBSCRIBE','DOWNLOAD']);
function readCopy(runDir) {
  const jsonPath=path.join(runDir,'copy/ads.json');
  if(fs.existsSync(jsonPath)){const data=JSON.parse(fs.readFileSync(jsonPath,'utf8'));return {message:data.primaryText||data.message||'',headline:data.headline||'',cta:data.callToAction||data.ctaValue||data.cta||''};}
  const mdPath=path.join(runDir,'copy/ads.md');
  if(!fs.existsSync(mdPath)) return {message:'',headline:'',cta:''};
  const text=fs.readFileSync(mdPath,'utf8');const front=text.match(/^---\s*\n([\s\S]*?)\n---/);const fields={};
  for(const line of (front?.[1]||'').split('\n')){const match=line.match(/^([\w-]+):\s*["']?(.*?)["']?\s*$/);if(match)fields[match[1]]=match[2];}
  const message=fields.primaryText||fields.message||'';return {message,headline:fields.headline||'',cta:fields.callToAction||fields.ctaValue||fields.cta||''};
}
function handoff(runDir) {
  const logPath=path.join(runDir,'run-log.jsonl');if(!fs.existsSync(logPath))throw new Error('Run check before creating a handoff.');const lines=fs.readFileSync(logPath,'utf8').trim().split('\n').filter(Boolean);const latest=JSON.parse(lines.at(-1));if(Number(latest.errors||0)>0)throw new Error('QA has failures. Fix them and rerun check before handoff.');
  const copy=readCopy(runDir);const rawCta=String(copy.cta||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const aliases=new Map([['LEARN MORE','LEARN_MORE'],['LEARNMORE','LEARN_MORE'],['SHOP NOW','SHOP_NOW'],['SHOPNOW','SHOP_NOW'],['SIGN UP','SIGN_UP'],['SIGNUP','SIGN_UP'],['BOOK NOW','BOOK_NOW'],['BOOK A CLASS','BOOK_NOW'],['BOOK CLASS','BOOK_NOW'],['GET OFFER','GET_OFFER'],['GET OFFER NOW','GET_OFFER'],['CONTACT US','CONTACT_US'],['CONTACT','CONTACT_US'],['SUBSCRIBE','SUBSCRIBE'],['DOWNLOAD','DOWNLOAD']]);
  let callToAction=aliases.get(rawCta)||rawCta.replace(/ /g,'_');
  if(!CTA_VALUES.has(callToAction)){console.warn('Warning: no valid Meta call-to-action value was supplied; defaulting to LEARN_MORE.');callToAction='LEARN_MORE';}
  const all=filesBelow(runDir);const ads=[];const seen=new Set();
  for(const specPath of all.filter(f=>/carousel-spec\.json$/.test(f))){const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));const cards=(spec.cards||[]).map(card=>({...card,image:`./carousel/${path.basename(card.image)}`}));if(cards.length>=2){ads.push({type:'carousel',name:spec.name||'Carousel ad',pageId:'FILL_IN_META_PAGE_ID',message:'FILL_IN_PRIMARY_MESSAGE',link:'FILL_IN_LANDING_PAGE_URL',callToAction,status:'PAUSED',cards,child_attachments:cards.map(card=>({image:card.image,headline:card.headline,link:''}))});for(const card of cards)seen.add(path.basename(card.image));}}
  for(const manifestPath of all.filter(f=>path.basename(f)==='manifest.json'&&!f.includes(`${path.sep}carousel${path.sep}`))){const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));for(const item of manifest.files||[]){if(item.status!=='rendered'||!/\.png$/i.test(item.file))continue;const image=path.relative(runDir,path.resolve(path.dirname(manifestPath),item.file)).split(path.sep).join('/');if(seen.has(path.basename(item.file)))continue;ads.push({type:'image',name:item.hook||'Single image ad',pageId:'FILL_IN_META_PAGE_ID',message:'FILL_IN_PRIMARY_MESSAGE',link:'FILL_IN_LANDING_PAGE_URL',callToAction,status:'PAUSED',image:`./${image}`,headline:copy.headline||item.hook||''});seen.add(path.basename(item.file));}}
  if(!ads.length)throw new Error('No rendered image or carousel creatives found.');
  const output={status:'PAUSED',blanks:{pageId:'FILL_IN_META_PAGE_ID',link:'FILL_IN_LANDING_PAGE_URL',message:'FILL_IN_PRIMARY_MESSAGE'},ads};
  fs.writeFileSync(path.join(runDir,'handoff.json'),`${JSON.stringify(output,null,2)}\n`);const outputs=all.filter(f=>/\.(png|jpe?g|webp)$/i.test(f)&&path.basename(f)!=='contact-sheet.png').map(f=>path.relative(runDir,f));fs.appendFileSync(logPath,`${JSON.stringify({time:new Date().toISOString(),event:'run-summary',status:'PAUSED',files:outputs,handoff:'handoff.json',qaErrors:Number(latest.errors||0)})}\n`);return output;
}
function syncBrand(){const source=path.join(STUDIO,'brand/BRAND-BRAIN.md');if(!fs.existsSync(source))throw new Error('Create brand/BRAND-BRAIN.md from brand/BRAND-BRAIN.template.md first.');const text=fs.readFileSync(source,'utf8');const values={};for(const match of text.matchAll(/^- ([^:\n]+):\s*(.*)$/gm))values[match[1].trim().toLowerCase()]=match[2].trim();const get=(key,fallback='')=>{const value=values[key];return value&&!/^\[.*\]$/.test(value)?value:fallback;};const list=(value)=>value.split(/[,;]/).map(v=>v.trim()).filter(Boolean);const colors={background:get('background color','#F7F2E8'),ink:get('ink color','#173B35'),accent:get('accent color','#E47C52')};const fonts={display:get('display font','Georgia'),body:get('body font','Arial')};const brand={brandName:get('brand name','Your business'),offer:get('offer'),priceOrTerms:get('price or terms, if approved'),destination:get('destination'),audience:get('specific audience'),currentSituation:get('current situation'),problem:get('problem in their words'),supportedOutcome:get('desired supported outcome'),approvedProof:list(get('approved facts and proof')),testimonials:list(get('testimonials with permission','none')).filter(v=>v.toLowerCase()!=='none'),claimsToAvoid:list(get('claims to avoid')),voice:get('voice'),colors,fonts,imageDirection:get('image direction'),primaryAction:get('primary action'),cta:get('cta wording')};const dest=path.join(STUDIO,'brand/brand.json');fs.writeFileSync(dest,`${JSON.stringify(brand,null,2)}\n`);say(`Generated ${dest} from brand/BRAND-BRAIN.md`);}
function useExampleBrand(){const md=path.join(STUDIO,'brand/BRAND-BRAIN.md'),json=path.join(STUDIO,'brand/brand.json');if(fs.existsSync(md)||fs.existsSync(json))throw new Error('Refusing to overwrite an existing brand/BRAND-BRAIN.md or brand/brand.json.');fs.copyFileSync(path.join(STUDIO,'brand/BRAND-BRAIN.example.md'),md);syncBrand();}
function renderTest(){const runDir=path.join(STUDIO,'runs','_selftest'),imageDir=path.join(runDir,'images');fs.mkdirSync(imageDir,{recursive:true});const data=path.join(runDir,'selftest-image.json'),out=path.join(imageDir,`studio-selftest-${process.pid}_01_offer-card_square.png`),manifest=path.join(imageDir,'manifest.json');fs.writeFileSync(data,JSON.stringify({brandName:'Sunrise Yoga Studio',hook:'A calmer start begins here',headline:'A calmer start begins here',body:'Try one gentle beginner class this week.',cta:'See the class schedule',brand:JSON.parse(fs.readFileSync(path.join(STUDIO,'brand/brand.example.json'),'utf8'))}));const r=run(process.execPath,[path.join(STUDIO,'tools/ad-images/scripts/render.mjs'),'--template',path.join(STUDIO,'tools/ad-images/templates/offer-card.html'),'--data',data,'--out',out,'--width','1080','--height','1080','--manifest',manifest]);if(r.status!==0)throw new Error((r.stderr||r.stdout).trim());say(`Test image: ${out}`);return out;}
function selfTest(){let failed=false;const [major,minor]=process.versions.node.split('.').map(Number),nodeOk=major>20||(major===20&&minor>=9);say(`Node: ${nodeOk?'working':`broken, ${process.versions.node} is below 20.9`}`);if(!nodeOk)failed=true;const browserOk=Boolean(findBrowser());say(`Chrome/Edge: ${browserOk?'working':'Install Google Chrome to run the browser renderer.'}`);if(!browserOk)failed=true;
  const tools=[['HookLab',fs.existsSync(path.join(STUDIO,'tools/hooklab/SKILL.md')),'missing HookLab files'],['Ad Images',fs.existsSync(path.join(STUDIO,'tools/ad-images/scripts/render.mjs'))&&browserOk,'renderer or browser missing'],['Carousel Builder',fs.existsSync(path.join(STUDIO,'tools/carousel-builder/lib/slide-renderer.js'))&&Boolean(chromium),'source or Playwright dependency missing'],['HeyGen Ad Videos',fs.existsSync(path.join(STUDIO,'tools/heygen-ad-videos/scripts/heygen.mjs')),'missing HeyGen files'],['Video Editor',fs.existsSync(path.join(STUDIO,'tools/video-editor/index.js')),'missing video editor files']];for(const [name,ok,why] of tools){if(name==='Video Editor'&&ok){const mod=require(path.join(STUDIO,'tools/video-editor/index.js'));const check=mod.check();say(check.ffmpegAvailable?'Video Editor: working':'Video Editor: ffmpeg not installed (optional)');continue;}if(name==='HeyGen Ad Videos'){say(`HeyGen Ad Videos: ${ok?'working (connection optional)':'broken, '+why}`);continue;}say(`${name}: ${ok?'working':`broken, ${why}`}`);if(!ok)failed=true;}
  try{renderTest();}catch(e){say(`Ad Images render: broken, ${e.message}`);failed=true;}if(failed)process.exitCode=1;
}
const [cmd,arg] = process.argv.slice(2);
try {
 if(cmd==='self-test'){selfTest();}
 else if(cmd==='render-test'){renderTest();}
 else if(cmd==='brand-json'){syncBrand();}
 else if(cmd==='use-example-brand'){useExampleBrand();}
 else if(cmd==='new-run'){if(!arg)throw new Error('Usage: studio.mjs new-run <slug>');const slug=arg.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);if(!slug)throw new Error('Use a slug with letters or numbers.');const dir=path.join(STUDIO,'runs',`${date}-${slug}`);fs.mkdirSync(dir,{recursive:false});fs.writeFileSync(path.join(dir,'brief.md'),`# Creative brief\n\nDate: ${date}\n\n## Goal\n[What should this creative help the audience do?]\n\n## Offer and audience\n[Offer]\n[Specific audience]\n\n## Approved evidence\n[Source-backed facts only]\n\n## Format and count\n[Image, carousel, optional video]\n\n## CTA and destination\n[CTA]\n[Destination or blank]\n\n## Constraints and open questions\n[Include policy and brand limits]\n`);say(dir);}
 else if(cmd==='contact-sheet'){if(!arg)throw new Error('Usage: studio.mjs contact-sheet <run-dir>');say(await createSheet(path.resolve(arg)));}
 else if(cmd==='check'){if(!arg)throw new Error('Usage: studio.mjs check <run-dir>');check(path.resolve(arg));}
 else if(cmd==='handoff'){if(!arg)throw new Error('Usage: studio.mjs handoff <run-dir>');handoff(path.resolve(arg));say(`Wrote ${path.join(path.resolve(arg),'handoff.json')} in PAUSED state.`);}
 else throw new Error('Commands: self-test, render-test, brand-json, use-example-brand, new-run <slug>, contact-sheet <run-dir>, check <run-dir>, handoff <run-dir>');
}catch(e){console.error(e.message);process.exitCode=1;}
