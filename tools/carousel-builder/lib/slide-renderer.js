const { chromium } = require('playwright-core');
const fs = require('node:fs');

const MIN_HEADLINE_SIZE = 72;
const START_HEADLINE_SIZE = 120;
const DEFAULTS = { background: '#F7F2E8', ink: '#173B35', accent: '#E47C52', display: 'Georgia', body: 'Arial' };
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function browserPaths() {
  const home=process.env.HOME||require('node:os').homedir();const pathVar=process.env.PATH||'';const dirs=pathVar.split(require('node:path').delimiter).filter(Boolean);
  const chrome=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`]:process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA||''}/Google/Chrome/Application/chrome.exe`]:dirs.flatMap(d=>[`${d}/google-chrome`,`${d}/google-chrome-stable`]);
  const edge=process.platform==='darwin'?['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:process.platform==='win32'?['C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',`${process.env.LOCALAPPDATA||''}/Microsoft/Edge/Application/msedge.exe`]:dirs.map(d=>`${d}/microsoft-edge`);
  return [...chrome,...edge].filter((candidate)=>candidate&&fs.existsSync(candidate));
}
function browserPath() { return browserPaths()[0]||null; }

function safeCss(value, fallback) { const text = String(value || fallback); return /[;{}<>]/.test(text) ? fallback : text; }

function slideMarkup(slide, index, total, preset, palette) {
  const presets={ocean:{background:'#102b3f',ink:'#ffffff',accent:'#6de3c0'},sunset:{background:'#312536',ink:'#ffffff',accent:'#ffbd91'},forest:{background:'#1b332f',ink:'#ffffff',accent:'#a8dfb0'},plum:{background:'#30223c',ink:'#ffffff',accent:'#e0b6ff'},sand:{background:'#eee3cf',ink:'#243a35',accent:'#c6774d'}};
  const theme = typeof palette === 'object' && palette ? palette : (presets[palette]||{});
  const background = safeCss(theme.background, DEFAULTS.background);
  const ink = safeCss(theme.ink, DEFAULTS.ink);
  const accent = safeCss(theme.accent, DEFAULTS.accent);
  const display = safeCss(theme.fonts?.display, DEFAULTS.display);
  const body = safeCss(theme.fonts?.body, DEFAULTS.body);
  const eyebrow = slide.eyebrow || slide.stepLabel || `IDEA ${String(index + 1).padStart(2, '0')}`;
  const headline = slide.headline || slide.heading || `Slide ${index + 1}`;
  const cta = slide.cta || 'Learn more';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:${preset.width}px;height:${preset.height}px;overflow:hidden}
  #canvas{width:100%;height:100%;padding:90px 64px 84px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:26px;overflow:hidden;background:linear-gradient(140deg,${background},${background});color:${ink};font-family:${body},sans-serif}
  #eyebrow{max-width:900px;color:${accent};font:700 32px/1.2 ${body},sans-serif;letter-spacing:4px;overflow-wrap:anywhere}
  #headline{max-width:900px;max-height:420px;overflow:hidden;font:700 ${START_HEADLINE_SIZE}px/1.04 ${display},serif;letter-spacing:-2px;overflow-wrap:anywhere}
  #body{max-width:900px;max-height:240px;overflow:hidden;font:400 44px/1.25 ${body},sans-serif;white-space:pre-line;overflow-wrap:anywhere}
  #cta{display:inline-block;background:${accent};color:${ink};border:2px solid ${accent};border-radius:16px;padding:20px 32px;font:700 36px/1.2 ${body},sans-serif;max-width:900px;overflow-wrap:anywhere}
  #counter{margin-top:auto;color:${ink};font:400 28px/1.2 ${body},sans-serif;opacity:.75}
  </style></head><body><main id="canvas"><div id="eyebrow">${escapeHtml(eyebrow)}</div><div id="headline">${escapeHtml(headline)}</div><div id="body">${escapeHtml(slide.body || '')}</div>${cta ? `<div id="cta">${escapeHtml(cta)}</div>` : ''}<div id="counter">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div></main></body></html>`;
}

async function renderSlides(slides, preset, palette, sharedBrowser = null) {
  const paths=browserPaths();let browser=sharedBrowser;if(!browser){for(const executablePath of paths){try{browser=await chromium.launch({executablePath,headless:true});break;}catch{}}if(!browser)throw new Error('Install Google Chrome to run the browser renderer.');}
  try {
    const page = await browser.newPage({ viewport: { width: preset.width, height: preset.height }, deviceScaleFactor: 1 });
    const output = [];
    for (let index = 0; index < slides.length; index++) {
      await page.setContent(slideMarkup(slides[index], index, slides.length, preset, palette), { waitUntil: 'load' });
      const measured = await page.evaluate(({ start, floor }) => {
        const canvas = document.querySelector('#canvas');
        const headline = document.querySelector('#headline');
        for (let size = start; size >= floor; size -= 4) {
          headline.style.fontSize = `${size}px`;
          if (headline.scrollWidth <= headline.clientWidth + 1 && headline.scrollHeight <= headline.clientHeight + 4) break;
        }
        const elements = {};
        for (const name of ['eyebrow', 'headline', 'body', 'cta', 'counter']) {
          const element = document.querySelector(`#${name}`);
          if (!element) continue;
          const rect = element.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          elements[name] = { x: Math.round(rect.x - canvasRect.x), y: Math.round(rect.y - canvasRect.y), width: Math.round(rect.width), height: Math.round(rect.height), scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, clientHeight: element.clientHeight, fontSize: parseFloat(getComputedStyle(element).fontSize), background: getComputedStyle(element).backgroundColor, border: getComputedStyle(element).borderTopWidth };
        }
        const overflow = {};
        for (const [name, value] of Object.entries(elements)) overflow[name] = value.scrollWidth > value.clientWidth + 1 || value.scrollHeight > value.clientHeight + 4 || value.x < 64 || value.x + value.width > canvas.clientWidth - 64 || value.y < 0 || value.y + value.height > canvas.clientHeight;
        const textNames = Object.keys(elements).filter((name) => ['eyebrow', 'headline', 'body', 'cta'].includes(name));
        const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        overflow.textOverlap = textNames.some((name, i) => textNames.slice(i + 1).some((other) => intersects(elements[name], elements[other])));
        if (elements.cta) overflow.ctaStyle = !elements.cta.background || elements.cta.background === 'rgba(0, 0, 0, 0)' || elements.cta.border === '0px';
        return { elements, overflow, headlineFontSize: elements.headline.fontSize };
      }, { start: START_HEADLINE_SIZE, floor: MIN_HEADLINE_SIZE });
      if (Object.values(measured.overflow).some(Boolean)) throw new Error(`Headline does not fit inside the safe margins. Please shorten the headline. Text and CTA must also fit without overlap.`);
      output.push({ png: await page.locator('#canvas').screenshot({ type: 'png' }), ...measured });
    }
    return output;
  } finally { if (!sharedBrowser) await browser.close(); }
}

module.exports = { renderSlides, START_HEADLINE_SIZE, MIN_HEADLINE_SIZE, slideMarkup };
