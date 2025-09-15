// News page — fetch Turkish AI-related news via NewsAPI
(function(){
  const list = document.getElementById('news-list');
  const statusEl = document.getElementById('news-status');
  const qEl = document.getElementById('news-q');
  const daysEl = document.getElementById('news-days');
  const btn = document.getElementById('news-refresh');

  // Persist the API key locally (user provided). Warning: exposing keys in client is not secure.
  const DEFAULT_KEY = '1e7565d5136d429b9098840c71c3805b';
  let API_KEY = (localStorage.getItem('newsapi_key') || DEFAULT_KEY);
  try{ localStorage.setItem('newsapi_key', API_KEY); }catch(_){ }

  function fmtDate(iso){ try{ return new Date(iso).toLocaleString('tr-TR'); }catch(_){ return iso||''; } }
  function esc(s){ return String(s||'').replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }
  function ago(days){ const d=new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0,19) + 'Z'; }

  async function fetchNews(){
    const base = 'https://newsapi.org/v2/everything';
    const userQ = (qEl && qEl.value || '').trim();
    // Türkçe AI odağına uygun sorgu
    const q = [
      '"yapay zeka"', 'yapay zekâ', 'LLM', 'genel yapay zeka', 'makine öğrenimi'
    ].concat(userQ ? [userQ] : []).join(' OR ');
    const days = Number(daysEl && daysEl.value || 7);
    const urlParams = new URLSearchParams({
      q,
      language: 'tr',
      sortBy: 'publishedAt',
      from: ago(days),
      pageSize: '30'
    });

    const tryHeaders = async ()=>{
      // Preferred: API key via header (if CORS allows)
      const res = await fetch(base + '?' + urlParams.toString(), {
        headers: { 'X-Api-Key': API_KEY }
      });
      return res;
    };
    const tryQuery = async ()=>{
      const res = await fetch(base + '?' + urlParams.toString() + '&apiKey=' + encodeURIComponent(API_KEY));
      return res;
    };

    list.innerHTML = '';
    statusEl.textContent = 'Haberler alınıyor...';
    let res;
    try {
      res = await tryHeaders();
      if (!res.ok) throw new Error('header mode failed: ' + res.status);
    } catch(_) {
      try { res = await tryQuery(); } catch(e){ res = null; }
    }
    if (!res || !res.ok){ statusEl.textContent = 'Haberler alınamadı (NewsAPI)'; return; }
    const j = await res.json().catch(()=>({}));
    const items = Array.isArray(j.articles) ? j.articles : [];
    if (!items.length){ statusEl.textContent = 'Sonuç bulunamadı'; return; }
    statusEl.textContent = `Kaynak: NewsAPI • ${items.length} haber`;

    // Render
    const dedup = new Set();
    for (const it of items){
      const key = (it.title||'') + '|' + (it.source && it.source.name || '');
      if (dedup.has(key)) continue; dedup.add(key);
      const img = it.urlToImage || '';
      const card = document.createElement('a');
      card.href = it.url || '#';
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'shell rounded-2xl overflow-hidden block hover:scale-[1.01] transition-transform border border-gray-700';
      card.innerHTML = `
        <div class="aspect-video bg-gray-800 overflow-hidden">${img ? `<img src="${esc(img)}" alt="" class="w-full h-full object-cover">` : ''}</div>
        <div class="p-4">
          <div class="text-xs text-slate-400 mb-1">${esc(it.source && it.source.name || '')} • ${esc(fmtDate(it.publishedAt))}</div>
          <div class="text-white font-semibold mb-1">${esc(it.title||'')}</div>
          <div class="text-sm text-slate-300 line-clamp-3">${esc(it.description||'')}</div>
        </div>`;
      list.appendChild(card);
    }
  }

  btn && btn.addEventListener('click', fetchNews);
  // Prefill
  try{ qEl.value = localStorage.getItem('news_q') || ''; }catch(_){ }
  qEl && qEl.addEventListener('input', ()=>{ try{ localStorage.setItem('news_q', qEl.value); }catch(_){ } });

  fetchNews();
})();

