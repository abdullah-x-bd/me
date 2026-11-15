(() => {
  "use strict";
  /*
   * Living Field: an autonomous generative sculpture about emergence.
   * Different collective states continually form and dissolve. Hover wakes
   * a local bloom and sends a persistent signal through the wider organism.
   * This is an abstract artwork, not a visualization of experimental data.
   *
   * Intentionally no buttons, clicking, controls, nodes or orbital object.
   */
  const canvas = document.getElementById("emergence-field");
  if (!canvas) return;
  const stage = canvas.closest(".emergence-stage");
  const ctx = canvas.getContext("2d", {alpha:true});
  if (!stage || !ctx) return;

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = (v) => {const x=clamp(v,0,1);return x*x*(3-2*x);};
  const rgba = (rgb,a) => "rgba("+rgb.join(",")+","+clamp(a,0,1).toFixed(3)+")";
  const pulses = [];

  let w=0,h=0,dpr=1,visible=true,raf=0,last=0,elapsed=.65;
  let lastDraw=0, frameDelta=0, particles=[];
  let nextIdlePulse=3.4, lastMousePulse=-10, paletteKey="", palette=null;
  const presence = {
    active:false, tx:0, ty:0, x:0, y:0,
    strength:0, target:0, afterglow:0, lastX:0, lastY:0
  };

  function seedRandom(s) {
    return () => {
      s=(Math.imul(s,1664525)+1013904223)>>>0;
      return s/4294967296;
    };
  }

  function makeParticles() {
    const random=seedRandom(729014);
    const count=Math.round(clamp(w*1.05,780,1380));
    const out=[];
    for(let i=0;i<count;i++){
      const p={
        u:((i*.618033988749895+.31)%1)*2-1,
        v:random()*2-1,
        local:random()*2-1,
        id:i,
        lane:i%5,
        phase:random()*TAU,
        seed:random(),
        accent:random(),
        motile:random(),
        size:2.1+random()*4.4,
        x:0,y:0,px:0,py:0,a:0,
        intensity:0
      };
      const at=basePosition(p,elapsed);
      p.x=at.x;p.y=at.y;p.a=at.a;
      out.push(p);
    }
    return out;
  }

  function paletteColors() {
    const theme=document.documentElement.dataset.theme==="dark"?"dark":"light";
    if(paletteKey===theme && palette)return palette;
    paletteKey=theme;
    palette=theme==="dark"
      ? {
          main:[176,229,187],inner:[112,182,141],warm:[246,187,111],
          mist:[123,183,142], wash:[42,104,72],
          mainAlpha:.76, glow:.17
        }
      : {
          main:[35,83,55],inner:[72,132,88],warm:[167,110,52],
          mist:[92,153,113], wash:[105,163,118],
          mainAlpha:.81, glow:.10
        };
    return palette;
  }

  function collective(t) {
    const cycle=t/8.3;
    const idx=Math.floor(cycle)%4;
    const progress=(cycle%1+1)%1;
    // Continuous transformation with no long static holds.
    const blend=smooth((progress-.11)/.76);
    return {index:idx,next:(idx+1)%4,blend};
  }

  function form(p,kind,t) {
    const u=p.u,v=p.v,lane=p.lane,phase=p.phase;
    const breath=1+.034*Math.sin(t*.93+u*5.1+phase*.11);
    if(kind===0){
      // A living membrane with several broad chambers, never a grid.
      const lobes=.23+.20*Math.pow(Math.cos(u*Math.PI*2.4+t*.23),2);
      const center=.09*Math.sin(u*7.0-t*.50)+.045*Math.sin(u*13+t*.38);
      return {x:u*.93+.022*Math.sin(t*.45+phase), y:(center+v*lobes)*breath,a:.12*Math.cos(u*7-t*.5)};
    }
    if(kind===1){
      // Five communicating colonies gather into visible islands.
      const laneId=p.id%5;
      const centerX=-.79+laneId*.395+.035*Math.sin(t*.33+laneId*1.4);
      const centerY=.22*Math.sin(laneId*1.5+t*.42);
      return {
        x:centerX+p.local*.165+.018*Math.sin(phase+t*.8),
        y:centerY+v*(.22+.06*Math.sin(laneId+t*.36)) + .018*Math.cos(phase-t*.6),
        a:.53*Math.sin(phase+t*.4)
      };
    }
    if(kind===2){
      // Coordinated streams convey collective directional movement.
      const stream=lane%4;
      const y=.29*Math.sin(u*5.5+stream*TAU/4-t*.66)
        + .054*v + .028*Math.sin(u*16+phase+t*.48);
      return {x:u*.93+.02*Math.cos(phase+t*.52),y,a:.64*Math.cos(u*5.5+stream*TAU/4-t*.66)};
    }
    // Release: a wider, diffusing cloud from which the membrane regrows.
    return {
      x:u*.93+.085*Math.sin(v*5.3+phase+t*.44),
      y:v*.70+.085*Math.sin(u*8.2+phase-t*.52),
      a:Math.sin(phase+t*.45)*1.1
    };
  }

  function basePosition(p,t) {
    const f=collective(t);
    const a=form(p,f.index,t),b=form(p,f.next,t);
    const q=f.blend;
    const ang=a.a+Math.atan2(Math.sin(b.a-a.a),Math.cos(b.a-a.a))*q;
    return {x:mix(a.x,b.x,q),y:mix(a.y,b.y,q),a:ang};
  }

  function signal(p,t) {
    let wave=0;
    const sx=w*.5, sy=h*.45;
    for(const pulse of pulses){
      const age=t-pulse.born;
      if(age<0||age>6.2)continue;
      const dx=(p.x-pulse.x)*sx,dy=(p.y-pulse.y)*sy;
      const distance=Math.hypot(dx,dy*1.2);
      const r=age*(w*.115+47);
      const spread=22+age*8;
      const front=Math.exp(-Math.pow((distance-r)/spread,2)*.9)
        *Math.exp(-age*.20)*pulse.power;
      wave=Math.max(wave,front);
    }
    return wave;
  }

  function animate(dt) {
    const follow=1-Math.exp(-dt*5.1);
    presence.x=mix(presence.x,presence.tx,follow);
    presence.y=mix(presence.y,presence.ty,follow);
    presence.strength=mix(presence.strength,presence.target,1-Math.exp(-dt*3.4));
    if(!presence.active){
      presence.afterglow=Math.max(0,presence.afterglow-dt*.10);
    } else presence.afterglow=Math.min(1,presence.afterglow+dt*.7);
    const bloom=clamp(presence.strength*.96+presence.afterglow*.35,0,1);

    const settle=1-Math.exp(-dt*(media.matches?3.3:7.5));
    for(const p of particles){
      const wanted=basePosition(p,elapsed);
      let x=wanted.x,y=wanted.y,a=wanted.a;
      const wave=signal(p,elapsed);
      // Signal changes local density and orientation, without pushing the
      // organism away from the pointer or creating unstructured distortion.
      const sway=wave*.07;
      x+=sway*Math.sin(p.phase+elapsed*.45);
      y+=sway*Math.cos(p.phase+elapsed*.72);

      // A subset of the field deliberately forms a temporary living bloom
      // around the cursor, which has six flexible petals and an open center.
      if(p.motile<.30 && bloom>.003){
        const angle=(p.id*.618033988749895%1)*TAU+elapsed*.07;
        const petal=Math.cos(6*angle+elapsed*.8);
        const radiusX=.073+.024*petal+p.seed*.018;
        const radiusY=.40+.09*petal+p.seed*.07;
        const bx=presence.x*.84+Math.cos(angle)*radiusX;
        const by=presence.y*.77+Math.sin(angle)*radiusY;
        const weight=smooth((bloom-.03)/.88);
        x=mix(x,bx,weight);
        y=mix(y,by,weight);
        a=mix(a,angle+Math.PI*.5,weight);
      }
      p.x=mix(p.x,x,settle);
      p.y=mix(p.y,y,settle);
      p.a+=Math.atan2(Math.sin(a-p.a),Math.cos(a-p.a))*settle;
      p.intensity=mix(p.intensity,Math.max(wave,bloom*(p.motile<.30?.95:.06)),1-Math.exp(-dt*7.2));
    }
  }

  function pulse(x,y,power) {
    pulses.push({x:clamp(x,-1.05,1.05),y:clamp(y,-1,1),born:elapsed,power});
    if(pulses.length>5)pulses.shift();
  }

  function gradients(pal) {
    // The living substrate is visible even without input.
    const center=ctx.createRadialGradient(w*.50,h*.50,5,w*.50,h*.50,w*.48);
    center.addColorStop(0,rgba(pal.mist,pal.glow));
    center.addColorStop(.68,rgba(pal.mist,pal.glow*.31));
    center.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=center;
    ctx.fillRect(0,0,w,h);

    // Gentle, moving concentration zones make the body feel inhabited.
    for(let i=0;i<4;i++){
      const fx=w*(.18+.21*i)+Math.sin(elapsed*.34+i*1.8)*w*.017;
      const fy=h*(.48+.15*Math.sin(i*1.5+elapsed*.48));
      const rad=h*(.37+.05*Math.cos(i+elapsed*.3));
      const g=ctx.createRadialGradient(fx,fy,0,fx,fy,rad);
      g.addColorStop(0,rgba(pal.wash,pal.glow*.56));
      g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;
      ctx.fillRect(fx-rad,fy-rad,rad*2,rad*2);
    }
  }

  function paint() {
    if(!w||!h||!particles.length)return;
    const pal=paletteColors();
    ctx.clearRect(0,0,w,h);
    gradients(pal);

    // Distinct strands and pulses remain organic, not a second neural graph.
    // All particles are drawn in a few batched paths for efficient animation.
    const bins=Array.from({length:8},()=>[]);
    const glowBins=Array.from({length:3},()=>[]);
    const xscale=w*.48,yscale=h*.46;
    for(const p of particles){
      const x=w*.5+p.x*xscale,y=h*.5+p.y*yscale;
      if(x<3||x>w-3||y<3||y>h-3)continue;
      const edge=clamp(Math.min(x,w-x)/(w*.06),0,1)*
        clamp(Math.min(y,h-y)/13,0,1);
      if(edge<.12)continue;
      const impulse=p.intensity;
      const size=p.size*(.9+impulse*.55);
      const angle=p.a+.10*Math.sin(p.phase+elapsed*.51);
      const dx=Math.cos(angle)*size*.5,dy=Math.sin(angle)*size*.5;
      const gold=p.accent<.10||impulse>.63;
      const tone=gold?2:p.lane===3?1:0;
      const thick=p.seed>.65?1:0;
      const value=clamp((.36+p.seed*.64)*edge+impulse*.24,0,1);
      const group=tone*2+thick;
      bins[group].push(x-dx,y-dy,x+dx,y+dy,value);
      if(impulse>.36)glowBins[tone].push(x,y,impulse*edge);
    }

    ctx.lineCap="round";
    for(let g=0;g<bins.length;g++){
      const verts=bins[g];
      if(!verts.length)continue;
      const tone=pal[g<2?"main":g<4?"inner":"warm"];
      ctx.beginPath();
      for(let i=0;i<verts.length;i+=5){
        ctx.moveTo(verts[i],verts[i+1]);
        ctx.lineTo(verts[i+2],verts[i+3]);
      }
      ctx.lineWidth=g%2?1.65:1.0;
      ctx.strokeStyle=rgba(tone,g>=4?.85:pal.mainAlpha);
      ctx.stroke();
    }

    // A translucent afterglow communicates that energy spreads and persists.
    for(let tone=0;tone<glowBins.length;tone++){
      const vertices=glowBins[tone];if(!vertices.length)continue;
      ctx.beginPath();
      for(let k=0;k<vertices.length;k+=3){
        const intensity=vertices[k+2];
        if(intensity>.44){
          const r=1.0+intensity*1.6;
          ctx.moveTo(vertices[k]+r,vertices[k+1]);
          ctx.arc(vertices[k],vertices[k+1],r,0,TAU);
        }
      }
      ctx.fillStyle=rgba(tone===2?pal.warm:pal.inner,.33);
      ctx.fill();
    }

    // During attention a clearly visible warm bloom marks the new collective
    // center, but does not turn into an orbiting ring or button-like control.
    const bloom=clamp(presence.strength*.88+presence.afterglow*.27,0,1);
    if(bloom>.012){
      const bx=w*(.5+presence.x*.48*.84);
      const by=h*(.5+presence.y*.46*.77);
      const r=h*.43;
      const glow=ctx.createRadialGradient(bx,by,h*.05,bx,by,r);
      glow.addColorStop(0,rgba(pal.warm,bloom*.13));
      glow.addColorStop(.55,rgba(pal.warm,bloom*.052));
      glow.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=glow;ctx.fillRect(bx-r,by-r,r*2,r*2);
    }
  }

  function fit() {
    const rect=stage.getBoundingClientRect();
    const rw=Math.round(rect.width),rh=Math.round(rect.height);
    if(rw<1||rh<1)return;
    const pixelRatio=Math.min(window.devicePixelRatio||1,1.5);
    if(rw===w&&rh===h&&dpr===pixelRatio)return;
    const changed=rw!==w||rh!==h;
    w=rw;h=rh;dpr=pixelRatio;
    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(changed||!particles.length)particles=makeParticles();
    paint();
  }

  function mouse(event) {
    if(event.pointerType==="touch")return;
    const bounds=stage.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const px=clamp(((event.clientX-bounds.left)/bounds.width)*2-1,-1,1);
    const py=clamp(((event.clientY-bounds.top)/bounds.height)*2-1,-1,1);
    const first=!presence.active;
    const travel=Math.hypot(px-presence.lastX,py-presence.lastY);
    presence.tx=px;presence.ty=py;
    presence.active=true;presence.target=1;
    if(first){
      presence.x=px;presence.y=py;
      presence.lastX=px;presence.lastY=py;
      pulse(px,py,1.35);
      lastMousePulse=elapsed;
    }else if(travel>.15&&elapsed-lastMousePulse>.85){
      pulse(px,py,.90);
      presence.lastX=px;presence.lastY=py;
      lastMousePulse=elapsed;
    }
    schedule();
  }

  stage.addEventListener("pointerenter",mouse,{passive:true});
  stage.addEventListener("pointermove",mouse,{passive:true});
  stage.addEventListener("pointerleave",()=>{
    presence.active=false;
    presence.target=0;
  },{passive:true});

  function tick(ts) {
    raf=0;
    if(document.hidden||!visible)return;
    const dt=last?clamp((ts-last)/1000,0,.046):1/60;
    last=ts;
    frameDelta+=dt;
    if(media.matches&&ts-lastDraw<50){schedule();return;}
    lastDraw=ts;
    const delta=clamp(frameDelta,0,.10);
    frameDelta=0;
    elapsed+=delta*(media.matches?.63:1);
    if(elapsed>nextIdlePulse){
      pulse(Math.sin(elapsed*.45)*.58,Math.cos(elapsed*.37)*.22,.75);
      nextIdlePulse=elapsed+6.0;
    }
    animate(delta);
    paint();
    schedule();
  }
  function schedule() {
    if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  function refresh(){fit();paint();schedule();}
  if("ResizeObserver" in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener("resize",refresh,{passive:true});
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible&&raf){cancelAnimationFrame(raf);raf=0;last=0;frameDelta=0;}
      if(visible)refresh();
    },{rootMargin:"100px"}).observe(stage);
  }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      if(raf)cancelAnimationFrame(raf);
      raf=0;last=0;frameDelta=0;
    }else refresh();
  });
  window.addEventListener("site-theme-change",()=>{paletteKey="";refresh();});
  media.addEventListener?.("change",()=>{lastDraw=0;refresh();});

  refresh();
})();
