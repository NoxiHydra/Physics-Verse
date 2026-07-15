/* ==========================================================================
   Sound simulations
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

let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/* =====================================================================
   1. Vibrating tuning fork
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-vibrate');
  const ctx = setupCanvas(canvas);
  const stage = document.getElementById('c-vibrate-stage');
  let strikeT = -10, ripples = [];

  function strike(){
    strikeT = 0;
    ripples.push({ r: 0, life: 1 });
  }
  document.getElementById('vibrate-strike').addEventListener('click', strike);
  stage.addEventListener('click', strike);

  function draw(){
    strikeT += 1/60;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const cx = w*0.32, cy = h*0.5;

    // ripples
    ripples.forEach(rp=>{
      rp.r += 3.2*devicePixelRatio;
      rp.life -= 0.012;
    });
    ripples = ripples.filter(rp=>rp.life>0);
    for(const rp of ripples){
      ctx.strokeStyle = `rgba(255,180,84,${rp.life*0.6})`;
      ctx.lineWidth = 2*devicePixelRatio;
      ctx.beginPath(); ctx.arc(cx,cy,rp.r,0,Math.PI*2); ctx.stroke();
    }

    // decaying vibration amplitude
    const amp = strikeT < 2 ? Math.max(0, (1 - strikeT/2)) * 14*devicePixelRatio : 0;
    const wob = Math.sin(strikeT*40) * amp;

    // tuning fork: handle + two prongs
    ctx.strokeStyle = '#dbe1f5';
    ctx.lineWidth = 5*devicePixelRatio;
    ctx.lineCap = 'round';
    const baseY = cy + 55*devicePixelRatio;
    // handle
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(cx, baseY+34*devicePixelRatio); ctx.stroke();
    // prongs, deflect oppositely
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx-16*devicePixelRatio+wob, baseY-70*devicePixelRatio);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx+16*devicePixelRatio-wob, baseY-70*devicePixelRatio);
    ctx.stroke();

    // waveform readout to the right
    const gx = w*0.6, gw = w*0.34, gy = h*0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+gw,gy); ctx.stroke();
    ctx.strokeStyle = '#ffb454';
    ctx.lineWidth = 2*devicePixelRatio;
    ctx.beginPath();
    for(let x=0; x<=gw; x+=3*devicePixelRatio){
      const localT = strikeT - (x/gw)*1.2;
      const localAmp = localT>0 && localT<2 ? Math.max(0,(1-localT/2))*20*devicePixelRatio : 0;
      const y = gy + Math.sin(localT*40)*localAmp;
      if(x===0) ctx.moveTo(gx+x,y); else ctx.lineTo(gx+x,y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('vibration trace →', gx, gy - 30*devicePixelRatio);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   2. Sound through particles (longitudinal wave)
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-particles');
  const ctx = setupCanvas(canvas);
  let playing = true, t = 0;
  document.getElementById('particles-toggle').addEventListener('click', e=>{
    playing = !playing;
    e.target.textContent = playing ? 'Pause' : 'Resume';
  });

  const rows = 6, cols = 26;
  function draw(){
    if(playing) t += 0.05;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    const marginX = w*0.08, marginY = h*0.15;
    const spanX = w - marginX*2, spanY = h - marginY*2;
    const baseSpacing = spanX/(cols-1);

    for(let j=0;j<rows;j++){
      for(let i=0;i<cols;i++){
        const baseX = marginX + i*baseSpacing;
        const y = marginY + (spanY/(rows-1))*j;
        const disp = Math.sin((i*0.5) - t) * baseSpacing*0.35;
        const x = baseX + disp;

        const isHighlight = (j===Math.floor(rows/2) && i===Math.floor(cols/2));
        ctx.fillStyle = isHighlight ? '#5eead4' : 'rgba(255,180,84,0.55)';
        ctx.beginPath();
        ctx.arc(x, y, (isHighlight?5:2.6)*devicePixelRatio, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('teal particle: jiggles in place only', marginX, h-14*devicePixelRatio);
    ctx.fillText('wave direction →', marginX, marginY-14*devicePixelRatio);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   3. Amplitude & frequency (with optional tone)
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-wave');
  const ctx = setupCanvas(canvas);
  let amp = 50, freq = 3, t = 0, osc=null, gain=null;

  document.getElementById('amp').addEventListener('input', e=>{
    amp = parseFloat(e.target.value);
    document.getElementById('amp-val').textContent = amp;
    if(gain) gain.gain.value = (amp/100)*0.18;
  });
  document.getElementById('freq').addEventListener('input', e=>{
    freq = parseFloat(e.target.value);
    document.getElementById('freq-val').textContent = freq.toFixed(1);
    if(osc) osc.frequency.value = 150 + freq*90;
  });

  const soundBtn = document.getElementById('wave-sound');
  soundBtn.addEventListener('click', ()=>{
    const ac = getAudioCtx();
    if(osc){
      osc.stop(); osc=null; gain=null;
      soundBtn.textContent = '🔊 Play tone';
      return;
    }
    osc = ac.createOscillator();
    gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 150 + freq*90;
    gain.gain.value = (amp/100)*0.18;
    osc.connect(gain); gain.connect(ac.destination);
    osc.start();
    soundBtn.textContent = '🔇 Stop tone';
  });

  function draw(){
    t += 0.05;
    const w = canvas.width, h = canvas.height, cy = h/2;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(w,cy); ctx.stroke();

    ctx.strokeStyle = '#ffb454';
    ctx.lineWidth = 3*devicePixelRatio;
    ctx.beginPath();
    for(let x=0;x<w;x+=2*devicePixelRatio){
      const A = (amp/100) * h*0.36;
      const F = freq;
      const y = cy + Math.sin((x*0.02*F) - t*3)*A;
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   4. Echo
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-echo');
  const ctx = setupCanvas(canvas);
  let wallDist = 30;
  let pulses = []; // {x, dir, born}
  let t = 0;
  const speedPxPerM = 6; // visual speed scale
  const status = document.getElementById('echo-status');

  document.getElementById('echo-dist').addEventListener('input', e=>{
    wallDist = parseFloat(e.target.value);
    document.getElementById('echo-dist-val').textContent = wallDist+' m';
  });
  document.getElementById('echo-shout').addEventListener('click', ()=>{
    pulses.push({ dist: 0, bounced:false, born:t });
    const threshold = 17;
    status.textContent = wallDist >= threshold
      ? `Clear echo expected — wall is ${wallDist} m away (> 17 m).`
      : `Too close — echo will blend into the original sound (< 17 m).`;
  });

  function draw(){
    t += 1/60;
    const w = canvas.width, h = canvas.height, cy = h*0.55;
    ctx.clearRect(0,0,w,h);

    const srcX = w*0.1;
    const wallX = w*0.1 + (wallDist/60)*w*0.8;

    // source
    ctx.fillStyle = '#ffb454';
    ctx.beginPath(); ctx.arc(srcX, cy, 8*devicePixelRatio, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.font = `${11*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('you', srcX-8*devicePixelRatio, cy+26*devicePixelRatio);

    // wall
    ctx.fillStyle = '#5c6688';
    ctx.fillRect(wallX-4*devicePixelRatio, cy-70*devicePixelRatio, 8*devicePixelRatio, 140*devicePixelRatio);
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.fillText('wall', wallX-10*devicePixelRatio, cy+90*devicePixelRatio);

    const pxPerM = (wallX-srcX)/Math.max(wallDist,1);

    pulses.forEach(p=>{
      p.dist += speedPxPerM * (pxPerM/6) * (1/1);
    });

    for(const p of pulses){
      let x;
      if(!p.bounced){
        x = srcX + p.dist;
        if(x >= wallX){ p.bounced = true; p.dist = 0; }
      } else {
        x = wallX - p.dist;
      }
      const alpha = p.bounced ? 0.9 : 0.55;
      ctx.strokeStyle = `rgba(94,234,212,${alpha})`;
      ctx.lineWidth = 2*devicePixelRatio;
      ctx.beginPath();
      ctx.arc(x, cy, 10*devicePixelRatio, -1.3, 1.3);
      ctx.stroke();
    }
    pulses = pulses.filter(p => !(p.bounced && (wallX-p.dist) < srcX-10));

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =====================================================================
   5. Human ear
   ===================================================================== */
(function(){
  const canvas = document.getElementById('c-ear');
  const ctx = setupCanvas(canvas);
  let progress = -1;
  const status = document.getElementById('ear-status');
  const stages = ['Outer ear (pinna) funnels sound in', 'Eardrum vibrates', 'Ossicles amplify the vibration', 'Cochlea turns it into nerve signals', 'Signal reaches the brain'];

  document.getElementById('ear-send').addEventListener('click', ()=>{
    progress = 0;
  });

  function draw(){
    const w = canvas.width, h = canvas.height, cy = h*0.5;
    ctx.clearRect(0,0,w,h);

    // simplified ear canal path (a curve from left to right)
    const points = [
      {x:w*0.06, y:cy}, {x:w*0.22, y:cy}, // pinna to canal
      {x:w*0.42, y:cy}, // eardrum
      {x:w*0.55, y:cy-h*0.12}, {x:w*0.66, y:cy+h*0.10}, // ossicles zig-zag
      {x:w*0.86, y:cy}, // cochlea
    ];

    // draw pinna
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3*devicePixelRatio;
    ctx.beginPath();
    ctx.ellipse(w*0.08, cy, w*0.05, h*0.22, 0, 0.3, Math.PI*1.7);
    ctx.stroke();

    // canal
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.stroke();

    // eardrum
    ctx.strokeStyle = 'rgba(255,180,84,0.8)';
    ctx.lineWidth = 3*devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(points[2].x, cy-h*0.12);
    ctx.lineTo(points[2].x, cy+h*0.12);
    ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.font = `${10*devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('eardrum', points[2].x-20*devicePixelRatio, cy-h*0.16);

    // ossicles (zig-zag bones)
    ctx.strokeStyle = 'rgba(139,157,255,0.8)';
    ctx.lineWidth = 3*devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(points[2].x, cy);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.lineTo(points[4].x, points[4].y);
    ctx.lineTo(points[5].x, cy);
    ctx.stroke();
    ctx.fillText('ossicles', (points[3].x+points[4].x)/2-20*devicePixelRatio, cy-h*0.22);

    // cochlea spiral
    const cxx = points[5].x, cyy = cy;
    ctx.strokeStyle = 'rgba(94,234,212,0.85)';
    ctx.beginPath();
    for(let a=0; a<Math.PI*5; a+=0.1){
      const rr = (h*0.09) * (a/(Math.PI*5));
      const x = cxx + Math.cos(a)*rr;
      const y = cyy + Math.sin(a)*rr;
      if(a===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.fillText('cochlea', cxx-16*devicePixelRatio, cyy+h*0.15);

    // brain label
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillText('→ brain', w*0.9, cyy);

    // traveling pulse
    if(progress >= 0){
      progress += 0.012;
      const segLen = 4;
      const segIdx = Math.min(Math.floor(progress*segLen), segLen-1);
      const localT = (progress*segLen) - segIdx;
      const segPoints = [points[0], points[2], points[3], points[4], points[5]];
      const p0 = segPoints[Math.min(segIdx, segPoints.length-2)];
      const p1 = segPoints[Math.min(segIdx+1, segPoints.length-1)];
      const px = p0.x + (p1.x-p0.x)*localT;
      const py = p0.y + (p1.y-p0.y)*localT;
      ctx.fillStyle = '#5eead4';
      ctx.beginPath(); ctx.arc(px,py,7*devicePixelRatio,0,Math.PI*2); ctx.fill();

      const stageIdx = Math.min(Math.floor(progress*stages.length), stages.length-1);
      status.textContent = stages[stageIdx];

      if(progress >= 1){ progress = -1; status.textContent = 'Reached the brain — sound perceived!'; }
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
