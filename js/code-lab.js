// KΔIRA Code Lab — basit çok dosyalı kod+canvas çalışma alanı

let __cl_initialized = false;

function defaultFiles(){
  return [
    { name: 'main.js', content: `// Basit örnek: dönen şekil\nconst canvas = document.getElementById('app');\nconst ctx = canvas.getContext('2d');\nfunction resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }\nwindow.addEventListener('resize', resize); resize();\nlet t=0;\nfunction loop(){\n  t+=0.02;\n  ctx.fillStyle = '#000014';\n  ctx.fillRect(0,0,canvas.width,canvas.height);\n  const cx = canvas.width/2, cy = canvas.height/2;\n  ctx.save();\n  ctx.translate(cx, cy);\n  ctx.rotate(t*0.7);\n  ctx.fillStyle = '#22d3ee';\n  ctx.beginPath();\n  ctx.rect(-80, -80, 160, 160);\n  ctx.fill();\n  ctx.restore();\n  requestAnimationFrame(loop);\n}\nloop();\n` },
    { name: 'style.css', content: `html,body{margin:0;padding:0;background:#000;}\n#app{width:100%;height:100%;display:block}` }
  ];
}

function loadFiles(){
  try{
    const raw = localStorage.getItem('kaira_codelab_files');
    if (!raw) return defaultFiles();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) return arr;
    return defaultFiles();
  } catch(_){ return defaultFiles(); }
}
function saveFiles(files){
  try{ localStorage.setItem('kaira_codelab_files', JSON.stringify(files)); }catch(_){ }
}

function renderFileList(files, activeIndex){
  const ul = document.getElementById('cl-file-list');
  ul.innerHTML = '';
  files.forEach((f, i) => {
    const li = document.createElement('li');
    li.textContent = f.name;
    li.className = 'px-2 py-1 rounded cursor-pointer ' + (i===activeIndex ? 'bg-gray-700 text-white' : 'hover:bg-gray-700/60');
    li.addEventListener('click', () => {
      const ev = new CustomEvent('cl:switch', { detail: { index: i } });
      document.dispatchEvent(ev);
    });
    ul.appendChild(li);
  });
}

function buildRunnerHTML(files){
  const css = files.filter(f=>/\.css$/i.test(f.name)).map(f=>f.content).join('\n\n');
  const jsFiles = files.filter(f=>/\.js$/i.test(f.name));
  const main = jsFiles.find(f=>f.name==='main.js');
  const others = jsFiles.filter(f=>f !== main);
  const js = `${others.map(f=>`\n/* ==== ${f.name} ==== */\n${f.content}`).join('\n')}\n\n/* ==== main.js ==== */\n${main ? main.content : ''}`;
  const htmlFile = files.find(f=>/\.html$/i.test(f.name));
  if (htmlFile){
    let html = String(htmlFile.content||'');
    // head/body garantile
    if (!/<head[\s>]/i.test(html)) html = html.replace(/<html[\s\S]*?>/i, m => m + '\n<head></head>');
    if (!/<body[\s>]/i.test(html)) html = html.replace(/<head[\s\S]*?<\/head>/i, m => m + '\n<body></body>');
    if (!/<head[\s\S]*?<\/head>/i.test(html)) html = `<head></head>${html}`;
    if (!/<body[\s\S]*?<\/body>/i.test(html)) html = `${html}<body></body>`;
    // CSS'i head'e enjekte et
    html = html.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`);
    // JS'i body sonuna modül olarak enjekte et
    html = html.replace(/<\/body>/i, `<script type="module">\ntry{\n${js}\n} catch(e){ console.error('[Runner]', e); const pre=document.createElement('pre'); pre.style.color='#f87171'; pre.textContent=String(e); document.body.appendChild(pre); }\n</script>\n</body>`);
    return html;
  }
  // html yoksa varsayılan iskelet
  return `<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>
  <style>${css}</style></head><body>
  <canvas id="app" style="width:100%;height:100vh"></canvas>
  <script type="module">\ntry{\n${js}\n} catch(e){ console.error('[Runner]', e); const pre=document.createElement('pre'); pre.style.color='#f87171'; pre.textContent=String(e); document.body.appendChild(pre); }\n</script>
  </body></html>`;
}

async function fetchModels(){
  const info = document.getElementById('cl-model-info');
  const sel = document.getElementById('cl-model');
  const PREFERRED = [
    'moonshotai/kimi-k2-instruct',
    'deepseek-r1-distill-llama-70b',
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile'
  ];
  try {
    // Her durumda tercih edilen modelleri göster
    sel.innerHTML = '';
    PREFERRED.forEach(m => { const o = document.createElement('option'); o.value=m; o.textContent=m; sel.appendChild(o); });
    // Varsayılanı ayarla
    sel.value = 'openai/gpt-oss-120b';
    // Bağlantı kontrolü (opsiyonel): sunucu modellerini al, ama UI’yı değiştirme
    try{
      const base = (window.API_PROXY_BASE||'').replace(/\/$/, '');
      await fetch(`${base}/api/models`, { headers: { 'ngrok-skip-browser-warning':'true' } }).catch(()=>{});
    }catch(_){ /* sessiz */ }
    if (info) info.textContent = 'Modeller hazır';
  } catch(e){ if (info) info.textContent = 'Model listesi yüklenemedi'; }
}

function extToLang(name){
  const n = String(name||'').toLowerCase();
  if (n.endsWith('.js')) return 'javascript';
  if (n.endsWith('.jsx')) return 'jsx';
  if (n.endsWith('.ts')) return 'ts';
  if (n.endsWith('.tsx')) return 'tsx';
  if (n.endsWith('.css')) return 'css';
  if (n.endsWith('.html')) return 'html';
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.md')) return 'markdown';
  return 'text';
}

function filesContext(files, perFileLimit=6000){
  try{
    let parts = [];
    files.forEach(f => {
      const lang = extToLang(f.name);
      const body = String(f.content||'');
      const slice = body.length > perFileLimit ? body.slice(0, perFileLimit) + "\n/* …trimmed… */" : body;
      parts.push(`\n\n\`\`\`${lang} filename=${f.name}\n${slice}\n\`\`\``);
    });
    return parts.join('');
  } catch(_){ return ''; }
}

async function callAssistant(prompt, files){
  const base = (window.API_PROXY_BASE||'').replace(/\/$/, '');
  const model = (document.getElementById('cl-model')||{}).value || 'openai/gpt-oss-120b';
  const context = `Mevcut dosyalar (ad, boyut):\n${files.map(f=>`- ${f.name} (${f.content.length}b)`).join('\n')}\n\nDosya içerikleri:${filesContext(files)}`;
  const sys = [
    'Sen yardımcı bir yazılım ajanısın.',
    'Yanıtlarında sadece gerekli kodu üret; açıklamayı kısa tut.',
    'Değişiklik/güncelleme için kodu üç tırnak bloklarında ver ve info satırına filename ekle: ```<lang> filename=dosya.js```',
    'Yeni dosya gerekiyorsa aynı formatta öner.',
    'Kısa, bağımsız, derlenebilir kod parçaları üret.'
  ].join(' ');
  const payload = { model, system: sys, prompt: `${context}\n\nİstek: ${prompt}` };
  const res = await fetch(`${base}/api/chat`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'ngrok-skip-browser-warning':'true' },
    body: JSON.stringify(payload)
  });
  if (!res.ok){ throw new Error(`HTTP ${res.status}`); }
  const data = await res.json();
  return String((data && (data.reply||data.text||'')) || '');
}

function parseCodeBlocks(text){
  const blocks = [];
  const re = /```([^\n]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))){
    const info = (m[1]||'').trim();
    let body = m[2] || '';
    let filename = null;
    // info line: look for filename= or file=
    const fi = /(?:^|\s)(?:filename|file)\s*=\s*([^\s]+)/i.exec(info);
    if (fi) filename = fi[1].replace(/^"|"$/g,'');
    if (!filename){
      // try first line comment markers
      const firstLine = body.split(/\r?\n/)[0];
      const f2 = /file\s*:\s*([^\s]+)/i.exec(firstLine||'');
      if (f2) filename = f2[1].trim();
    }
    blocks.push({ info, filename, content: body });
  }
  return blocks;
}

export function initializeCodeLab(){
  if (__cl_initialized) return; __cl_initialized = true;
  let files = loadFiles();
  let active = 0;
  const editor = document.getElementById('cl-editor');
  const activeLabel = document.getElementById('cl-active-file');
  const iframe = document.getElementById('cl-iframe');

  function loadActive(){
    renderFileList(files, active);
    if (files[active]){
      activeLabel.textContent = files[active].name;
      editor.value = files[active].content;
    } else {
      activeLabel.textContent = '(dosya yok)';
      editor.value = '';
    }
  }
  loadActive();
  fetchModels().catch(()=>{});

  document.addEventListener('cl:switch', (ev) => {
    if (typeof ev.detail?.index === 'number'){ active = ev.detail.index; loadActive(); }
  });
  document.getElementById('cl-save')?.addEventListener('click', ()=>{
    if (files[active]){ files[active].content = editor.value; saveFiles(files); }
  });
  document.getElementById('cl-new-file')?.addEventListener('click', ()=>{
    const name = prompt('Yeni dosya adı (örn: helper.js, style.css):','script.js');
    if (!name) return;
    files.push({ name, content: '' });
    active = files.length - 1; saveFiles(files); loadActive();
  });
  document.getElementById('cl-delete-file')?.addEventListener('click', ()=>{
    if (!files[active]) return;
    if (!confirm(`${files[active].name} silinsin mi?`)) return;
    files.splice(active,1); if (active >= files.length) active = files.length-1; if (active<0) active=0; saveFiles(files); loadActive();
  });
  document.getElementById('cl-run')?.addEventListener('click', ()=>{
    if (files[active]){ files[active].content = editor.value; saveFiles(files); }
    const html = buildRunnerHTML(files);
    iframe.srcdoc = html;
  });
  document.getElementById('cl-reset')?.addEventListener('click', ()=>{ iframe.srcdoc = '<!doctype html><meta charset="utf-8"><style>html,body{height:100%;margin:0;background:#000}</style>'; });

  document.getElementById('cl-generate')?.addEventListener('click', async ()=>{
    const out = document.getElementById('cl-ai-output');
    const prompt = (document.getElementById('cl-prompt')||{}).value || '';
    out.textContent = 'Üretiliyor…';
    try{
      const reply = await callAssistant(prompt, files);
      out.textContent = reply;
      // Otomatik uygulama yerine, kullanıcı 'Kodu Uygula' tuşuna basınca
    } catch(e){ out.textContent = 'Hata: ' + (e?.message||e); }
  });

  function fallbackFilenameFor(lang){
    const l = String(lang||'').toLowerCase();
    if (l.includes('html')) return 'index.html';
    if (l.includes('css')) return 'style.css';
    if (l.includes('js')) return 'main.js';
    if (l.includes('ts')) return 'main.ts';
    return 'snippet.txt';
  }
  function applyBlocksFromOutput(){
    const out = document.getElementById('cl-ai-output');
    const txt = out ? out.textContent : '';
    if (!txt || !txt.includes('```')) return;
    const blocks = parseCodeBlocks(txt);
    if (!(blocks && blocks.length)) return;
    blocks.forEach(b => {
      let fname = b.filename;
      if (!fname){
        // info line'da dil varsa uygun varsayılan isim
        fname = fallbackFilenameFor(b.info||'');
      }
      if (!fname) return;
      const idx = files.findIndex(f => f.name === fname);
      if (idx >= 0) files[idx].content = b.content; else files.push({ name: fname, content: b.content });
    });
    saveFiles(files); loadActive();
  }
  document.getElementById('cl-apply')?.addEventListener('click', applyBlocksFromOutput);
}

// otomatik export
window.initializeCodeLab = initializeCodeLab;
