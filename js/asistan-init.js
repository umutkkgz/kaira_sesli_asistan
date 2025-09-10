(function(){
  // Küresel görünüm durumu — var ise kullan
  window.activeView = window.activeView || 'selection';

  let asistanInitialized = false;
  let asistanAnimationId = null;
  let asistanParticles, asistanMouse = { x: null, y: null };

  function showView(id, name){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.activeView = name;
  }

  function inAsistan(){ return window.activeView === 'asistan'; }
  function isAsistanAuthorized(){
    try {
      const loggedToken = localStorage.getItem('kaira_auth_token');
      if (loggedToken && loggedToken.length > 0) return true;
      return sessionStorage.getItem('kaira_asistan_auth') === '1';
    } catch(_){ return false; }
  }
  function showAsistanAuth(msg){
    const overlay = document.getElementById('asistan-auth-overlay');
    const input = document.getElementById('asistan-auth-input');
    const btn = document.getElementById('asistan-auth-submit');
    const msgEl = document.getElementById('asistan-auth-msg');
    if (!overlay) return;
    overlay.style.display = 'flex';
    if (msgEl) msgEl.textContent = msg || '';
    if (input) { input.value = ''; setTimeout(()=>input.focus(), 50); }
    if (btn && !btn._kairaBound){
      btn._kairaBound = true;
      const handler = () => {
        const val = (input && input.value) ? input.value.trim() : '';
        if (val === '12345'){
          try { sessionStorage.setItem('kaira_asistan_auth', '1'); } catch(_){ }
          overlay.style.display = 'none';
          // Başarılı → Asistan’ı başlat
          enterAsistan(true);
        } else {
          if (msgEl) msgEl.textContent = 'Hatalı şifre. Lütfen tekrar deneyin.';
          if (input) input.focus();
        }
      };
      btn.addEventListener('click', handler);
      if (input){ input.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); handler(); } }); }
    }
  }

  async function initAsistan(){
    if (asistanInitialized) return;
    let initAvatar, setCoreState, updateAvatarBubblePosition, updateAudioLevel;
    try {
      const avatarModule = await import('./kaira-avatar.js');
      initAvatar = avatarModule.initAvatar;
      setCoreState = avatarModule.setCoreState;
      updateAvatarBubblePosition = avatarModule.updateAvatarBubblePosition;
      updateAudioLevel = avatarModule.updateAudioLevel;
    } catch (err) {
      console.warn('[KAIRA-ASISTAN] Avatar modülü yüklenemedi, placeholders kullanılacak.', err);
      initAvatar = (canvas) => { if(canvas){ const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); } };
      setCoreState = (state) => console.log('[Avatar]', state);
      updateAvatarBubblePosition = () => {};
      updateAudioLevel = () => {};
      const view = document.getElementById('asistan-view');
      if (view) {
        const div = document.createElement('div');
        div.className = 'absolute top-20 left-1/2 -translate-x-1/2 text-center text-yellow-400 text-xs bg-yellow-900/50 p-2 rounded-md';
        div.textContent = 'Avatar modülü (kaira-avatar.js) yüklenemedi. Asistan avatarsız modda çalışacak.';
        view.appendChild(div);
        setTimeout(()=>div.remove(), 5000);
      }
    }

    const avatarCanvas = document.getElementById('asistan-avatar-canvas');
    if (avatarCanvas) initAvatar(avatarCanvas);

    // Safari/iOS tespiti: Safari'de element tabanlı çalma sessiz kalabiliyor → WebAudio tercih et
    const UA = navigator.userAgent || '';
    const IS_IOS = /iP(ad|hone|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(UA);
    const PREFER_WEBAUDIO = IS_IOS || IS_SAFARI;

    // Arkaplan parçacıkları
    const bgCanvas = document.getElementById('asistan-bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    function setBgCanvasSize(){ bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
    function createParticles(){
      asistanParticles = [];
      const IS_MOBILE = (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) || (window.innerWidth < 768);
      const REDUCED = (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      let particleCount = (bgCanvas.width * bgCanvas.height) / 8000;
      if (IS_MOBILE) particleCount = particleCount * 0.6; // mobilde azalt
      if (REDUCED) particleCount = particleCount * 0.35; // reduced-motion'da daha da azalt
      for (let i=0; i<particleCount; i++){
        asistanParticles.push({
          x: Math.random()*bgCanvas.width,
          y: Math.random()*bgCanvas.height,
          originX: Math.random()*bgCanvas.width,
          originY: Math.random()*bgCanvas.height,
          size: Math.random()*2 + 1,
          speed: Math.random()*0.5 + 0.1,
          color: `rgba(255,255,255,${Math.random()*0.5 + 0.3})`
        });
      }
    }
    window.addEventListener('mousemove', e => { asistanMouse.x = e.x; asistanMouse.y = e.y; });
    window.addEventListener('mouseout', ()=>{ asistanMouse.x = null; asistanMouse.y = null; });
    window.addEventListener('resize', ()=>{ setBgCanvasSize(); createParticles(); });
    setBgCanvasSize(); createParticles();

    // Sunucu ile hizalama: belirtilen uzak tabanı kullan (ngrok) veya window.API_PROXY_BASE
    const API_BASE = (window.API_PROXY_BASE && window.API_PROXY_BASE.trim()) || 'https://0b3ace67b5c8.ngrok-free.app';
    const micBtn = document.getElementById('asistan-mic-btn');
    const statusEl = document.getElementById('asistan-status');
    // Öğrenen mod rozeti kalmışsa temizle ve varsayılan metni ata
    try {
      if (statusEl) {
        statusEl.textContent = 'Konuşmak için mikrofon simgesine dokunun';
        // Güvenlik: varsa sonuna ekli tüm '• ...' rozetlerini kaldır
        statusEl.textContent = (statusEl.textContent || '').replace(/\s*•\s*.*$/,'').trim();
      }
    } catch(_){}
    const player = document.getElementById('asistan-player');
    if (player) {
      try {
        player.setAttribute('playsinline', '');
        player.setAttribute('preload', 'auto');
        // iOS/Safari: display:none video/audio bazen ses yolunu kapatabiliyor; görünmez ama DOM'da kalsın
        player.classList.remove('hidden');
        player.style.position = 'absolute';
        player.style.left = '-9999px';
        player.style.width = '1px';
        player.style.height = '1px';
      } catch(_){ }
    }
    const chatContainer = document.getElementById('asistan-chat-container');
    const clearChatBtn = document.getElementById('asistan-clear-chat-btn');
    const textInput = document.getElementById('asistan-text-input');
    const sendBtn   = document.getElementById('asistan-send-btn');

    let chatHistory = [];
    function base64ToBlobUrl(base64) {
      const byteCharacters = atob(base64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      return URL.createObjectURL(new Blob(byteArrays, { type: 'audio/wav' }));
    }
    function sendTyped(){
      if (!isAsistanAuthorized()) { if (statusEl) statusEl.textContent = 'Yetkili şifresi gerekli'; showAsistanAuth(); return; }
      const txt = (textInput && textInput.value ? textInput.value : '').trim();
      if (!txt) return;
      addMessageToChat(txt, 'user');
      if (textInput) textInput.value = '';
      unlockAudio();
      getAIResponse(txt).catch(()=>{});
    }
    let isRecording = false;

    // Visualizer
    const visualizerCanvas = document.getElementById('asistan-visualizer');
    const visualizerCtx = visualizerCanvas.getContext('2d');
    let audioContext, analyser, source, dataArray; let isVisualizerSetup = false;
    function setupVisualizer(){ if (isVisualizerSetup) return; audioContext = new (window.AudioContext||window.webkitAudioContext)(); analyser = audioContext.createAnalyser(); source = audioContext.createMediaElementSource(player); source.connect(analyser); analyser.connect(audioContext.destination); analyser.fftSize = 256; dataArray = new Uint8Array(analyser.frequencyBinCount); isVisualizerSetup = true; }
    function drawVisualizer(){ if (!inAsistan()) return; requestAnimationFrame(drawVisualizer); if (!isVisualizerSetup) return; analyser.getByteFrequencyData(dataArray); const avgLevel = dataArray.reduce((a,b)=>a+b,0)/dataArray.length/255; updateAudioLevel(avgLevel); visualizerCtx.clearRect(0,0,visualizerCanvas.width,visualizerCanvas.height); const barWidth=(visualizerCanvas.width/dataArray.length)*1.5; let x=0; for (let i=0;i<dataArray.length;i++){ const barHeight=dataArray[i]/2; const g=visualizerCtx.createLinearGradient(0,visualizerCanvas.height,0,visualizerCanvas.height-barHeight); g.addColorStop(0,'#0ea5e9'); g.addColorStop(1,'#6366f1'); visualizerCtx.fillStyle=g; visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight); x += barWidth + 2; } }

    const USER_ID = (()=>{
      try{
        const u = JSON.parse(localStorage.getItem('kaira_user')||'null');
        if (u && u.username){ localStorage.setItem('kaira_uid', u.username); return u.username; }
      }catch(_){ }
      let id = localStorage.getItem('kaira_uid');
      if (!id){ id = (crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`); localStorage.setItem('kaira_uid', id); }
      return id;
    })();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; let recognition;
    if (SpeechRecognition){
      recognition = new SpeechRecognition(); recognition.continuous = false; recognition.lang = 'tr-TR'; recognition.interimResults = false;
      recognition.onstart = ()=>{ isRecording = true; micBtn.classList.remove('breathe'); micBtn.classList.add('is-listening'); statusEl.textContent='Dinliyorum...'; setCoreState('listening'); try{ if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_sr_start'); }catch(_){ } };
      recognition.onend = ()=>{ isRecording = false; micBtn.classList.remove('is-listening'); micBtn.classList.add('breathe'); if (statusEl.textContent==='Dinliyorum...') statusEl.textContent='Konuşmak için mikrofon simgesine dokunun'; setCoreState('idle'); try{ if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_sr_end'); }catch(_){ } };
      recognition.onresult = (ev)=>{ const transcript = ev.results[0][0].transcript; try{ if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_sr_result', { len: (transcript||'').length }); }catch(_){ } addMessageToChat(transcript,'user'); getAIResponse(transcript); };
      recognition.onerror = (ev)=>{ console.error('[SR]', ev.error); statusEl.textContent = `Hata: ${ev.error}`; setCoreState('idle'); };
    }

    function unlockAudio(){
      try { if (audioContext && audioContext.state === 'suspended') audioContext.resume(); } catch(_){ }
      try { player.muted = true; const p = player.play(); if (p && typeof p.catch === 'function') p.catch(()=>{}); player.pause(); player.currentTime = 0; player.muted = false; } catch(_){ }
    }

    function startRecognition(){
      if (!recognition) { statusEl.textContent = 'Bu tarayıcı konuşma tanımayı desteklemiyor.'; return; }
      try {
        recognition.start();
      } catch(e){ console.warn('[SR START]', e); }
    }

    let currentBufferSource = null; let bufferGain = null;
    function stopBufferSource(){ try { if (currentBufferSource) { currentBufferSource.stop(0); } } catch(_){} currentBufferSource = null; }
    async function playViaWebAudio(url){
      // WebAudio fallback: WAV'i indir, decode et, gain ile çal
      if (!audioContext) setupVisualizer();
      try { if (audioContext && audioContext.state === 'suspended') await audioContext.resume(); } catch(_){ }
      stopBufferSource();
      try{
        const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning':'true' }, cache:'no-store' });
        const buf = await res.arrayBuffer();
        const audioBuf = await audioContext.decodeAudioData(buf);
        bufferGain = bufferGain || audioContext.createGain();
        bufferGain.gain.value = 1.2; // küçük bir boost
        const src = audioContext.createBufferSource();
        src.buffer = audioBuf; currentBufferSource = src;
        src.connect(bufferGain); bufferGain.connect(analyser); // analyser -> destination zaten bağlı
        src.start(0);
        setCoreState('speaking');
        return new Promise((resolve)=>{ src.onended = ()=>{ setCoreState('idle'); resolve(); }; });
      }catch(e){ console.error('[Audio][webaudio-fallback]', e); }
    }
    async function getAIResponse(text, angry=false){
      if (!isAsistanAuthorized()) { if (statusEl) statusEl.textContent = 'Yetkili şifresi gerekli'; showAsistanAuth(); return; }
      // Öğrenen-bot entegrasyonu sesli asistanda devre dışı; doğrudan sunucu TTS kullanılacak
      micBtn.disabled=true;
      if (!isVisualizerSetup) setupVisualizer();
      let waitingTimeout;
      function showWaitingContent(){ statusEl.textContent='Yanıt bekleniyor...'; }
      function hideWaitingContent(){ statusEl.textContent='Konuşmak için mikrofon simgesine dokunun'; }
      waitingTimeout = setTimeout(showWaitingContent, 2000);
      const fd = new FormData(); fd.append('text', (text||'').trim()); fd.append('angry', angry ? 'true' : 'false'); fd.append('history', JSON.stringify(chatHistory.slice(-10))); fd.append('user_id', USER_ID);
      const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), 300000);
      try{
        try { if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_tts_request', { len: (text||'').length, angry: !!angry }); } catch(_){ }
        const res = await fetch(`${API_BASE.replace(/\/$/,'')}/api/tts`, { method:'POST', body: fd, signal: ctrl.signal, headers: { 'ngrok-skip-browser-warning': 'true' } });
        if (!res.ok){ const txt = await res.text().catch(()=>'' ); throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt}`); }
        const data = await res.json();
        // Önce varsa doğrudan URL'yi tercih et (base64 bazı tarayıcılarda sessiz kalabiliyor)
        let direct = null;
        try {
          const path = data.session_audio_url || data.audio_url || '';
          if (path) {
            direct = /^https?:\/\//i.test(path) ? path : `${API_BASE.replace(/\/$/,'')}${path}`;
            // ngrok banner bypass + cache buster
            const sep = direct.includes('?') ? '&' : '?';
            direct = `${direct}${sep}ngrok-skip-browser-warning=true&t=${Date.now()}`;
          }
        } catch(_){ direct = null; }
        let audioUrl = null;
        if (!direct) {
          if (!data.audio_data) throw new Error("API yanıtında 'audio_data' alanı bulunamadı.");
          audioUrl = base64ToBlobUrl(data.audio_data);
        }
        // Mikrofonda açık tanıma varsa kapat (bazı tarayıcılarda çalma engellenebilir)
        try { if (window.KAIRA_AUDIO && typeof window.KAIRA_AUDIO.stopRecognizer === 'function') window.KAIRA_AUDIO.stopRecognizer(); } catch(_){ }
        try { if (recognition && typeof recognition.stop === 'function') recognition.stop(); } catch(_){ }
        // Safari/iOS'ta doğrudan WebAudio ile çal (ringer/silent ve autoplay kısıtları için daha güvenilir)
        if (PREFER_WEBAUDIO && direct) {
          try {
            // Elementi durdur ve WebAudio ile çal
            try { player.pause(); } catch(_){}
            player.removeAttribute('src');
            await playViaWebAudio(direct);
          } catch(e){
            console.warn('[Audio][safari-pref-webaudio-failed], element ile denenecek', e);
            // WebAudio başarısızsa element akışıyla dene
            if (player.previousUrl) URL.revokeObjectURL(player.previousUrl);
            player.srcObject = null; player.muted = false; player.volume = 1.0;
            player.src = direct; player.load();
            try { await player.play(); } catch(_){ /* alttaki kontrol tetikler */ }
          }
        } else {
          // Mevcut URL'yi bırak ve yeni kaynağı yükle
          if (player.previousUrl) URL.revokeObjectURL(player.previousUrl);
          player.srcObject = null; player.muted = false; player.volume = 1.0;
          if (direct) {
            player.src = direct; player.load();
          } else {
            player.previousUrl = audioUrl; player.src = audioUrl; player.load();
          }
          try {
            await player.play();
            // Eğer element oynuyor ama ses yoksa (bazı cihazlarda) → kısa bir gecikmeden sonra süreyi/doğal akışı kontrol et
            await new Promise(r=>setTimeout(r, 250));
            if (!player.muted && player.volume > 0 && (isNaN(player.duration) || player.duration > 0)){
              // timeupdate tetiklenmiyorsa ve ses gelmiyorsa WebAudio fallback dene
              const started = player.currentTime; await new Promise(r=>setTimeout(r, 400));
              const progressed = player.currentTime > started + 0.05;
              if (!progressed && direct) {
                console.warn('[Audio] Element akışı ilerlemiyor, WebAudio fallback deneniyor');
                await playViaWebAudio(direct);
              }
            }
          } catch(e) {
            console.warn('[Audio] Blob/URL element çalma başarısız, fallback akışwa', e);
            // Sunucunun verdiği URL ile WebAudio fallback dene
            try {
              let directUrl = null;
              try {
                const path2 = data.session_audio_url || data.audio_url || '';
                if (path2) {
                  directUrl = /^https?:\/\//i.test(path2) ? path2 : `${API_BASE.replace(/\/$/,'')}${path2}`;
                  const sep = directUrl.includes('?') ? '&' : '?';
                  directUrl = `${directUrl}${sep}ngrok-skip-browser-warning=true&t=${Date.now()}`;
                }
              } catch(_){ directUrl = null; }
              if (directUrl) {
                await playViaWebAudio(directUrl);
              }
            } catch(e2){ console.error('[Audio][fallback]', e2); }
          }
        }
        statusEl.textContent = 'Cevap oynatılıyor...';
        const out = data.text_response ?? data.clean_text ?? '';
        addMessageToChat(out, 'assistant');
        try { if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_tts_result', { sr: data.sr, duration: data.duration, peak: data.debug_peak, rms: data.debug_rms }); } catch(_){ }
        return data;
      } catch(err){
        console.error('[KAIRA-ASISTAN]', err);
        const msg = 'Hata: ' + (err?.message || err);
        statusEl.textContent = msg; addMessageToChat(msg, 'assistant'); micBtn.disabled=false; setCoreState('idle');
        try { if (window.KAIRA_LOG) window.KAIRA_LOG('asistan_tts_error', { message: String(err&&err.message||err) }); } catch(_){ }
        throw err;
      } finally { hideWaitingContent(); clearTimeout(to); }
    }

    function addMessageToChat(text, sender){
      const b = document.createElement('div'); b.className = `p-3 rounded-xl max-w-lg ${sender==='user' ? 'user-bubble' : 'assistant-bubble'}`; b.textContent = text; chatContainer.appendChild(b); chatContainer.scrollTop = chatContainer.scrollHeight;
      if (sender){ chatHistory.push({ role: sender, content: text }); localStorage.setItem('kaira_asistan_chat_history', JSON.stringify(chatHistory)); }
    }

    // Geçmişi yükle (asistan için ayrı anahtar)
    (function loadChatHistory(){
      const saved = localStorage.getItem('kaira_asistan_chat_history'); chatContainer.innerHTML='';
      if (saved){ try { chatHistory = JSON.parse(saved); } catch(_) { chatHistory = []; } }
      if (chatHistory.length){ chatHistory.forEach(m => addMessageToChat(m.content, m.role)); }
      else { addMessageToChat('Merhaba! Size nasıl yardımcı olabilirim?', 'assistant'); }
    })();

    // --- Event bağlayıcıları ---
    if (micBtn){
      micBtn.addEventListener('click', () => {
        unlockAudio();
        if (!recognition){
          statusEl.textContent = 'Tarayıcınız konuşma tanımayı desteklemiyor.';
          return;
        }
        if (isRecording) {
          try { recognition.stop(); } catch(_){}
        } else {
          startRecognition();
        }
      });
    }
    if (sendBtn) sendBtn.addEventListener('click', sendTyped);
    if (textInput) {
      textInput.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendTyped(); }
      });
      // Mobile: ensure latest messages visible when keyboard opens
      textInput.addEventListener('focus', ()=>{ setTimeout(()=>{ try{ chatContainer.scrollTop = chatContainer.scrollHeight; }catch(_){ } }, 100); });
    }
    if (clearChatBtn) clearChatBtn.addEventListener('click', ()=>{
      chatHistory = []; localStorage.removeItem('kaira_asistan_chat_history'); chatContainer.innerHTML = '';
      addMessageToChat('Merhaba! Size nasıl yardımcı olabilirim?', 'assistant');
    });
    if (player){
      player.addEventListener('play', ()=>{ if (!isVisualizerSetup) setupVisualizer(); requestAnimationFrame(drawVisualizer); setCoreState('speaking'); });
      player.addEventListener('ended', ()=>{ statusEl.textContent = 'Konuşmak için mikrofon simgesine dokunun'; micBtn.disabled = false; setCoreState('idle'); });
      player.addEventListener('error', async ()=>{
        try{
          const src = player.currentSrc || player.src || '';
          if (src) {
            console.warn('[Audio] HTMLMediaElement error, trying WebAudio fallback for', src);
            await playViaWebAudio(src);
          }
        } catch(_){}
      }, { passive: true });
    }

    asistanInitialized = true;
  }

  function animateAsistan(){
    if (!inAsistan() || !asistanParticles) return;
    const bgCtx = document.getElementById('asistan-bg-canvas').getContext('2d');
    bgCtx.clearRect(0,0,bgCtx.canvas.width,bgCtx.canvas.height);
    asistanParticles.forEach(p=>{
      bgCtx.fillStyle = p.color; bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.size,0,Math.PI*2); bgCtx.fill();
      if (asistanMouse.x !== null){
        let dx = asistanMouse.x - p.x; let dy = asistanMouse.y - p.y; let d = Math.sqrt(dx*dx + dy*dy);
        if (d < 150){ p.x -= dx/10 * p.speed; p.y -= dy/10 * p.speed; }
        else { p.x += (p.originX - p.x) * 0.01 * p.speed; p.y += (p.originY - p.y) * 0.01 * p.speed; }
      }
    });
    asistanAnimationId = requestAnimationFrame(animateAsistan);
  }

  function enterAsistan(force=false){
    showView('asistan-view', 'asistan');
    try {
      const st = document.getElementById('asistan-status');
      if (st) {
        st.textContent = 'Konuşmak için mikrofon simgesine dokunun';
        st.textContent = (st.textContent||'').replace(/\s*•\s*.*$/,'').trim();
      }
    } catch(_){}
    if (!force && !isAsistanAuthorized()) { showAsistanAuth(); return; }
    if (!asistanInitialized) { initAsistan().then(()=>{ animateAsistan(); }).catch(e=>console.error(e)); }
    else { animateAsistan(); }
  }

  // Delegated navigation
  document.addEventListener('click', function(ev){
    const t = ev.target; if (!t || typeof t.closest !== 'function') return;
    if (t.closest('#select-asistan')) { enterAsistan(); }
    if (t.closest('#asistan-view .back-to-selection')) {
      if (asistanAnimationId) { cancelAnimationFrame(asistanAnimationId); asistanAnimationId = null; }
      showView('selection-view', 'selection');
    }
  }, true);
})();
