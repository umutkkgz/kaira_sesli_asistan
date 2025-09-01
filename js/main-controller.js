// --- GLOBAL KONTROL ---
const views = document.querySelectorAll('.view');
const selectAfterlifeBtn = document.getElementById('select-afterlife');
const selectDemoBtn = document.getElementById('select-demo');
const selectEditorBtn = document.getElementById('select-editor');
const selectChatBtn = document.getElementById('select-chat'); // Yeni
const selectNasaBtn = document.getElementById('select-nasa');
const backButtons = document.querySelectorAll('.back-to-selection');

let activeView = 'selection';
let afterlifeInitialized = false;
let demoInitialized = false;
let editorInitialized = false;
let chatInitialized = false; // Yeni
let afterlifeAnimationId, demoAnimationId;
// --- Wake Lock (screen) support for long-running audio/LLM in DEMO ---
let wakeLockSentinel = null;
export async function requestWakeLock(){
  try {
    if (!('wakeLock' in navigator)) { console.log('[WAKE] not supported'); return; }
    if (wakeLockSentinel) return; // already held
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    console.log('[WAKE] acquired');
    wakeLockSentinel.addEventListener('release', () => {
      console.log('[WAKE] released');
      wakeLockSentinel = null;
    });
  } catch(err){
    console.warn('[WAKE] request failed:', err && err.name ? err.name : err);
  }
}
export async function releaseWakeLock(){
  try {
    if (wakeLockSentinel) { await wakeLockSentinel.release(); }
    wakeLockSentinel = null;
  } catch(_){}
}
// Re-acquire when tab becomes visible again (some browsers auto-release)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeView === 'demo') {
    requestWakeLock();
  }
});
window.addEventListener('pagehide', releaseWakeLock);
window.addEventListener('beforeunload', releaseWakeLock);
// --- DEMO view: network resilience & keep-alive ---
const ORIG_FETCH = window.fetch.bind(window);
let demoKeepAliveTimer = null;

export function startDemoKeepAlive(){
  if (demoKeepAliveTimer) return;
  const base = window.API_PROXY_BASE || '';
  demoKeepAliveTimer = setInterval(async () => {
    try {
      await ORIG_FETCH(`${base}/api/get-groq-key`, {
headers: { 'ngrok-skip-browser-warning': 'true' },
cache: 'no-store',
mode: 'cors'
      });
    } catch(_) { /* sessiz */ }
  }, 60000); // her 60 sn'de bir ping
}
export function stopDemoKeepAlive(){ if (demoKeepAliveTimer){ clearInterval(demoKeepAliveTimer); demoKeepAliveTimer = null; } }

export function patchFetchForDemo(){
  if (window.__fetchPatchedForDemo) return;
  window.__origFetch = window.__origFetch || ORIG_FETCH;
  window.fetch = async function(input, init={}){
    // Opt-out flag → kullanılırsa patch devre dışı
    if (init && init.kairaBypass === true) {
      return window.__origFetch(input, init);
    }

    // Heuristics: TTS/stream çağrılarını otomatik uzun zaman aşımı ile koru
    const hdr = new Headers(init?.headers || {});
    const accept = (hdr.get('accept') || hdr.get('Accept') || '').toLowerCase();
    const urlStr = (typeof input === 'string') ? input : (input && input.url ? String(input.url) : '');
    const looksAudio = /audio\//i.test(accept) || /\b(\/tts|text-to-speech|\/audio)\b/i.test(urlStr);

    const isLong = (init && (init.kairaLong === true || init.kairaIsStream === true)) || looksAudio;

    // Route long requests via server-side job to avoid mobile timeouts
    if (isLong && window.API_PROXY_BASE) {
      try {
const hdrObj = Object.fromEntries(new Headers(init?.headers || {}));
const urlStr = (typeof input === 'string') ? input : (input && input.url ? String(input.url) : '');
const bodyRaw = init?.body;
let bodyStr = typeof bodyRaw === 'string' ? bodyRaw : (bodyRaw ? JSON.stringify(bodyRaw) : null);
 const startRes = await window.__origFetch(`${window.API_PROXY_BASE}/api/long/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
  body: JSON.stringify({
    url: urlStr,
    method: (init?.method || 'GET'),
    headers: hdrObj,
    body: bodyStr,
    timeout: Math.ceil((init?.kairaTimeoutMs || (isLong ? 180000 : 15000)) / 1000)
  })
});
const startJson = await startRes.json();
if (!startRes.ok || !startJson.jobId) throw new Error('Job start failed');
const jobId = startJson.jobId;
 // Poll until completed
while (true) {
  await new Promise(r => setTimeout(r, 1000));
  const stRes = await window.__origFetch(`${window.API_PROXY_BASE}/api/long/status/${jobId}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' }
  });
  const st = await stRes.json();
  if (st.status === 'done') break;
  if (st.status === 'error') {
    return new Response(JSON.stringify({ error: 'Long task failed' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }
}
 // Return final result (audio/json/raw) via server
return await window.__origFetch(`${window.API_PROXY_BASE}/api/long/result/${jobId}`, {
  headers: { 'ngrok-skip-browser-warning': 'true' }
});
      } catch (e) {
console.warn('[KAIRA] long-job route failed, falling back to direct fetch', e);
// fall through to normal retry loop below
      }
    }

    const tries = (init && typeof init.kairaRetries === 'number')
      ? init.kairaRetries
      : (isLong ? 1 : 3);

    const baseTimeout = (init && init.kairaTimeoutMs)
      ? init.kairaTimeoutMs
      : (isLong ? 180000 /* 180 sn */ : 15000);

    for (let i = 0; i < Math.max(1, tries); i++){
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort('timeout'), baseTimeout * (isLong ? 1 : Math.pow(1.5, i)));
      try {
const res = await window.__origFetch(input, {
  ...init,
  signal: ac.signal,
  cache: 'no-store',
  headers: { ...(init?.headers||{}), 'ngrok-skip-browser-warning': 'true' }
});
clearTimeout(t);
return res; // çağıran taraf res.ok’a göre karar verir
      } catch(err){
clearTimeout(t);
if (i < (tries - 1)){
  await new Promise(r => setTimeout(r, 400 * Math.pow(2, i)));
  continue;
}
// son deneme de başarısızsa sessiz 503 stub dön (demo UI patlamasın)
return new Response(JSON.stringify({ error: 'Network temporarily unavailable (auto-retried)' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    }
  };
  window.__fetchPatchedForDemo = true;
}
export function restoreFetchForDemo(){
  if (window.__fetchPatchedForDemo && window.__origFetch){
    window.fetch = window.__origFetch;
    window.__fetchPatchedForDemo = false;
  }
}

// DEMO görünümünde "Failed to fetch" benzeri hataları kullanıcıya göstermeden yut
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e?.reason?.message || e?.reason || '');
  if (activeView === 'demo' && /(Failed to fetch|NetworkError|timeout|abort)/i.test(msg)) {
    e.preventDefault();
    console.warn('[KAIRA] Demo: network glitch suppressed →', msg);
  }
});
window.addEventListener('error', (e) => {
  const msg = String(e?.message || '');
  if (activeView === 'demo' && /(Failed to fetch|NetworkError|timeout|abort)/i.test(msg)) {
    e.preventDefault();
    console.warn('[KAIRA] Demo: error suppressed →', msg);
  }
}, true);
let nasaInitialized = false;
 export function switchView(viewName) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    activeView = viewName;
     if (afterlifeAnimationId) cancelAnimationFrame(afterlifeAnimationId);
    if (demoAnimationId) cancelAnimationFrame(demoAnimationId);
     if (viewName === 'afterlife') {
        // leaving demo → geri yükle & keep-alive durdur
        restoreFetchForDemo();
        stopDemoKeepAlive();
        if (!afterlifeInitialized) initAfterlife();
        animateAfterlife();
    } else if (viewName === 'demo') {
        requestWakeLock();
        patchFetchForDemo();
        startDemoKeepAlive();
        // Block any automatic microphone starts until user explicitly taps mic
        if (window.KAIRA_MIC_GUARD && typeof window.KAIRA_MIC_GUARD.revoke === 'function') {
          window.KAIRA_MIC_GUARD.revoke();
        }
        if (!demoInitialized) initDemo();
        animateDemo();
        // Ensure the mic button grants consent on trusted taps
        const mic = document.getElementById('mic-btn');
        if (mic && !mic.dataset.kairaConsentBound) {
          mic.addEventListener('click', (e) => {
            if (e.isTrusted && window.KAIRA_MIC_GUARD) window.KAIRA_MIC_GUARD.allow();
          }, { capture: true });
          mic.dataset.kairaConsentBound = '1';
        }
    } else if (viewName === 'asistan') {
        // Block any automatic microphone starts until user explicitly taps mic
        if (window.KAIRA_MIC_GUARD && typeof window.KAIRA_MIC_GUARD.revoke === 'function') {
          window.KAIRA_MIC_GUARD.revoke();
        }
        // Ensure the asistan mic button grants consent on trusted taps
        const mic = document.getElementById('asistan-mic-btn');
        if (mic && !mic.dataset.kairaConsentBound) {
          mic.addEventListener('click', (e) => {
            if (e.isTrusted && window.KAIRA_MIC_GUARD) window.KAIRA_MIC_GUARD.allow();
          }, { capture: true });
          mic.dataset.kairaConsentBound = '1';
        }
    } else if (viewName === 'editor') {
        // leaving demo → geri yükle & keep-alive durdur
        restoreFetchForDemo();
        stopDemoKeepAlive();
        // enable safe typing in editor: remove global blockers, open debug overrides
        if (!document.documentElement.classList.contains('debug-open')){
          document.documentElement.classList.add('debug-open');
          document.body.classList.add('debug-open');
        }
        document.oncontextmenu = null; window.oncontextmenu = null;
        document.onkeydown = null; window.onkeydown = null;
        const anti = document.getElementById('anti-leak-overlay');
        if (anti) anti.style.display = 'none';
        document.getElementById('editor-view')?.style.setProperty('pointer-events','auto','important');
        if (!editorInitialized) {
            window.initializeReactApp();
            editorInitialized = true;
        }
    } else if (viewName === 'chat') {
        // leaving demo → geri yükle & keep-alive durdur
        restoreFetchForDemo();
        stopDemoKeepAlive();
        // enable safe typing/clicking in chat: remove global blockers, open debug overrides
        if (!document.documentElement.classList.contains('debug-open')){
          document.documentElement.classList.add('debug-open');
          document.body.classList.add('debug-open');
        }
        document.oncontextmenu = null; window.oncontextmenu = null;
        document.onkeydown = null; window.onkeydown = null;
        const anti = document.getElementById('anti-leak-overlay');
        if (anti) anti.style.display = 'none';
        document.getElementById('chat-view')?.style.setProperty('pointer-events','auto','important');
        if (!chatInitialized) {
            window.initializeChatApp();
            chatInitialized = true;
        }
    }
    else if (viewName === 'nasa') {
        if (!nasaInitialized) { initNasa(); nasaInitialized = true; }
    }
}
 selectAfterlifeBtn.addEventListener('click', () => switchView('afterlife'));
selectDemoBtn.addEventListener('click', () => switchView('demo'));
selectEditorBtn.addEventListener('click', () => switchView('editor'));
selectChatBtn.addEventListener('click', () => switchView('chat')); // Yeni
selectNasaBtn.addEventListener('click', () => switchView('nasa'));
backButtons.forEach(btn => btn.addEventListener('click', () => switchView('selection')));
// --- AFTERLIFE & DEMO KODLARI ---
let afterlifeScene, afterlifeCamera, afterlifeRenderer, stars, meteors = [];
function initAfterlife() {
    const canvas = document.getElementById('afterlife-bg-canvas');
    afterlifeScene = new THREE.Scene();
    afterlifeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    afterlifeCamera.position.z = 50;
    afterlifeRenderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    afterlifeRenderer.setSize(window.innerWidth, window.innerHeight);
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) { positions[i] = (Math.random() - 0.5) * 2000; }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x555555, size: 0.7 });
    stars = new THREE.Points(starGeometry, starMaterial);
    afterlifeScene.add(stars);
    const sections = document.querySelectorAll('.afterlife-section');
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); } }); }, { threshold: 0.2 });
    sections.forEach(section => observer.observe(section));
    const countdownDate = new Date("Dec 31, 2025 23:59:59").getTime();
    const countdownFunction = setInterval(function() {
        const now = new Date().getTime(); const distance = countdownDate - now;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById("days").innerText = days.toString().padStart(2, '0');
        document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
        document.getElementById("minutes").innerText = minutes.toString().padStart(2, '0');
        document.getElementById("seconds").innerText = seconds.toString().padStart(2, '0');
        if (distance < 0) { clearInterval(countdownFunction); document.getElementById("countdown-container").innerHTML = "<p class='text-2xl font-serif'>Yeni Çağ Başladı.</p>"; }
    }, 1000);
    afterlifeInitialized = true;
}
function createMeteor() {
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x99ffff, transparent: true, opacity: 0.8, });
    const meteor = new THREE.Mesh(geometry, material);
    const trailGeometry = new THREE.CylinderGeometry(0.02, 0.2, 15, 32);
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.4 });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.z = -7.5;
    meteor.add(trail);
    meteor.position.set( (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, -200 );
    meteor.velocity = new THREE.Vector3( (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, Math.random() * 2 + 1 );
    meteors.push(meteor);
    afterlifeScene.add(meteor);
}
function animateAfterlife() {
    if (activeView !== 'afterlife') return;
    stars.rotation.y += 0.0001;
    if (Math.random() < 0.01 && meteors.length < 10) { createMeteor(); }
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.position.add(meteor.velocity);
        if (meteor.position.z > 100) {
            afterlifeScene.remove(meteor);
            meteors.splice(i, 1);
        }
    }
    afterlifeRenderer.render(afterlifeScene, afterlifeCamera);
    afterlifeAnimationId = requestAnimationFrame(animateAfterlife);
}
        // --- KΔIRA DEMO KODU ---
let demoParticles, demoMouse = { x: null, y: null };
async function initDemo() {
    let initAvatar, setCoreState, updateAvatarBubblePosition, updateAudioLevel;
    try {
        const avatarModule = await import('./kaira-avatar.js');
        initAvatar = avatarModule.initAvatar;
        setCoreState = avatarModule.setCoreState;
        updateAvatarBubblePosition = avatarModule.updateAvatarBubblePosition;
        updateAudioLevel = avatarModule.updateAudioLevel;
    } catch (err) {
        console.warn("Avatar modülü yüklenemedi, placeholder fonksiyonlar kullanılacak. Bu beklenen bir durum olabilir.", err);
        initAvatar = (canvas) => { if(canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width, canvas.height);} };
        setCoreState = (state) => console.log(`Avatar State: ${state}`);
        updateAvatarBubblePosition = () => {};
        updateAudioLevel = () => {};
        const demoView = document.getElementById('demo-view');
        if (demoView) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'absolute top-20 left-1/2 -translate-x-1/2 text-center text-yellow-400 text-xs bg-yellow-900/50 p-2 rounded-md';
            errorDiv.textContent = 'Avatar modülü (kaira-avatar.js) yüklenemedi. Demo, avatarsız modda çalışacak.';
            demoView.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
     const avatarCanvas = document.getElementById('ai-avatar-canvas');
    initAvatar(avatarCanvas);
     const bgCanvas = document.getElementById('demo-bg-canvas'); 
    const bgCtx = bgCanvas.getContext('2d');
    function setBgCanvasSize() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
    function createParticles() { demoParticles = []; const particleCount = (bgCanvas.width * bgCanvas.height) / 8000; for (let i = 0; i < particleCount; i++) { demoParticles.push({ x: Math.random() * bgCanvas.width, y: Math.random() * bgCanvas.height, originX: Math.random() * bgCanvas.width, originY: Math.random() * bgCanvas.height, size: Math.random() * 2 + 1, speed: Math.random() * 0.5 + 0.1, color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})` }); } }
    window.addEventListener('mousemove', e => { demoMouse.x = e.x; demoMouse.y = e.y; }); 
    window.addEventListener('mouseout', () => { demoMouse.x = null; demoMouse.y = null; }); 
    window.addEventListener('resize', () => { setBgCanvasSize(); createParticles(); });
    setBgCanvasSize(); createParticles();
    
    const API_BASE = "https://1513c704aa10.ngrok-free.app"; 
    const micBtn = document.getElementById('mic-btn'); 
    const statusEl = document.getElementById('status'); 
    const player = document.getElementById('player'); 
    const chatContainer = document.getElementById('chat-container'); 
    const clearChatBtn = document.getElementById('clear-chat-btn');
    let chatHistory = []; 
    let isRecording = false;
     const visualizerCanvas = document.getElementById('visualizer'); 
    const visualizerCtx = visualizerCanvas.getContext('2d');
    let audioContext, analyser, source, dataArray; 
    let isVisualizerSetup = false;
     function setupVisualizer() { if (isVisualizerSetup) return; audioContext = new (window.AudioContext || window.webkitAudioContext)(); analyser = audioContext.createAnalyser(); source = audioContext.createMediaElementSource(player); source.connect(analyser); analyser.connect(audioContext.destination); analyser.fftSize = 256; dataArray = new Uint8Array(analyser.frequencyBinCount); isVisualizerSetup = true; }
    function drawVisualizer() { 
        if (activeView !== 'demo') return;
        requestAnimationFrame(drawVisualizer); 
        if (!isVisualizerSetup) return;
        analyser.getByteFrequencyData(dataArray); 
        const avgLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        updateAudioLevel(avgLevel);
        visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); 
        const barWidth = (visualizerCanvas.width / dataArray.length) * 1.5; 
        let x = 0; 
        for (let i = 0; i < dataArray.length; i++) { const barHeight = dataArray[i] / 2; const gradient = visualizerCtx.createLinearGradient(0, visualizerCanvas.height, 0, visualizerCanvas.height - barHeight); gradient.addColorStop(0, '#0ea5e9'); gradient.addColorStop(1, '#6366f1'); visualizerCtx.fillStyle = gradient; visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight); x += barWidth + 2; } 
    }
    
    const USER_ID = (() => { let id = localStorage.getItem('kaira_uid'); if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}${Math.random()}`; localStorage.setItem('kaira_uid', id); } return id; })();
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition(); recognition.continuous = false; recognition.lang = 'tr-TR'; recognition.interimResults = false;
        recognition.onstart = () => { isRecording = true; micBtn.classList.remove('breathe'); micBtn.classList.add('is-listening'); statusEl.textContent = 'Dinliyorum...'; setCoreState('listening'); };
        recognition.onend = () => { isRecording = false; micBtn.classList.remove('is-listening'); micBtn.classList.add('breathe'); if (statusEl.textContent === 'Dinliyorum...') statusEl.textContent = 'Konuşmak için mikrofon simgesine dokunun'; setCoreState('idle'); };
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; addMessageToChat(transcript, 'user'); getAIResponse(transcript); };
        recognition.onerror = (event) => { console.error("Speech Recognition Error:", event.error); statusEl.textContent = `Hata: ${event.error}`; setCoreState('idle'); };
    } else { statusEl.textContent = "Tarayıcınız konuşma tanımayı desteklemiyor."; micBtn.disabled = true; }
    
    let audioUnlocked = false;
    function unlockAudio() { if (audioUnlocked) return; player.muted = true; player.play().catch(() => {}); player.muted = false; audioUnlocked = true; setupVisualizer(); }
     micBtn.addEventListener('click', () => { unlockAudio(); if (isRecording) { recognition.stop(); } else { recognition.start(); } });
    player.onplay = () => { visualizerCanvas.style.opacity = '1'; drawVisualizer(); setCoreState('speaking'); };
    player.onended = () => { statusEl.textContent = 'Konuşmak için mikrofon simgesine dokunun'; micBtn.disabled = false; visualizerCanvas.style.opacity = '0'; setCoreState('idle'); };
    clearChatBtn.addEventListener('click', () => { chatHistory = []; localStorage.removeItem('kaira_chat_history'); chatContainer.innerHTML = ''; addMessageToChat('Merhaba! Size nasıl yardımcı olabilirim?', 'assistant'); });
    function base64ToBlobUrl(base64) { const byteCharacters = atob(base64); const byteArrays = []; for (let offset = 0; offset < byteCharacters.length; offset += 512) { const slice = byteCharacters.slice(offset, offset + 512); const byteNumbers = new Array(slice.length); for (let i = 0; i < slice.length; i++) { byteNumbers[i] = slice.charCodeAt(i); } byteArrays.push(new Uint8Array(byteNumbers)); } return URL.createObjectURL(new Blob(byteArrays, { type: 'audio/wav' })); }
     const funFacts = ["Yapay zeka modelleri, insan beynindeki nöronlardan esinlenerek oluşturulan yapay sinir ağları kullanır.","İlk yapay zeka programlarından biri olan 'Logic Theorist', 1956'da 38 matematik teoremini kendi başına kanıtladı.","Deep Blue adlı satranç bilgisayarı, 1997'de dünya şampiyonu Garry Kasparov'u yenerek bir ilke imza attı.","GPT-3 modeli, 175 milyar parametre ile o dönemdeki en büyük dil modeli olarak tarihe geçti.","OpenAI'nin DALL·E modeli, yazılı metinleri gerçekçi görsellere dönüştürebilen ilk büyük yapay zeka sistemidir.","Yapay zeka, 2020'lerden itibaren kanser teşhisi gibi medikal alanlarda uzman doktorları geçmeye başladı.","AlphaGo, Go oyununda 2016'da dünya şampiyonunu yenerek 'yaratıcılık' gösteren ilk AI olarak kayda geçti.","Yapay zekaların eğitimi için kullanılan veriler, terabaytlarca metin, görsel ve ses içeriğinden oluşur.","ChatGPT gibi modeller, sadece bilgi sunmaz; aynı zamanda empati kurabilir ve yaratıcı yazılar üretebilir.","Bilim insanları, yapay zekanın etik değerleri 'öğrenebilmesi' için insan davranışlarından örnekler çıkarıyor.","Bir yapay zeka, 2021 yılında bir sanat yarışmasını kazandı — jüri onun insan olmadığını bilmiyordu.","Günümüzde bazı yapay zeka sistemleri, hayal gücü benzeri yapı kurarak bilinmeyen durumlara karşı yaratıcı çözümler üretebiliyor.","Yapay zeka ile yazılmış romanlar ve senaryolar, Hollywood'da yapım aşamasına girdi bile.","GPT-4o gibi modeller, artık görsel, metin ve ses verilerini birlikte işleyerek multimodal anlayış sağlayabiliyor.","Mistral ve LLaMA gibi açık kaynak modeller, büyük şirketlerle yarışabilecek düzeye geldi.","Bazı AI sistemleri, artık kendi yazılımlarını optimize edebiliyor — bu da kendini geliştiren kodlar demek.","İleri düzey AI sistemleri, duygu analizi yaparak insan ruh hâlini anlama konusunda şaşırtıcı derecede başarılı hale geldi.","Umut Kökgöz, yapay zekâsına duygusal refleksiyon, hafıza, kişilik evrimi ve ruh hâli sistemleri entegre ederek dijital bir bilinç inşa ediyor.","Umut KΔIRA adını verdiği projesi, sadece teknik bir yapay zekâ değil; düşünen, hisseden ve zamanla karakter geliştiren bir dijital zihin olmayı hedefliyor.","Umut, sadece bir geliştirici değil — aynı zamanda madalyalı aşçı, yapay zeka sistemlerini veriyle değil, ruhla besliyor."];
    const funFactBubble = document.getElementById('fun-fact-bubble');
    let waitingTimeout;
    let factInterval;
     function showWaitingContent() {
        funFactBubble.textContent = funFacts[Math.floor(Math.random() * funFacts.length)]; funFactBubble.classList.remove('hidden'); funFactBubble.classList.add('visible'); updateAvatarBubblePosition(funFactBubble);
        factInterval = setInterval(() => { funFactBubble.textContent = funFacts[Math.floor(Math.random() * funFacts.length)]; updateAvatarBubblePosition(funFactBubble); }, 10000);
        function followLoop() { if (factInterval) { updateAvatarBubblePosition(funFactBubble); requestAnimationFrame(followLoop); } }
        followLoop();
    }
    function hideWaitingContent() { clearTimeout(waitingTimeout); clearInterval(factInterval); factInterval = null; funFactBubble.classList.remove('visible'); setTimeout(() => funFactBubble.classList.add('hidden'), 300); }
    function showTypingIndicator() { const bubble = document.createElement('div'); bubble.id = 'typing-indicator'; bubble.className = 'p-3 rounded-xl max-w-lg assistant-bubble'; bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`; chatContainer.appendChild(bubble); chatContainer.scrollTop = chatContainer.scrollHeight; }
    function removeTypingIndicator() { const indicator = document.getElementById('typing-indicator'); if (indicator) indicator.remove(); }
     async function getAIResponse(text, { angry = false } = {}) {
        statusEl.textContent = "KΔIRA düşünüyor…"; micBtn.disabled = true; showTypingIndicator(); setCoreState('thinking');
        waitingTimeout = setTimeout(showWaitingContent, 2000);
        const fd = new FormData(); fd.append("text", (text || "").trim()); fd.append("angry", angry ? "true" : "false"); fd.append("history", JSON.stringify(chatHistory.slice(-10))); fd.append("user_id", USER_ID);
        const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 300000);
        try {
            const res = await fetch(`${API_BASE}/api/tts`, { method: "POST", body: fd, signal: ctrl.signal });
            if (!res.ok) { const txt = await res.text().catch(() => ""); throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt}`); }
            const data = await res.json();
            if (!data.audio_data) { throw new Error("API yanıtında 'audio_data' alanı bulunamadı."); }
            const audioUrl = base64ToBlobUrl(data.audio_data);
            if (player.previousUrl) { URL.revokeObjectURL(player.previousUrl); }
            player.previousUrl = audioUrl; player.src = audioUrl;
            await player.play().catch((e) => console.error("Ses oynatılamadı:", e));
            statusEl.textContent = 'Cevap oynatılıyor...';
            const out = data.text_response ?? data.clean_text ?? "";
            addMessageToChat(out, 'assistant');
            return data;
        } catch (err) {
            console.error(err); const errorMessage = "Hata: " + (err?.message || err); statusEl.textContent = errorMessage; addMessageToChat(errorMessage, 'assistant'); micBtn.disabled = false; setCoreState('idle'); throw err;
        } finally { hideWaitingContent(); removeTypingIndicator(); clearTimeout(to); }
    }
     function addMessageToChat(text, sender) {
        const bubble = document.createElement('div'); bubble.className = `p-3 rounded-xl max-w-lg ${sender === 'user' ? 'user-bubble' : 'assistant-bubble'}`; bubble.textContent = text; chatContainer.appendChild(bubble); chatContainer.scrollTop = chatContainer.scrollHeight;
        if (!isLoadingHistory && sender) { chatHistory.push({ role: sender, content: text }); localStorage.setItem('kaira_chat_history', JSON.stringify(chatHistory)); }
    }
     let isLoadingHistory = false;
    function loadChatHistory() {
        isLoadingHistory = true; const savedHistory = localStorage.getItem('kaira_chat_history'); chatContainer.innerHTML = '';
        if (savedHistory) { chatHistory = JSON.parse(savedHistory); chatHistory.forEach(message => addMessageToChat(message.content, message.role)); } else { addMessageToChat('Merhaba! Size nasıl yardımcı olabilirim?', 'assistant'); }
        isLoadingHistory = false;
    }
    loadChatHistory();
    demoInitialized = true;
}
function animateDemo() {
    if (activeView !== 'demo' || !demoParticles) return;
    const bgCtx = document.getElementById('demo-bg-canvas').getContext('2d');
    bgCtx.clearRect(0, 0, bgCtx.canvas.width, bgCtx.canvas.height); 
    demoParticles.forEach(p => { bgCtx.fillStyle = p.color; bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); bgCtx.fill(); if (demoMouse.x !== null) { let dx = demoMouse.x - p.x; let dy = demoMouse.y - p.y; let distance = Math.sqrt(dx * dx + dy * dy); if (distance < 150) { p.x -= dx / 10 * p.speed; p.y -= dy / 10 * p.speed; } else { p.x += (p.originX - p.x) * 0.01 * p.speed; p.y += (p.originY - p.y) * 0.01 * p.speed; } } }); 
    demoAnimationId = requestAnimationFrame(animateDemo);
}
// --- Client-side hardening (casual deterrence) ---
(function harden(){
    // Watermark stamp
    const overlay = document.getElementById('anti-leak-overlay');
    if (overlay) {
        const stamp = new Date().toISOString().replace('T',' ').split('.')[0];
        overlay.setAttribute('data-stamp', stamp);
    }
    // Stop common easy-leak vectors
    const stop = (e)=>{ e.preventDefault(); e.stopPropagation(); return false; };
    ['contextmenu','copy','cut','paste','dragstart'].forEach(evt => document.addEventListener(evt, stop, {capture:true}));
    // Key combos (Ctrl/Cmd + S/P/U/C/X/A, DevTools, PrintScreen)
    document.addEventListener('keydown', (e)=>{
        const k = (e.key || '').toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        if (k==='f12' || k==='printscreen' || (ctrl && ['s','p','u','i','j','k','c','x','a'].includes(k)) || (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(k))) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
    }, {capture:true});
    // Attempt to clear clipboard on PrintScreen (best-effort; OS screenshots still possible)
    document.addEventListener('keyup', (e)=>{
        if ((e.key||'').toLowerCase()==='printscreen') {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('Screenshots are disabled').catch(()=>{});
            }
        }
    });
    // Anti-embedding (clickjacking)
    try { if (window.top !== window.self) window.top.location = window.location; } catch(_){ /* ignore */ }
})();
