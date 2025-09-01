function initIntroOverlay(){
  const intro = document.getElementById('intro-container');
  if (!intro) return;
  const btn = document.getElementById('enter-button');
  const ui  = document.getElementById('ui-container');
  const subtitle = document.getElementById('subtitle');
  requestAnimationFrame(() => {
    if (ui) ui.style.opacity = '1';
    if (subtitle) subtitle.style.opacity = '1';
    if (btn) { btn.style.opacity = '1'; btn.style.transform = 'scale(1)'; }
    const stampEl = document.getElementById('anti-leak-overlay');
    if (stampEl) stampEl.setAttribute('data-stamp', new Date().toISOString().slice(0,10));
  });
  function startBlackHoleTransition(){
    const intro = document.getElementById('intro-container');
    if (!intro) return;
    if (intro.dataset.closed === '1' || intro.dataset.bh === '1') return;
    intro.dataset.bh = '1';
    intro.classList.add('blackhole');
    intro.style.pointerEvents = 'none';
    document.body.classList.add('reveal-mode');
    const site = document.getElementById('site-content');
    if (site) {
      site.classList.add('reveal-prep');
      void site.offsetHeight;
      setTimeout(() => {
        site.classList.add('reveal-open');
        site.classList.remove('reveal-prep');
      }, 150);
    }
    setTimeout(() => { try { closeIntro(); } catch(_){} }, 1400);
    setTimeout(() => { document.body.classList.remove('reveal-mode'); }, 1400);
  }
  function closeIntro(){
    if (intro.dataset.closed === '1') return;
    intro.dataset.closed = '1';
    if (!intro.classList.contains('blackhole')) intro.classList.add('fade-out');
    setTimeout(() => { try { intro.remove(); } catch(_){} }, 650);
  }
  if (btn) btn.addEventListener('click', startBlackHoleTransition);
  window.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBlackHoleTransition(); });
  const urlp = new URLSearchParams(location.search);
  if (urlp.get('skipIntro') === '1') {
    const site=document.getElementById('site-content');
    if(site){ site.classList.add('reveal-open'); site.classList.remove('reveal-prep'); }
    closeIntro();
    return;
  }
  const ms = Number(urlp.get('introMs') || 8000);
  if (Number.isFinite(ms) && ms > 0) setTimeout(startBlackHoleTransition, ms);
}

initIntroOverlay();
export { initIntroOverlay };
