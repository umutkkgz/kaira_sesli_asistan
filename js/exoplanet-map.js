import { escapeHTML } from './utils.js';

let __aladin;
window.__exoLayers = window.__exoLayers || [];
let __fovShadow = 60;

function initAladin(){
  if (__aladin) { console.log('[Aladin] already initialized'); return; }
  const el = document.getElementById('aladin-map');
  if (!el) { console.warn('[Aladin] #aladin-map not found'); return; }
  if (!window.A || typeof A.aladin !== 'function') { console.warn('[Aladin] library not loaded'); return; }
  __aladin = A.aladin('#aladin-map', {
    survey: 'P/DSS2/color',
    fov: 60,
    target: 'M42',
    showCooGridControl: false,
    showSimbadPointerControl: false,
    showFullscreenControl: false,
    showZoomControl: false
  });
  try { __fovShadow = (__callGetFoV() ?? 60); } catch(_) { __fovShadow = 60; }
  try { __aladin.setCooGridVisible(false); } catch(_){ }
  console.log('[Aladin] instance created (external toolbar mode)');
  try {
    const host = document.getElementById('aladin-map');
    const zc = document.getElementById('zoom-controls');
    if (host && zc) {
      host.appendChild(zc);
      zc.style.pointerEvents = 'auto';
      zc.style.zIndex = '2147483647';
      zc.style.position = 'absolute';
    }
  } catch(_){ }
}

async function fetchAndPlotExoplanets(){
  const infoEl = document.getElementById('exo-info');
  try{
    const endpoint = ((window.API_PROXY_BASE && window.API_PROXY_BASE.trim()) ? window.API_PROXY_BASE.trim() : 'https://1513c704aa10.ngrok-free.app') + '/api/get-exoplanets';
    console.log('[Exo] Fetching:', endpoint);
    if (infoEl) infoEl.textContent = `Ötegezegen verisi alınıyor… (${endpoint})`;
    const ac = new AbortController();
    const to = setTimeout(()=> ac.abort('timeout'), 15000);
    const res = await fetch(endpoint, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      cache: 'no-store',
      signal: ac.signal
    });
    clearTimeout(to);
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      throw new Error('HTTP ' + res.status + ' — ' + txt);
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Beklenmeyen JSON formatı (dizi değil)');
    const list = data;
    if (list.length) { window.plotExoplanetsOnMap(list); }
    if (infoEl) infoEl.textContent = list.length ? `${list.length} ötegezegen işaretlendi.` : 'Ötegezegen verisi bulunamadı.';
  } catch(e){
    console.error('[Exo] Fetch failed:', e);
    if (infoEl) infoEl.textContent = 'Ötegezegen verisi alınamadı.';
  }
}

function whenMapReady(run){
  let tries = 0;
  (function tick(){
    const el = document.getElementById('aladin-map');
    if (!el){
      if (++tries > 100) return run(null);
      return setTimeout(tick, 100);
    }
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    if (visible) return run(el);
    if (++tries > 100) return run(el);
    setTimeout(tick, 100);
  })();
}

function __callGetFoV(){
  try {
    if (__aladin && typeof __aladin.getFoV === 'function') return __aladin.getFoV();
    if (__aladin && typeof __aladin.getFov === 'function') return __aladin.getFov();
  } catch(_){ }
  return undefined;
}
function __callSetFoV(v){
  try {
    if (__aladin && typeof __aladin.setFoV === 'function') { __aladin.setFoV(v); return true; }
    if (__aladin && typeof __aladin.setFov === 'function') { __aladin.setFov(v); return true; }
  } catch(_){ }
  return false;
}
function getFovSafe(){
  let f;
  try { f = __callGetFoV(); if (f === undefined) f = __fovShadow; } catch(_) { f = __fovShadow; }
  if (!Number.isFinite(f) || f <= 0) f = __fovShadow || 60;
  return f;
}
function setFovSafe(val){
  if (!__aladin) return;
  let v = Number(val);
  if (!Number.isFinite(v) || v <= 0) v = getFovSafe();
  if (v < 0.02) v = 0.02; else if (v > 360) v = 360;
  const ok = __callSetFoV(v);
  if (ok) __fovShadow = v;
}
function bindZoomButtons(){
  const inBtn  = document.getElementById('zoom-in');
  const outBtn = document.getElementById('zoom-out');
  if (!inBtn || !outBtn) return;
  if (inBtn.dataset.bound === '1' && outBtn.dataset.bound === '1') return;
  inBtn.dataset.bound = '1';
  outBtn.dataset.bound = '1';
  const step = 1.04;
  function onPlus(e){ e.preventDefault(); e.stopPropagation(); if (!__aladin) return; setFovSafe(getFovSafe()/step); }
  function onMinus(e){ e.preventDefault(); e.stopPropagation(); if (!__aladin) return; setFovSafe(getFovSafe()*step); }
  inBtn.addEventListener('pointerdown', onPlus, { passive:false });
  outBtn.addEventListener('pointerdown', onMinus, { passive:false });
  inBtn.addEventListener('click', onPlus, { passive:false });
  outBtn.addEventListener('click', onMinus, { passive:false });
}
function bindAladinToolbar(){
  const btnGrid = document.getElementById('btnGrid');
  const btnFull = document.getElementById('btnFullSky');
  const btnOrion = document.getElementById('btnOrion');
  const btnClear = document.getElementById('btnClearExo');
  const surveySel = document.getElementById('surveySelect');
  if (btnGrid){
    let gridOn = false;
    btnGrid.addEventListener('click', () => {
      if (!__aladin) return;
      gridOn = !gridOn;
      try { __aladin.setCooGridVisible(gridOn); } catch(_){ }
      btnGrid.classList.toggle('ring-1', gridOn);
      btnGrid.classList.toggle('ring-blue-400', gridOn);
    });
  }
  if (btnFull){ btnFull.addEventListener('click', () => { if(__aladin){ setFovSafe(360); __aladin.gotoRaDec(0,0); }}); }
  if (btnOrion){ btnOrion.addEventListener('click', () => { if(__aladin){ setFovSafe(8); __aladin.gotoRaDec(83.822, -5.391); }}); }
  if (btnClear){
    btnClear.addEventListener('click', () => {
      try {
        if (window.__exoLayers && window.__exoLayers.length){
          window.__exoLayers.forEach(cat => { try { __aladin.removeCatalog(cat); } catch(_){} });
          window.__exoLayers = [];
        }
        const infoEl = document.getElementById('exo-info');
        if (infoEl) infoEl.textContent = 'Katmanlar temizlendi.';
      } catch(_){ }
    });
  }
  if (surveySel){
    surveySel.addEventListener('change', () => {
      const v = surveySel.value;
      if (__aladin && v){ try { __aladin.setImageSurvey(v); } catch(_){ } }
    });
  }
}
function bindGentleZoom(){ /* placeholder */ }

const TOUR_PRESETS = [
  { name:'Galaktik Merkez (Sgr A*)',    ra:266.4168, dec:-29.0078, fov:10,  survey:'P/AllWISE/color' },
  { name:'Orion Bulutsusu (M42)',       ra:83.8221,  dec:-5.3911,  fov:8,   survey:'P/DSS2/color' },
  { name:'Atbaşı Bulutsusu',            ra:85.2500,  dec:-2.4500,  fov:3.8, survey:'P/DSS2/color' },
  { name:'Pleiades (M45)',              ra:56.7500,  dec:24.1167,  fov:8,   survey:'P/DSS2/color' },
  { name:'Andromeda Gökadası (M31)',    ra:10.6847,  dec:41.2687,  fov:6,   survey:'P/DSS2/color' },
  { name:'Triangulum (M33)',            ra:23.4621,  dec:30.6599,  fov:5,   survey:'P/DSS2/color' },
  { name:'Whirlpool (M51)',             ra:202.4696, dec:47.1952,  fov:4,   survey:'P/DSS2/color' },
  { name:'Sombrero (M104)',             ra:189.9970, dec:-11.6230, fov:4,   survey:'P/DSS2/color' },
  { name:'Pinwheel (M101)',             ra:210.8020, dec:54.3490,  fov:5,   survey:'P/DSS2/color' },
  { name:'Kuzey Amerika (NGC 7000)',    ra:314.0000, dec:44.5000,  fov:10,  survey:'P/DSS2/color' },
  { name:'Veil / Cygnus Loop',          ra:312.7800, dec:31.7330,  fov:8,   survey:'P/DSS2/color' },
  { name:'Kaliforniya Bulutsusu',       ra:63.0000,  dec:36.5000,  fov:10,  survey:'P/DSS2/color' },
  { name:'Rosette Bulutsusu',           ra:97.5000,  dec:5.0000,   fov:6,   survey:'P/DSS2/color' },
  { name:'Kalp Bulutsusu (IC 1805)',    ra:38.4700,  dec:61.3500,  fov:6,   survey:'P/DSS2/color' },
  { name:'Ruh Bulutsusu (IC 1848)',     ra:38.6700,  dec:60.1800,  fov:6,   survey:'P/DSS2/color' },
  { name:'Lagün (M8)',                  ra:270.9250, dec:-24.3860, fov:5,   survey:'P/DSS2/color' },
  { name:'Trifid (M20)',                ra:270.9500, dec:-23.0200, fov:4,   survey:'P/DSS2/color' },
  { name:'Omega (M17)',                 ra:275.1000, dec:-16.1700, fov:4,   survey:'P/DSS2/color' },
  { name:'Kartal (M16)',                ra:274.7000, dec:-13.8000, fov:4,   survey:'P/DSS2/color' },
  { name:'Rho Ophiuchi',                ra:246.7800, dec:-24.5700, fov:6,   survey:'P/AllWISE/color' },
  { name:'Büyük Macellan Bulutu',       ra:80.8940,  dec:-69.7560, fov:12,  survey:'P/DSS2/color' },
  { name:'Küçük Macellan Bulutu',       ra:13.1860,  dec:-72.8280, fov:10,  survey:'P/DSS2/color' },
  { name:'Kepler Alanı (FOV merkezi)',  ra:290.5000, dec:44.5000,  fov:25,  survey:'P/SDSS9/color' }
];
let tourIndex = 0;
let tourTimer = null;
let tourPlaying = false;
function populateTourSelect(){
  const sel = document.getElementById('tourSelect');
  if (!sel) return;
  sel.innerHTML = '';
  TOUR_PRESETS.forEach((p,i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i+1}. ${p.name}`;
    sel.appendChild(opt);
  });
  sel.value = String(tourIndex);
}
function gotoTour(i){
  if (!__aladin) return;
  const n = TOUR_PRESETS.length;
  tourIndex = ((i % n) + n) % n;
  const p = TOUR_PRESETS[tourIndex];
  try {
    if (p.survey) __aladin.setImageSurvey(p.survey);
    __aladin.setFov(p.fov);
    __aladin.gotoRaDec(p.ra, p.dec);
    const sel = document.getElementById('tourSelect');
    if (sel) sel.value = String(tourIndex);
    const infoEl = document.getElementById('exo-info');
    if (infoEl) infoEl.textContent = `Tur: ${p.name} • RA ${p.ra.toFixed(3)}°, Dec ${p.dec.toFixed(3)}° • FOV ${p.fov}°`;
  } catch(e){ console.warn('[Tour] goto error', e); }
}
function nextTour(){ gotoTour(tourIndex + 1); }
function prevTour(){ gotoTour(tourIndex - 1); }
function stopTour(){ tourPlaying = false; if (tourTimer){ clearInterval(tourTimer); tourTimer = null; } }
function playTour(){ stopTour(); tourPlaying = true; tourTimer = setInterval(() => { nextTour(); }, 5000); }
function bindTourControls(){
  populateTourSelect();
  const prev = document.getElementById('tourPrev');
  const next = document.getElementById('tourNext');
  const sel  = document.getElementById('tourSelect');
  const play = document.getElementById('tourPlay');
  if (prev) prev.addEventListener('click', prevTour);
  if (next) next.addEventListener('click', nextTour);
  if (sel) sel.addEventListener('change', () => { stopTour(); gotoTour(Number(sel.value)); });
  if (play) play.addEventListener('click', () => {
    if (tourPlaying) { stopTour(); play.textContent = 'Oto Tur'; }
    else { playTour(); play.textContent = 'Durdur'; }
  });
}

window.plotExoplanetsOnMap = function(planets){
  try{
    if (!__aladin || !Array.isArray(planets)) return;
    if (window.__exoLayers && window.__exoLayers.length){
      window.__exoLayers.forEach(cat => { try { __aladin.removeCatalog(cat); } catch(_){} });
    }
    window.__exoLayers = [];
    const cfgs = [
      { name:'Yakın (≤200 pc)', color:'#22c55e',  filter:p=>Number(p.sy_dist) <= 200 },
      { name:'Orta (200–800 pc)', color:'#60a5fa', filter:p=>Number(p.sy_dist) > 200 && Number(p.sy_dist) <= 800 },
      { name:'Uzak (>800 pc)',   color:'#f472b6', filter:p=>Number(p.sy_dist) > 800 }
    ];
    const all = [];
    cfgs.forEach(cfg => {
      const cat = A.catalog({ name: cfg.name, sourceSize: 10, color: cfg.color });
      const pts = planets.filter(cfg.filter).map(p => {
        const ra = Number(p.ra), dec = Number(p.dec);
        if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;
        all.push([ra,dec]);
        return A.marker(ra, dec, {
          name: p.pl_name || p.hostname || 'Exoplanet',
          popupTitle: p.pl_name || 'Exoplanet',
          popupDesc: `<div><b>Yıldız:</b> ${escapeHTML(p.hostname||'—')}<br>`+
                     `<b>Uzaklık:</b> ${String(p.sy_dist||'—')} pc<br>`+
                     `<b>RA/Dec:</b> ${String(p.ra)}, ${String(p.dec)}<br>`+
                     `<b>Gezegen sayısı:</b> ${String(p.sy_pnum||'—')}</div>`
        });
      }).filter(Boolean);
      cat.addSources(pts);
      __aladin.addCatalog(cat);
      window.__exoLayers.push(cat);
    });
    if (all.length){
      const mra = all.reduce((a,b)=>a+b[0],0)/all.length;
      const mdec = all.reduce((a,b)=>a+b[1],0)/all.length;
      __aladin.gotoRaDec(mra, mdec);
      const maxSep = Math.max(...all.map(([r,d])=>angularSep(mra,mdec,r,d)));
      __aladin.setFov(Math.min(120, Math.max(4, maxSep*2.2)));
    }
  }catch(e){ console.warn('plotExoplanetsOnMap hata:', e); }
};
function fitViewToPoints(planets){
  const r = planets.map(p => Number(p.ra)).filter(n => !Number.isNaN(n));
  const d = planets.map(p => Number(p.dec)).filter(n => !Number.isNaN(n));
  if (!r.length || !d.length || !__aladin) return;
  const mra = r.reduce((a,b)=>a+b,0)/r.length, mdec = d.reduce((a,b)=>a+b,0)/d.length;
  __aladin.gotoRaDec(mra, mdec);
  const maxSep = Math.max(...planets.map(p => angularSep(mra, mdec, Number(p.ra), Number(p.dec))));
  __aladin.setFov(Math.min(60, Math.max(2, maxSep * 2.5)));
}
function angularSep(ra1, dec1, ra2, dec2){
  const d2r = Math.PI/180; ra1*=d2r; dec1*=d2r; ra2*=d2r; dec2*=d2r;
  const s = Math.acos(Math.sin(dec1)*Math.sin(dec2) + Math.cos(dec1)*Math.cos(dec2)*Math.cos(ra1-ra2));
  return s / d2r;
}

export async function ensureAladinReady(){
  function proceed(){
    console.log('[Aladin] proceeding to init…');
    initAladin();
    bindGentleZoom();
    bindZoomButtons();
    fetchAndPlotExoplanets();
    try { gotoTour(0); } catch(_){ }
  }
  let tries = 0;
  while (!(window.A && typeof A.aladin === 'function') && tries < 100){
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!(window.A && typeof A.aladin === 'function')){
    console.warn('[Aladin] library not present (timeout)');
    return;
  }
  if (A.init && typeof A.init.then === 'function'){
    try { await A.init; } catch(err){ console.warn('[Aladin] A.init rejected:', err); }
  }
  whenMapReady(() => proceed());
  bindAladinToolbar();
  bindTourControls();
}
