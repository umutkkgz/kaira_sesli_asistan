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

  function uid(){ try{ let id = localStorage.getItem('kaira_uid'); if (!id){ id = (crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`); localStorage.setItem('kaira_uid', id);} return id; } catch(_){ return `user_${Date.now()}`; } }
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
        if (msg && msg.type === 'welcome') { chatId = msg.chat_id; }
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
})();

