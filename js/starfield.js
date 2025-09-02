// Lightweight starfield + meteors background
(function(){
  const canvas = document.getElementById('starfield-canvas') || (function(){
    const c = document.createElement('canvas'); c.id = 'starfield-canvas'; c.setAttribute('aria-hidden','true');
    c.style.position='fixed'; c.style.inset='0'; c.style.width='100%'; c.style.height='100%'; c.style.pointerEvents='none'; c.style.zIndex='-3';
    document.body.insertBefore(c, document.body.firstChild);
    return c;
  })();
  const ctx = canvas.getContext('2d');
  const PREF_REDUCED = (typeof window.matchMedia === 'function') && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W = 0, H = 0, running = true;

  const state = {
    stars: [],
    meteors: [],
    t: 0,
  };

  function resize(){
    const w = window.innerWidth, h = window.innerHeight;
    if (w === W && h === H) return;
    W = w; H = h; dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function seedStars(){
    const area = W * H;
    let desired = Math.max(120, Math.min(800, Math.floor(area / 6000))); // density
    if (PREF_REDUCED) desired = Math.floor(desired * 0.5);
    const old = state.stars;
    const stars = [];
    for (let i=0; i<desired; i++){
      const reuse = old[i];
      const s = reuse || {};
      s.x = reuse ? reuse.x : Math.random()*W;
      s.y = reuse ? reuse.y : Math.random()*H;
      s.size = (Math.random()*1.2 + 0.4);
      s.tw = (Math.random()*0.8 + 0.2) * (Math.random()<0.5?-1:1);
      s.alpha = Math.random();
      // subtle parallax drift
      const dir = Math.random() * Math.PI * 2;
      const speed = (Math.random()*0.04 + 0.01);
      s.vx = Math.cos(dir) * speed;
      s.vy = Math.sin(dir) * speed;
      stars.push(s);
    }
    state.stars = stars;
  }

  function spawnMeteor(){
    // Randomly enter from top-left or top; shoot diagonally
    const side = Math.random();
    let x, y, angle;
    if (side < 0.5){ x = -50; y = Math.random()*H*0.6; angle = Math.random()*0.25 + 0.15; } // from left
    else { x = Math.random()*W*0.7; y = -50; angle = Math.random()*0.25 + 0.55; } // from top
    const speed = Math.random()*6 + 3; // px/frame
    const len = Math.random()*120 + 80;
    state.meteors.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, len, life: 0, maxLife: 120 + Math.random()*60, width: Math.random()*2 + 1.2 });
  }

  function update(dt){
    state.t += dt;
    // stars
    for (let s of state.stars){
      s.x += s.vx * dt * 60; s.y += s.vy * dt * 60;
      if (s.x < -2) s.x = W+2; else if (s.x > W+2) s.x = -2;
      if (s.y < -2) s.y = H+2; else if (s.y > H+2) s.y = -2;
      s.alpha += s.tw * dt * 0.5;
      if (s.alpha < 0.15 || s.alpha > 1) s.tw *= -1;
    }
    // meteors
    for (let m of state.meteors){
      m.x += m.vx * dt * 60; m.y += m.vy * dt * 60; m.life += dt * 60;
    }
    state.meteors = state.meteors.filter(m => m.x < W+200 && m.y < H+200 && m.life < m.maxLife+30);

    // probabilistic spawn (about 1 every 6-12s)
    if (!PREF_REDUCED && Math.random() < dt / (6 + Math.random()*6)) spawnMeteor();
  }

  function draw(){
    // space background subtle gradient
    const g = ctx.createRadialGradient(W*0.7, H*0.3, Math.min(W,H)*0.1, W*0.5, H*0.5, Math.max(W,H));
    g.addColorStop(0, 'rgba(0,10,25,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // stars
    for (let s of state.stars){
      const a = Math.max(0.15, Math.min(1, s.alpha));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
      ctx.fill();
      // subtle sparkle
      if (s.size > 1 && a > 0.6){
        ctx.fillStyle = `rgba(135,206,235,${a*0.25})`;
        ctx.fillRect(s.x-0.5, s.y-1.2, 1, 2.4);
      }
    }

    // meteors (draw tails)
    for (let m of state.meteors){
      const tailX = m.x - m.vx * m.len * 0.6;
      const tailY = m.y - m.vy * m.len * 0.6;
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(135,206,235,0)');
      grad.addColorStop(0.6, 'rgba(135,206,235,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0.9)');
      ctx.strokeStyle = grad; ctx.lineWidth = m.width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(m.x, m.y); ctx.stroke();
    }
  }

  let last = performance.now();
  function loop(now){
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  function onVis(){ running = (document.visibilityState !== 'hidden'); if (running){ last = performance.now(); requestAnimationFrame(loop); } }
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  resize();
  requestAnimationFrame(loop);
})();
