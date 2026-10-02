const $ = (s) => document.querySelector(s);
const labels = ['Offer', 'Audience', 'Style', 'Generate Text', 'Images & Export'];
const state = {
  step: 1, slideIndex: 0, offer: '', audience: '', pain: '', transformation: '', cta: 'Learn more',
  slideCount: 3, framework: 'AIDA', palette: 'brand', preset: 'square', slides: [], images: {}, exported: null,
  settings: { pexelsEnabled: false, aiCaptionEnabled: false, workspace: 'workspace' },
};
const presets = [
  { id: 'square', label: 'Square · 1:1', detail: '1080 × 1080. Best default for Instagram carousels.' },
  { id: 'portrait', label: 'Portrait · 4:5', detail: '1080 × 1350. A taller feed format.' },
  { id: 'story', label: 'Story · 9:16', detail: '1080 × 1920. Keep key text inside the safe area.' },
];
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function updatePreview() {
  const slide = state.slides[state.slideIndex];
  $('#preview-count').textContent = `${String(state.slideIndex + 1).padStart(2, '0')} / ${String(Math.max(state.slides.length, 3)).padStart(2, '0')}`;
  $('#preview-title').textContent = state.offer || 'Your carousel';
  const el = $('#slide-preview');
  el.className = `slide-preview palette-${state.palette}`;
  el.innerHTML = slide ? `<div class="preview-kicker">${esc(slide.stepLabel || 'YOUR MESSAGE')}</div><div class="preview-heading">${esc(slide.heading)}</div><div class="preview-body">${esc(slide.body || '')}</div>` : '<div class="preview-kicker">YOUR FIRST SLIDE</div><div class="preview-heading">A clear idea goes a long way.</div><div class="preview-body">Your slide preview will appear here.</div>';
  $('#preview-prev').disabled = state.slideIndex <= 0;
  $('#preview-next').disabled = state.slideIndex >= state.slides.length - 1;
}
function draw() {
  $('#stepper').innerHTML = labels.map((label, i) => `${i ? '<span class="step-link"></span>' : ''}<button class="step-node ${state.step === i + 1 ? 'active' : ''} ${state.step > i + 1 ? 'done' : ''}" data-step="${i + 1}"><span class="num">${state.step > i + 1 ? '✓' : i + 1}</span><span>${label}</span></button>`).join('');
  $('#stepper').querySelectorAll('[data-step]').forEach(b => b.onclick = () => { if (Number(b.dataset.step) <= state.step || state.step === 5) { state.step = Number(b.dataset.step); draw(); } });
  const c = $('#step-content');
  c.innerHTML = [offerStep, audienceStep, styleStep, textStep, exportStep][state.step - 1]();
  bindStep();
  updatePreview();
}
function frame(kicker, title, lede, content, back = true, next = 'Continue') {
  return `<div class="eyebrow">STEP ${state.step} OF 5</div><h2 class="step-heading">${title}</h2><p class="step-lede">${lede}</p>${content}<div class="button-row">${back ? '<button class="secondary-button" data-back>← Back</button>' : '<span class="hint">Your work stays in this browser.</span>'}<span class="hint">${kicker || ''}</span><button class="primary-button" data-next>${next} →</button></div>`;
}
function offerStep() { return frame('START WITH THE OFFER', 'What are you offering?', 'A carousel works best when one person, one problem, and one useful result are clear.', `<div class="field"><label for="offer">Offer or product</label><input id="offer" value="${esc(state.offer)}" placeholder="A 4-week beginner pottery course"></div><div class="two-col"><div class="field"><label for="cta">Call to action</label><input id="cta" value="${esc(state.cta)}" placeholder="Learn more"></div><div class="field"><label for="count">Number of slides</label><select id="count">${[3,4,5,6,7,8,9,10].map(n => `<option ${n === state.slideCount ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`, false); }
function audienceStep() { return frame('GET SPECIFIC', 'Who needs this?', 'Name the people you want to reach and the thing they are trying to change.', `<div class="field"><label for="audience">Audience</label><textarea id="audience" placeholder="People who are new to pottery and want a relaxing creative hobby">${esc(state.audience)}</textarea></div><div class="field"><label for="pain">The problem they feel</label><textarea id="pain" placeholder="They want to try pottery but do not know where to begin">${esc(state.pain)}</textarea></div><div class="field"><label for="transformation">The result you can honestly offer</label><textarea id="transformation" placeholder="Learn the basics and leave with a first handmade piece">${esc(state.transformation)}</textarea></div>`); }
function styleStep() { return frame('SET THE DIRECTION', 'Choose a visual direction.', 'Pick a canvas and a simple color mood. You can change this later.', `<div class="field"><label>Canvas size</label><div class="choice-row">${presets.map(p => `<button class="preset-card ${state.preset === p.id ? 'selected' : ''}" data-preset="${p.id}"><b>${p.label}</b><small>${p.detail}</small>${p.id === 'story' ? '<div class="safe-zone">Safe zone guides reserve 14% at the top and 20% at the bottom.</div>' : ''}</button>`).join('')}</div></div><div class="field"><label>Palette</label><div class="choice-row">${[['brand','Your brand'],['ocean','Ocean'],['sunset','Warm'],['forest','Garden'],['plum','Plum'],['sand','Sand']].map(([id,name]) => `<button class="choice ${state.palette === id ? 'selected' : ''}" data-palette="${id}">${name}</button>`).join('')}</div></div>`); }
function textStep() {
  const frameworks = [['AIDA','Attention · Interest · Desire · Action'],['PAS','Problem · Agitate · Solution'],['Story','Hook · Tension · Resolution'],['Tips','Numbered practical tips'],['Listicle','A useful short list'],['Hook','Lead with a surprising idea']];
  const slides = state.slides.length ? `<div class="slide-list">${state.slides.map((s,i) => `<div class="slide-edit"><div class="slide-edit-head"><b>SLIDE ${i+1}</b><span>${s.type === 'cover' ? 'Opening' : s.type === 'cta' ? 'Next step' : 'Main idea'}</span></div><input data-slide-heading="${i}" value="${esc(s.heading)}" aria-label="Slide ${i+1} heading"><textarea data-slide-body="${i}" aria-label="Slide ${i+1} body">${esc(s.body)}</textarea></div>`).join('')}</div>` : `<div class="hint">Choose a structure, then draft your slides. Every line remains editable.</div>`;
  return frame('DRAFT THE STORY', 'Build the message, slide by slide.', 'Start with a framework. The app makes a first draft on your computer. Edit every line until it sounds like you.', `<div class="field"><label>Story structure</label><div class="framework-grid">${frameworks.map(([id,desc]) => `<button class="framework ${state.framework === id ? 'selected' : ''}" data-framework="${id}"><b>${id}</b><small>${desc}</small></button>`).join('')}</div></div><div class="field"><button class="secondary-button" id="generate-text">${state.slides.length ? 'Refresh first draft' : 'Draft my slides'} ✳</button><span class="hint" style="margin-left:10px">This creates an editable starting point. Nothing is sent anywhere.</span></div>${slides}`,'Back','Continue');
}
function exportStep() {
  const slots = state.slides.map((s,i) => `<div class="image-slot">${state.images[i] ? `<img src="${state.images[i]}" alt="Selected slide background"><button class="choice" style="position:absolute;right:5px;top:5px;padding:5px" data-clear-image="${i}">×</button>` : `<label for="image-${i}">＋<br>Choose an image<input type="file" id="image-${i}" data-image="${i}" accept="image/png,image/jpeg,image/webp"></label>`}</div>`).join('');
  const result = state.exported ? `<div class="export-success"><b>Slides exported at ${state.exported.width} × ${state.exported.height}.</b><br>Saved in your local workspace. The Meta handoff spec is ready.<span class="code-box">${esc(state.exported.command)}</span><a href="/workspace/creatives/${encodeURIComponent(state.exported.specFile)}" download>Download carousel spec JSON</a><br><a href="/workspace/creatives/manifest.json" target="_blank">Open creative manifest</a></div>` : '';
  const stock = state.settings.pexelsEnabled ? `<div class="two-col"><div class="field"><label for="stock-query">Search stock photos</label><input id="stock-query" placeholder="Soft sunlight through a studio window"></div><button class="secondary-button" id="stock-search">Search Pexels</button></div><div id="stock-results" class="image-list"></div>` : '';
  const optional = state.settings.aiCaptionEnabled ? 'AI caption help is enabled in Settings.' : 'No AI key? Copy a prompt into your agent workspace. Nothing is sent from this step.';
  return frame('MAKE IT REAL', 'Choose images and export.', 'Use your own images or keep the clean typographic backgrounds. Export creates one PNG per card and a Meta Ads handoff file.', `<div class="field"><label>Optional images</label><div class="image-list">${slots}</div><div class="field-help">The app can run offline. Optional Pexels search is ${state.settings.pexelsEnabled?'enabled':'off'} in Settings.</div>${stock}</div>${result}<div class="field"><label>Send to Meta Ads</label><div class="meta-fields"><div class="field"><label for="page-id">PAGE ID</label><input id="page-id" placeholder="Fill this in later"></div><div class="field"><label for="landing-link">Link</label><input id="landing-link" placeholder="https://your-site.example"></div><div class="field" style="grid-column:1/-1"><label for="primary-message">Primary message</label><input id="primary-message" placeholder="Write the text above your carousel"></div></div><div class="field-help">These are clearly marked blanks in the exported JSON. No ad account connection is made.</div></div><button class="secondary-button" id="caption-prompt">Get a caption prompt for your agent workspace</button><div class="field-help">${optional}</div><div id="caption-output"></div>`, 'Back', state.exported ? 'Export again' : 'Export PNGs');
}
function bindStep() {
  $('[data-next]')?.addEventListener('click', async () => {
    if (state.step === 1) { state.offer = $('#offer').value.trim(); state.cta = $('#cta').value.trim() || 'Learn more'; state.slideCount = Number($('#count').value); if (!state.offer) return $('#offer').focus(); }
    if (state.step === 2) { state.audience = $('#audience').value.trim(); state.pain = $('#pain').value.trim(); state.transformation = $('#transformation').value.trim(); }
    if (state.step === 4) saveSlideEdits();
    if (state.step === 5) { await exportCarousel(); return; }
    state.step = Math.min(5, state.step + 1); draw();
  });
  $('[data-back]')?.addEventListener('click', () => { if (state.step === 4) saveSlideEdits(); state.step--; draw(); });
  document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { state.preset = b.dataset.preset; draw(); });
  document.querySelectorAll('[data-palette]').forEach(b => b.onclick = () => { state.palette = b.dataset.palette; draw(); });
  document.querySelectorAll('[data-framework]').forEach(b => b.onclick = () => { saveSlideEdits(); state.framework = b.dataset.framework; draw(); });
  $('#generate-text')?.addEventListener('click', async () => { saveSlideEdits(); const button = $('#generate-text'); button.disabled = true; button.textContent = 'Drafting…'; const response = await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...state,slideCount:state.slideCount})}); const data = await response.json(); state.slides = data.slides; state.slideIndex = 0; draw(); });
  document.querySelectorAll('[data-image]').forEach(input => input.onchange = async () => { const file = input.files?.[0]; if (!file) return; state.images[input.dataset.image] = await readImage(file); draw(); });
  document.querySelectorAll('[data-clear-image]').forEach(button => button.onclick = () => { delete state.images[button.dataset.clearImage]; draw(); });
  $('#stock-search')?.addEventListener('click', async () => { const query=$('#stock-query').value.trim(); if(!query)return; const r=await fetch(`/api/images?q=${encodeURIComponent(query)}`); const data=await r.json(); const target=$('#stock-results'); target.innerHTML=(data.photos||[]).map((p,i)=>`<button class="image-slot" data-stock="${i}" style="padding:0"><img src="${esc(p.thumb)}" alt="${esc(p.alt)}"></button>`).join('')||`<div class="field-help">${esc(data.message || 'No photos found.')}</div>`; target.querySelectorAll('[data-stock]').forEach((button,i)=>button.onclick=async()=>{const photo=data.photos[i];const image=await fetch(photo.url).then(x=>x.blob());state.images[state.slideIndex]=await readImage(new File([image],'stock-photo.jpg',{type:image.type||'image/jpeg'}));draw();}); });
  $('#caption-prompt')?.addEventListener('click', async () => { saveSlideEdits(); const r = await fetch('/api/caption',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slides:state.slides,offer:state.offer,audience:state.audience,cta:state.cta})}); const d=await r.json(); const out=$('#caption-output'); if (d.caption) out.innerHTML=`<div class="export-success">${esc(d.caption)}</div>`; else out.innerHTML=`<div class="export-success"><b>Copy this prompt into your agent workspace:</b><span class="code-box">${esc(d.prompt || d.error)}</span><button class="secondary-button" id="copy-caption">Copy prompt</button></div>`; $('#copy-caption')?.addEventListener('click',()=>navigator.clipboard.writeText(d.prompt)); });
}
function saveSlideEdits() { document.querySelectorAll('[data-slide-heading]').forEach(el => { const s=state.slides[Number(el.dataset.slideHeading)]; if(s) s.heading=el.value; }); document.querySelectorAll('[data-slide-body]').forEach(el => { const s=state.slides[Number(el.dataset.slideBody)]; if(s) s.body=el.value; }); }
function readImage(file) { return new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }
async function exportCarousel() {
  saveSlideEdits(); const button=$('[data-next]'); button.disabled=true; button.textContent='Rendering…';
  const r=await fetch('/api/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:state.offer,offer:state.offer,slides:state.slides.map((s,i)=>({...s,cta:state.cta,imageData:state.images[i]||null})),presetId:state.preset,palette:state.palette,headlineHook:state.slides[0]?.heading,pageId:$('#page-id')?.value.trim()||undefined,link:$('#landing-link')?.value.trim()||undefined,message:$('#primary-message')?.value.trim()||undefined})}); const d=await r.json(); button.disabled=false; button.textContent='Export again →';
  if(!r.ok){alert(d.error || 'Export failed.');return;} state.exported=d; draw();
}
$('#preview-prev').onclick=()=>{state.slideIndex=Math.max(0,state.slideIndex-1);updatePreview();}; $('#preview-next').onclick=()=>{state.slideIndex=Math.min(state.slides.length-1,state.slideIndex+1);updatePreview();};
$('#settings-open').onclick=async()=>{const r=await fetch('/api/settings');state.settings=await r.json();$('#pexels-status').textContent=state.settings.pexelsEnabled?'On':'Off';$('#caption-status').textContent=state.settings.aiCaptionEnabled?'On':'Off';$('#settings-dialog').showModal();};
$('#workspace-location').textContent='Workspace: workspace/creatives';
fetch('/api/settings').then(r=>r.json()).then(d=>{state.settings=d;}).catch(()=>{});
draw();
