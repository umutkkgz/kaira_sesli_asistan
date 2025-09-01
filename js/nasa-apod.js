import { escapeHTML } from './utils.js';
import { ensureAladinReady } from './exoplanet-map.js';

export function initNasa(){
  console.log('[NASA] initNasa() start');
  const nasaView = document.getElementById('nasa-view');
  const nav = nasaView.querySelector('nav');
  const sections = nasaView.querySelectorAll('.nasa-content');
  function setActiveTab(targetId){
    nasaView.querySelectorAll('.nasa-tab').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
    sections.forEach(s => s.classList.toggle('active', s.id === targetId));
  }
  if (nav && !nav.dataset.bound){
    nav.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.nasa-tab');
      if (!btn) return;
      ev.preventDefault();
      setActiveTab(btn.dataset.target);
    });
    nav.dataset.bound = '1';
  }
  setTimeout(() => {
    const current = nasaView.querySelector('.nasa-tab.active')?.dataset.target || 'apod-container';
    setActiveTab(current);
  }, 0);

  async function translateWithGemini(text, apiKey){
    try{
      if (!text || !apiKey) return null;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: { parts: [{ text: "Aşağıdaki metni doğal ve akıcı bir Türkçeye çevir. Sadece çeviriyi ver, açıklama ekleme." }] },
        contents: [ { role: 'user', parts: [{ text }] } ]
      };
      const res = await fetch(endpoint, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) {
        const t = await res.text().catch(()=> '');
        throw new Error(`Gemini HTTP ${res.status} — ${t}`);
      }
      const data = await res.json();
      const out = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      return (out && out.trim()) ? out.trim() : null;
    }catch(err){
      console.warn('Çeviri başarısız:', err);
      return null;
    }
  }

  const apiStatus = document.getElementById('nasa-api-status');
  const base = window.API_PROXY_BASE || '';
  console.log('[NASA] API base =', base);
  const apodContainer = document.getElementById('apod-container');
  const apodTab = document.querySelector('#nasa-view .nasa-tab[data-target="apod-container"]');
  const marsTab = document.querySelector('#nasa-view .nasa-tab[data-target="mars-container"]');
  let marsBound = false;

  function activateNasaTab(targetId){
    const tabs = document.querySelectorAll('#nasa-view .nasa-tab');
    const sections = document.querySelectorAll('#nasa-view .nasa-content');
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    const tab = document.querySelector(`#nasa-view .nasa-tab[data-target="${targetId}"]`);
    const section = document.getElementById(targetId);
    if (tab) tab.classList.add('active');
    if (section) section.classList.add('active');
  }
  function renderApodLoading(){ apodContainer.innerHTML = '<div class="text-center text-gray-400 p-8">Yükleniyor...</div>'; }
  function renderApodError(msg){ apodContainer.innerHTML = `<div class="text-center text-red-400 p-8">Hata: ${escapeHTML(msg)}</div>`; }

  async function fetchApod(date){
    try{
      renderApodLoading();
      const apiKey = window.KAIRA_NASA?.nasaApiKey;
      if (!apiKey) throw new Error('NASA API anahtarı yok.');
      const q = new URLSearchParams({ api_key: apiKey, thumbs:'true' });
      if (date) q.set('date', date);
      const res = await fetch(`https://api.nasa.gov/planetary/apod?${q.toString()}`);
      if (!res.ok){
        const txt = await res.text().catch(()=> '');
        throw new Error(`HTTP ${res.status} — ${txt}`);
      }
      const data = await res.json();
      const gKey = window.KAIRA_NASA?.googleApiKey || null;
      let trTitle = null, trExpl = null;
      if (gKey){
        trTitle = await translateWithGemini(data.title, gKey).catch(()=>null);
        trExpl  = await translateWithGemini(data.explanation, gKey).catch(()=>null);
      }
      renderApod({
        ...data,
        title: trTitle || data.title,
        explanation: trExpl || data.explanation
      });
    }catch(e){
      renderApodError(e?.message || e);
    }
  }
  function renderApod(data){
    if (!apodContainer) return;
    const title   = data?.title || 'Astronomy Picture of the Day';
    const date    = data?.date  || '';
    const explain = data?.explanation || '';
    const credit  = data?.copyright ? `© ${escapeHTML(data.copyright)}` : '';
    let mediaHtml = '';
    if (data?.media_type === 'image') {
      const src = data.hdurl || data.url || data.thumbnail_url || '';
      mediaHtml = `<img src="${src}" alt="${escapeHTML(title)}" class="w-full rounded-xl border border-gray-700" />`;
    } else if (data?.media_type === 'video') {
      const src = data.url || '';
      mediaHtml = `<div class="aspect-video w-full"><iframe src="${src}" class="w-full h-full rounded-xl border border-gray-700" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe></div>`;
    } else {
      mediaHtml = `<div class="text-center text-gray-400">Desteklenmeyen medya türü: ${escapeHTML(String(data?.media_type))}</div>`;
    }
    apodContainer.innerHTML = `<div class="bg-gray-800/60 border border-gray-700 rounded-xl p-4 md:p-6"><div class="flex items-baseline justify-between gap-3"><div><h3 class="text-2xl font-semibold text-white mb-1">${escapeHTML(title)}</h3><p class="text-gray-400 text-sm">${escapeHTML(date)} ${credit ? '• '+credit : ''}</p></div><button id="apod-refresh" class="al-btn">Yenile</button></div><div class="mt-3">${mediaHtml}</div><p class="text-gray-300 leading-relaxed mt-4 whitespace-pre-wrap">${escapeHTML(explain)}</p><div class="mt-3 text-xs text-gray-500">Kaynak: NASA APOD</div></div>`;
    const btn = document.getElementById('apod-refresh');
    if (btn) btn.addEventListener('click', () => fetchApod());
  }

  function renderMarsLoading(){ const r=document.getElementById('mars-results'); if(r) r.innerHTML='<div class="col-span-full text-center text-gray-400 p-8">Yükleniyor...</div>'; }
  function renderMarsError(msg){ const r=document.getElementById('mars-results'); if(r) r.innerHTML=`<div class="col-span-full text-center text-red-400 p-8">Hata: ${escapeHTML(msg)}</div>`; }
  function renderMarsPhotos(photos){
    const results=document.getElementById('mars-results');
    if(!results) return;
    if(!photos||!photos.length){ results.innerHTML='<div class="col-span-full text-center text-gray-400 p-8">Sonuç bulunamadı. Farklı tarih/kamera deneyin veya "En Son"a basın.</div>'; return; }
    const html=photos.map(p=>`<article class="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden"><img src="${p.img_src}" alt="${escapeHTML(p.camera?.full_name||'Mars')}" class="w-full h-48 object-cover" /><div class="p-4"><h3 class="text-white font-semibold mb-1">${escapeHTML(p.rover?.name||'Rover')} • ${escapeHTML(p.camera?.name||'Kamera')}</h3><p class="text-gray-400 text-sm">${escapeHTML(p.earth_date||'')}</p></div></article>`).join('');
    results.innerHTML=html;
  }
  async function fetchMars(params={}){
    try{
      renderMarsLoading();
      const apiKey = window.KAIRA_NASA?.nasaApiKey;
      if(!apiKey) throw new Error('NASA API anahtarı yok.');
      const rover=(params.rover||'curiosity').toLowerCase();
      let url;
      if(params.latest){
        url=`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${apiKey}`;
      } else {
        const q=new URLSearchParams({ api_key: apiKey });
        if(params.earth_date) q.set('earth_date', params.earth_date);
        if(params.camera) q.set('camera', params.camera);
        url=`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?${q.toString()}`;
      }
      const res=await fetch(url);
      if(!res.ok){ const txt=await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status} — ${txt}`); }
      const data=await res.json();
      const photos=data.latest_photos || data.photos || [];
      renderMarsPhotos(photos);
    }catch(e){ renderMarsError(e?.message || e); }
  }
  function bindMarsControls(){
    if (marsBound) return; marsBound = true;
    const roverSel=document.getElementById('mars-rover');
    const dateInp=document.getElementById('mars-date');
    const camSel=document.getElementById('mars-camera');
    const btnLatest=document.getElementById('mars-latest');
    const btnFetch=document.getElementById('mars-fetch');
    if(btnLatest) btnLatest.addEventListener('click', () => fetchMars({ rover: roverSel.value, latest: true }));
    if(btnFetch) btnFetch.addEventListener('click', () => { fetchMars({ rover: roverSel.value, earth_date: dateInp.value || undefined, camera: camSel.value || undefined }); });
  }

  async function fetchNasaKeys(){
    apiStatus.textContent = 'Anahtarlar sunucudan bekleniyor...';
    try{
      const headers = { 'ngrok-skip-browser-warning': 'true' };
      const [nasaRes, googleRes] = await Promise.all([
        fetch(`${base}/api/get-nasa-key`, { headers }),
        fetch(`${base}/api/get-google-key`, { headers })
      ]);
      const nasaData = await nasaRes.json().catch(()=>({}));
      const googleData = await googleRes.json().catch(()=>({}));
      window.KAIRA_NASA = {
        nasaApiKey: (nasaRes.ok && nasaData.apiKey) ? nasaData.apiKey : null,
        googleApiKey: (googleRes.ok && googleData.apiKey) ? googleData.apiKey : null
      };
      if (window.KAIRA_NASA.nasaApiKey) {
        apiStatus.textContent = 'Bağlantı kuruldu';
        apiStatus.classList.remove('text-gray-400');
        apiStatus.classList.add('text-green-400');
        if (apodTab) {
          apodTab.disabled = false;
          apodTab.style.cursor = 'pointer';
          apodTab.addEventListener('click', () => { activateNasaTab('apod-container'); fetchApod().catch(()=>{}); }, { once: true });
        }
        activateNasaTab('apod-container');
        fetchApod().catch(()=>{});
        if (marsTab) {
          marsTab.disabled = false;
          marsTab.style.cursor = 'pointer';
          marsTab.addEventListener('click', () => { activateNasaTab('mars-container'); bindMarsControls(); fetchMars({ latest: true, rover: 'curiosity' }); }, { once: true });
        }
      } else {
        throw new Error(nasaData?.error || 'NASA API anahtarı alınamadı.');
      }
    }catch(e){
      apiStatus.textContent = 'Hata: ' + (e?.message || e);
      apiStatus.classList.add('text-red-400');
    }
  }

  fetchNasaKeys();
  ensureAladinReady();
}
window.initNasa = initNasa;
