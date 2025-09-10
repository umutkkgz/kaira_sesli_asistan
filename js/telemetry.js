// KAIRA Telemetry — client-side logging helpers
// Sends structured events to the server's /api/log endpoint (BigData-ready)

(function(){
  const UID = (()=>{
    try{
      const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
      if (u && u.username){ localStorage.setItem('kaira_uid', u.username); return u.username; }
      let id = localStorage.getItem('kaira_uid'); if (!id){ id = (crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`); localStorage.setItem('kaira_uid', id);} return id;
    }catch(_){ return 'anon'; }
  })();

  async function post(event, data){
    const API_BASE = (window.API_PROXY_BASE || '').replace(/\/$/, '');
    if (!API_BASE) return; // base henüz set edilmemiş olabilir, sessiz geç
    const payload = Object.assign({
      event,
      user_id: UID,
      href: location.href,
      title: document.title
    }, data||{});
    try{
      await fetch(`${API_BASE}/api/log`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'ngrok-skip-browser-warning':'true' },
        body: JSON.stringify(payload)
      });
    }catch(_){ /* silent */ }
  }

  // Public API
  try{ window.KAIRA_LOG = (ev, obj)=>post(ev, obj); }catch(_){ }

  // Page load
  window.addEventListener('load', ()=>{
    post('page_load', { ref: document.referrer || '' });
  });

  // Navigation cards (selection -> views)
  function bindNav(id, view){ const el = document.getElementById(id); if (el) el.addEventListener('click', ()=>post('view_enter', { view })); }
  bindNav('select-asistan', 'asistan');
  bindNav('select-editor', 'editor');
  bindNav('select-chat', 'chat');
  bindNav('select-nasa', 'nasa');
  bindNav('select-codelab', 'codelab');
  bindNav('select-afterlife', 'afterlife');
  document.querySelectorAll('.back-to-selection').forEach(btn=>{
    btn.addEventListener('click', ()=>post('view_exit', { from: 'unknown' }));
  });

  // Asistan UI basics
  const micBtn = document.getElementById('asistan-mic-btn'); if (micBtn) micBtn.addEventListener('click', ()=>post('asistan_mic_click'));
  const sendBtn = document.getElementById('asistan-send-btn'); if (sendBtn) sendBtn.addEventListener('click', ()=>{ const t=(document.getElementById('asistan-text-input')||{}).value||''; post('asistan_send', { len: (t||'').length }); });
  const player = document.getElementById('asistan-player');
  if (player){
    player.addEventListener('play', ()=>post('asistan_audio_play', { src: player.currentSrc || '' }));
    player.addEventListener('ended', ()=>post('asistan_audio_end'));
  }

  // Code Lab buttons (if present)
  function bind(id, ev, extra){ const el = document.getElementById(id); if (el) el.addEventListener('click', ()=>post(ev, (typeof extra==='function'?extra():extra)||{})); }
  bind('cl-generate', 'codelab_generate', ()=>{ const p=(document.getElementById('cl-prompt')||{}).value||''; return { prompt_len: (p||'').length }; });
  bind('cl-apply', 'codelab_apply_clicked');
  bind('cl-run', 'codelab_run');
  bind('cl-save', 'codelab_save');
  bind('cl-new-file', 'codelab_new_file');
  bind('cl-delete-file', 'codelab_delete_file');

  // Photo editor: watch file inputs and downloads
  document.addEventListener('change', (e)=>{
    const t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('#editor-view input[type=file], input[type=file]')){
      try{ const f = t.files && t.files[0]; if (f) post('upload_select', { name: f.name, size: f.size, type: f.type }); }catch(_){ }
    }
  }, true);
  document.addEventListener('click', (e)=>{
    const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a){ post('download', { name: a.getAttribute('download') || '', href: a.href || '' }); }
  }, true);

  // Errors → server
  window.addEventListener('error', (ev)=>{
    try{
      // Only report real ErrorEvents; ignore resource/media 'error' without message
      const isErrEvt = (ev && (ev.constructor && ev.constructor.name === 'ErrorEvent')) || ('message' in (ev||{}));
      const tgt = ev && ev.target;
      const isMedia = tgt && (tgt.tagName === 'AUDIO' || tgt.tagName === 'VIDEO');
      if (!isErrEvt || isMedia) return;
      const m = ev && ev.message ? ev.message : 'Unknown error';
      post('js_error', { message: m });
    }catch(_){ }
  }, true);
  window.addEventListener('unhandledrejection', (ev)=>{ try{ const r = ev && ev.reason; const m = (r && r.message) ? r.message : String(r); post('js_unhandledrejection', { message: m }); }catch(_){ } });
})();
