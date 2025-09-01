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
              <input id="reg-consent" type="checkbox" class="mt-1" />
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

  function show(){ modal.classList.remove('hidden'); }
  function hide(){ modal.classList.add('hidden'); }

  openBtn.addEventListener('click', (e)=>{
    try{
      const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
      const tok = localStorage.getItem('kaira_auth_token');
      if (tok && u && u.username) {
        // allow default navigation to profile.html
        return;
      }
    }catch(_){ }
    // Not logged in → stop default link and show modal
    e.preventDefault();
    show();
  }, { capture: true });
  modal.querySelector('#auth-close').addEventListener('click', hide);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) hide(); });

  // Consent viewer
  modal.querySelector('#reg-view-consent').addEventListener('click', async ()=>{
    try{
      const base = API(); if (!base) return;
      const res = await fetch(`${base}/api/consent`, { headers:{'ngrok-skip-browser-warning':'true'} });
      const j = await res.json();
      const txt = (j && j.content) ? j.content : 'Belge bulunamadı.';
      const w = window.open('', '_blank');
      if (w && w.document) {
        w.document.write(`<pre style="white-space:pre-wrap;font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial">${txt.replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`);
      }
    }catch(_){ }
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
    if (!payload.username || !payload.password || !payload.first_name || !payload.last_name || !payload.consent){ msg.textContent = 'Zorunlu alanları doldurun ve onay verin.'; return; }
    try{
      const base = API(); if (!base){ msg.textContent = 'Sunucu tanımlı değil.'; return; }
      const res = await fetch(`${base}/api/auth/register`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok){ msg.textContent = j && j.error ? j.error : 'Kayıt başarısız'; return; }
      msg.textContent = 'Kayıt başarılı. Giriş yapabilirsiniz.'; msg.classList.remove('text-rose-400'); msg.classList.add('text-emerald-400');
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
      try{ localStorage.setItem('kaira_auth_token', j.token); localStorage.setItem('kaira_user', JSON.stringify(j.user||{})); }catch(_){ }
      msg.textContent = 'Giriş başarılı'; msg.classList.remove('text-rose-400'); msg.classList.add('text-emerald-400');
      openBtn.textContent = (j.user && j.user.username) ? j.user.username : 'Üyelik';
      setTimeout(hide, 600);
    }catch(e){ msg.textContent = 'Hata: ' + (e && e.message || e); }
  });

  // If already logged, reflect & ensure href behavior
  try{
    const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
    const tok = localStorage.getItem('kaira_auth_token');
    if (u && u.username && tok){ openBtn.textContent = u.username; try{ openBtn.setAttribute('href','profile.html'); }catch(_){ } }
    else { try{ openBtn.setAttribute('href','#'); }catch(_){ } }
  }catch(_){ try{ openBtn.setAttribute('href','#'); }catch(__){} }
})();
