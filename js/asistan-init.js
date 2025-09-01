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

    // Arkaplan parçacıkları
    const bgCanvas = document.getElementById('asistan-bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    function setBgCanvasSize(){ bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
    function createParticles(){
      asistanParticles = [];
      const particleCount = (bgCanvas.width * bgCanvas.height) / 8000;
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

    const API_BASE = 'https://1513c704aa10.ngrok-free.app';
    const micBtn = document.getElementById('asistan-mic-btn');
    const statusEl = document.getElementById('asistan-status');
    const player = document.getElementById('asistan-player');
    const chatContainer = document.getElementById('asistan-chat-container');
    const clearChatBtn = document.getElementById('asistan-clear-chat-btn');
    const textInput = document.getElementById('asistan-text-input');
    const sendBtn   = document.getElementById('asistan-send-btn');

    let chatHistory = [];
    function sendTyped(){
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

    const USER_ID = (()=>{ let id = localStorage.getItem('kaira_uid'); if (!id){ id = (crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`); localStorage.setItem('kaira_uid', id);} return id; })();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; let recognition;
    if (SpeechRecognition){
      recognition = new SpeechRecognition(); recognition.continuous = false; recognition.lang = 'tr-TR'; recognition.interimResults = false;
      recognition.onstart = ()=>{ isRecording = true; micBtn.classList.remove('breathe'); micBtn.classList.add('is-listening'); statusEl.textContent='Dinliyorum...'; setCoreState('listening'); };
      recognition.onend = ()=>{ isRecording = false; micBtn.classList.remove('is-listening'); micBtn.classList.add('breathe'); if (statusEl.textContent==='Dinliyorum...') statusEl.textContent='Konuşmak için mikrofon simgesine dokunun'; setCoreState('idle'); };
      recognition.onresult = (ev)=>{ const transcript = ev.results[0][0].transcript; addMessageToChat(transcript,'user'); getAIResponse(transcript); };
      recognition.onerror = (ev)=>{ console.error('[SR]', ev.error); statusEl.textContent = `Hata: ${ev.error}`; setCoreState('idle'); };
    }

    function unlockAudio(){
      try { if (player && player.context && player.context.state === 'suspended') player.context.resume(); } catch(_){ }
      try { if (audioContext && audioContext.state === 'suspended') audioContext.resume(); } catch(_){ }
    }

    function startRecognition(){
      if (!recognition) { statusEl.textContent = 'Bu tarayıcı konuşma tanımayı desteklemiyor.'; return; }
      try {
        recognition.start();
      } catch(e){ console.warn('[SR START]', e); }
    }

    async function getAIResponse(text, angry=false){
      micBtn.disabled=true;
      if (!isVisualizerSetup) setupVisualizer();
      let waitingTimeout;
      function showWaitingContent(){ statusEl.textContent='Yanıt bekleniyor...'; }
      function hideWaitingContent(){ statusEl.textContent='Konuşmak için mikrofon simgesine dokunun'; }
      waitingTimeout = setTimeout(showWaitingContent, 2000);
      const fd = new FormData(); fd.append('text', (text||'').trim()); fd.append('angry', angry ? 'true' : 'false'); fd.append('history', JSON.stringify(chatHistory.slice(-10))); fd.append('user_id', USER_ID);
      const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), 300000);
      try{
        const res = await fetch(`${API_BASE}/api/tts`, { method:'POST', body: fd, signal: ctrl.signal });
        if (!res.ok){ const txt = await res.text().catch(()=>'' ); throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt}`); }
        const data = await res.json();
        if (!data.audio_data) throw new Error("API yanıtında 'audio_data' alanı bulunamadı.");
        const audioUrl = base64ToBlobUrl(data.audio_data);
        if (player.previousUrl) URL.revokeObjectURL(player.previousUrl);
        player.previousUrl = audioUrl; player.src = audioUrl;
        await player.play().catch(e=>console.error('[Audio]', e));
        statusEl.textContent = 'Cevap oynatılıyor...';
        const out = data.text_response ?? data.clean_text ?? '';
        addMessageToChat(out, 'assistant');
        return data;
      } catch(err){
        console.error('[KAIRA-ASISTAN]', err);
        const msg = 'Hata: ' + (err?.message || err);
        statusEl.textContent = msg; addMessageToChat(msg, 'assistant'); micBtn.disabled=false; setCoreState('idle');
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

  function enterAsistan(){
    showView('asistan-view', 'asistan');
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
