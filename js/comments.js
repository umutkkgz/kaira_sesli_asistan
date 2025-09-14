import { escapeHTML } from './utils.js';

function apiBase(){
  try{ return (window.API_PROXY_BASE || localStorage.getItem('kaira_api_base') || '').replace(/\/$/,''); }catch(_){ return ''; }
}
function token(){ try{ return localStorage.getItem('kaira_auth_token') || ''; }catch(_){ return ''; } }

const listEl = document.getElementById('comments-list');
const formEl = document.getElementById('comment-form');
const txtEl = document.getElementById('comment-text');
const sendBtn = document.getElementById('comment-send');
const msgEl = document.getElementById('comment-msg');
const authHint = document.getElementById('comment-auth-hint');

function setAuthUI(){
  const t = token();
  const ok = !!t;
  if (!ok){
    formEl.classList.add('opacity-60');
    if (authHint) authHint.classList.remove('hidden');
  } else {
    formEl.classList.remove('opacity-60');
    if (authHint) authHint.classList.add('hidden');
  }
}
setAuthUI();

function fmtDate(iso){
  try{ const d=new Date(iso); return d.toLocaleString(); }catch(_){ return iso||''; }
}

async function loadComments(){
  const b = apiBase(); if (!b || !listEl) return;
  try{
    const r = await fetch(`${b}/api/comments?limit=50`, { headers: { 'ngrok-skip-browser-warning':'true' }, cache:'no-store' });
    if (!r.ok) throw new Error('Yorumlar alınamadı');
    const j = await r.json();
    const items = Array.isArray(j.items) ? j.items : [];
    listEl.innerHTML = items.map(it => {
      const user = escapeHTML(it.username || 'kullanıcı');
      const date = escapeHTML(fmtDate(it.ts));
      const text = escapeHTML(it.text || '');
      const up = Number(it.up||0), down = Number(it.down||0);
      return `<div class="bg-gray-900/60 border border-gray-700 rounded-2xl p-3">
        <div class="text-sm text-gray-400">${user} • ${date}</div>
        <div class="text-slate-200 mt-1">${text}</div>
        <div class="mt-2 flex items-center gap-3 text-sm">
          <button class="c-up bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded" data-id="${it.id}">👍 <span>${up}</span></button>
          <button class="c-down bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded" data-id="${it.id}">👎 <span>${down}</span></button>
        </div>
      </div>`;
    }).join('');
  }catch(e){ /* silent */ }
}

async function sendComment(){
  msgEl.textContent=''; msgEl.className='text-sm text-gray-300';
  const t = token(); if (!t){ msgEl.textContent='Giriş yapmalısınız.'; msgEl.className='text-sm text-rose-400'; return; }
  const base = apiBase(); if (!base){ msgEl.textContent='Sunucu ayarlı değil'; msgEl.className='text-sm text-rose-400'; return; }
  const text = (txtEl.value||'').trim(); if (!text){ return; }
  try{
    const headers = { 'Content-Type':'application/json', 'X-Auth-Token': t };
    // Fallback Bearer for compatibility
    headers['Authorization'] = `Bearer ${t}`;
    const r = await fetch(`${base}/api/comments`, {
      method:'POST', headers, body: JSON.stringify({ text })
    });
    if (!r.ok){ const j = await r.json().catch(()=>({})); throw new Error(j.error||'Gönderim başarısız'); }
    txtEl.value=''; msgEl.textContent='Gönderildi'; msgEl.className='text-sm text-emerald-400';
    await loadComments();
  }catch(e){ msgEl.textContent='Yayınlanmadı (moderasyon)'; msgEl.className='text-sm text-amber-300'; }
}

function onListClick(e){
  const upBtn = e.target.closest('.c-up');
  const downBtn = e.target.closest('.c-down');
  if (!upBtn && !downBtn) return;
  const t = token(); if (!t){ alert('Giriş gerekli'); return; }
  const id = (upBtn||downBtn).dataset.id; const val = upBtn ? 'up' : 'down';
  const base = apiBase(); if (!base) return;
  const headers = { 'Content-Type':'application/json', 'X-Auth-Token': t };
  headers['Authorization'] = `Bearer ${t}`;
  fetch(`${base}/api/comments/rate`, {
    method:'POST', headers, body: JSON.stringify({ id, value: val })
  }).then(()=> loadComments()).catch(()=>{});
}

if (sendBtn) sendBtn.addEventListener('click', sendComment);
if (listEl) listEl.addEventListener('click', onListClick);

// Lazy load on section visibility
try{
  const sec = document.getElementById('comments-section');
  if (sec && 'IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if (en.isIntersecting){ loadComments(); io.disconnect(); } }); });
    io.observe(sec);
  } else {
    loadComments();
  }
}catch(_){ loadComments(); }

// Login durumu sonrası formu otomatik etkinleştir
window.addEventListener('storage', (e)=>{ if (e.key === 'kaira_auth_token') setAuthUI(); });
window.addEventListener('focus', setAuthUI);
document.addEventListener('visibilitychange', ()=>{ if (document.visibilityState==='visible') setAuthUI(); });
