/* ==========================================================================
   Gravitation simulations
   ========================================================================== */

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);
  return ctx;
}

/* =====================================================================
   1. Orbiting planets
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-orbit');
  const ctx = setupCanvas(canvas);
  let speed = 1, paused = false, showTrails = true, t = 0;

  const planets = [
    { name:'Mercury', a:0.14, b:0.11, period:0.24, color:'#c9c2b4', r:3.2, trail:[] },
    { name:'Venus',   a:0.20, b:0.16, period:0.62, color:'#e8c28a', r:4.5, trail:[] },
    { name:'Earth',   a:0.27, b:0.22, period:1.0,  color:'#7fb2ff', r:4.8, trail:[] },
    { name:'Mars',    a:0.34, b:0.28, period:1.88, color:'#e07a5f', r:3.6, trail:[] },
    { name:'Jupiter', a:0.44, b:0.36, period:4.5,  color:'#e8d0a9', r:8.0, trail:[] },
  ];

  document.getElementById('orbit-speed').addEventListener('input', e=>{
    speed = parseFloat(e.target.value);
    document.getElementById('orbit-speed-val').textContent = speed.toFixed(1)+'×';
  });
  document.getElementById('orbit-pause').addEventListener('click', e=>{
    paused = !paused;
    e.target.textContent = paused ? 'Resume' : 'Pause';
  });
  document.getElementById('orbit-trails').addEventListener('click', ()=>{
    showTrails = !showTrails;
    planets.forEach(p=>p.trail=[]);
  });

  function draw(){
    if(!paused) t += 0.006 * speed;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2;
    const scale = Math.min(w,h);

    // sun glow
    const sunR = scale*0.035;
    const sg = ctx.createRadialGradient(cx,cy,0,cx,cy,sunR*4);
    sg.addColorStop(0,'rgba(255,214,140,0.9)');
    sg.addColorStop(1,'rgba(255,214,140,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx,cy,sunR*4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffe0a0';
    ctx.beginPath(); ctx.arc(cx,cy,sunR,0,Math.PI*2); ctx.fill();

    for(const p of planets){
      const rx = p.a*scale, ry = p.b*scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.stroke();

      const angle = (t / p.period) * Math.PI*2;
      const px = cx + Math.cos(angle)*rx;
      const py = cy + Math.sin(angle)*ry;

      if(showTrails){
        p.trail.push({x:px,y:py});
        if(p.trail.length>60) p.trail.shift();
        for(let i=0;i<p.trail.length;i++){
          ctx.globalAlpha = (i/p.trail.length)*0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.trail[i].x, p.trail[i].y, p.r*devicePixelRatio*0.5, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px,py,p.r*devicePixelRatio,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   2. Falling objects
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-fall');
  const ctx = setupCanvas(canvas);
  let airOn = true, dropping = false, elapsed = 0;
  const objects = [
    { name:'Stone',   color:'#9fb0d0', drag:0.02, x:0.25, y:0, vy:0 },
    { name:'Feather', color:'#ffe6a8', drag:0.55, x:0.5,  y:0, vy:0 },
    { name:'Ball',    color:'#ff9d7a', drag:0.10, x:0.75, y:0, vy:0 },
  ];

  document.getElementById('fall-drop').addEventListener('click', ()=>{
    objects.forEach(o=>{ o.y = 0; o.vy = 0; });
    elapsed = 0;
    dropping = true;
  });
  document.getElementById('fall-air').addEventListener('click', e=>{
    airOn = !airOn;
    e.target.textContent = 'Air resistance: ' + (airOn ? 'ON' : 'OFF');
  });

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // ground
    const groundY = h*0.92;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(0,groundY); ctx.lineTo(w,groundY); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('ground', 8*devicePixelRatio, groundY+16*devicePixelRatio);

    if(dropping){
      elapsed += 1/60;
      let allLanded = true;
      for(const o of objects){
        const g = 9.8;
        const dragFactor = airOn ? o.drag : 0;
        o.vy += (g - o.vy*dragFactor) * (1/60) * 22;
        o.vy = Math.max(o.vy, 0);
        o.y += o.vy * (1/60) * (devicePixelRatio*3.2);
        const floor = groundY - 14*devicePixelRatio;
        if(o.y < floor) allLanded = false;
        o.y = Math.min(o.y, floor);
      }
      if(allLanded) dropping = false;
      document.querySelector('#fall-readout b').textContent = elapsed.toFixed(2)+' s';
    }

    for(const o of objects){
      const px = w*o.x;
      const py = 30*devicePixelRatio + o.y;
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(px, py, 12*devicePixelRatio, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(o.name, px, py + 30*devicePixelRatio);
      ctx.textAlign = 'left';
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   3. Attraction between two masses
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-masses');
  const ctx = setupCanvas(canvas);
  let mA = 4, mB = 6;
  let posA = {x:0.3, y:0.5}, posB = {x:0.7, y:0.5};
  let dragging = null;

  document.getElementById('mA').addEventListener('input', e=>{
    mA = parseFloat(e.target.value);
    document.getElementById('mA-val').textContent = mA;
  });
  document.getElementById('mB').addEventListener('input', e=>{
    mB = parseFloat(e.target.value);
    document.getElementById('mB-val').textContent = mB;
  });

  function toCanvasXY(rel){ return { x: rel.x*canvas.width, y: rel.y*canvas.height }; }

  canvas.addEventListener('pointerdown', e=>{
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX-rect.left)/rect.width, my=(e.clientY-rect.top)/rect.height;
    const a = toCanvasXY(posA), b = toCanvasXY(posB);
    const dA = Math.hypot(mx*canvas.width-a.x, my*canvas.height-a.y);
    const dB = Math.hypot(mx*canvas.width-b.x, my*canvas.height-b.y);
    if(dA < 40*devicePixelRatio && dA<dB) dragging='A';
    else if(dB < 40*devicePixelRatio) dragging='B';
    canvas.closest('.stage').classList.add('grabbing');
  });
  window.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const rect = canvas.getBoundingClientRect();
    let mx = (e.clientX-rect.left)/rect.width, my=(e.clientY-rect.top)/rect.height;
    mx = Math.min(Math.max(mx,0.08),0.92);
    my = Math.min(Math.max(my,0.12),0.88);
    if(dragging==='A') posA = {x:mx,y:my}; else posB = {x:mx,y:my};
  });
  window.addEventListener('pointerup', ()=>{ dragging=null; canvas.closest('.stage')?.classList.remove('grabbing'); });

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const a = toCanvasXY(posA), b = toCanvasXY(posB);
    const dist = Math.hypot(b.x-a.x, b.y-a.y);
    const distReal = (dist / (Math.min(w,h))) * 10; // arbitrary units
    const F = (mA*mB) / (distReal*distReal || 1);

    // force line
    const lw = Math.min(Math.max(F*1.4, 1), 14) * devicePixelRatio;
    ctx.strokeStyle = `rgba(139,157,255,${Math.min(0.3+F*0.05,0.95)})`;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();

    // masses
    const rA = (10 + mA*3.2) * devicePixelRatio;
    const rB = (10 + mB*3.2) * devicePixelRatio;
    const gA = ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,rA*1.6);
    gA.addColorStop(0,'rgba(139,157,255,0.9)'); gA.addColorStop(1,'rgba(139,157,255,0)');
    ctx.fillStyle=gA; ctx.beginPath(); ctx.arc(a.x,a.y,rA*1.6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8b9dff'; ctx.beginPath(); ctx.arc(a.x,a.y,rA,0,Math.PI*2); ctx.fill();

    const gB = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,rB*1.6);
    gB.addColorStop(0,'rgba(255,180,84,0.9)'); gB.addColorStop(1,'rgba(255,180,84,0)');
    ctx.fillStyle=gB; ctx.beginPath(); ctx.arc(b.x,b.y,rB*1.6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb454'; ctx.beginPath(); ctx.arc(b.x,b.y,rB,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.textAlign='center';
    ctx.fillText('A', a.x, a.y+4*devicePixelRatio);
    ctx.fillText('B', b.x, b.y+4*devicePixelRatio);
    ctx.textAlign='left';

    const readout = document.getElementById('masses-readout');
    readout.innerHTML = `<span>force: <b>${F.toFixed(2)} units</b></span><span>distance: <b>${distReal.toFixed(2)} units</b></span>`;

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   4. Satellites orbiting Earth
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-sat');
  const ctx = setupCanvas(canvas);
  let launchSpeed = 6, sat = null, trail = [];
  const statusEl = document.getElementById('sat-status');

  document.getElementById('sat-speed').addEventListener('input', e=>{
    launchSpeed = parseFloat(e.target.value);
    document.getElementById('sat-speed-val').textContent = launchSpeed.toFixed(1);
  });
  document.getElementById('sat-launch').addEventListener('click', ()=>{
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2;
    const orbitR = Math.min(w,h)*0.22;
    sat = { x: cx, y: cy-orbitR, vx: launchSpeed*devicePixelRatio*0.28, vy: 0 };
    trail = [];
    statusEl.textContent = 'Satellite launched…';
  });
  document.getElementById('sat-reset').addEventListener('click', ()=>{
    sat = null; trail=[];
    statusEl.textContent = 'Ready on the pad.';
  });

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2;
    const earthR = Math.min(w,h)*0.09;

    // earth
    const eg = ctx.createRadialGradient(cx,cy,0,cx,cy,earthR*1.4);
    eg.addColorStop(0,'rgba(94,234,212,0.35)'); eg.addColorStop(1,'rgba(94,234,212,0)');
    ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(cx,cy,earthR*1.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a7bd6';
    ctx.beginPath(); ctx.arc(cx,cy,earthR,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(94,234,212,0.5)';
    ctx.beginPath(); ctx.arc(cx-earthR*0.3, cy-earthR*0.2, earthR*0.4, 0, Math.PI*2); ctx.fill();

    // launch pad marker
    const orbitR = Math.min(w,h)*0.22;
    if(!sat){
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([4*devicePixelRatio,4*devicePixelRatio]);
      ctx.beginPath(); ctx.arc(cx,cy,orbitR,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffb454';
      ctx.beginPath(); ctx.arc(cx, cy-orbitR, 6*devicePixelRatio, 0, Math.PI*2); ctx.fill();
    }

    if(sat){
      const GM = 900; // tuned constant
      const dx = cx - sat.x, dy = cy - sat.y;
      const r = Math.hypot(dx,dy) || 1;
      const a = GM/(r*r);
      sat.vx += (dx/r)*a*(1/60);
      sat.vy += (dy/r)*a*(1/60);
      sat.x += sat.vx*(1/60)*devicePixelRatio*3.5/devicePixelRatio;
      sat.y += sat.vy*(1/60)*devicePixelRatio*3.5/devicePixelRatio;

      trail.push({x:sat.x,y:sat.y});
      if(trail.length>240) trail.shift();

      // crash / escape detection
      if(r < earthR){
        statusEl.textContent = 'Crashed — too slow, gravity won.';
        sat = null;
      } else if(r > Math.min(w,h)*0.6){
        statusEl.textContent = 'Escaped — too fast, it flew off.';
        sat = null;
      } else {
        const speedNow = Math.hypot(sat.vx,sat.vy);
        statusEl.textContent = `Orbiting — speed ${speedNow.toFixed(1)}, distance ${(r/devicePixelRatio).toFixed(0)}px`;
      }

      for(let i=0;i<trail.length;i++){
        ctx.globalAlpha = (i/trail.length)*0.6;
        ctx.fillStyle = '#ffb454';
        ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 2*devicePixelRatio, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if(sat){
        ctx.fillStyle = '#ffb454';
        ctx.beginPath(); ctx.arc(sat.x, sat.y, 6*devicePixelRatio, 0, Math.PI*2); ctx.fill();
      }
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   5. Bonus: Einstein's spacetime fabric
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-fabric');
  const ctx = setupCanvas(canvas);
  let mass = 50;
  let heavy = {x:0.5, y:0.5};
  let dragging = false;
  let orbiterAngle = 0;

  document.getElementById('fabric-mass').addEventListener('input', e=>{
    mass = parseFloat(e.target.value);
    document.getElementById('fabric-mass-val').textContent = mass;
  });

  canvas.addEventListener('pointerdown', e=>{
    dragging = true;
    canvas.closest('.stage').classList.add('grabbing');
  });
  window.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const rect = canvas.getBoundingClientRect();
    let mx = (e.clientX-rect.left)/rect.width, my=(e.clientY-rect.top)/rect.height;
    heavy = { x: Math.min(Math.max(mx,0.15),0.85), y: Math.min(Math.max(my,0.15),0.85) };
  });
  window.addEventListener('pointerup', ()=>{ dragging=false; canvas.closest('.stage')?.classList.remove('grabbing'); });

  function depthAt(px, py, hx, hy, w, h){
    const d = Math.hypot(px-hx, py-hy);
    const falloff = Math.min(w,h)*0.28;
    return (mass*0.9) / (1 + (d/falloff)*(d/falloff)) ;
  }

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const hx = heavy.x*w, hy = heavy.y*h;

    const cols = 18, rows = 14;
    const stepX = w/cols, stepY = h/rows;

    ctx.strokeStyle = 'rgba(139,157,255,0.28)';
    ctx.lineWidth = 1*devicePixelRatio;

    // horizontal grid lines (warped)
    for(let j=0;j<=rows;j++){
      ctx.beginPath();
      for(let i=0;i<=cols;i++){
        const px = i*stepX, py = j*stepY;
        const depth = depthAt(px,py,hx,hy,w,h);
        const dy = depth;
        if(i===0) ctx.moveTo(px, py+dy); else ctx.lineTo(px, py+dy);
      }
      ctx.stroke();
    }
    // vertical grid lines (warped)
    for(let i=0;i<=cols;i++){
      ctx.beginPath();
      for(let j=0;j<=rows;j++){
        const px = i*stepX, py = j*stepY;
        const depth = depthAt(px,py,hx,hy,w,h);
        const dy = depth;
        if(j===0) ctx.moveTo(px, py+dy); else ctx.lineTo(px, py+dy);
      }
      ctx.stroke();
    }

    // small orbiting ball following the curvature
    orbiterAngle += 0.02;
    const orbitR = Math.min(w,h)*0.30;
    const ox = hx + Math.cos(orbiterAngle)*orbitR;
    const oy = hy + Math.sin(orbiterAngle)*orbitR*0.55;
    const oDepth = depthAt(ox,oy,hx,hy,w,h);
    ctx.fillStyle = '#5eead4';
    ctx.beginPath(); ctx.arc(ox, oy+oDepth, 6*devicePixelRatio, 0, Math.PI*2); ctx.fill();

    // heavy ball
    const hDepth = depthAt(hx,hy,hx,hy,w,h);
    const rH = (10 + mass*0.22) * devicePixelRatio;
    const hg = ctx.createRadialGradient(hx,hy+hDepth,0,hx,hy+hDepth,rH*1.8);
    hg.addColorStop(0,'rgba(255,180,84,0.85)'); hg.addColorStop(1,'rgba(255,180,84,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx,hy+hDepth,rH*1.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb454';
    ctx.beginPath(); ctx.arc(hx, hy+hDepth, rH, 0, Math.PI*2); ctx.fill();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
