(function(){
  // Keep typing responsive inside form fields by stopping upstream global blockers
  // BUT let contextmenu propagate so a site-wide policy can decide to block it.
  const TYPES = ['keydown','keypress','keyup','contextmenu'];
  TYPES.forEach(type => {
    window.addEventListener(type, function(e){
      const t = e.target;
      if (!t) return;
      const isField = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (!isField) return;
      if (e.type === 'contextmenu') {
        // allow propagation; global handler may block right‑click
        return;
      }
      if (e.type === 'keydown') {
        // Let security/devtools combos propagate; stop others to keep typing smooth
        const k = (e.key||'').toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const isDevtools = (k==='f12') || (ctrl && shift && (k==='i' || k==='j' || k==='c')) || (ctrl && (k==='u' || k==='s' || k==='p' || k==='x')) || (k==='printscreen');
        if (!isDevtools) {
          e.stopImmediatePropagation();
        }
        return;
      }
      // For keypress/keyup inside inputs, stop upstream blockers
      e.stopImmediatePropagation();
    }, true); // capture phase
  });
})();
