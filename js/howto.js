// Toggleable "Nasıl kullanılır?" helper for mobile and accessibility
(function(){
  const hints = Array.from(document.querySelectorAll('.howto-hint'));
  if (!hints.length) return;
  const IS_MOBILE = (typeof window.matchMedia === 'function' && (window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches)) || (window.innerWidth < 768);

  function closeAll(except){
    for (const h of hints){ if (h === except) continue; h.classList.remove('open'); const b = h.querySelector('.howto-label[aria-expanded]'); if (b) b.setAttribute('aria-expanded','false'); }
  }

  for (const hint of hints){
    const button = hint.querySelector('.howto-label');
    const pop = hint.querySelector('.howto-popover');
    if (!button || !pop) continue;

    // Ensure ARIA hookups if not set
    if (!button.hasAttribute('aria-expanded')) button.setAttribute('aria-expanded','false');
    button.setAttribute('role','button');

    button.addEventListener('click', (e)=>{
      e.preventDefault();
      const isOpen = hint.classList.toggle('open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) closeAll(hint);
    });

    // Keyboard: Enter/Space toggles
    button.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); button.click(); }
      if (e.key === 'Escape') { hint.classList.remove('open'); button.setAttribute('aria-expanded','false'); button.focus(); }
    });
  }

  // Inject a close button for mobile to quickly dismiss the popover
  if (IS_MOBILE) {
    for (const hint of hints) {
      const button = hint.querySelector('.howto-label');
      const pop = hint.querySelector('.howto-popover');
      if (!pop || pop.querySelector('.howto-close')) continue;
      const close = document.createElement('button');
      close.className = 'howto-close';
      close.type = 'button';
      close.setAttribute('aria-label','Kapat');
      close.textContent = '×';
      close.addEventListener('click', (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        hint.classList.remove('open');
        if (button) button.setAttribute('aria-expanded','false');
      });
      pop.appendChild(close);
    }
  }

  // Click outside to close
  document.addEventListener('click', (e)=>{
    const target = e.target;
    for (const hint of hints){ if (!hint.contains(target)) { hint.classList.remove('open'); const b = hint.querySelector('.howto-label[aria-expanded]'); if (b) b.setAttribute('aria-expanded','false'); } }
  });

  // Close on escape globally
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeAll();
  });

  // Orientation/resize: close all to avoid misplacement
  ['resize','orientationchange'].forEach(evt => window.addEventListener(evt, ()=> closeAll()));
})();
