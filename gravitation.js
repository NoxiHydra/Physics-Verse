/* ==========================================================
   PhysicsVerse — Gravitation Simulations
   Full 3D canvas with realistic procedural textures
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

/* ── 3D sphere with procedural texture ── */
function draw3DSphere(ctx, cx, cy, radius, opts = {}) {
  const { baseColor = '#4488ff', lightAngle = -0.6, lightElev = 0.7,
          bands = [], craters = [], rings = false, atmosphere = null, cloudOffset = 0 } = opts;

  // Base sphere clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Main gradient (day/night)
  const lx = cx + Math.cos(lightAngle) * radius * lightElev;
  const ly = cy - Math.sin(lightElev) * radius * lightElev;
  const g = ctx.createRadialGradient(lx, ly, 0, cx, cy, radius * 1.15);
  g.addColorStop(0, lightenColor(baseColor, 60));
  g.addColorStop(0.4, baseColor);
  g.addColorStop(0.85, darkenColor(baseColor, 50));
  g.addColorStop(1, darkenColor(baseColor, 80));
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Color bands (Jupiter/Saturn style)
  for (const b of bands) {
    const by = cy + b.y * radius;
    const bh = b.h * radius;
    if (by - bh > cy + radius || by + bh < cy - radius) continue;
    ctx.fillStyle = `rgba(${b.r},${b.g},${b.b},${b.a})`;
    ctx.fillRect(cx - radius, by - bh, radius * 2, bh * 2);
  }

  // Craters (Moon style)
  for (const cr of craters) {
    const crx = cx + cr.x * radius;
    const cry = cy + cr.y * radius;
    const crr = cr.r * radius;
    const cg = ctx.createRadialGradient(crx, cry, 0, crx, cry, crr);
    cg.addColorStop(0, 'rgba(0,0,0,0.35)');
    cg.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    cg.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(crx, cry, crr, crr * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Atmosphere/clouds
  if (atmosphere) {
    const co = cloudOffset;
    for (let i = 0; i < 5; i++) {
      const ca = (co + i * 1.3) % (Math.PI * 2);
      const cx2 = cx + Math.cos(ca) * radius * 0.5;
      const cy2 = cy + Math.sin(ca * 0.4) * radius * 0.3;
      const cg2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, radius * 0.38);
      cg2.addColorStop(0, `rgba(255,255,255,0.18)`);
      cg2.addColorStop(1, 'transparent');
      ctx.fillStyle = cg2;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }

  // Terminator shadow
  const shadowGrad = ctx.createLinearGradient(
    cx + Math.cos(lightAngle + Math.PI) * radius * 0.3, cy,
    cx + Math.cos(lightAngle) * radius * 0.5, cy
  );
  shadowGrad.addColorStop(0, 'rgba(0,0,20,0.7)');
  shadowGrad.addColorStop(0.5, 'rgba(0,0,10,0.2)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Specular highlight
  const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 0.5);
  spec.addColorStop(0, 'rgba(255,255,255,0.25)');
  spec.addColorStop(1, 'transparent');
  ctx.fillStyle = spec;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();

  // Saturn rings (outside clip)
  if (rings) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let ri = 1.4; ri < 2.2; ri += 0.18) {
      const ringColor = ri < 1.7 ? 'rgba(200,170,130,' : 'rgba(220,190,150,';
      ctx.strokeStyle = ringColor + (0.5 - (ri - 1.4) * 0.3) + ')';
      ctx.lineWidth = radius * 0.12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * ri, radius * ri * 0.28, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Atmosphere glow
  const atmoGrad = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.22);
  atmoGrad.addColorStop(0, opts.atmoColor || 'rgba(100,140,255,0.18)');
  atmoGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = atmoGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
  ctx.fill();
}

function lightenColor(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darkenColor(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

/* ============================================================
   SIM 1 — Solar System Orbits (3D planets, draggable)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-orbit');
  let speed = 1, paused = false, showTrails = true, t = 0;
  let dragIdx = -1, cloudT = 0;

  const PLANETS = [
    { name:'Mercury', a:.12, b:.09, period:.24, color:'#a89b8c', r:3.5, trail:[], bands:[], craters:[{x:.3,y:-.2,r:.28},{x:-.4,y:.3,r:.2},{x:.1,y:.4,r:.15}], atmoColor:'rgba(180,160,140,0.1)' },
    { name:'Venus',   a:.20, b:.15, period:.62, color:'#c8a96e', r:4.8, trail:[], bands:[{r:210,g:180,b:120,a:.25,y:-.3,h:.15}], atmosphere:true, atmoColor:'rgba(220,180,100,0.2)' },
    { name:'Earth',   a:.29, b:.23, period:1.0, color:'#2a6fa8', r:5.2, trail:[], bands:[{r:60,g:160,b:90,a:.45,y:.2,h:.18},{r:60,g:160,b:90,a:.35,y:-.25,h:.12}], atmosphere:true, atmoColor:'rgba(80,160,255,0.22)' },
    { name:'Mars',    a:.38, b:.30, period:1.88,color:'#b5472a', r:3.8, trail:[], craters:[{x:.2,y:-.3,r:.22},{x:-.3,y:.2,r:.18}], atmoColor:'rgba(200,80,30,0.1)' },
    { name:'Jupiter', a:.48, b:.38, period:4.5, color:'#c9956c', r:8.5, trail:[], bands:[{r:195,g:140,b:90,a:.5,y:0,h:.09},{r:220,g:190,b:150,a:.4,y:.18,h:.08},{r:185,g:120,b:70,a:.5,y:-.18,h:.07},{r:200,g:160,b:110,a:.35,y:.32,h:.06}], atmoColor:'rgba(200,150,100,0.15)' },
  ];

  const orbitReadout = document.getElementById('orbit-readout');

  document.getElementById('orbit-spd').addEventListener('input', e=>{
    speed = parseFloat(e.target.value);
    document.getElementById('orbit-spd-v').textContent = speed.toFixed(1)+'×';
  });
  document.getElementById('orbit-pause').addEventListener('click', e=>{
    paused=!paused; e.target.textContent = paused?'▶ Resume':'⏸ Pause';
  });
  document.getElementById('orbit-trails').addEventListener('click', e=>{
    showTrails=!showTrails;
    PLANETS.forEach(p=>p.trail=[]);
    e.target.textContent = 'Trails: '+(showTrails?'ON':'OFF');
  });

  // Drag
  function ptToRel(e) {
    const rect = c.getBoundingClientRect();
    return { x:(e.clientX-rect.left)/rect.width, y:(e.clientY-rect.top)/rect.height };
  }
  c.addEventListener('pointerdown', e=>{
    const pt = ptToRel(e);
    const w=c.width,h=c.height;
    const cx=w/2,cy=h/2,sc=Math.min(w,h);
    PLANETS.forEach((p,i)=>{
      const a=t/p.period*Math.PI*2;
      const px=(cx+Math.cos(a)*p.a*sc)/w, py=(cy+Math.sin(a)*p.b*sc)/h;
      if(Math.hypot(pt.x-px,pt.y-py)<0.05){ dragIdx=i; }
    });
  });
  window.addEventListener('pointermove', e=>{
    if(dragIdx<0) return;
    const pt=ptToRel(e);
    const w=c.width,h=c.height,sc=Math.min(w,h);
    const cx=w/2,cy=h/2;
    const dx=(pt.x*w-cx)/sc, dy=(pt.y*h-cy)/sc;
    const r=Math.hypot(dx,dy);
    const p=PLANETS[dragIdx];
    p.a=Math.max(.07,Math.min(.52,r));
    p.b=p.a*.78;
    p.period=Math.pow(p.a,1.5)*4;
    orbitReadout.innerHTML=`<span>Dragging <b>${p.name}</b> · radius <b>${(p.a*100).toFixed(0)}</b> · period <b>${p.period.toFixed(2)} yr</b></span>`;
  });
  window.addEventListener('pointerup',()=>{ dragIdx=-1; });

  function drawSun(cx,cy,r){
    // animated glow
    const pulse = 1+0.05*Math.sin(t*3);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r*5*pulse);
    g.addColorStop(0,'rgba(255,240,160,1)');
    g.addColorStop(0.15,'rgba(255,180,40,0.8)');
    g.addColorStop(0.4,'rgba(255,120,20,0.25)');
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r*5*pulse,0,Math.PI*2);ctx.fill();
    draw3DSphere(ctx,cx,cy,r,{baseColor:'#e8a020',lightAngle:0.8,lightElev:0.8,atmoColor:'rgba(255,160,30,0.35)'});
  }

  function draw(){
    if(!paused){t+=.006*speed; cloudT+=.003*speed;}
    const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    // deep space bg
    const bg=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.7);
    bg.addColorStop(0,'#08101e');bg.addColorStop(1,'#030408');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // stars
    if(!draw.stars){
      draw.stars=[];
      for(let i=0;i<180;i++) draw.stars.push({x:Math.random(),y:Math.random(),s:Math.random()*1.2+.2,a:Math.random()*.7+.3});
    }
    for(const s of draw.stars){
      ctx.globalAlpha=s.a;
      ctx.fillStyle='#e8eeff';
      ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.s*devicePixelRatio,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    const cx=w/2,cy=h/2,sc=Math.min(w,h);
    drawSun(cx,cy,sc*.035);

    for(const p of PLANETS){
      const rx=p.a*sc,ry=p.b*sc;
      // orbit path
      ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
      ctx.setLineDash([3,6]);
      ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);

      const a=t/p.period*Math.PI*2;
      const px=cx+Math.cos(a)*rx, py=cy+Math.sin(a)*ry;

      if(showTrails){
        p.trail.push({x:px,y:py});
        if(p.trail.length>80)p.trail.shift();
        for(let i=0;i<p.trail.length-1;i++){
          ctx.strokeStyle=`rgba(255,255,255,${(i/p.trail.length)*.2})`;
          ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(p.trail[i].x,p.trail[i].y);ctx.lineTo(p.trail[i+1].x,p.trail[i+1].y);ctx.stroke();
        }
      }

      draw3DSphere(ctx,px,py,p.r*devicePixelRatio,{
        baseColor:p.color, bands:p.bands||[], craters:p.craters||[],
        atmosphere:p.atmosphere, cloudOffset:cloudT*(1/p.period),
        rings:p.name==='Jupiter'?false:false, // Saturn not in list here
        atmoColor:p.atmoColor
      });
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 2 — Free Fall (3D Earth, 3D objects)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-fall');
  let airOn=true, dropping=false, elapsed=0;
  const OBJ=[
    {label:'Stone',  color:'#8899bb', drag:.015, x:.25, y:0, vy:0, shape:'sphere'},
    {label:'Feather',color:'#ffe08a', drag:.65,  x:.50, y:0, vy:0, shape:'feather'},
    {label:'Ball',   color:'#e06040', drag:.08,  x:.75, y:0, vy:0, shape:'sphere'},
  ];

  document.getElementById('fall-drop').addEventListener('click',()=>{
    OBJ.forEach(o=>{o.y=0;o.vy=0;});elapsed=0;dropping=true;
  });
  document.getElementById('fall-air').addEventListener('click',e=>{
    airOn=!airOn;e.target.textContent='Air: '+(airOn?'ON':'OFF');
  });

  function drawEarth(cx,cy,r){
    draw3DSphere(ctx,cx,cy,r,{
      baseColor:'#1a4a7a',
      bands:[{r:34,g:120,b:60,a:.6,y:.1,h:.22},{r:34,g:120,b:60,a:.5,y:-.2,h:.15}],
      atmosphere:true, cloudOffset:0,
      atmoColor:'rgba(60,140,255,0.28)'
    });
  }

  function drawFeather(x,y,s){
    ctx.save();ctx.translate(x,y);
    ctx.strokeStyle=OBJ[1].color;ctx.lineWidth=1.5*devicePixelRatio;
    ctx.beginPath();ctx.moveTo(0,-s);ctx.bezierCurveTo(s*.4,-s*.5,s*.3,s*.2,0,s*.5);ctx.stroke();
    for(let i=-.7;i<.7;i+=.2){
      ctx.beginPath();ctx.moveTo(0,i*s);ctx.lineTo(s*.5,i*s+s*.1);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,i*s);ctx.lineTo(-s*.5,i*s+s*.1);ctx.stroke();
    }
    ctx.restore();
  }

  function draw(){
    const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#03040a';ctx.fillRect(0,0,w,h);

    // stars
    if(!draw.st){draw.st=[];for(let i=0;i<80;i++)draw.st.push({x:Math.random(),y:Math.random(),s:Math.random()*.8+.2});}
    ctx.fillStyle='rgba(200,210,255,0.5)';
    for(const s of draw.st){ctx.beginPath();ctx.arc(s.x*w,s.y*.5*h,s.s*devicePixelRatio,0,Math.PI*2);ctx.fill();}

    // Earth at bottom
    const eR = w*.12;
    drawEarth(w/2, h+eR*.6, eR);

    // Ground line
    const groundY = h*.88;
    const gGrad=ctx.createLinearGradient(0,groundY-4,0,groundY+4);
    gGrad.addColorStop(0,'rgba(60,140,255,0.6)');gGrad.addColorStop(1,'transparent');
    ctx.fillStyle=gGrad;ctx.fillRect(0,groundY-4,w,8);

    if(dropping){
      elapsed+=1/60;
      OBJ.forEach(o=>{
        const drag=airOn?o.drag:0;
        o.vy += (9.8 - o.vy*drag)*(1/60)*22;
        o.vy=Math.max(0,o.vy);
        o.y += o.vy*(1/60)*2.8*devicePixelRatio;
        const floor=groundY-16*devicePixelRatio;
        if(o.y>=floor){o.y=floor;}
      });
      document.getElementById('fall-t').textContent=elapsed.toFixed(2)+' s';
      if(OBJ.every(o=>o.y>=groundY-16*devicePixelRatio))dropping=false;
    }

    OBJ.forEach(o=>{
      const px=w*o.x, py=28*devicePixelRatio+o.y;
      if(o.shape==='sphere'){
        draw3DSphere(ctx,px,py,12*devicePixelRatio,{baseColor:o.color,atmoColor:'transparent'});
      } else {
        drawFeather(px,py,14*devicePixelRatio);
      }
      ctx.fillStyle='rgba(255,255,255,0.55)';
      ctx.font=`${10*devicePixelRatio}px 'JetBrains Mono',monospace`;
      ctx.textAlign='center';
      ctx.fillText(o.label,px,py+28*devicePixelRatio);
    });
    ctx.textAlign='left';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 3 — Two Masses (draggable glowing 3D spheres)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-masses');
  let mA=5,mB=7;
  let posA={x:.3,y:.5},posB={x:.7,y:.5};
  let dragging=null;

  document.getElementById('mA').addEventListener('input',e=>{mA=parseFloat(e.target.value);document.getElementById('mA-v').textContent=mA;});
  document.getElementById('mB').addEventListener('input',e=>{mB=parseFloat(e.target.value);document.getElementById('mB-v').textContent=mB;});

  function getXY(e){
    const r=c.getBoundingClientRect();
    return {x:Math.min(Math.max((e.clientX-r.left)/r.width,.06),.94),y:Math.min(Math.max((e.clientY-r.top)/r.height,.08),.92)};
  }
  c.addEventListener('pointerdown',e=>{
    const p=getXY(e);
    const da=Math.hypot(p.x-posA.x,p.y-posA.y);
    const db=Math.hypot(p.x-posB.x,p.y-posB.y);
    if(da<.1&&da<db)dragging='A'; else if(db<.1)dragging='B';
  });
  window.addEventListener('pointermove',e=>{if(dragging){const p=getXY(e);if(dragging==='A')posA=p;else posB=p;}});
  window.addEventListener('pointerup',()=>dragging=null);

  let t=0;
  function draw(){
    t+=.016;
    const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#030408';ctx.fillRect(0,0,w,h);

    const ax=posA.x*w,ay=posA.y*h,bx=posB.x*w,by=posB.y*h;
    const dist=Math.hypot(bx-ax,by-ay);
    const dUnit=dist/(Math.min(w,h)*.5);
    const F=(mA*mB)/Math.max(dUnit*dUnit,.01);
    const alpha=Math.min(0.9,0.15+F*.08);
    const lw=Math.min(16,Math.max(1.5,F*.5))*devicePixelRatio;

    // force beam
    const beamGrad=ctx.createLinearGradient(ax,ay,bx,by);
    beamGrad.addColorStop(0,`rgba(108,143,255,${alpha})`);
    beamGrad.addColorStop(.5,`rgba(167,139,250,${alpha*1.2})`);
    beamGrad.addColorStop(1,`rgba(108,143,255,${alpha})`);
    ctx.strokeStyle=beamGrad;ctx.lineWidth=lw;
    ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();

    // arrows
    function drawArrow(fromX,fromY,toX,toY){
      const a=Math.atan2(toY-fromY,toX-fromX);
      const len=Math.min(dist*.18,35*devicePixelRatio);
      const ex=fromX+Math.cos(a)*len,ey=fromY+Math.sin(a)*len;
      ctx.strokeStyle=`rgba(255,255,255,${alpha*1.2})`;ctx.lineWidth=2.5*devicePixelRatio;
      ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.fillStyle=`rgba(255,255,255,${alpha*1.2})`;
      ctx.beginPath();ctx.moveTo(ex,ey);
      ctx.lineTo(ex-Math.cos(a-.4)*8*devicePixelRatio,ey-Math.sin(a-.4)*8*devicePixelRatio);
      ctx.lineTo(ex-Math.cos(a+.4)*8*devicePixelRatio,ey-Math.sin(a+.4)*8*devicePixelRatio);
      ctx.closePath();ctx.fill();
    }
    const edgeA=(mA/12)*22+10;const edgeB=(mB/12)*22+10;
    const dx=(bx-ax)/dist,dy=(by-ay)/dist;
    drawArrow(ax+dx*edgeA*devicePixelRatio,ay+dy*edgeA*devicePixelRatio,bx,by);
    drawArrow(bx-dx*edgeB*devicePixelRatio,by-dy*edgeB*devicePixelRatio,ax,ay);

    const rA=(10+mA*2.2)*devicePixelRatio;
    const rB=(10+mB*2.2)*devicePixelRatio;
    draw3DSphere(ctx,ax,ay,rA,{baseColor:'#3050c0',atmoColor:'rgba(108,143,255,0.3)'});
    draw3DSphere(ctx,bx,by,rB,{baseColor:'#a06020',atmoColor:'rgba(251,191,36,0.3)'});

    ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.font=`bold ${11*devicePixelRatio}px 'JetBrains Mono',monospace`;
    ctx.textAlign='center';
    ctx.fillText('A',ax,ay+4*devicePixelRatio);
    ctx.fillText('B',bx,by+4*devicePixelRatio);
    ctx.textAlign='left';

    document.getElementById('m-force').textContent=F.toFixed(2)+' units';
    document.getElementById('m-dist').textContent=dUnit.toFixed(2)+' units';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 4 — Satellite (3D Earth, realistic orbital physics)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-sat');
  let launchSpeed=6.5,sat=null,trail=[];
  const statusEl=document.getElementById('sat-status');
  let cloudT=0;

  document.getElementById('sat-spd').addEventListener('input',e=>{
    launchSpeed=parseFloat(e.target.value);
    document.getElementById('sat-spd-v').textContent=launchSpeed.toFixed(1);
  });
  document.getElementById('sat-launch').addEventListener('click',()=>{
    const w=c.width,h=c.height,cx=w/2,cy=h/2;
    const orbitR=Math.min(w,h)*.24;
    sat={x:cx,y:cy-orbitR,vx:launchSpeed*devicePixelRatio*.32,vy:0};
    trail=[];
  });
  document.getElementById('sat-reset').addEventListener('click',()=>{sat=null;trail=[];statusEl.textContent='Set speed and launch.';});

  function draw(){
    cloudT+=.004;
    const w=c.width,h=c.height,cx=w/2,cy=h/2;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#030408';ctx.fillRect(0,0,w,h);
    if(!draw.st){draw.st=[];for(let i=0;i<200;i++)draw.st.push({x:Math.random(),y:Math.random(),s:Math.random()*1.3+.3,a:Math.random()*.8+.2});}
    for(const s of draw.st){ctx.globalAlpha=s.a;ctx.fillStyle='#ccd6ff';ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.s*devicePixelRatio,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;

    const eR=Math.min(w,h)*.13;
    draw3DSphere(ctx,cx,cy,eR,{baseColor:'#1a4a7a',bands:[{r:34,g:120,b:60,a:.6,y:.15,h:.2},{r:34,g:120,b:60,a:.5,y:-.2,h:.14}],atmosphere:true,cloudOffset:cloudT,atmoColor:'rgba(60,150,255,0.28)'});

    if(sat){
      const dx=cx-sat.x,dy=cy-sat.y;
      const r=Math.hypot(dx,dy)||1;
      const GM=1100;
      const a=GM/(r*r);
      sat.vx+=(dx/r)*a*(1/60);
      sat.vy+=(dy/r)*a*(1/60);
      sat.x+=sat.vx*(1/60)*3.6;
      sat.y+=sat.vy*(1/60)*3.6;

      trail.push({x:sat.x,y:sat.y});
      if(trail.length>300)trail.shift();

      if(r<eR+4*devicePixelRatio){sat=null;statusEl.textContent='💥 Crashed into Earth — speed was too low.';return;}
      if(r>Math.min(w,h)*.6){sat=null;statusEl.textContent='🚀 Escaped — speed was too high!';return;}

      const speed=Math.hypot(sat.vx,sat.vy);
      statusEl.textContent=`Orbiting · speed: ${speed.toFixed(1)} · alt: ${((r-eR)/devicePixelRatio).toFixed(0)}px`;

      for(let i=1;i<trail.length;i++){
        const p=(i/trail.length);
        ctx.strokeStyle=`rgba(108,200,255,${p*.7})`;
        ctx.lineWidth=(1+p)*devicePixelRatio;
        ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();
      }

      if(sat){
        // satellite body
        ctx.save();ctx.translate(sat.x,sat.y);
        const angle=Math.atan2(sat.vy,sat.vx)+Math.PI/2;
        ctx.rotate(angle);
        ctx.fillStyle='#c0c8e0';
        ctx.fillRect(-5*devicePixelRatio,-3*devicePixelRatio,10*devicePixelRatio,6*devicePixelRatio);
        ctx.fillStyle='rgba(100,160,255,0.8)';
        ctx.fillRect(-14*devicePixelRatio,-1.5*devicePixelRatio,8*devicePixelRatio,3*devicePixelRatio);
        ctx.fillRect(6*devicePixelRatio,-1.5*devicePixelRatio,8*devicePixelRatio,3*devicePixelRatio);
        ctx.restore();
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   SIM 5 — Spacetime Fabric (3D warp grid + orbiter)
   ============================================================ */
(function(){
  const { c, ctx } = mkCanvas('c-fabric');
  let mass=55;
  let heavy={x:.5,y:.5};
  let dragging=false,orbAngle=0;

  document.getElementById('fab-mass').addEventListener('input',e=>{mass=parseFloat(e.target.value);document.getElementById('fab-mass-v').textContent=mass;});

  const stage=document.getElementById('stage-fabric');
  stage.addEventListener('pointerdown',()=>dragging=true);
  window.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const r=c.getBoundingClientRect();
    heavy={x:Math.min(.88,Math.max(.12,(e.clientX-r.left)/r.width)),y:Math.min(.85,Math.max(.15,(e.clientY-r.top)/r.height))};
  });
  window.addEventListener('pointerup',()=>dragging=false);

  function warp(px,py,hx,hy,w,h){
    const d=Math.hypot(px-hx,py-hy);
    const f=Math.min(w,h)*.30;
    return mass*1.1/(1+(d/f)*(d/f));
  }

  let t=0;
  function draw(){
    t+=.018;orbAngle+=.018;
    const w=c.width,h=c.height,hx=heavy.x*w,hy=heavy.y*h;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#020308';ctx.fillRect(0,0,w,h);

    const cols=22,rows=17;
    const sx=w/cols,sy=h/rows;

    // vertical lines
    for(let i=0;i<=cols;i++){
      ctx.beginPath();
      let first=true;
      for(let j=0;j<=rows;j++){
        const px=i*sx,py=j*sy;
        const d=warp(px,py,hx,hy,w,h);
        const nx=px,ny=py+d;
        if(first){ctx.moveTo(nx,ny);first=false;}else ctx.lineTo(nx,ny);
      }
      const distFromH=Math.abs(i*sx-hx)/(w*.5);
      ctx.strokeStyle=`rgba(108,143,255,${Math.max(.08,.22-distFromH*.1)})`;
      ctx.lineWidth=.8*devicePixelRatio;ctx.stroke();
    }
    // horizontal lines
    for(let j=0;j<=rows;j++){
      ctx.beginPath();let first=true;
      for(let i=0;i<=cols;i++){
        const px=i*sx,py=j*sy;
        const d=warp(px,py,hx,hy,w,h);
        const nx=px,ny=py+d;
        if(first){ctx.moveTo(nx,ny);first=false;}else ctx.lineTo(nx,ny);
      }
      const distFromH=Math.abs(j*sy-hy)/(h*.5);
      ctx.strokeStyle=`rgba(108,143,255,${Math.max(.08,.22-distFromH*.08)})`;
      ctx.lineWidth=.8*devicePixelRatio;ctx.stroke();
    }

    // orbiting small body
    const orbitRx=Math.min(w,h)*.27,orbitRy=orbitRx*.45;
    const ox=hx+Math.cos(orbAngle)*orbitRx;
    const oy=hy+Math.sin(orbAngle)*orbitRy;
    const od=warp(ox,oy,hx,hy,w,h);
    draw3DSphere(ctx,ox,oy+od,6*devicePixelRatio,{baseColor:'#2dd4bf',atmoColor:'rgba(45,212,191,0.3)'});

    // heavy mass
    const hd=warp(hx,hy,hx,hy,w,h);
    const hR=(14+mass*.38)*devicePixelRatio;
    draw3DSphere(ctx,hx,hy+hd,hR,{baseColor:'#c8a060',bands:[{r:180,g:140,b:80,a:.5,y:0,h:.08},{r:200,g:160,b:100,a:.4,y:.2,h:.07}],atmoColor:'rgba(220,180,100,0.25)'});

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
