// Parallel Realms — Match-3 (Candy Crush tarzı)
// 3 evren (Pastel, Neon, Noir). Evrenler, renk paleti, zaman akışı ve "yerçekimi yönü" değiştirir (Noir: yukarı).

(function(){
  const C = document.getElementById('game-canvas');
  const ctx = C.getContext('2d');
  const uNameEl = document.getElementById('u-name');
  const uMetaEl = document.getElementById('u-meta');
  const timerEl = document.getElementById('timer');
  const shardsEl = document.getElementById('shards');
  const pbEl = document.getElementById('pb');
  const toastEl = document.getElementById('toast');
  const scoreEl = document.getElementById('score');
  const btnHint = document.getElementById('btn-hint');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnHelp = document.getElementById('btn-help');
  const howto = document.getElementById('howto');
  const howtoClose = document.getElementById('howto-close');
  const lvlEl = document.getElementById('level');
  const movesEl = document.getElementById('moves');
  const lsWrap = document.getElementById('level-start');
  const lsNum = document.getElementById('ls-num');
  const lsGoals = document.getElementById('ls-goals');
  const lsMoves = document.getElementById('ls-moves');
  const lsPlay = document.getElementById('ls-play');
  const lsClose = document.getElementById('ls-close');
  const leWrap = document.getElementById('level-end');
  const leTitle = document.getElementById('le-title');
  const leMsg = document.getElementById('le-msg');
  const leRetry = document.getElementById('le-retry');
  const leNext = document.getElementById('le-next');

  // Responsive fit
  function fit(){
    const w = C.parentElement.clientWidth;
    const h = C.parentElement.clientHeight;
    const ar = 16/9;
    let vw = w, vh = Math.round(w/ar);
    if (vh > h){ vh = h; vw = Math.round(h*ar); }
    C.style.width = vw + 'px';
    C.style.height = vh + 'px';
  }
  window.addEventListener('resize', fit); fit();

  // Universes
  const U = {
    // Daha görünür, yüksek kontrastlı renkler
    PASTEL: { name:'Pastel', timeScale:0.9, mult:1.1, gravity:'down',
      bg:['#121623','#2a375a','#9ad5ca'], tint:'rgba(154,213,202,0.18)',
      palette:[
        '#ff6b6b', // canlı pembe-kırmızı
        '#ffd166', // amber
        '#06d6a0', // yeşil
        '#4dabf7', // mavi
        '#b794f4', // mor
        '#f97316'  // turuncu
      ]
    },
    NEON:   { name:'Neon',   timeScale:1.3, mult:1.2, gravity:'down',
      bg:['#0a0b11','#0f162e','#08f7fe'], tint:'rgba(8,247,254,0.15)',
      palette:['#08f7fe','#f706cf','#f9f871','#05ffa1','#ff9933','#ff2079']
    },
    NOIR:   { name:'Noir',   timeScale:1.0, mult:1.0, gravity:'up',
      bg:['#050507','#171923','#0b1220'], tint:'rgba(124,125,132,0.10)',
      // Noir için daha belirgin vurgu renkleri (griden ziyade accent tonları)
      palette:[
        '#e5e7eb', // açık gri (yüksek kontrast)
        '#60a5fa', // mavi
        '#22c55e', // yeşil
        '#f59e0b', // amber
        '#a78bfa', // mor
        '#f43f5e'  // rose
      ]
    },
  };
  const UNAMES = ['PASTEL','NEON','NOIR'];
  let curIdx = 0;
  let Uc = U[UNAMES[curIdx]];
  let switching = 0;

  // Board config
  const COLS = 8, ROWS = 8, TYPES = 6;
  const board = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> 0));
  let score = 0, shards = 0, chains = 0;
  let selected = null; // {r,c}
  let animTimer = 0;
  let hintCells = null; // [[r,c],[r,c]]
  let lastAction = performance.now();

  // Layout
  const TILE = Math.floor(Math.min(C.width*0.6, C.height*0.8)/COLS);
  const BW = TILE*COLS, BH = TILE*ROWS;
  const BX = Math.floor((C.width - BW)/2);
  const BY = Math.floor((C.height - BH)/2);

  function showToast(text){ toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(()=> toastEl.classList.remove('show'), 900); }
  function bestStr(sec){ if (!Number.isFinite(sec)) return '—'; const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  // Minimal SFX (WebAudio beeps)
  let ACtx = null; function ac(){ if (!ACtx){ try{ ACtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ ACtx = null; } } return ACtx; }
  function tone(freq, dur, gain){ const a=ac(); if(!a) return; const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.type='sine'; o.frequency.value=freq; g.gain.value=(gain||0.04); o.start(); setTimeout(()=>{ try{o.stop();}catch(_){ } }, Math.max(10,(dur||120))); }
  function playSfx(kind){ try{ if(kind==='match'){ tone(660,90,0.05); setTimeout(()=>tone(880,90,0.04),90); } else if(kind==='shuffle'){ tone(300,60,0.03); } else if(kind==='win'){ tone(523,120,0.05); setTimeout(()=>tone(659,120,0.05),130); setTimeout(()=>tone(784,180,0.05),280); } else if(kind==='fail'){ tone(200,160,0.05); setTimeout(()=>tone(160,200,0.05),170); } else if(kind==='hint'){ tone(740,80,0.035); } }catch(_){ }
  }

  // Timer & PB
  let startT = performance.now();
  try{ const pb = Number(localStorage.getItem('kaira_game_pb_match3')||''); pbEl.textContent = bestStr(pb); }catch(_){ pbEl.textContent = '—'; }

  // Levels & goals (collect specific types within limited moves)
  const levels = [
    { id:1, moves: 30, goals: [ { type:0, need:20 }, { type:1, need:20 }, { type:2, need:15 } ] },
    { id:2, moves: 28, goals: [ { type:3, need:22 }, { type:4, need:18 }, { type:5, need:15 } ] },
    { id:3, moves: 26, goals: [ { type:0, need:18 }, { type:2, need:18 }, { type:4, need:18 } ] },
    { id:4, moves: 24, goals: [ { type:1, need:25 }, { type:3, need:25 }, { type:5, need:20 } ] },
    { id:5, moves: 24, goals: [ { type:0, need:25 }, { type:4, need:25 }, { type:2, need:25 } ] },
    { id:6, moves: 22, goals: [ { type:1, need:28 }, { type:5, need:28 } ] }
  ];
  let lvlIdx = Math.max(0, Math.min(Number(localStorage.getItem('kaira_game_lvl')||'0'), levels.length-1));
  let movesLeft = levels[lvlIdx].moves;
  let goalsProg = levels[lvlIdx].goals.map(g => ({ type:g.type, need:g.need, have:0 }));
  function refreshHud(){ try{ lvlEl.textContent = String(levels[lvlIdx].id); movesEl.textContent = String(movesLeft); }catch(_){ } updateHud(); }
  function renderLevelStart(){ if (!lsWrap) return; lsNum.textContent = String(levels[lvlIdx].id); lsMoves.textContent = String(levels[lvlIdx].moves); lsGoals.innerHTML = goalsProg.map(g=>`<li><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${Uc.palette[g.type%Uc.palette.length]};margin-right:6px"></span> Tip ${g.type+1}: ${g.have}/${g.need}</li>`).join(''); lsWrap.classList.remove('hidden'); }
  function hideLevelStart(){ if (lsWrap) lsWrap.classList.add('hidden'); }
  function renderLevelEnd(win){ if (!leWrap) return; leTitle.textContent = win ? 'Tebrikler!' : 'Seviye Başarısız'; leMsg.textContent = win ? 'Hedefleri tamamladın.' : 'Hamleler bitti. Tekrar dene!'; leWrap.classList.remove('hidden'); }
  function hideLevelEnd(){ if (leWrap) leWrap.classList.add('hidden'); }
  function startLevel(idx){
    lvlIdx = idx|0; const L = levels[lvlIdx];
    goalsProg = L.goals.map(g=>({ type:g.type, need:g.need, have:0 }));
    movesLeft = L.moves; startT = performance.now(); score=0; shards=0; chains=0; hintCells=null; lastAction=performance.now();
    initBoard(); refreshHud();
    try{ const key='kaira_game_pb_match3_l'+levels[lvlIdx].id; const pb = Number(localStorage.getItem(key)||''); pbEl.textContent = bestStr(pb); }catch(_){ }
  }
  function addProgressForCells(cells){ const m=new Map(); for (const [r,c] of cells){ const t=tileAt(r,c); if (t>=0) m.set(t, (m.get(t)||0)+1); } goalsProg.forEach(g=>{ g.have = Math.min(g.need, g.have + (m.get(g.type)||0)); }); }
  function isGoalsMet(){ return goalsProg.every(g=> g.have>=g.need); }

  function updateHud(){
    try{ uNameEl.textContent = 'Evren: ' + Uc.name; uMetaEl.textContent = ` • Zaman x${Uc.timeScale.toFixed(2)} • Yerçekimi ${(Uc.gravity==='down')?'↓':'↑'}`; }catch(_){ }
    shardsEl.textContent = `${shards}/3`;
    if (scoreEl) scoreEl.textContent = String(score);
  }
  function updateTimer(){ const sec=(performance.now()-startT)/1000; const m=Math.floor(sec/60), s=Math.floor(sec%60); timerEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

  function tileAt(r,c){ if (r<0||r>=ROWS||c<0||c>=COLS) return -1; return board[r][c]; }
  function setTile(r,c,v){ if (r<0||r>=ROWS||c<0||c>=COLS) return; board[r][c]=v; }
  function rndTile(){ return Math.floor(Math.random()*TYPES); }

  function hasLineAt(r,c){
    const v = tileAt(r,c); if (v<0) return false;
    // horiz
    let count=1; let cc=c-1; while(tileAt(r,cc)===v){count++;cc--;}
    cc=c+1; while(tileAt(r,cc)===v){count++;cc++;}
    if (count>=3) return true;
    // vert
    count=1; let rr=r-1; while(tileAt(rr,c)===v){count++;rr--;}
    rr=r+1; while(tileAt(rr,c)===v){count++;rr++;}
    return count>=3;
  }
  function initBoard(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        do { setTile(r,c,rndTile()); } while (hasLineAt(r,c));
      }
    }
  }

  function findMatches(){
    const marks = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> false));
    const horiz = [];
    const vert  = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run=1;
      for(let c=1;c<=COLS;c++){
        const same = (c<COLS && tileAt(r,c)===tileAt(r,c-1) && tileAt(r,c)>=0);
        if (same) run++; else { if (run>=3){ for(let k=0;k<run;k++) marks[r][c-1-k]=true; horiz.push({ r, c0:c-run, c1:c-1, len: run }); } run=1; }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run=1;
      for(let r=1;r<=ROWS;r++){
        const same = (r<ROWS && tileAt(r,c)===tileAt(r-1,c) && tileAt(r,c)>=0);
        if (same) run++; else { if (run>=3){ for(let k=0;k<run;k++) marks[r-1-k][c]=true; vert.push({ c, r0:r-run, r1:r-1, len: run }); } run=1; }
      }
    }
    const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ if (marks[r][c]) cells.push([r,c]); }
    if (!cells.length) return null;
    const big = horiz.concat(vert).some(s=> s.len>=4);
    return { cells, horiz, vert, big };
  }

  function removeCells(cells){
    // update goals using current types before clearing
    addProgressForCells(cells);
    for (const [r,c] of cells){ setTile(r,c,-1); }
    const gain = Math.floor(cells.length * 10 * Uc.mult * (1 + chains*0.15));
    score += gain; animTimer = 0.15; // small flash
    if (cells.length>=4){ shards = Math.min(3, shards + 1); showToast('Shard kazandın ✦'); }
    updateHud();
    playSfx('match');
  }

  function collapseAndRefill(){
    if (Uc.gravity === 'down'){
      for(let c=0;c<COLS;c++){
        let wptr = ROWS-1;
        for(let r=ROWS-1;r>=0;r--){ const v=tileAt(r,c); if (v>=0){ setTile(wptr,c,v); if (wptr!==r) setTile(r,c,-1); wptr--; } }
        for(let r=wptr;r>=0;r--){ setTile(r,c,rndTile()); }
      }
    } else { // up
      for(let c=0;c<COLS;c++){
        let wptr = 0;
        for(let r=0;r<ROWS;r++){ const v=tileAt(r,c); if (v>=0){ setTile(wptr,c,v); if (wptr!==r) setTile(r,c,-1); wptr++; } }
        for(let r=wptr;r<ROWS;r++){ setTile(r,c,rndTile()); }
      }
    }
  }

  function anyMoveExists(){
    // brute-force: try swap all adjacents and see if it yields a match
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if (c+1<COLS){ const va=tileAt(r,c), vb=tileAt(r,c+1); setTile(r,c,vb); setTile(r,c+1,va); const ok=!!findMatches(); setTile(r,c,va); setTile(r,c+1,vb); if (ok) return [[r,c],[r,c+1]]; }
        if (r+1<ROWS){ const va=tileAt(r,c), vb=tileAt(r+1,c); setTile(r,c,vb); setTile(r+1,c,va); const ok=!!findMatches(); setTile(r,c,va); setTile(r+1,c,vb); if (ok) return [[r,c],[r+1,c]]; }
      }
    }
    return null;
  }

  function shuffleBoard(){
    const vals=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) vals.push(tileAt(r,c));
    let tries=0;
    while(tries++<200){
      // Fisher-Yates
      for(let i=vals.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; const t=vals[i]; vals[i]=vals[j]; vals[j]=t; }
      // fill
      let k=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) setTile(r,c, vals[k++]);
      // ensure no immediate matches and at least one move
      if (!findMatches() && anyMoveExists()) return true;
    }
    return false;
  }

  function trySwap(a,b){
    const ar=a.r, ac=a.c, br=b.r, bc=b.c;
    const adj = (ar===br && Math.abs(ac-bc)===1) || (ac===bc && Math.abs(ar-br)===1);
    if (!adj) return false;
    const va=tileAt(ar,ac), vb=tileAt(br,bc);
    setTile(ar,ac,vb); setTile(br,bc,va);
    const m = findMatches();
    if (!m){ // revert
      setTile(ar,ac,va); setTile(br,bc,vb);
      return false;
    }
    // valid move consumes a move
    movesLeft = Math.max(0, movesLeft - 1); refreshHud();
    // apply cascades
    let total=0; chains=0;
    while(true){
      const f = findMatches(); if (!f) break;
      // expand by special effects (instant): 4'lü satır/sütun → tüm satır/sütun; 5'li → renk patlaması; T/L → 3x3 bomba
      const expanded = new Set(f.cells.map(([r,c])=> `${r},${c}`));
      // Mark membership sets for cross detection
      const inH = new Set(); f.horiz.forEach(s=>{ for(let cc=s.c0; cc<=s.c1; cc++) inH.add(`${s.r},${cc}`); });
      const inV = new Set(); f.vert.forEach(s=>{ for(let rr=s.r0; rr<=s.r1; rr++) inV.add(`${rr},${s.c}`); });
      // Row/Col clears
      for (const s of f.horiz){
        if (s.len>=4){ for(let cc=0; cc<COLS; cc++) expanded.add(`${s.r},${cc}`); }
        if (s.len>=5){ const centerC=Math.floor((s.c0+s.c1)/2); const t=tileAt(s.r,centerC); if (t>=0){ for(let rr=0;rr<ROWS;rr++) for(let cc=0;cc<COLS;cc++) if (tileAt(rr,cc)===t) expanded.add(`${rr},${cc}`); } }
      }
      for (const s of f.vert){
        if (s.len>=4){ for(let rr=0; rr<ROWS; rr++) expanded.add(`${rr},${s.c}`); }
        if (s.len>=5){ const centerR=Math.floor((s.r0+s.r1)/2); const t=tileAt(centerR,s.c); if (t>=0){ for(let rr=0;rr<ROWS;rr++) for(let cc=0;cc<COLS;cc++) if (tileAt(rr,cc)===t) expanded.add(`${rr},${cc}`); } }
      }
      // Cross cells → 3x3 blast
      for (const key of inH){ if (inV.has(key)){ const [r,c]=key.split(',').map(Number); for(let rr=r-1; rr<=r+1; rr++) for(let cc=c-1; cc<=c+1; cc++){ if (rr>=0&&rr<ROWS&&cc>=0&&cc<COLS) expanded.add(`${rr},${cc}`); } } }

      const list = Array.from(expanded).map(s=> s.split(',').map(Number));
      removeCells(list); total += list.length; chains++;
      collapseAndRefill();
      if (chains>12) break; // sanity
    }
    if (total>0){
      if (isGoalsMet()){
        showToast('Seviye tamamlandı!');
        try{ const t=(performance.now()-startT)/1000; const key='kaira_game_pb_match3_l'+levels[lvlIdx].id; const prev=Number(localStorage.getItem(key)||''); if(!prev||t<prev) localStorage.setItem(key, String(t)); const newpb=Number(localStorage.getItem(key)||''); pbEl.textContent = bestStr(newpb); }catch(_){ }
        localStorage.setItem('kaira_game_lvl', String(Math.min(levels.length-1, lvlIdx+1)));
        renderLevelEnd(true); playSfx('win');
      } else if (movesLeft<=0){
        renderLevelEnd(false); playSfx('fail');
      }
    }
    return true;
  }

  // Input (click/tap select two adjacents)
  function posToCell(x,y){ const c=Math.floor((x-BX)/TILE), r=Math.floor((y-BY)/TILE); if (r<0||r>=ROWS||c<0||c>=COLS) return null; return {r,c}; }
  C.addEventListener('mousedown', (e)=>{
    const rect = C.getBoundingClientRect(); const scaleX = C.width / rect.width; const scaleY = C.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX; const y = (e.clientY - rect.top) * scaleY;
    const cell = posToCell(x,y); if (!cell) return;
    lastAction = performance.now(); hintCells = null;
    if (!selected){ selected = cell; }
    else {
      if (cell.r===selected.r && cell.c===selected.c){ selected=null; return; }
      const ok = trySwap(selected, cell);
      selected = null;
      if (!ok) showToast('Geçersiz hamle');
    }
  });

  // Buttons
  if (btnHint) btnHint.addEventListener('click', ()=>{ lastAction = performance.now(); hintCells = anyMoveExists(); if (!hintCells) { showToast('Hamle yok, karıştırılıyor'); shuffleBoard(); playSfx('shuffle'); } else { playSfx('hint'); } });
  if (btnShuffle) btnShuffle.addEventListener('click', ()=>{ lastAction = performance.now(); shuffleBoard(); showToast('Karıştırıldı'); playSfx('shuffle'); });
  if (btnHelp) btnHelp.addEventListener('click', ()=>{ if (howto) howto.classList.remove('hidden'); });
  if (howtoClose) howtoClose.addEventListener('click', ()=>{ if (howto) howto.classList.add('hidden'); });
  if (lsPlay) lsPlay.addEventListener('click', ()=>{ hideLevelStart(); startLevel(lvlIdx); });
  if (lsClose) lsClose.addEventListener('click', ()=>{ hideLevelStart(); });
  if (leRetry) leRetry.addEventListener('click', ()=>{ hideLevelEnd(); startLevel(lvlIdx); });
  if (leNext) leNext.addEventListener('click', ()=>{ hideLevelEnd(); lvlIdx=Math.min(levels.length-1, lvlIdx+1); localStorage.setItem('kaira_game_lvl', String(lvlIdx)); startLevel(lvlIdx); });

  // Universe switching
  const keys = Object.create(null);
  window.addEventListener('keydown', (e)=>{ keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()] = false; });
  function switchUniverse(i){ const idx=((i%UNAMES.length)+UNAMES.length)%UNAMES.length; if (idx===curIdx) return; curIdx=idx; Uc=U[UNAMES[curIdx]]; switching=1; updateHud(); showToast('Evren: '+Uc.name); }
  function cycle(dir){ switchUniverse(curIdx + (dir>0?1:-1)); }

  function handleKeys(){
    if (keys['1']) switchUniverse(0);
    if (keys['2']) switchUniverse(1);
    if (keys['3']) switchUniverse(2);
    if (keys['q']) { keys['q']=false; cycle(-1); }
    if (keys['e']) { keys['e']=false; cycle(1); }
    if (keys['r']) { keys['r']=false; score=0; shards=0; startT=performance.now(); initBoard(); showToast('Yeniden başlatıldı'); updateHud(); }
  }

  // Rendering
  function drawBackground(){ const g=ctx.createLinearGradient(0,0,0,C.height); const pal=Uc.bg; g.addColorStop(0,pal[0]); g.addColorStop(0.6,pal[1]); g.addColorStop(1,pal[0]); ctx.fillStyle=g; ctx.fillRect(0,0,C.width,C.height); ctx.globalAlpha=1; ctx.fillStyle=Uc.tint; ctx.fillRect(0,0,C.width,C.height); }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function drawBoard(){
    // frame
    ctx.fillStyle='rgba(15,23,42,0.7)'; roundRect(BX-12,BY-12,BW+24,BH+24,12); ctx.fill();
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const v = tileAt(r,c);
        const x = BX + c*TILE; const y = BY + r*TILE;
        // grid cell bg
        ctx.fillStyle='rgba(2,6,23,0.6)'; roundRect(x+3,y+3,TILE-6,TILE-6,8); ctx.fill();
        if (v>=0){
          const col = Uc.palette[v % Uc.palette.length];
          const g = ctx.createLinearGradient(x,y, x+TILE,y+TILE);
          g.addColorStop(0, col);
          g.addColorStop(1, 'rgba(255,255,255,0.75)');
          ctx.save();
          // hafif gölge ile kutuları arka plandan ayır
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = g;
          roundRect(x+6,y+6,TILE-12,TILE-12,10); ctx.fill();
          ctx.restore();
          // kenarlık: önce açık, sonra hafif koyu
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          roundRect(x+6,y+6,TILE-12,TILE-12,10); ctx.stroke();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          roundRect(x+7,y+7,TILE-14,TILE-14,10); ctx.stroke();
          // parıltı
          ctx.fillStyle='rgba(255,255,255,0.28)'; roundRect(x+10,y+10,TILE-26,10,6); ctx.fill();
        }
      }
    }
    if (selected){
      const x = BX + selected.c*TILE; const y = BY + selected.r*TILE;
      ctx.lineWidth = 3; ctx.strokeStyle = '#fbbf24'; roundRect(x+3,y+3,TILE-6,TILE-6,8); ctx.stroke();
      // neighbor highlights
      const neigh = [ [selected.r,selected.c-1], [selected.r,selected.c+1], [selected.r-1,selected.c], [selected.r+1,selected.c] ];
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(251,191,36,0.6)';
      for (const [rr,cc] of neigh){ if (rr<0||rr>=ROWS||cc<0||cc>=COLS) continue; const xx=BX+cc*TILE, yy=BY+rr*TILE; roundRect(xx+4,yy+4,TILE-8,TILE-8,8); ctx.stroke(); }
    }
    // hint highlight
    if (hintCells && hintCells.length===2){
      ctx.lineWidth = 4; ctx.strokeStyle = '#22d3ee';
      for (const [r,c] of hintCells){ const x=BX+c*TILE, y=BY+r*TILE; roundRect(x+2,y+2,TILE-4,TILE-4,9); ctx.stroke(); }
    }
  }

  // Touch support (drag to adjacent)
  let dragStart = null;
  C.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; const rect=C.getBoundingClientRect(); const x=(t.clientX-rect.left)*(C.width/rect.width); const y=(t.clientY-rect.top)*(C.height/rect.height); dragStart = posToCell(x,y); e.preventDefault(); }, {passive:false});
  C.addEventListener('touchend', (e)=>{ if (!dragStart) return; const t=e.changedTouches[0]; const rect=C.getBoundingClientRect(); const x=(t.clientX-rect.left)*(C.width/rect.width); const y=(t.clientY-rect.top)*(C.height/rect.height); const end=posToCell(x,y); if(end){ if (Math.abs(end.r-dragStart.r)+Math.abs(end.c-dragStart.c)===1){ trySwap(dragStart,end); } else { selected=end; } } dragStart=null; e.preventDefault(); }, {passive:false});

  // Game loop
  initBoard(); updateHud(); refreshHud(); renderLevelStart();
  let last = performance.now();
  function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min(0.033,(now-last)/1000) * Uc.timeScale; last = now;
    handleKeys(); updateTimer();
    // idle hint after 6 seconds
    if (!hintCells && (now - lastAction) > (6000 / Uc.timeScale)) hintCells = anyMoveExists();
    // if no moves exist at all → shuffle
    if (!anyMoveExists()) { shuffleBoard(); showToast('Hamle yok, karıştırıldı'); lastAction = now; hintCells = null; }
    if (animTimer>0) animTimer = Math.max(0, animTimer - dt);
    drawBackground(); drawBoard();
    if (switching>0){ switching=Math.max(0,switching - dt*1.8); ctx.globalAlpha=switching; const g=ctx.createRadialGradient(C.width*0.5,C.height*0.5,0,C.width*0.5,C.height*0.5,C.height*0.7); g.addColorStop(0,'rgba(255,255,255,0.0)'); g.addColorStop(1,'rgba(0,0,0,0.6)'); ctx.fillStyle=g; ctx.fillRect(0,0,C.width,C.height); ctx.globalAlpha=1; }
  }
  requestAnimationFrame(loop);
})();
