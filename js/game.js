// Parallel Realms — browser game (vanilla JS + Canvas)
// Core idea: 3 universes with different physics/time/color. Switch to solve a simple level puzzle.

(function(){
  const C = document.getElementById('game-canvas');
  const ctx = C.getContext('2d');
  const uNameEl = document.getElementById('u-name');
  const uMetaEl = document.getElementById('u-meta');
  const timerEl = document.getElementById('timer');
  const shardsEl = document.getElementById('shards');
  const pbEl = document.getElementById('pb');
  const toastEl = document.getElementById('toast');

  // Resize to fit while keeping aspect
  function fit(){
    const w = C.parentElement.clientWidth;
    const h = C.parentElement.clientHeight;
    const ar = 16/9;
    let vw = w, vh = Math.round(w/ar);
    if (vh > h){ vh = h; vw = Math.round(h*ar); }
    C.style.width = vw + 'px';
    C.style.height = vh + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  // Universe presets
  const U = {
    PASTEL: { name: 'Pastel', timeScale: 0.7, gravity: 1100*0.55, friction: 0.90, speed: 260, jump: 520, bg: ['#1b1f2a','#42526e','#9ad5ca'], tint: 'rgba(154,213,202,0.25)', stars: '#c0f5e7' },
    NEON:   { name: 'Neon',   timeScale: 1.25, gravity: 1100*1.05, friction: 0.88, speed: 320, jump: 540, bg: ['#0a0b11','#0f162e','#08f7fe'], tint: 'rgba(8,247,254,0.22)',  stars: '#08f7fe' },
    NOIR:   { name: 'Noir',   timeScale: 1.0, gravity: 1100*0.85, friction: 0.96, speed: 280, jump: 500, bg: ['#050507','#171923','#7c7d84'], tint: 'rgba(124,125,132,0.20)', stars: '#9aa0a6' },
  };
  const UNAMES = ['PASTEL','NEON','NOIR'];
  let currentUIndex = 0;
  let currentU = U[UNAMES[currentUIndex]];
  let switching = 0; // 0..1 transition alpha

  function showToast(text){
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toastEl.classList.remove('show'), 900);
  }

  // Level geometry
  // Platforms with phase (which universe they are solid in). phase: 'ALL' | 'PASTEL' | 'NEON' | 'NOIR'
  const platforms = [
    {x:0, y:660, w:1280, h:60, phase:'ALL', col:'#0b1222'},
    {x:60, y:560, w:260, h:18, phase:'PASTEL', col:'#6bc7b3'},
    {x:360, y:520, w:220, h:18, phase:'NEON', col:'#08f7fe'},
    {x:640, y:480, w:200, h:18, phase:'NOIR', col:'#7c7d84'},
    {x:900, y:430, w:260, h:18, phase:'ALL', col:'#334155'},
    {x:1160, y:380, w:60, h:280, phase:'NEON', col:'#08f7fe'}, // gate pillar
    {x:1185, y:350, w:40, h:30, phase:'ALL', col:'#1f2937'}, // exit ledge base
  ];
  // Decorative or blocking walls in certain universes
  const walls = [
    {x:500, y:610, w:30, h:50, phase:'NOIR', col:'#54555d'},
  ];

  // Shards (collectibles) exist only in some universes
  const shards = [
    {x:180, y:520-22, r:10, phase:'PASTEL', got:false},
    {x:470, y:480-22, r:10, phase:'NEON', got:false},
    {x:940, y:390-22, r:10, phase:'NOIR', got:false},
  ];

  // Exit door requires all shards
  const exitDoor = { x:1190, y:320, w:30, h:60, open:false };

  const player = {
    x: 30,
    y: 600,
    w: 26,
    h: 36,
    vx: 0,
    vy: 0,
    onGround: false,
  };

  const keys = Object.create(null);
  window.addEventListener('keydown', (e)=>{ keys[e.key.toLowerCase()] = true; if([' ','arrowup'].includes(e.key.toLowerCase())) e.preventDefault(); });
  window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()] = false; });

  function switchUniverse(i){
    const idx = ((i % UNAMES.length) + UNAMES.length) % UNAMES.length;
    if (idx === currentUIndex) return;
    currentUIndex = idx; currentU = U[UNAMES[currentUIndex]]; switching = 1;
    showToast('Evren: ' + currentU.name);
    updateHud();
  }
  function cycle(dir){ switchUniverse(currentUIndex + (dir>0?1:-1)); }

  function updateHud(){
    try{ uNameEl.textContent = 'Evren: ' + currentU.name; uMetaEl.textContent = ` • Yerçekimi ${(currentU.gravity/1100).toFixed(2)} • Zaman x${currentU.timeScale.toFixed(2)}`; }catch(_){ }
  }
  updateHud();

  // Stars background
  const stars = Array.from({length: 120}).map(()=>({
    x: Math.random()*1280,
    y: Math.random()*720,
    z: Math.random()*1 + 0.2,
  }));

  // Timer & PB
  let startT = performance.now();
  let done = false;
  function bestStr(sec){ if (!Number.isFinite(sec)) return '—'; const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function updateTimer(){
    const now = performance.now();
    const sec = (now - startT) / 1000;
    const m = Math.floor(sec/60), s = Math.floor(sec%60);
    timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function shardsCount(){ return shards.filter(s=>s.got).length; }
  function updateShardUI(){ shardsEl.textContent = `${shardsCount()}/3`; }
  updateShardUI();
  try{ const pb = Number(localStorage.getItem('kaira_game_pb')||''); pbEl.textContent = bestStr(pb); }catch(_){ pbEl.textContent = '—'; }

  // Physics and collisions
  function rectsIntersect(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by; }
  function activeSolids(){ return platforms.concat(walls).filter(p => p.phase==='ALL' || p.phase===UNAMES[currentUIndex]); }

  function moveAndCollide(dt){
    // Horizontal
    player.x += player.vx * dt;
    let solids = activeSolids();
    for (const s of solids){
      if (rectsIntersect(player.x,player.y,player.w,player.h, s.x,s.y,s.w,s.h)){
        if (player.vx > 0) player.x = s.x - player.w; else if (player.vx < 0) player.x = s.x + s.w;
        player.vx = 0;
      }
    }
    // Vertical
    player.vy += currentU.gravity * dt;
    player.y += player.vy * dt;
    player.onGround = false;
    solids = activeSolids();
    for (const s of solids){
      if (rectsIntersect(player.x,player.y,player.w,player.h, s.x,s.y,s.w,s.h)){
        if (player.vy > 0){ player.y = s.y - player.h; player.vy = 0; player.onGround = true; }
        else if (player.vy < 0){ player.y = s.y + s.h; player.vy = 0; }
      }
    }
  }

  // Input
  function handleInput(dt){
    const left = keys['arrowleft'] || keys['a'];
    const right = keys['arrowright'] || keys['d'];
    const jump = keys[' '] || keys['arrowup'] || keys['w'];
    if (left && !right){ player.vx = -currentU.speed; }
    else if (right && !left){ player.vx = currentU.speed; }
    else { player.vx *= currentU.friction; }
    if (player.onGround && jump){ player.vy = -currentU.jump; player.onGround = false; }

    if (keys['1']) switchUniverse(0);
    if (keys['2']) switchUniverse(1);
    if (keys['3']) switchUniverse(2);
    if (keys['q']) { keys['q']=false; cycle(-1); }
    if (keys['e']) { keys['e']=false; cycle(1); }
    if (keys['r']) reset();
  }

  function reset(){
    player.x = 30; player.y = 600; player.vx = 0; player.vy = 0; player.onGround=false;
    shards.forEach(s=> s.got=false); updateShardUI(); exitDoor.open=false; done=false; startT = performance.now(); showToast('Yeniden başlatıldı');
  }

  // Rendering helpers
  function drawBackground(){
    const g = ctx.createLinearGradient(0,0, 0,C.height);
    const pal = currentU.bg;
    g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[0]);
    ctx.fillStyle = g; ctx.fillRect(0,0,C.width,C.height);
    ctx.globalAlpha = 0.9; ctx.fillStyle = currentU.tint; ctx.fillRect(0,0,C.width,C.height); ctx.globalAlpha = 1;
  }
  function drawStars(dt){
    ctx.fillStyle = currentU.stars;
    for (const s of stars){
      ctx.globalAlpha = 0.5 + s.z*0.5;
      ctx.fillRect(s.x, s.y, 2, 2);
      s.x -= (12 * s.z) * dt * currentU.timeScale;
      if (s.x < -2) { s.x = C.width + Math.random()*80; s.y = Math.random()*C.height; s.z = Math.random()*1 + 0.2; }
    }
    ctx.globalAlpha = 1;
  }
  function drawPlatforms(){
    for (const p of platforms){
      const active = (p.phase==='ALL' || p.phase===UNAMES[currentUIndex]);
      ctx.globalAlpha = active ? 1 : 0.25;
      ctx.fillStyle = p.col || '#334155';
      ctx.fillRect(p.x,p.y,p.w,p.h);
    }
    for (const w of walls){
      const active = (w.phase==='ALL' || w.phase===UNAMES[currentUIndex]);
      ctx.globalAlpha = active ? 1 : 0.25;
      ctx.fillStyle = w.col || '#1f2937';
      ctx.fillRect(w.x,w.y,w.w,w.h);
    }
    ctx.globalAlpha = 1;
  }
  function drawShards(){
    for (const s of shards){
      if (s.got) continue;
      const active = (s.phase===UNAMES[currentUIndex]);
      ctx.globalAlpha = active ? 1 : 0.12;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = active ? '#fbbf24' : '#94a3b8';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function drawDoor(){
    ctx.fillStyle = exitDoor.open ? '#22c55e' : '#64748b';
    ctx.fillRect(exitDoor.x, exitDoor.y, exitDoor.w, exitDoor.h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(exitDoor.x+6, exitDoor.y+10, exitDoor.w-12, exitDoor.h-20);
  }
  function drawPlayer(){
    // Body
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    // Accent mouth (universe color)
    ctx.fillStyle = currentU.stars;
    ctx.fillRect(player.x+5, player.y+player.h-8, player.w-10, 3);
  }

  function collectCheck(){
    for (const s of shards){
      if (s.got) continue;
      if (s.phase!==UNAMES[currentUIndex]) continue; // only collectible in its phase
      if (rectsIntersect(player.x,player.y,player.w,player.h, s.x-s.r, s.y-s.r, s.r*2, s.r*2)){
        s.got = true; updateShardUI(); showToast('Parça toplandı ✦');
        if (shardsCount()===3){ exitDoor.open = true; showToast('Kapı açıldı!'); }
      }
    }
  }
  function exitCheck(){
    if (!exitDoor.open || done) return;
    if (rectsIntersect(player.x,player.y,player.w,player.h, exitDoor.x,exitDoor.y,exitDoor.w,exitDoor.h)){
      done = true;
      const elapsed = (performance.now() - startT)/1000;
      showToast('Tebrikler! Süre: ' + bestStr(elapsed));
      try{
        const prev = Number(localStorage.getItem('kaira_game_pb')||'');
        if (!prev || elapsed < prev){ localStorage.setItem('kaira_game_pb', String(elapsed)); }
        pbEl.textContent = bestStr(Math.min(prev||Infinity, elapsed));
      }catch(_){ }
    }
  }

  let last = performance.now();
  function loop(now){
    requestAnimationFrame(loop);
    const rawDt = (now - last)/1000; last = now;
    const dt = Math.min(0.033, rawDt) * currentU.timeScale; // clamp

    // Update
    if (!done){ handleInput(dt); moveAndCollide(dt); collectCheck(); exitCheck(); updateTimer(); }
    if (switching>0){ switching = Math.max(0, switching - dt*1.8); }

    // Render
    drawBackground();
    drawStars(dt);
    drawPlatforms();
    drawShards();
    drawDoor();
    drawPlayer();

    // Transition overlay
    if (switching>0){
      ctx.globalAlpha = switching;
      const g = ctx.createRadialGradient(C.width*0.5, C.height*0.5, 0, C.width*0.5, C.height*0.5, C.height*0.7);
      g.addColorStop(0, 'rgba(255,255,255,0.0)');
      g.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0,0,C.width,C.height);
      ctx.globalAlpha = 1;
    }
  }
  requestAnimationFrame(loop);
})();

