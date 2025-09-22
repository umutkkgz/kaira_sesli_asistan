function initIntroOverlay(){
  const intro = document.getElementById('intro-container');
  if (!intro) return;

  const btn = document.getElementById('enter-button');
  const ui  = document.getElementById('ui-container');
  const subtitle = document.getElementById('subtitle');
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let typeTimer = null;

  function stampDate(){
    const stampEl = document.getElementById('anti-leak-overlay');
    if (stampEl) stampEl.setAttribute('data-stamp', new Date().toISOString().slice(0, 10));
  }

  function prepareSubtitle(){
    if (!subtitle || subtitle.dataset.prepared === '1') return;
    const text = (subtitle.textContent || '').trim();
    subtitle.dataset.text = text;
    subtitle.dataset.prepared = '1';
    subtitle.textContent = '';
    if (!text) return;
    const frag = document.createDocumentFragment();
    const letters = Array.from(text);
    letters.forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.transitionDelay = `${index * 45}ms`;
      frag.appendChild(span);
    });
    subtitle.appendChild(frag);
  }

  function revealSubtitle(){
    if (!subtitle) return;
    const spans = subtitle.querySelectorAll('span');
    spans.forEach((span) => { span.classList.add('is-visible'); });
  }

  function revealIntro(){
    if (ui){
      ui.style.opacity = '1';
      ui.style.transform = 'translateY(0)';
    }
    if (subtitle){
      subtitle.style.opacity = '1';
    }
    if (btn){
      btn.style.opacity = '1';
      btn.style.transform = 'scale(1)';
    }
    stampDate();

    if (subtitle){
      if (prefersReduced){
        revealSubtitle();
      } else {
        if (typeTimer) clearTimeout(typeTimer);
        typeTimer = setTimeout(revealSubtitle, 250);
      }
    }
  }

  function handlePointerMove(ev){
    if (!intro || prefersReduced) return;
    const rect = intro.getBoundingClientRect();
    const relX = (ev.clientX - rect.left) / rect.width - 0.5;
    const relY = (ev.clientY - rect.top) / rect.height - 0.5;
    intro.style.setProperty('--intro-parallax-x', `${-(relX * 18).toFixed(2)}px`);
    intro.style.setProperty('--intro-parallax-y', `${-(relY * 14).toFixed(2)}px`);
    intro.style.setProperty('--intro-glow-shift-x', `calc(50% + ${(relX * 6).toFixed(2)}%)`);
    intro.style.setProperty('--intro-glow-shift-y', `calc(50% + ${(relY * 6).toFixed(2)}%)`);
  }

  requestAnimationFrame(() => {
    prepareSubtitle();
    revealIntro();
  });

  if (!prefersReduced){
    intro.addEventListener('pointermove', handlePointerMove, { passive: true });
    intro.addEventListener('pointerleave', () => {
      intro.style.removeProperty('--intro-parallax-x');
      intro.style.removeProperty('--intro-parallax-y');
      intro.style.removeProperty('--intro-glow-shift-x');
      intro.style.removeProperty('--intro-glow-shift-y');
    });
  }

  function startBlackHoleTransition(){
    const intro = document.getElementById('intro-container');
    if (!intro) return;
    if (intro.dataset.closed === '1' || intro.dataset.bh === '1') return;
    intro.dataset.bh = '1';
    intro.classList.add('blackhole');
    intro.style.pointerEvents = 'none';
    document.body.classList.add('reveal-mode');
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
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
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
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
