(function(){
  const TYPES = ['keydown','keypress','keyup','contextmenu'];
  TYPES.forEach(type => {
    window.addEventListener(type, function(e){
      const t = e.target;
      if (!t) return;
      const isField = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (isField) {
        // Form alanlarında global engelleyicileri etkisizleştir
        e.stopImmediatePropagation();
        // preventDefault çağırmıyoruz → doğal yazma davranışı çalışır
      }
    }, true); // capture phase → önce biz çalışırız
  });
})();
