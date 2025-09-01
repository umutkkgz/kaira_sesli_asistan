// Varsayılan sistem promptu devre dışı: boş string.
// Evrensel sohbet arayüzünde default system promptu istemiyoruz.
export const DEFAULT_SYSTEM_PROMPT = '';

function injectStealthDefaultOnce(){
  const el = document.getElementById('system-prompt');
  if (!el || el.value.trim()) return; // kullanıcı yazdıysa dokunma
  // Varsayılan boş ise enjekte etme (tamamen devre dışı)
  if (!DEFAULT_SYSTEM_PROMPT || !DEFAULT_SYSTEM_PROMPT.trim()) return;
  el.dataset.kairaWasEmpty = '1';
  el.value = DEFAULT_SYSTEM_PROMPT;   // sadece gönderim anında geçici yaz
  // mikro-görevde geri boşalt
  setTimeout(()=>{
    if (el && el.dataset.kairaWasEmpty === '1') {
      el.value = '';
      delete el.dataset.kairaWasEmpty;
    }
  }, 0);
}

function clearChatUI(){
  try {
    // 1) Görünen konteynerleri boşalt
    const hist = document.getElementById('chat-history');
    if (hist) hist.innerHTML = '';
    const hist2 = document.getElementById('chat-container');
    if (hist2) hist2.innerHTML = '';

    // Her ihtimale karşı sohbet balonlarını doğrudan temizle
    document.querySelectorAll('#chat-view .chat-user-bubble, #chat-view .chat-assistant-bubble, #chat-view [data-chat-item]').forEach(function(el){ el.remove(); });

    // 2) Hata/loader ve giriş alanını sıfırla
    const err = document.getElementById('error-message');
    if (err) { err.classList.add('hidden'); err.textContent = ''; }
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
    const userIn = document.getElementById('user-input');
    if (userIn) userIn.value = '';

    // 3) Bellekteki (JS) geçmiş yapılarını sıfırla (varsa)
    try {
      const g = window;
      const CANDIDATES = ['conversation','messages','chatHistory','history','chatMessages','__kairaMessages','__chatCtx'];
      CANDIDATES.forEach(function(k){
        if (Array.isArray(g[k])) { g[k].length = 0; }
        else if (g[k] && typeof g[k].clear === 'function') { try { g[k].clear(); } catch(_){} }
        else if (g[k] && typeof g[k] === 'object') { try { Object.keys(g[k]).forEach(function(p){ delete g[k][p]; }); } catch(_){} }
      });
      // Yaygın custom temizleyiciler
      if (typeof g.resetChat === 'function') { try { g.resetChat(); } catch(_){} }
      if (typeof g.clearHistory === 'function') { try { g.clearHistory(); } catch(_){} }
    } catch(_){ }

    // 4) storage alanları (local + session) — chat/kaira içeriyorsa sil
    try {
      const nuke = function(storage){
        const toDel = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (/chat|kaira/i.test(k)) toDel.push(k);
        }
        toDel.forEach(function(k){ try { storage.removeItem(k); } catch(_){} });
      };
      if (window.localStorage) nuke(window.localStorage);
      if (window.sessionStorage) nuke(window.sessionStorage);
    } catch(_){ }

    // 5) Sistem promptu kullanıcıya görünmesin (gizli varsayılanı temizle)
    const sys = document.getElementById('system-prompt');
    if (sys && sys.value && sys.value.trim() === DEFAULT_SYSTEM_PROMPT.trim()) sys.value = '';

    // 6) Scroll tepeye
    const wrap = document.getElementById('chat-view');
    if (wrap && typeof wrap.scrollTo === 'function') wrap.scrollTo({ top: 0, behavior: 'smooth' });

    // 7) Olay yayınla
    document.dispatchEvent(new CustomEvent('kaira:chat-cleared', { detail: { source: 'clear-button' } }));

    console.log('[Chat] cleared');
  } catch(e){ console.warn('[Chat Clear] ', e); }
}

window.__kairaClearChat = clearChatUI;

function wipeSystemPromptOnEnterChat(){
  // Evrensel Sohbet görünümü seçildiğinde textarea'yı boşalt
  const sys = document.getElementById('system-prompt');
  if (sys && !sys.dataset.userTouched) sys.value = '';
}

function wireUp(){
  // 1) Delegated click: DOM tekrar oluşturulsa bile çalışsın (capture)
  document.addEventListener('click', function(ev){
    const target = ev.target;
    if (!target || typeof target.closest !== 'function') return;
    // Gönder butonu
    if (target.closest('#send-button')) {
      injectStealthDefaultOnce();
    }
    // Sohbeti temizle
    if (target.closest('#clear-chat')) {
      ev.preventDefault();
      clearChatUI();
    }
    // Seçim ekranından Evrensel Sohbet'e girişte promptu boşalt
    if (target.closest('#select-chat')) {
      wipeSystemPromptOnEnterChat();
    }
  }, true);

  // 2) Hedef butona doğrudan dinleyici ekle (stopImmediatePropagation olsa bile capture ile yakalarız)
  const clearBtn = document.getElementById('clear-chat');
  if (clearBtn) {
    clearBtn.setAttribute('type','button');
    clearBtn.addEventListener('click', function(e){ e.preventDefault(); clearChatUI(); }, true); // capture=true
  }

  // Enter (Shift'siz) ile gönderimler için de koruma
  const input = document.getElementById('user-input');
  if (input) {
    input.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' && !ev.shiftKey) {
        injectStealthDefaultOnce();
      }
    }, true);
  }

  // Kullanıcı sistem promptuna dokunduysa bir daha otomatik boşaltmayalım
  const sys = document.getElementById('system-prompt');
  if (sys) {
    sys.addEventListener('input', ()=>{ sys.dataset.userTouched = '1'; });
  }
}

document.addEventListener('DOMContentLoaded', wireUp);
