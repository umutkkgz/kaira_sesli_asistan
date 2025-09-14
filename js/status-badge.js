// KAIRA Status Badge — shows server online/offline and planned maintenance
(function(){
  function baseURL(){
    try{
      return (window.API_PROXY_BASE && window.API_PROXY_BASE.trim()) || (localStorage.getItem('kaira_api_base')||'');
    }catch(_){ return ''; }
  }

  function mk(el, cls, text){ const d = document.createElement(el); if (cls) d.className = cls; if (text!=null) d.textContent = text; return d; }

  function ensureBadgeRoot(){
    let el = document.getElementById('kaira-status-badge');
    if (el) return el;
    el = mk('div');
    el.id = 'kaira-status-badge';
    el.style.position = 'fixed';
    el.style.top = '8px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '2147483646';
    el.style.pointerEvents = 'auto';
    el.style.fontSize = '12px';
    el.style.fontWeight = '600';
    el.style.borderRadius = '9999px';
    el.style.padding = '6px 10px';
    el.style.backdropFilter = 'blur(10px)';
    el.style.WebkitBackdropFilter = 'blur(10px)';
    el.style.border = '1px solid rgba(255,255,255,0.15)';
    el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.35)';
    el.style.background = 'rgba(30,41,59,0.7)'; // default
    el.style.color = '#e5e7eb';
    const span = mk('span', '', 'Durum: bilinmiyor');
    span.id = 'kaira-status-label';
    el.appendChild(span);
    document.body.appendChild(el);
    return el;
  }

  function setBadge(state){
    const el = ensureBadgeRoot();
    const label = el.querySelector('#kaira-status-label');
    if (!label) return;
    if (state.maintenance){
      el.style.background = 'rgba(180,83,9,0.85)'; // amber-700
      el.style.borderColor = 'rgba(252,211,77,0.35)';
      label.textContent = 'Bakım Modu';
      el.title = state.note ? String(state.note) : 'Planlı bakım aktif';
      return;
    }
    if (state.online){
      el.style.background = 'rgba(6,95,70,0.85)'; // emerald-800
      el.style.borderColor = 'rgba(16,185,129,0.35)';
      label.textContent = 'Sunucu: Çevrimiçi';
      el.title = 'API sağlıklı';
    } else {
      el.style.background = 'rgba(127,29,29,0.88)'; // red-800
      el.style.borderColor = 'rgba(248,113,113,0.35)';
      label.textContent = 'Sunucu: Çevrimdışı';
      el.title = 'Ağ veya sunucu erişilemiyor';
    }
  }

  async function safeJSON(res){ try{ return await res.json(); }catch(_){ return {}; } }

  async function checkHealth(){
    const base = baseURL(); if (!base) return { online:false };
    try{
      const r = await fetch(base.replace(/\/$/,'') + '/api/health', { headers:{ 'ngrok-skip-browser-warning':'true' }, cache:'no-store' });
      if (!r.ok) return { online:false };
      const j = await safeJSON(r);
      return { online: true, raw: j };
    }catch(_){ return { online:false }; }
  }

  async function checkMaintRemote(){
    const base = baseURL(); if (!base) return { maintenance:false };
    const paths = ['/api/status', '/api/maintenance', '/api/flags'];
    for (const p of paths){
      try{
        const r = await fetch(base.replace(/\/$/,'') + p, { headers:{ 'ngrok-skip-browser-warning':'true' }, cache:'no-store' });
        if (!r.ok) continue;
        const j = await safeJSON(r);
        const m = (j && (j.maintenance || j.maint || j.plannedMaintenance || j.maintenance_mode));
        if (typeof m !== 'undefined') return { maintenance: !!m, note: j.note || j.message || '' };
      }catch(_){ /* try next */ }
    }
    return { maintenance:false };
  }

  function checkMaintLocal(){
    try{
      const force = localStorage.getItem('kaira_maintenance_force') === '1';
      const note = localStorage.getItem('kaira_maintenance_note') || '';
      return { maintenance: force, note };
    }catch(_){ return { maintenance:false }; }
  }

  let _lastReq = 0;
  async function refresh(){
    const now = Date.now();
    if (now - _lastReq < 5000) return; // basit anti-spam (5 sn)
    _lastReq = now;
    const [health, mRemote] = await Promise.all([checkHealth(), checkMaintRemote()]);
    const mLocal = checkMaintLocal();
    const state = { online: !!health.online, maintenance: !!(mRemote.maintenance || mLocal.maintenance), note: mLocal.note || mRemote.note || '' };
    setBadge(state);
  }

  function start(){
    const el = ensureBadgeRoot();
    // İlk yüklemede bir kez kontrol et
    refresh();
    // Otomatik periyodik ping yok; sadece görünür olduğunda veya kullanıcı tıklayınca
    document.addEventListener('visibilitychange', ()=>{ if (document.visibilityState === 'visible') refresh(); });
    window.addEventListener('online', refresh);
    try { el.addEventListener('click', refresh); } catch(_){ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
