/* ==========================================================
   PhysicsVerse — Sound Simulations
   ========================================================== */

function mkCanvas(id) {
  const c = document.getElementById(id);
  const ctx = c.getContext('2d');
  const stage = c.closest('.sim-stage');
  function resize() {
    const r = stage.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  return { c, ctx };
}

let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/* ============================================================
   SIM 1 — Vibrating Tuning Fork
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-vib');
  let strikeT = -99, ripples = [];
  const statusEl = document.getElementById('vib-status');

  function strike() {
    strikeT = 0;
    ripples = [];
    statusEl.textContent = 'Vibrating — watch the wavefronts spread outward.';
    // actual sound
    try {
      const a = ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.value = 440;
      o.type = 'sine';
      g.gain.setValueAtTime(0.18, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.8);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + 1.8);
    } catch(e) {}
  }

  document.getElementById('vib-strike').addEventListener('click', strike);
  document.getElementById('stage-vib').addEventListener('click', strike);

  let t = 0;
  function draw() {
    t += 1/60;
    if (strikeT >= 0) strikeT += 1/60;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // bg
    ctx.fillStyle = '#030408';
    ctx.fillRect(0, 0, w, h);

    const forkX = w * 0.28, forkY = h * 0.5;

    // ripples
    if (strikeT >= 0 && strikeT < 3) {
      if (strikeT * 60 % 14 < 1.5) ripples.push({ r: 0, born: strikeT });
    }
    ripples = ripples.filter(rp => rp.r < Math.max(w, h));
    for (const rp of ripples) {
      rp.r += 4.5 * devicePixelRatio;
      const age = strikeT - rp.born;
      const alpha = Math.max(0, 0.7 - age * 0.3);
      ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
      ctx.lineWidth = (2 - age * 0.6) * devicePixelRatio;
      ctx.beginPath();
      ctx.arc(forkX, forkY, rp.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // waveform trace
    const decayAmp = strikeT >= 0 ? Math.max(0, 1 - strikeT / 2.5) : 0;
    ctx.strokeStyle = 'rgba(251,191,36,0.7)';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    const wx0 = forkX + 12 * devicePixelRatio;
    for (let x = wx0; x < w * 0.94; x += 3) {
      const phase = (x - wx0) / (w * 0.6);
      const localAmp = decayAmp * Math.exp(-phase * 1.2) * h * 0.14;
      const y = forkY + Math.sin((x * 0.045) - strikeT * 26) * localAmp;
      x === wx0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // tuning fork
    const vibAmp = decayAmp * 11 * devicePixelRatio;
    const wob = Math.sin(strikeT * 40) * vibAmp;
    ctx.strokeStyle = '#d0d8f0';
    ctx.lineWidth = 5 * devicePixelRatio;
    ctx.lineCap = 'round';

    const handleTop = forkY + 30 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(forkX, handleTop);
    ctx.lineTo(forkX, handleTop + 50 * devicePixelRatio);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(forkX, handleTop);
    ctx.bezierCurveTo(forkX - 5 * devicePixelRatio, handleTop - 30 * devicePixelRatio, forkX - 14 * devicePixelRatio + wob, handleTop - 60 * devicePixelRatio, forkX - 14 * devicePixelRatio + wob, handleTop - 80 * devicePixelRatio);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(forkX, handleTop);
    ctx.bezierCurveTo(forkX + 5 * devicePixelRatio, handleTop - 30 * devicePixelRatio, forkX + 14 * devicePixelRatio - wob, handleTop - 60 * devicePixelRatio, forkX + 14 * devicePixelRatio - wob, handleTop - 80 * devicePixelRatio);
    ctx.stroke();

    // Particle glow at fork tip
    if (decayAmp > 0.05) {
      const pg = ctx.createRadialGradient(forkX, handleTop - 80 * devicePixelRatio, 0, forkX, handleTop - 80 * devicePixelRatio, 22 * devicePixelRatio);
      pg.addColorStop(0, `rgba(251,191,36,${decayAmp * 0.6})`);
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.fillRect(forkX - 30 * devicePixelRatio, handleTop - 110 * devicePixelRatio, 60 * devicePixelRatio, 60 * devicePixelRatio);
    }

    if (strikeT > 3.5 && ripples.length === 0) {
      statusEl.textContent = 'Fork still again. Strike to repeat.';
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 2 — Particle Propagation (Longitudinal Wave)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-prop');
  let playing = true, freq = 1.5, t = 0;

  document.getElementById('prop-freq').addEventListener('input', e => {
    freq = parseFloat(e.target.value);
    document.getElementById('prop-freq-v').textContent = freq.toFixed(1);
  });
  document.getElementById('prop-pause').addEventListener('click', e => {
    playing = !playing;
    e.target.textContent = playing ? '⏸ Pause' : '▶ Resume';
  });

  function draw() {
    if (playing) t += 0.035 * freq;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030408';
    ctx.fillRect(0, 0, w, h);

    // 3D-style source ball
    const sx = w * 0.07, sy = h / 2;
    const sR = Math.min(w, h) * 0.045;
    const srcPulse = 1 + 0.12 * Math.sin(t * 2.5);
    const sg = ctx.createRadialGradient(sx - sR * 0.3, sy - sR * 0.3, 0, sx, sy, sR * srcPulse);
    sg.addColorStop(0, 'rgba(255,220,120,1)');
    sg.addColorStop(0.4, '#f97316');
    sg.addColorStop(1, 'rgba(180,60,0,0.7)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, sR * srcPulse, 0, Math.PI * 2);
    ctx.fill();

    // particles grid
    const rows = 8, cols = 30;
    const mx = w * 0.15, my = h * 0.12;
    const spanX = w * 0.82, spanY = h * 0.76;
    const baseSpX = spanX / (cols - 1);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const baseX = mx + i * baseSpX;
        const y = my + (spanY / (rows - 1)) * j;
        const disp = Math.sin(i * 0.45 - t * 2.2) * baseSpX * 0.38;
        const x = baseX + disp;
        const isHL = (j === Math.floor(rows / 2) && i === Math.floor(cols * 0.5));
        const density = 0.5 + 0.5 * Math.sin(i * 0.45 - t * 2.2);
        const alpha = 0.35 + density * 0.55;

        if (isHL) {
          const pg = ctx.createRadialGradient(x - 3 * devicePixelRatio, y - 3 * devicePixelRatio, 0, x, y, 7 * devicePixelRatio);
          pg.addColorStop(0, '#a0fff5');
          pg.addColorStop(1, 'rgba(45,212,191,0.4)');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(x, y, 7 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.arc(x, y, 2.8 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${10 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('← teal particle stays in place →', mx + spanX * 0.25, h - 16 * devicePixelRatio);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 3 — Amplitude & Frequency
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-wave');
  let amp = 50, freq = 3, t = 0, osc = null, gain = null, playing = false;

  document.getElementById('amp').addEventListener('input', e => {
    amp = parseFloat(e.target.value);
    document.getElementById('amp-v').textContent = amp;
    if (gain) gain.gain.value = (amp / 100) * 0.2;
  });
  document.getElementById('freq').addEventListener('input', e => {
    freq = parseFloat(e.target.value);
    document.getElementById('freq-v').textContent = freq.toFixed(1);
    if (osc) osc.frequency.value = 120 + freq * 85;
  });

  document.getElementById('wave-play').addEventListener('click', e => {
    const a = ac();
    if (playing) {
      if (osc) { osc.stop(); osc = null; gain = null; }
      playing = false;
      e.target.textContent = '🔊 Play tone';
    } else {
      osc = a.createOscillator();
      gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.value = 120 + freq * 85;
      gain.gain.value = (amp / 100) * 0.2;
      osc.connect(gain); gain.connect(a.destination);
      osc.start();
      playing = true;
      e.target.textContent = '🔇 Stop tone';
    }
  });

  function draw() {
    t += 0.045;
    const w = c.width, h = c.height, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, w, h);

    // axis
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // amplitude guide lines
    const A = (amp / 100) * h * 0.36;
    ctx.strokeStyle = 'rgba(251,191,36,0.12)';
    ctx.setLineDash([6 * devicePixelRatio, 6 * devicePixelRatio]);
    ctx.beginPath(); ctx.moveTo(0, cy - A); ctx.lineTo(w, cy - A); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy + A); ctx.lineTo(w, cy + A); ctx.stroke();
    ctx.setLineDash([]);

    // waveform — multicolor gradient
    const wg = ctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, '#6c8fff');
    wg.addColorStop(0.5, '#fbbf24');
    wg.addColorStop(1, '#f87171');
    ctx.strokeStyle = wg;
    ctx.lineWidth = 3 * devicePixelRatio;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8 * devicePixelRatio;
    ctx.beginPath();
    for (let x = 0; x < w; x += 2) {
      const y = cy + Math.sin((x / w) * Math.PI * 2 * freq * 4 - t * 3) * A;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // labels
    ctx.fillStyle = 'rgba(251,191,36,0.6)';
    ctx.font = `${10 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText(`amplitude = ${amp}`, 10 * devicePixelRatio, cy - A - 8 * devicePixelRatio);
    ctx.fillText(`freq = ${freq.toFixed(1)} Hz`, 10 * devicePixelRatio, 20 * devicePixelRatio);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 4 — Echo (NO reflection if wall < 17 m)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-echo');
  let wallDist = 30, t = 0;
  let pulses = [];
  const statusEl = document.getElementById('echo-status');
  const SOUND_SPEED = 340; // m/s

  document.getElementById('echo-dist').addEventListener('input', e => {
    wallDist = parseFloat(e.target.value);
    document.getElementById('echo-dist-v').textContent = wallDist + ' m';
  });

  document.getElementById('echo-shout').addEventListener('click', () => {
    // play a short burst
    try {
      const a = ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.value = 600;
      o.type = 'sawtooth';
      g.gain.setValueAtTime(0.15, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + 0.15);

      // schedule echo only if >= 17 m
      if (wallDist >= 17) {
        const delay = (wallDist * 2) / SOUND_SPEED;
        setTimeout(() => {
          try {
            const a2 = ac();
            const o2 = a2.createOscillator();
            const g2 = a2.createGain();
            o2.frequency.value = 580;
            o2.type = 'sine';
            g2.gain.setValueAtTime(0.08, a2.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.001, a2.currentTime + 0.12);
            o2.connect(g2); g2.connect(a2.destination);
            o2.start(); o2.stop(a2.currentTime + 0.12);
          } catch(e) {}
        }, delay * 1000);
      }
    } catch(e) {}

    const canEcho = wallDist >= 17;
    pulses.push({
      dist: 0,
      bounced: false,
      canEcho,
      born: t,
      absorbed: false
    });

    if (canEcho) {
      const delay = (wallDist * 2 / SOUND_SPEED).toFixed(2);
      statusEl.textContent = `Echo expected — wall is ${wallDist} m away. Echo arrives in ~${delay} s.`;
    } else {
      statusEl.textContent = `Too close (${wallDist} m < 17 m) — sound hits wall and is absorbed. No distinct echo.`;
    }
  });

  function draw() {
    t += 1/60;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, w, h);

    // ground
    const groundY = h * 0.72;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, groundY, w, h - groundY);

    const srcX = w * 0.1;
    const maxDist = 60;
    const wallX = srcX + (wallDist / maxDist) * (w * 0.82);

    // wall
    const wallH = h * 0.5;
    const wallTop = groundY - wallH;
    ctx.fillStyle = 'rgba(100,120,160,0.25)';
    ctx.fillRect(wallX - 6 * devicePixelRatio, wallTop, 12 * devicePixelRatio, wallH);
    ctx.strokeStyle = 'rgba(150,170,210,0.5)';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(wallX, wallTop);
    ctx.lineTo(wallX, groundY);
    ctx.stroke();
    // brick pattern
    for (let wy = wallTop; wy < groundY; wy += h * 0.06) {
      ctx.strokeStyle = 'rgba(100,120,160,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wallX - 6 * devicePixelRatio, wy); ctx.lineTo(wallX + 6 * devicePixelRatio, wy); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${10 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${wallDist} m`, wallX, groundY + 22 * devicePixelRatio);
    ctx.textAlign = 'left';

    // person (source)
    const py = groundY;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(srcX, py - 18 * devicePixelRatio, 7 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(srcX, py - 11 * devicePixelRatio);
    ctx.lineTo(srcX, py);
    ctx.moveTo(srcX - 8 * devicePixelRatio, py - 6 * devicePixelRatio);
    ctx.lineTo(srcX + 8 * devicePixelRatio, py - 6 * devicePixelRatio);
    ctx.moveTo(srcX, py);
    ctx.lineTo(srcX - 6 * devicePixelRatio, py + 12 * devicePixelRatio);
    ctx.moveTo(srcX, py);
    ctx.lineTo(srcX + 6 * devicePixelRatio, py + 12 * devicePixelRatio);
    ctx.stroke();

    // distance scale
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${9 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillText('17 m threshold', srcX + (17 / maxDist) * (w * 0.82) - 20 * devicePixelRatio, groundY - wallH - 10 * devicePixelRatio);
    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
    ctx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);
    const threshX = srcX + (17 / maxDist) * (w * 0.82);
    ctx.beginPath(); ctx.moveTo(threshX, wallTop - 20 * devicePixelRatio); ctx.lineTo(threshX, groundY); ctx.stroke();
    ctx.setLineDash([]);

    // pulse speed (pixels per second, proportional)
    const pxPerM = (wallX - srcX) / wallDist;
    const pxPerSec = SOUND_SPEED * pxPerM * 0.12; // scaled for visualization

    for (const p of pulses) {
      p.dist += pxPerSec * (1 / 60);

      if (!p.bounced) {
        const px = srcX + p.dist;
        if (px >= wallX) {
          if (p.canEcho) {
            p.bounced = true;
            p.dist = 0;
          } else {
            // absorbed — wall < 17m, no echo
            p.absorbed = true;
          }
        }

        if (!p.absorbed) {
          // draw going pulse
          for (let ring = 0; ring < 3; ring++) {
            const rr = p.dist - ring * 18 * devicePixelRatio;
            if (rr < 0) continue;
            const alpha = Math.max(0, 0.7 - ring * 0.2 - p.dist / (w * 0.8));
            ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
            ctx.lineWidth = (2 - ring * 0.5) * devicePixelRatio;
            ctx.beginPath();
            ctx.arc(srcX, groundY - wallH * 0.4, rr, -1.4, 1.4);
            ctx.stroke();
          }
        } else {
          // absorbed pulse: show at wall, fading fast
          const px2 = Math.min(srcX + p.dist, wallX);
          const alpha = Math.max(0, 0.4 - (p.dist - (wallX - srcX)) / (50 * devicePixelRatio));
          if (alpha > 0) {
            ctx.strokeStyle = `rgba(150,150,150,${alpha})`;
            ctx.lineWidth = 1.5 * devicePixelRatio;
            ctx.beginPath(); ctx.arc(wallX, groundY - wallH * 0.4, 15 * devicePixelRatio, -Math.PI/2, Math.PI/2); ctx.stroke();
          }
        }
      } else {
        // bounced echo traveling back
        const ex = wallX - p.dist;
        for (let ring = 0; ring < 3; ring++) {
          const rr = p.dist - ring * 18 * devicePixelRatio;
          if (rr < 0) continue;
          const alpha = Math.max(0, 0.5 - ring * 0.15 - p.dist / (wallX - srcX));
          ctx.strokeStyle = `rgba(45,212,191,${alpha})`;
          ctx.lineWidth = (1.8 - ring * 0.4) * devicePixelRatio;
          ctx.beginPath();
          ctx.arc(wallX, groundY - wallH * 0.4, rr, Math.PI - 1.4, Math.PI + 1.4);
          ctx.stroke();
        }
        if (ex < srcX) p.absorbed = true;
      }
    }

    pulses = pulses.filter(p => !p.absorbed || (p.bounced && wallX - p.dist > srcX - 20));

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 5 — Human Ear
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-ear');
  let progress = -1;
  const statusEl = document.getElementById('ear-status');
  const STAGES = [
    'Outer ear (pinna) funnels sound into the ear canal',
    'Sound hits the eardrum — it vibrates at the wave\'s frequency',
    'Three ossicles (malleus → incus → stapes) amplify the vibration ×20',
    'Stapes pushes on the oval window of the cochlea',
    'Cochlea converts vibration into electrical nerve signals',
    'Auditory nerve fires signals to the brain — you hear sound! 🧠'
  ];

  document.getElementById('ear-send').addEventListener('click', () => {
    progress = 0;
    statusEl.textContent = STAGES[0];
  });

  let t = 0;
  function draw() {
    t += 1 / 60;
    if (progress >= 0) progress += 0.007;
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5, cy = h * 0.5;
    const scale = Math.min(w, h);

    // ── Outer ear (pinna) ──
    ctx.strokeStyle = 'rgba(230,200,170,0.7)';
    ctx.lineWidth = 4 * devicePixelRatio;
    ctx.beginPath();
    ctx.ellipse(w * 0.1, cy, scale * 0.06, scale * 0.16, 0.2, 0.3, Math.PI * 1.8);
    ctx.stroke();
    ctx.font = `${9 * devicePixelRatio}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('pinna', w * 0.1, cy + scale * 0.22);

    // ── Canal ──
    ctx.strokeStyle = 'rgba(230,200,170,0.4)';
    ctx.lineWidth = 10 * devicePixelRatio;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.14, cy);
    ctx.lineTo(w * 0.34, cy);
    ctx.stroke();
    ctx.fillText('ear canal', w * 0.24, cy + scale * 0.13);

    // ── Eardrum ──
    ctx.strokeStyle = progress >= 0 && progress < 0.25 ? '#fbbf24' : 'rgba(251,191,36,0.7)';
    ctx.lineWidth = 4 * devicePixelRatio;
    const edX = w * 0.34;
    const edWob = progress >= 0 && progress < 0.25 ? Math.sin(t * 40) * 3 * devicePixelRatio : 0;
    ctx.beginPath();
    ctx.moveTo(edX + edWob, cy - scale * 0.1);
    ctx.quadraticCurveTo(edX + edWob * 2, cy, edX + edWob, cy + scale * 0.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(251,191,36,0.6)';
    ctx.fillText('eardrum', edX, cy - scale * 0.13);

    // ── Ossicles (zig-zag) ──
    const ossColor = progress >= 0.2 && progress < 0.5 ? '#a78bfa' : 'rgba(167,139,250,0.6)';
    ctx.strokeStyle = ossColor;
    ctx.lineWidth = 4 * devicePixelRatio;
    ctx.lineCap = 'round';
    const pts = [
      [w * 0.36, cy],
      [w * 0.43, cy - scale * 0.09],
      [w * 0.49, cy + scale * 0.07],
      [w * 0.55, cy - scale * 0.05],
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    // circles at joints
    for (const pt of pts) {
      ctx.fillStyle = ossColor;
      ctx.beginPath(); ctx.arc(pt[0], pt[1], 4 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(167,139,250,0.6)';
    ctx.fillText('ossicles (×20)', w * 0.42, cy + scale * 0.14);

    // ── Cochlea (spiral) ──
    const ccX = w * 0.72, ccY = cy;
    const cochColor = progress >= 0.5 && progress < 0.82 ? '#2dd4bf' : 'rgba(45,212,191,0.6)';
    ctx.strokeStyle = cochColor;
    ctx.lineWidth = 3 * devicePixelRatio;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5.5; a += 0.08) {
      const rr = scale * 0.075 * (1 - a / (Math.PI * 6));
      const px = ccX + Math.cos(a - Math.PI * 0.5) * rr;
      const py = ccY + Math.sin(a - Math.PI * 0.5) * rr;
      a < 0.08 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    // connect to oval window
    ctx.lineTo(w * 0.57, cy);
    ctx.stroke();
    ctx.fillStyle = 'rgba(45,212,191,0.6)';
    ctx.fillText('cochlea', ccX - 10 * devicePixelRatio, cy + scale * 0.14);

    // ── Auditory nerve ──
    const nerveColor = progress >= 0.82 ? '#f87171' : 'rgba(248,113,113,0.35)';
    ctx.strokeStyle = nerveColor;
    ctx.lineWidth = 3 * devicePixelRatio;
    ctx.setLineDash([5 * devicePixelRatio, 4 * devicePixelRatio]);
    ctx.beginPath();
    ctx.moveTo(ccX + 8 * devicePixelRatio, ccY);
    ctx.bezierCurveTo(w * 0.82, cy - scale * 0.05, w * 0.88, cy + scale * 0.08, w * 0.93, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = nerveColor;
    ctx.fillText('nerve → brain', w * 0.82, cy - scale * 0.12);

    // ── Brain icon ──
    if (progress >= 0.85) {
      const bAlpha = Math.min(1, (progress - 0.85) * 10);
      const bg = ctx.createRadialGradient(w * 0.93, cy, 0, w * 0.93, cy, scale * 0.07);
      bg.addColorStop(0, `rgba(248,113,113,${bAlpha * 0.6})`);
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(w * 0.93, cy, scale * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${bAlpha})`;
      ctx.font = `${scale * 0.055}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🧠', w * 0.93, cy + scale * 0.02);
    }

    // ── Traveling pulse ──
    if (progress >= 0 && progress < 1) {
      const waypoints = [
        [w * 0.14, cy],
        [w * 0.34, cy],
        [pts[0][0], pts[0][1]],
        [pts[3][0], pts[3][1]],
        [w * 0.57, cy],
        [ccX, ccY],
        [w * 0.93, cy],
      ];
      const seg = Math.min(Math.floor(progress * (waypoints.length - 1)), waypoints.length - 2);
      const local = (progress * (waypoints.length - 1)) - seg;
      const p0 = waypoints[seg], p1 = waypoints[seg + 1];
      const px = p0[0] + (p1[0] - p0[0]) * local;
      const py = p0[1] + (p1[1] - p0[1]) * local;

      const pg = ctx.createRadialGradient(px, py, 0, px, py, 10 * devicePixelRatio);
      pg.addColorStop(0, 'rgba(255,255,200,1)');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px, py, 10 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();

      const stageIdx = Math.min(Math.floor(progress * STAGES.length), STAGES.length - 1);
      statusEl.textContent = STAGES[stageIdx];
    }

    if (progress >= 1) {
      progress = -1;
      statusEl.textContent = '✅ Sound fully perceived. Click to trace again.';
    }

    ctx.textAlign = 'left';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
