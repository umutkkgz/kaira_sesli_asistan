// Simple auth modal (register/login) using server /api/auth endpoints
(function(){
  const openBtn = document.getElementById('auth-open');
  if (!openBtn) return;
  const API = ()=> (window.API_PROXY_BASE || '').replace(/\/$/,'');

  // Build modal
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'fixed inset-0 z-50 bg-black/60 hidden';
  modal.innerHTML = `
  <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[680px] max-w-[95vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <div class="text-white font-semibold">Üyelik</div>
      <button id="auth-close" class="text-gray-400 hover:text-white">✕</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2">
      <div class="p-4 border-r border-gray-800">
        <div class="text-white font-semibold mb-2">Kayıt Ol</div>
        <div class="space-y-2">
          <input id="reg-username" placeholder="Kullanıcı Adı" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          <input id="reg-email" type="email" placeholder="E-posta (opsiyonel)" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          <div class="flex gap-2">
            <input id="reg-first" placeholder="Ad" class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
            <input id="reg-last" placeholder="Soyad" class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>
          <input id="reg-password" type="password" placeholder="Şifre" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          <div class="text-sm text-gray-300">
            <label class="inline-flex items-start gap-2">
              <input id="reg-consent" type="checkbox" class="mt-1" disabled />
              <span>Muvafakatname'yi okudum ve kabul ediyorum. <button id="reg-view-consent" class="underline text-indigo-400">Görüntüle</button></span>
            </label>
          </div>
          <button id="reg-submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded">Kayıt Ol</button>
          <div id="reg-msg" class="text-sm h-5 text-rose-400"></div>
        </div>
      </div>
      <div class="p-4">
        <div class="text-white font-semibold mb-2">Giriş Yap</div>
        <div class="space-y-2">
          <input id="login-id" placeholder="Kullanıcı Adı veya E-posta" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          <input id="login-password" type="password" placeholder="Şifre" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          <button id="login-submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded">Giriş Yap</button>
          <div id="login-msg" class="text-sm h-5 text-rose-400"></div>
          <div id="auth-user" class="hidden text-sm text-gray-300"></div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);

  const consentCheckbox = modal.querySelector('#reg-consent');
  let consentOpened = false;

  function resetConsentState(){
    consentOpened = false;
    if (consentCheckbox){
      consentCheckbox.checked = false;
      consentCheckbox.disabled = true;
    }
  }

  function show(){
    modal.classList.remove('hidden');
    resetConsentState();
  }
  function hide(){
    modal.classList.add('hidden');
    resetConsentState();
  }

  openBtn.addEventListener('click', (e)=>{
    e.preventDefault(); // Biz yöneteceğiz
    let logged = false;
    try{
      const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
      const tok = localStorage.getItem('kaira_auth_token');
      logged = !!(tok && u && u.username);
    }catch(_){ }
    if (logged) {
      try{ openBtn.setAttribute('href','profile.html'); }catch(_){ }
      try{ window.location.href = 'profile.html'; }catch(_){ }
    } else {
      show();
    }
  }, { capture: true });
  modal.querySelector('#auth-close').addEventListener('click', hide);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) hide(); });

  function markConsentOpened(){
    consentOpened = true;
    if (consentCheckbox) {
      consentCheckbox.disabled = false;
      consentCheckbox.focus({ preventScroll: true });
    }
  }

  // Consent viewer
  modal.querySelector('#reg-view-consent').addEventListener('click', async ()=>{
    // Helper to safely open a new window and render plain text (escaped)
    const renderTextInNewWindow = (text, opts={})=>{
      const isRaw = !!opts.raw;
      const safe = isRaw ? String(text||'') : (String(text||'').replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s])));
      const w = window.open('', '_blank', 'noopener');
      if (w && w.document) {
        if (isRaw) {
          w.document.write(safe);
        } else {
          w.document.write(`<pre style="white-space:pre-wrap;font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial">${safe}</pre>`);
        }
        markConsentOpened();
      } else {
        alert('Belge görüntülenemedi. Açılır pencere engelleyicisini kontrol edin.');
      }
    };

    // 1) Try backend API if configured
    const base = API();
    if (base) {
      try{
        const res = await fetch(`${base}/api/consent`, { headers:{'ngrok-skip-browser-warning':'true'} });
        if (res.ok) {
          const j = await res.json().catch(()=>({}));
          if (j && j.content) { renderTextInNewWindow(j.content); return; }
        }
      }catch(_){ /* fall back to local file */ }
    }

    // 2) Fallback: load local file directly
    try {
      const tryPaths = ['muvafakatname.html', 'server/muvafakatname.html'];
      let lastErr = null;
      for (const path of tryPaths){
        try {
          const res = await fetch(path, { cache: 'no-store', headers:{'ngrok-skip-browser-warning':'true'} });
          if (!res.ok) throw new Error(`${path} not ok`);
          const txt = await res.text();
          const ctype = (res.headers.get('content-type') || '').toLowerCase();
          renderTextInNewWindow(txt || 'Belge bulunamadı.', { raw: /html/.test(ctype) });
          return;
        } catch(err){ lastErr = err; }
      }
      throw lastErr || new Error('local not ok');
    } catch (e) {
      renderTextInNewWindow('Belge bulunamadı.');
    }
  });

  // Register
  modal.querySelector('#reg-submit').addEventListener('click', async ()=>{
    const msg = modal.querySelector('#reg-msg'); msg.textContent = '';
    const payload = {
      username: modal.querySelector('#reg-username').value.trim(),
      email: modal.querySelector('#reg-email').value.trim(),
      password: modal.querySelector('#reg-password').value,
      first_name: modal.querySelector('#reg-first').value.trim(),
      last_name: modal.querySelector('#reg-last').value.trim(),
      consent: modal.querySelector('#reg-consent').checked
    };
    if (!payload.username || !payload.password || !payload.first_name || !payload.last_name){ msg.textContent = 'Zorunlu alanları doldurun.'; return; }
    if (!consentOpened){ msg.textContent = 'Kayıt için Muvafakatnameyi görüntüleyip onaylayın.'; return; }
    if (!payload.consent){ msg.textContent = 'Muvafakatnameyi onaylamadan kayıt olamazsınız.'; return; }
    try{
      const base = API(); if (!base){ msg.textContent = 'Sunucu tanımlı değil.'; return; }
      const res = await fetch(`${base}/api/auth/register`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok){ msg.textContent = j && j.error ? j.error : 'Kayıt başarısız'; return; }
      msg.textContent = 'Kayıt başarılı. Giriş yapılıyor...'; msg.classList.remove('text-rose-400'); msg.classList.add('text-emerald-400');
      try{
        const base2 = API();
        const loginRes = await fetch(`${base2}/api/auth/login`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ identifier: payload.username, password: payload.password }) });
        const lj = await loginRes.json();
        if (loginRes.ok){
          try{
            localStorage.setItem('kaira_auth_token', lj.token);
            // cookie fallback
            const sec = (location.protocol === 'https:');
            document.cookie = 'kaira_token='+ encodeURIComponent(lj.token) + '; path=/; max-age='+(60*60*24*180) + (sec?'; Secure':'') + '; SameSite=Lax';
            localStorage.setItem('kaira_user', JSON.stringify(lj.user||{}));
            if (lj.user && lj.user.username) localStorage.setItem('kaira_uid', lj.user.username);
          }catch(_){ }
          try{ window.location.href = 'profile.html'; }catch(_){ }
        }
      }catch(_){ }
    }catch(e){ msg.textContent = 'Hata: ' + (e && e.message || e); }
  });

  // Login
  modal.querySelector('#login-submit').addEventListener('click', async ()=>{
    const msg = modal.querySelector('#login-msg'); msg.textContent = '';
    const idEl = modal.querySelector('#login-id'); const pwEl = modal.querySelector('#login-password');
    const payload = { identifier: idEl.value.trim(), password: pwEl.value };
    if (!payload.identifier || !payload.password){ msg.textContent = 'Kimlik ve şifre zorunlu'; return; }
    try{
      const base = API(); if (!base){ msg.textContent = 'Sunucu tanımlı değil.'; return; }
      const res = await fetch(`${base}/api/auth/login`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok){ msg.textContent = j && j.error ? j.error : 'Giriş başarısız'; return; }
      try{
        localStorage.setItem('kaira_auth_token', j.token);
        const sec = (location.protocol === 'https:');
        document.cookie = 'kaira_token='+ encodeURIComponent(j.token) + '; path=/; max-age='+(60*60*24*180) + (sec?'; Secure':'') + '; SameSite=Lax';
        localStorage.setItem('kaira_user', JSON.stringify(j.user||{}));
        if (j.user && j.user.username) localStorage.setItem('kaira_uid', j.user.username);
      }catch(_){ }
      msg.textContent = 'Giriş başarılı'; msg.classList.remove('text-rose-400'); msg.classList.add('text-emerald-400');
      openBtn.textContent = (j.user && j.user.username) ? `Profil (${j.user.username})` : 'Üyelik';
      try{ openBtn.setAttribute('href','profile.html'); }catch(_){ }
      setTimeout(()=>{ hide(); try{ window.location.href = 'profile.html'; }catch(_){ } }, 500);
    }catch(e){ msg.textContent = 'Hata: ' + (e && e.message || e); }
  });

  // If already logged, reflect & ensure href behavior
  try{
    const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
    const tok = localStorage.getItem('kaira_auth_token');
    if (u && u.username && tok){
      openBtn.textContent = `Profil (${u.username})`;
      try{ openBtn.setAttribute('href','profile.html'); }catch(_){ }
      try{ localStorage.setItem('kaira_uid', u.username); }catch(_){ }
    }
    else { try{ openBtn.setAttribute('href','#'); }catch(_){ } }
  }catch(_){ try{ openBtn.setAttribute('href','#'); }catch(__){} }

  // Auto-restore user info on load if token exists but user missing
  (async function restoreMe(){
    try{
      let tok = localStorage.getItem('kaira_auth_token');
      if (!tok){
        try{
          const m = document.cookie.match(/(?:^|; )kaira_token=([^;]+)/);
          tok = m ? decodeURIComponent(m[1]) : '';
          if (tok) localStorage.setItem('kaira_auth_token', tok);
        }catch(_){ }
      }
      if (!tok) return;
      let u = null; try{ u = JSON.parse(localStorage.getItem('kaira_user')||'null'); }catch(_){ u=null; }
      if (u && u.username) return; // already present
      const base = API(); if (!base) return;
      const res = await fetch(`${base}/api/auth/me`, { headers: { 'X-Auth-Token': tok } });
      if (!res.ok) return;
      const j = await res.json();
      if (j && j.user && j.user.username){
        try{ localStorage.setItem('kaira_user', JSON.stringify(j.user)); localStorage.setItem('kaira_uid', j.user.username); }catch(_){ }
        openBtn.textContent = `Profil (${j.user.username})`;
        try{ openBtn.setAttribute('href','profile.html'); }catch(_){ }
      }
    }catch(_){ }
  })();
})();
