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
    'AÇIK METİN YERİNE KOD BLOKLARI ÜRET. Açıklamayı çok kısa tut.',
    'Var olan dosyalarda TAMAMIYLA ÜZERİNE YAZMA. Bölgesel yama (patch) yaklaşımı kullan.',
    'Her blok üç tırnak içinde ve info satırında filename içersin: ```<lang> filename=dosya.js```',
    'Bölgesel değişiklik için gövdeye KAIRA işaretçileri ekle: JS/TS: // KAIRA:BEGIN <id> ... // KAIRA:END <id> | CSS: /* KAIRA:BEGIN <id> */ ... /* KAIRA:END <id> */ | HTML: <!-- KAIRA:BEGIN <id> --> ... <!-- KAIRA:END <id> -->',
    'Aynı id tekrar gönderildiğinde Code Lab o bölgeyi dosyada bularak sadece o kısmı günceller; yoksa sona ekler.',
    'Tam dosya yenilemek ZORUNLUYSA info satırına mode=replace ekle (örn: ```javascript filename=main.js mode=replace```).',
    'Yeni dosya gerekiyorsa aynı formatta ayrı blok olarak ver.'
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
    let mode = null; // 'replace' | 'merge'
    // 1) info line: filename= veya file=
    const fi = /(?:^|\s)(?:filename|file)\s*=\s*([^\s]+)/i.exec(info);
    if (fi) filename = fi[1].replace(/^"|"$/g,'');
    // 1b) info satırında doğrudan dosya adı (örn: ```script.js)
    if (!filename){
      const fInfo = /(?:^|\s)([^\s]+\.(?:js|jsx|ts|tsx|css|html|json|md))(?:$|\s)/i.exec(info);
      if (fInfo) filename = fInfo[1];
    }
    const mi = /(?:^|\s)mode\s*=\s*(replace|merge)/i.exec(info);
    if (mi) mode = mi[1].toLowerCase();
    // 2) gövde ilk satır: file: NAME
    if (!filename){
      const firstLine = body.split(/\r?\n/)[0] || '';
      const f2 = /file\s*:\s*([^\s]+)/i.exec(firstLine);
      if (f2) filename = f2[1].trim();
    }
    // 3) gövde ilk satır: yorum içinde NAME.ext (// main.js, /* style.css */, <!-- index.html -->)
    if (!filename){
      const firstLine = body.split(/\r?\n/)[0] || '';
      const f3 = /(?:\/\/|#|<!--|\/\*)\s*([^\s]+\.(?:js|jsx|ts|tsx|css|html|json|md))/i.exec(firstLine);
      if (f3) filename = f3[1].trim();
    }
    blocks.push({ info, filename, content: body, mode });
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
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_save', { file: files[active]?.name }); }catch(_){ }
  });
  document.getElementById('cl-new-file')?.addEventListener('click', ()=>{
    const name = prompt('Yeni dosya adı (örn: helper.js, style.css):','script.js');
    if (!name) return;
    files.push({ name, content: '' });
    active = files.length - 1; saveFiles(files); loadActive();
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_new_file', { file: name }); }catch(_){ }
  });
  document.getElementById('cl-rename-file')?.addEventListener('click', ()=>{
    if (!files[active]) return;
    const oldName = files[active].name;
    const name = prompt('Yeni dosya adı:', oldName);
    if (!name || name === oldName) return;
    if (files.some((f,i)=> i!==active && f.name === name)) { try{ alert('Aynı isimde bir dosya zaten var.'); }catch(_){} return; }
    files[active].name = name;
    saveFiles(files); loadActive();
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_rename_file', { from: oldName, to: name }); }catch(_){ }
  });
  document.getElementById('cl-delete-file')?.addEventListener('click', ()=>{
    if (!files[active]) return;
    if (!confirm(`${files[active].name} silinsin mi?`)) return;
    files.splice(active,1); if (active >= files.length) active = files.length-1; if (active<0) active=0; saveFiles(files); loadActive();
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_delete_file'); }catch(_){ }
  });
  document.getElementById('cl-run')?.addEventListener('click', ()=>{
    if (files[active]){ files[active].content = editor.value; saveFiles(files); }
    const html = buildRunnerHTML(files);
    iframe.srcdoc = html;
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_run', { files: files.length }); }catch(_){ }
  });
  document.getElementById('cl-reset')?.addEventListener('click', ()=>{ iframe.srcdoc = '<!doctype html><meta charset="utf-8"><style>html,body{height:100%;margin:0;background:#000}</style>'; });

  document.getElementById('cl-generate')?.addEventListener('click', async ()=>{
    const out = document.getElementById('cl-ai-output');
    const prompt = (document.getElementById('cl-prompt')||{}).value || '';
    out.textContent = 'Üretiliyor…';
    try{
      try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_generate', { prompt_len: (prompt||'').length, files: files.length }); }catch(_){ }
      const reply = await callAssistant(prompt, files);
      out.textContent = reply;
      try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_generated', { reply_len: (reply||'').length }); }catch(_){ }
      // Otomatik uygulama yerine, kullanıcı 'Kodu Uygula' tuşuna basınca
    } catch(e){ out.textContent = 'Hata: ' + (e?.message||e); }
  });

  function fallbackFilenameFor(lang){
    const l = String(lang||'').toLowerCase();
    if (l.includes('html')) return 'index.html';
    if (l.includes('css')) return 'style.css';
    if (/(^|\s)(jsx)($|\s)/.test(l)) return 'main.jsx';
    if (/(^|\s)(tsx)($|\s)/.test(l)) return 'main.tsx';
    if (/(^|\s)(ts)($|\s)/.test(l)) return 'main.ts';
    if (/(^|\s)(js|javascript)($|\s)/.test(l)) return 'main.js';
    if (l.includes('json')) return 'data.json';
    if (l.includes('markdown') || l.includes('md')) return 'README.md';
    return 'snippet.txt';
  }
  // --- Sürüm geçmişi + Güvenli birleştirme ---
  function loadHistory(){
    try { const raw = localStorage.getItem('kaira_codelab_history'); return raw ? JSON.parse(raw) : []; } catch(_){ return []; }
  }
  function saveHistorySnapshot(files){
    try{
      const hist = loadHistory();
      const snapshot = JSON.parse(JSON.stringify(files));
      hist.push({ at: Date.now(), files: snapshot });
      while (hist.length > 10) hist.shift();
      localStorage.setItem('kaira_codelab_history', JSON.stringify(hist));
    }catch(_){ }
  }
  function undoLast(){
    const hist = loadHistory();
    if (!hist.length) return false;
    const last = hist.pop();
    localStorage.setItem('kaira_codelab_history', JSON.stringify(hist));
    if (last && Array.isArray(last.files)){
      files = last.files;
      saveFiles(files);
      loadActive();
      return true;
    }
    return false;
  }

  function applyBlocksFromOutput(){
    const out = document.getElementById('cl-ai-output');
    const txt = out ? out.textContent : '';
    // Önce aktif dosyayı kaydet ki en güncel hali üzerinden birleştirelim
    try{
      if (files[active]){ files[active].content = (document.getElementById('cl-editor')?.value || files[active].content); saveFiles(files); }
    }catch(_){ }
    if (!txt || !txt.includes('```')) { if (out) out.textContent += '\n\n(Blok bulunamadı — üç tırnaklı kod blokları bekleniyor.)'; return; }
    const blocks = parseCodeBlocks(txt);
    if (!(blocks && blocks.length)) { if (out) out.textContent += '\n\n(Blok ayrıştırılamadı.)'; return; }

    // Değişikliklerden önce mevcut durumu yedekle
    saveHistorySnapshot(files);
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('codelab_apply', { blocks: blocks.length }); }catch(_){ }

    function getExt(name){ return String(name||'').split('.').pop()?.toLowerCase() || ''; }
    function markerWrap(name, id, inner){
      const ext = getExt(name);
      if (/^x?html?$/.test(ext)) return `<!-- KAIRA:BEGIN ${id} -->\n${inner}\n<!-- KAIRA:END ${id} -->`;
      if (ext === 'css') return `/* KAIRA:BEGIN ${id} */\n${inner}\n/* KAIRA:END ${id} */`;
      // js/ts/jsx/tsx ve diğerleri
      return `// KAIRA:BEGIN ${id}\n${inner}\n// KAIRA:END ${id}`;
    }
    function detectRegion(body){
      const reBegin = /KAIRA:\s*BEGIN\s+([\w.-]+)/;
      const reEnd = (id)=> new RegExp(`KAIRA:\\s*END\\s+${id.replace(/[.*+?^${}()|[\\]\\]/g, r=>"\\"+r)}`);
      const mb = reBegin.exec(body);
      if (!mb) return null;
      const id = mb[1];
      const start = mb.index;
      const tail = body.slice(start);
      const me = reEnd(id).exec(tail);
      if (!me) return { id, full: body.slice(start) };
      const endIdx = start + me.index + me[0].length;
      return { id, full: body.slice(start, endIdx) };
    }
    function replaceOrAppendRegion(filename, current, regionId, regionText){
      const lines = current.split(/\r?\n/);
      let beginLine = -1, endLine = -1;
      const beginStr = `KAIRA:BEGIN ${regionId}`;
      const endStr = `KAIRA:END ${regionId}`;
      for (let i=0;i<lines.length;i++){
        if (beginLine === -1 && lines[i].includes(beginStr)) beginLine = i;
        if (beginLine !== -1 && lines[i].includes(endStr)) { endLine = i; break; }
      }
      if (beginLine !== -1 && endLine !== -1 && endLine >= beginLine){
        const before = lines.slice(0, beginLine).join('\n');
        const after = lines.slice(endLine+1).join('\n');
        return (before ? before + '\n' : '') + regionText + (after ? '\n' + after : '');
      }
      // yoksa sona ekle
      return (current ? current.replace(/\n*$/, '\n') : '') + regionText + '\n';
    }

    blocks.forEach(b => {
      let fname = b.filename;
      if (!fname){
        // info line'da dil varsa uygun varsayılan isim
        fname = fallbackFilenameFor(b.info||'');
      }
      if (!fname) return;
      const idx = files.findIndex(f => f.name === fname);
      const exists = idx >= 0;
      const current = exists ? String(files[idx].content||'') : '';
      const mode = (b.mode === 'replace') ? 'replace' : 'merge';

      if (mode === 'replace'){
        if (exists) files[idx].content = b.content; else files.push({ name: fname, content: b.content });
        return;
      }

      // merge modu: Bölge tespit et, varsa değiştir; yoksa yeni bölge olarak ekle
      const det = detectRegion(b.content||'');
      if (det && det.id && det.full){
        const merged = replaceOrAppendRegion(fname, current, det.id, det.full);
        if (exists) files[idx].content = merged; else files.push({ name: fname, content: merged });
      } else {
        // Marker yoksa: dosya varsa güvenli olarak yeni bir bölge oluşturup ekleyelim
        // Benzersiz id üretelim ki aynı saniye içinde birden çok blok çakışmasın
        const autoId = 'auto-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
        const wrapped = markerWrap(fname, autoId, b.content||'');
        const merged = replaceOrAppendRegion(fname, current, autoId, wrapped);
        if (exists) files[idx].content = merged; else files.push({ name: fname, content: merged });
      }
    });
    saveFiles(files); loadActive();
    try{
      const list = blocks.map((b,i)=>`- ${b.filename || fallbackFilenameFor(b.info||'')} (${(b.mode||'merge')})`).join('\n');
      if (out) out.textContent += `\n\n(${blocks.length} blok uygulandı)\n${list}`;
    }catch(_){ if (out) out.textContent += `\n\n(${blocks.length} blok uygulandı)`; }
  }
  document.getElementById('cl-apply')?.addEventListener('click', applyBlocksFromOutput);
  document.getElementById('cl-undo')?.addEventListener('click', ()=>{
    const ok = undoLast();
    if (!ok){ try{ alert('Geri alacak bir değişiklik yok.'); }catch(_){ }
  }});

  // Kısayollar: Ctrl/Cmd+S => Kaydet, Ctrl/Cmd+Enter => Çalıştır, Ctrl/Cmd+B => Kodu Uygula
  try {
    const onKey = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const btn = document.getElementById('cl-save');
        if (btn) btn.click();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById('cl-run');
        if (btn) btn.click();
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        const btn = document.getElementById('cl-apply');
        if (btn) btn.click();
      }
    };
    editor?.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onKey);
  } catch(_) {}
}

// otomatik export
window.initializeCodeLab = initializeCodeLab;
