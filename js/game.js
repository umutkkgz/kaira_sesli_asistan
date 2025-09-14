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
    PASTEL: { name:'Pastel', timeScale:0.9, mult:1.1, gravity:'down', bg:['#1b1f2a','#42526e','#9ad5ca'], tint:'rgba(154,213,202,0.22)', palette:['#f8c8dc','#b8e0d2','#ffd6a5','#c9c9ff','#bde0fe','#f1f7b5'] },
    NEON:   { name:'Neon',   timeScale:1.3, mult:1.2, gravity:'down', bg:['#0a0b11','#0f162e','#08f7fe'], tint:'rgba(8,247,254,0.15)', palette:['#08f7fe','#f706cf','#f9f871','#05ffa1','#ff9933','#ff2079'] },
    NOIR:   { name:'Noir',   timeScale:1.0, mult:1.0, gravity:'up',   bg:['#050507','#171923','#7c7d84'], tint:'rgba(124,125,132,0.16)', palette:['#cbd5e1','#94a3b8','#e2e8f0','#9aa0a6','#6b7280','#f5f5f5'] },
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
  const BOARD_SIZE = Math.min(C.height*0.9, C.height*0.9, C.width*0.9);
  const TILE = Math.floor(Math.min(C.width*0.6, C.height*0.8)/COLS);
  const BW = TILE*COLS, BH = TILE*ROWS;
  const BX = Math.floor((C.width - BW)/2);
  const BY = Math.floor((C.height - BH)/2);

  function showToast(text){ toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(()=> toastEl.classList.remove('show'), 900); }
  function bestStr(sec){ if (!Number.isFinite(sec)) return '—'; const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

  // Timer & PB
  let startT = performance.now();
  try{ const pb = Number(localStorage.getItem('kaira_game_pb_match3')||''); pbEl.textContent = bestStr(pb); }catch(_){ pbEl.textContent = '—'; }

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
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run=1;
      for(let c=1;c<=COLS;c++){
        const same = (c<COLS && tileAt(r,c)===tileAt(r,c-1));
        if (same) run++; else { if (run>=3){ for(let k=0;k<run;k++) marks[r][c-1-k]=true; } run=1; }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run=1;
      for(let r=1;r<=ROWS;r++){
        const same = (r<ROWS && tileAt(r,c)===tileAt(r-1,c));
        if (same) run++; else { if (run>=3){ for(let k=0;k<run;k++) marks[r-1-k][c]=true; } run=1; }
      }
    }
    // gather
    const cells=[]; let maxRun=false;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ if (marks[r][c]){ cells.push([r,c]); } }
    if (!cells.length) return null;
    // crude run size check for shard reward: if any row/col run >=4 around a marked cell
    for (const [r,c] of cells){
      const v=tileAt(r,c);
      // check horizontal
      let cnt=1, cc=c-1; while(tileAt(r,cc)===v && marks[r][cc]){cnt++;cc--;}
      cc=c+1; while(tileAt(r,cc)===v && marks[r][cc]){cnt++;cc++;}
      if (cnt>=4) { maxRun=true; break; }
      // vertical
      cnt=1; let rr=r-1; while(tileAt(rr,c)===v && marks[rr][c]){cnt++;rr--;}
      rr=r+1; while(tileAt(rr,c)===v && marks[rr][c]){cnt++;rr++;}
      if (cnt>=4) { maxRun=true; break; }
    }
    return { cells, big: maxRun };
  }

  function removeCells(cells){
    for (const [r,c] of cells){ setTile(r,c,-1); }
    const gain = Math.floor(cells.length * 10 * Uc.mult * (1 + chains*0.15));
    score += gain; animTimer = 0.15; // small flash
    if (cells.length>=4){ shards = Math.min(3, shards + 1); showToast('Shard kazandın ✦'); }
    updateHud();
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
    // apply cascades
    let total=0; chains=0;
    while(true){
      const f = findMatches(); if (!f) break;
      removeCells(f.cells); total += f.cells.length; chains++;
      collapseAndRefill();
      if (chains>12) break; // sanity
    }
    if (total>0 && shards>=3){ showToast('Kapı açıldı! Kazandın'); try{ const t=(performance.now()-startT)/1000; const prev=Number(localStorage.getItem('kaira_game_pb_match3')||''); if(!prev||t<prev) localStorage.setItem('kaira_game_pb_match3', String(t)); pbEl.textContent = bestStr(Math.min(prev||Infinity, t)); }catch(_){ } }
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
  if (btnHint) btnHint.addEventListener('click', ()=>{ lastAction = performance.now(); hintCells = anyMoveExists(); if (!hintCells) { showToast('Hamle yok, karıştırılıyor'); shuffleBoard(); } });
  if (btnShuffle) btnShuffle.addEventListener('click', ()=>{ lastAction = performance.now(); shuffleBoard(); showToast('Karıştırıldı'); });
  if (btnHelp) btnHelp.addEventListener('click', ()=>{ if (howto) howto.classList.remove('hidden'); });
  if (howtoClose) howtoClose.addEventListener('click', ()=>{ if (howto) howto.classList.add('hidden'); });

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
          g.addColorStop(1, 'rgba(255,255,255,0.7)');
          ctx.fillStyle = g;
          roundRect(x+6,y+6,TILE-12,TILE-12,10); ctx.fill();
          // small shine
          ctx.fillStyle='rgba(255,255,255,0.25)'; roundRect(x+10,y+10,TILE-26,10,6); ctx.fill();
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

  // Game loop
  initBoard(); updateHud();
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
