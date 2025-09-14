// Global copy/paste policy: allow copy & paste, block right‑click and common leak/inspect shortcuts
(function(){
  if (window.__KAIRA_COPY_POLICY_APPLIED) return;
  window.__KAIRA_COPY_POLICY_APPLIED = true;

  const stop = (e)=>{ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } return false; };

  // Disable context menu everywhere
  document.addEventListener('contextmenu', stop, { capture: true });

  // Allow copy/paste; block cut and drag-start copying
  document.addEventListener('cut', stop, { capture: true });
  document.addEventListener('dragstart', stop, { capture: true });

  // Keyboard guard: allow copy/paste; block devtools/view-source/print/save/cut
  document.addEventListener('keydown', (e)=>{
    const k = (e.key||'').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    // Allow copy/paste explicitly
    if (ctrl && (k === 'c' || k === 'v')) return;
    // Block DevTools shortcuts
    if (k === 'f12') return stop(e);
    if (ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) return stop(e);
    // Block view source, save, print, cut
    if (ctrl && (k === 'u' || k === 's' || k === 'p' || k === 'x')) return stop(e);
    // Optionally block PrintScreen
    if (k === 'printscreen') return stop(e);
  }, { capture: true });
})();

