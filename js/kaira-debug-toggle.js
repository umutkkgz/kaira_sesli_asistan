(function(){
  // URL param ?debug=1 → başlatırken açık
  const params = new URLSearchParams(location.search);
  let debug = params.get('debug') === '1';

  function applyDebug(on){
    document.documentElement.classList.toggle('debug-open', on);
    document.body.classList.toggle('debug-open', on);
    // Bilinen engelleyicileri temizlemeye çalış (F12, sağ tık vb.)
    if (on){
      document.oncontextmenu = null; window.oncontextmenu = null;
      document.onkeydown = null; window.onkeydown = null;
    }
  }

  // Sağ tık ve klavye engelleyicilerini yakalama fazında etkisizleştir
  window.addEventListener('contextmenu', function(e){
    if (document.documentElement.classList.contains('debug-open')){
      e.stopImmediatePropagation();
      // preventDefault çağırmıyoruz → sistem menüsü açılır
    }
  }, true);

  window.addEventListener('keydown', function(e){
    if (document.documentElement.classList.contains('debug-open')){
      e.stopImmediatePropagation();
      // preventDefault yok → F12 vb. çalışır
    }
  }, true);

  // Başlangıç durumunu uygula
  applyDebug(debug);

  // Kısayol: Ctrl/Cmd + Shift + D → Toggle
  window.addEventListener('keydown', function(e){
    const isMod = e.ctrlKey || e.metaKey;
    if (isMod && e.shiftKey && (e.key === 'd' || e.key === 'D')){
      debug = !debug; applyDebug(debug);
      console.warn('KAIRA DEBUG:', debug ? 'ON' : 'OFF');
    }
  }, false);

  // Konsoldan kontrol: KAIRA_DEBUG.on() / KAIRA_DEBUG.off()
  window.KAIRA_DEBUG = {
    on(){ if (!debug){ debug = true; applyDebug(true); console.warn('KAIRA DEBUG: ON'); } },
    off(){ if (debug){ debug = false; applyDebug(false); console.warn('KAIRA DEBUG: OFF'); } }
  };

  console.log('%cKAIRA Debug hazır.', 'color:#22d3ee',
              '\n• Aç/Kapat: Ctrl/Cmd+Shift+D' +
              '\n• URL ile: ?debug=1' +
              '\n• Konsol: KAIRA_DEBUG.on() / KAIRA_DEBUG.off()');
})();
