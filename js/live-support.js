// Live Support client (WebSocket)
(function(){
  const btn = document.getElementById('live-support-btn');
  const modal = document.getElementById('live-support-modal');
  const closeBtn = document.getElementById('live-support-close');
  const ident = document.getElementById('live-support-ident');
  const chat = document.getElementById('live-support-chat');
  const nameEl = document.getElementById('ls-name');
  const emailEl = document.getElementById('ls-email');
  const startBtn = document.getElementById('ls-start');
  const messages = document.getElementById('ls-messages');
  const input = document.getElementById('ls-input');
  const sendBtn = document.getElementById('ls-send');

  if (!btn || !modal) return;

  // --- Local history persistence (per device) ---
  const HISTORY_KEY = 'kaira_support_history_v1';
  let currentChatId = null; // set on welcome
  let loadedSavedOnce = false;
  function uid(){ try{ let id = localStorage.getItem('kaira_uid'); if (!id){ id = (crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`); localStorage.setItem('kaira_uid', id);} return id; } catch(_){ return `user_${Date.now()}`; } }
  function readHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); }catch(_){ return []; } }
  function writeHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch(_){ }
  }
  function appendHistory(entry){
    const rec = Object.assign({ ts: Math.floor(Date.now()/1000), chat_id: currentChatId || null, uid: uid() }, entry);
    const arr = readHistory(); arr.push(rec); writeHistory(arr);
  }
  function renderSavedHistory(){
    if (loadedSavedOnce) return;
    const arr = readHistory(); if (!arr.length) { loadedSavedOnce = true; return; }
    // Heading
    const head = document.createElement('div');
    head.className = 'text-center text-xs text-gray-400 my-2';
    head.textContent = 'Önceki Sohbet Kayıtları';
    messages.appendChild(head);
    // Messages
    const sorted = arr.slice().sort((a,b)=> (a.ts||0)-(b.ts||0));
    for (const m of sorted){
      const role = (m.role === 'admin') ? 'admin' : 'user';
      const div = document.createElement('div');
      div.className = `px-3 py-2 rounded-lg text-sm ${role==='admin' ? 'bg-emerald-700/40 text-emerald-100 self-start' : 'bg-gray-700 text-white self-end'}`;
      // Optional timestamp prefix for clarity
      try{
        const dt = new Date((m.ts||0)*1000).toLocaleString();
        div.textContent = `[${dt}] ${m.text||''}`;
      }catch(_){ div.textContent = String(m.text||''); }
      messages.appendChild(div);
    }
    messages.scrollTop = messages.scrollHeight;
    loadedSavedOnce = true;
  }

  function apiBase(){ return (window.API_PROXY_BASE || '').replace(/\/$/, ''); }
  function wsUrl(){
    const base = apiBase();
    const origin = base || (location.origin);
    try{
      const u = new URL(origin);
      u.protocol = (u.protocol === 'https:') ? 'wss:' : 'ws:';
      u.pathname = (u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname) + '/ws/support';
      return u.toString();
    }catch(_){
      // fallback same origin
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${location.host}/ws/support`;
    }
  }

  let ws = null; let chatId = null;
  function show(){ modal.classList.remove('hidden'); }
  function hide(){ modal.classList.add('hidden'); }
  function addMsg(text, role){
    const div = document.createElement('div');
    div.className = `px-3 py-2 rounded-lg text-sm ${role==='admin' ? 'bg-emerald-700/40 text-emerald-100 self-start' : 'bg-gray-700 text-white self-end'}`;
    div.textContent = text;
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
    // persist locally and log to server
    appendHistory({ text: String(text||''), role: role==='admin' ? 'admin' : 'user' });
    try{ logSupport('support_msg', { role: role==='admin'?'admin':'user', text: String(text||''), chat_id: currentChatId||chatId||null }); }catch(_){ }
  }

  btn.addEventListener('click', ()=>{ show(); try{ if (window.KAIRA_LOG) window.KAIRA_LOG('support_open'); }catch(_){ } });
  closeBtn.addEventListener('click', hide);

  // Prefill
  try{
    const n = localStorage.getItem('kaira_support_name'); if (n) nameEl.value = n;
    const e = localStorage.getItem('kaira_support_email'); if (e) emailEl.value = e;
  }catch(_){ }

  function connect(){
    const name = (nameEl.value||'').trim() || 'Ziyaretçi';
    const email = (emailEl.value||'').trim();
    try{ localStorage.setItem('kaira_support_name', name); }catch(_){ }
    try{ localStorage.setItem('kaira_support_email', email); }catch(_){ }
    const url = wsUrl() + `?uid=${encodeURIComponent(uid())}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
    ws = new WebSocket(url);
    ws.onopen = ()=>{ addMsg('Bağlantı kuruldu. Sorunuzu iletebilirsiniz.', 'admin'); try{ if (window.KAIRA_LOG) window.KAIRA_LOG('support_ws_open'); }catch(_){ } };
    ws.onmessage = (ev)=>{
      try{
        const msg = JSON.parse(ev.data);
        if (msg && msg.type === 'welcome') { chatId = msg.chat_id; currentChatId = chatId; try{ logSupport('support_welcome', { chat_id: chatId }); }catch(_){ } }
        if (msg && msg.type === 'admin') { addMsg(String(msg.text||''), 'admin'); }
      }catch(_){ /* plain text */ }
    };
    ws.onclose = ()=>{ try{ if (window.KAIRA_LOG) window.KAIRA_LOG('support_ws_close'); }catch(_){ } };
    ws.onerror = ()=>{ try{ if (window.KAIRA_LOG) window.KAIRA_LOG('support_ws_error'); }catch(_){ } };
  }

  startBtn.addEventListener('click', ()=>{
    if (!nameEl.value.trim()) { nameEl.focus(); return; }
    ident.classList.add('hidden');
    chat.classList.remove('hidden');
    // Render any saved history for this device
    renderSavedHistory();
    connect();
  });

  function send(){
    const t = (input.value||'').trim();
    if (!t || !ws || ws.readyState !== ws.OPEN) return;
    ws.send(t);
    addMsg(t, 'user');
    input.value = '';
    try{ if (window.KAIRA_LOG) window.KAIRA_LOG('support_client_send', { len: t.length }); }catch(_){ }
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });

  // --- Lightweight server logging ---
  async function logSupport(event, data){
    try{
      const base = apiBase(); if (!base) return;
      await fetch(`${base}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ event, data, t: Date.now(), uid: uid(), chat_id: currentChatId||chatId||null })
      }).catch(()=>{});
    }catch(_){ }
  }
})();
