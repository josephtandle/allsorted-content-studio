import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
let chromium;
try{chromium=require('playwright-core').chromium}catch{ try { if(process.env.CONTENT_STUDIO_DIR) chromium=require(path.join(process.env.CONTENT_STUDIO_DIR,'tools/carousel-builder/node_modules/playwright-core')).chromium; } catch {} }

export function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) result[args[i].slice(2)] = args[++i];
  }
  return result;
}

export function findBrowsers(platform = process.platform, env = process.env) {
  const chrome=[],edge=[];
  if(platform==='darwin'){chrome.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',path.join(env.HOME||os.homedir(),'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));edge.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');}
  else if(platform==='win32'){const bases=[env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter(Boolean);for(const base of bases)chrome.push(path.join(base,'Google/Chrome/Application/chrome.exe'));for(const base of bases)edge.push(path.join(base,'Microsoft/Edge/Application/msedge.exe'));}
  else {const root=path.parse(process.execPath).root;chrome.push(path.join(root,'usr/bin/google-chrome'),path.join(root,'usr/bin/google-chrome-stable'));edge.push(path.join(root,'usr/bin/microsoft-edge'));}
  const dirs=String(env.PATH||'').split(path.delimiter).filter(Boolean);for(const name of platform==='win32'?['chrome.exe']:['google-chrome','google-chrome-stable'])for(const dir of dirs)chrome.push(path.join(dir,name));for(const dir of dirs)edge.push(path.join(dir,platform==='win32'?'msedge.exe':'microsoft-edge'));
  return [...chrome,...edge].filter((candidate,index,all)=>all.indexOf(candidate)===index&&fs.existsSync(candidate));
}
export function findBrowser(platform = process.platform, env = process.env) { return findBrowsers(platform,env)[0]||null; }

export function pngDimensions(file) {
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) throw new Error(`Not a valid PNG: ${file}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function safeCss(value, fallback) {
  const text = String(value || fallback);
  return /[;{}<>]/.test(text) ? fallback : text;
}

export function makeHtml(template, data, width, height) {
  const brand = data.brand || {};
  const colors = brand.colors || {};
  const fonts = brand.fonts || {};
  const values = {
    BACKGROUND: safeCss(colors.background, '#F7F2E8'), INK: safeCss(colors.ink, '#173B35'), ACCENT: safeCss(colors.accent, '#E47C52'),
    DISPLAY_FONT: safeCss(fonts.display, 'Georgia'), BODY_FONT: safeCss(fonts.body, 'Arial'), BRAND: data.brandName || brand.brandName || 'Your business',
    HOOK: data.hook || data.headline || '', HEADLINE: data.headline || '', BODY: data.body || '', CTA: data.cta || '',
    TIP1: data.tips?.[0] || data.tip1 || '', TIP2: data.tips?.[1] || data.tip2 || '', TIP3: data.tips?.[2] || data.tip3 || '', PROOF: data.proof || '',
    IMAGE_SRC: data.image ? pathToFileURL(path.resolve(data.image)).href : ''
  };
  let html = template.replace('--w:1080px;--h:1080px', `--w:${width}px;--h:${height}px`);
  if (Number(height) / Number(width) === 1920 / 1080) {
    html = html.replace('</style>', '.canvas{position:absolute!important;top:14%!important;left:8%!important;height:66%!important;width:84%!important;margin:0!important;padding:56px 7.4vw!important;justify-content:space-around!important}h1{font-size:120px!important;line-height:1.04!important;max-height:none!important;overflow:visible!important}p,.proof,.tip,.foot{font-size:52px!important;line-height:1.18!important}.cta{font-size:54px!important;background:var(--accent)!important;color:var(--ink)!important;padding:22px 36px!important;border-radius:16px!important;margin-top:42px!important;align-self:flex-start!important}.brand{font-size:48px!important}.arrow{font-size:52px!important}</style>');
    html = html.replace(/data-layout-box="[^"]+"/g, 'data-layout-box="0.08,0.14,0.84,0.66"');
  }
  html=html.replace('</style>','.canvas h1{height:auto!important;max-height:none!important;overflow:visible!important;padding-bottom:8px!important}</style>');
  for (const [key, value] of Object.entries(values)) html = html.replaceAll(`{{${key}}}`, escapeHtml(String(value)));
  html = html.replace('</body>', `<script>
  (()=>{
    const headline=document.querySelector('h1');
    const floor=72;
    function inspect(){
      const canvas=document.querySelector('.canvas');
      const canvasRect=canvas.getBoundingClientRect();
      const nodes=[...document.querySelectorAll('h1,p,.cta,.brand,.proof,.tip,.foot,.note,.label,.eyebrow,.arrow')]
        .filter(node=>!node.parentElement.closest('h1,p,.cta,.brand,.proof,.tip,.foot,.note,.label,.eyebrow,.arrow'));
      const elements=nodes.map((node,index)=>{
        const rect=node.getBoundingClientRect();
        const overflow=node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1||rect.left<canvasRect.left-1||rect.top<canvasRect.top-1||rect.right>canvasRect.right+1||rect.bottom>canvasRect.bottom+1;
        return {index,selector:node.tagName.toLowerCase()+(node.className&&typeof node.className==='string'?'.'+node.className.trim().replace(/\\s+/g,'.'):''),background:getComputedStyle(node).backgroundColor,borderWidth:getComputedStyle(node).borderTopWidth,text:(node.innerText||node.textContent||'').trim(),fontSize:Math.round(parseFloat(getComputedStyle(node).fontSize)),overflow,overlaps:[],scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)}};
      });
      for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
        const a=elements[i].rect,b=elements[j].rect;
        if(a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1){elements[i].overlaps.push(j);elements[j].overlaps.push(i);elements[i].overflow=true;elements[j].overflow=true;}
      }
      return elements;
    }
    addEventListener('load',()=>{
      if(headline){
        let size=parseFloat(getComputedStyle(headline).fontSize);
        let result=inspect();
        while(size>floor&&result.some(item=>item.overflow)){
          size=Math.max(floor,size-4);headline.style.fontSize=size+'px';
          result=inspect();
        }
        headline.dataset.fontSize=String(Math.round(size));
      }
      const result=inspect();
      const payload=JSON.stringify({elements:result,headlineFontSize:headline?Math.round(parseFloat(getComputedStyle(headline).fontSize)):null});
      document.body.insertAdjacentHTML('beforeend','<pre id="render-measurements" style="display:none">'+btoa(unescape(encodeURIComponent(payload)))+'</pre>');
    });
  })();
  </script></body>`);
  return html;
}

export function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export async function render({ templatePath, dataPath, data: suppliedData, outPath, width, height, browser = findBrowser() }) {
  if(fs.existsSync(path.resolve(outPath)))throw new Error(`Refusing to overwrite existing creative: ${path.resolve(outPath)}`);
  if (!browser) throw new Error('Install Google Chrome to run the browser renderer.');
  const data = suppliedData || (dataPath ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : {});
  const studioBrandPath = process.env.CONTENT_STUDIO_DIR ? path.join(process.env.CONTENT_STUDIO_DIR, 'brand', 'brand.json') : '';
  if (studioBrandPath && fs.existsSync(studioBrandPath)) { const shared = JSON.parse(fs.readFileSync(studioBrandPath, 'utf8')); data.brand = { ...(data.brand || {}), ...shared }; data.brandName = data.brandName || shared.brandName; }
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = makeHtml(template, data, width, height);
  const tempRoot = process.env.CONTENT_STUDIO_DIR ? path.join(process.env.CONTENT_STUDIO_DIR, '.test-data') : os.tmpdir();
  fs.mkdirSync(tempRoot,{recursive:true});
  const temp = path.join(tempRoot, `ad-creative-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(temp, html);
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  const url=pathToFileURL(temp).href;
  if(!chromium) throw new Error('Renderer dependency missing. Reinstall the studio dependencies.');
  let instance;for(const executablePath of [...new Set([browser,...findBrowsers()])]){try{instance=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--allow-file-access-from-files']});break;}catch{}}if(!instance)throw new Error('Install Google Chrome to run the browser renderer.');
  try{
    const page=await instance.newPage({viewport:{width:Number(width),height:Number(height)},deviceScaleFactor:1});
    await page.goto(url,{waitUntil:'load'});
    const diagnostics=await page.locator('#render-measurements').evaluate(node=>JSON.parse(decodeURIComponent(Array.from(atob(node.textContent.trim()),char=>'%'+char.charCodeAt(0).toString(16).padStart(2,'0')).join(''))));
    const overflows=diagnostics.elements.filter(item=>item.overflow);
    if(overflows.length){
      const words=String(data.hook||data.headline||'').trim().split(/\s+/).filter(Boolean).length;
      const details=overflows.map(item=>`${item.selector} (${item.fontSize}px at ${item.rect.x},${item.rect.y} ${item.rect.width}x${item.rect.height}, scroll ${item.scrollWidth}x${item.scrollHeight} client ${item.clientWidth}x${item.clientHeight}${item.overlaps.length?`, overlaps ${item.overlaps.join(',')}`:''})`).join(', ');
      throw new Error(`Headline still overflows at 72px. Shorten the headline to 12 words maximum (current: ${words} words). Elements: ${details}`);
    }
    await page.screenshot({path:path.resolve(outPath),animations:'disabled'});
    const dimensions=pngDimensions(outPath);
    if(dimensions.width!==Number(width)||dimensions.height!==Number(height)) throw new Error(`Expected ${width}x${height}; got ${dimensions.width}x${dimensions.height}`);
    return {...dimensions,measurements:diagnostics.elements,headlineFontSize:diagnostics.headlineFontSize};
  }finally{
    await instance.close();
    try{fs.unlinkSync(temp)}catch{}
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.template || !args.out || !args.width || !args.height) {
    console.error('Usage: node render.mjs --template FILE --data FILE --out PNG --width W --height H'); process.exit(2);
  }
  const browser = findBrowser();
  if (!browser) { console.error('Install Google Chrome to run the browser renderer.'); process.exit(2); }
  try {
    const dimensions = await render({ templatePath: args.template, dataPath: args.data, outPath: args.out, width: Number(args.width), height: Number(args.height), browser });
    if(args.manifest){
      const manifestPath=path.resolve(args.manifest);
      const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{files:[]};
      const relative=path.relative(path.dirname(manifestPath),path.resolve(args.out)).split(path.sep).join('/');
      const data=args.data?JSON.parse(fs.readFileSync(args.data,'utf8')):{};
      const ratio=Number(args.height)/Number(args.width)===1920/1080?'story':Number(args.height)/Number(args.width)===1350/1080?'feed':'square';
      const entry=manifest.files.find(file=>file.file===relative)||{file:relative,hook:data.hook||data.headline||'',width:Number(args.width),height:Number(args.height),ratio,template:path.basename(args.template,'.html'),layoutBox:ratio==='story'?[0.08,0.14,0.84,0.66]:null};
      Object.assign(entry,{status:'rendered',headlineFontSize:dimensions.headlineFontSize,measurements:dimensions.measurements,overflow:dimensions.measurements.some(element=>element.overflow)});
      if(!manifest.files.includes(entry))manifest.files.push(entry);
      fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    }
    console.log(`Rendered ${args.out} (${dimensions.width}x${dimensions.height})`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
