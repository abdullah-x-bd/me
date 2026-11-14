(() => {
  'use strict';
  const hero = document.getElementById('field');
  const ambient = document.getElementById('ambient-field');
  if (!hero || !ambient) return;
  const heroStage = hero.parentElement;
  const heroArea = document.querySelector('.hero') || heroStage;
  const ambientStage = ambient.parentElement;
  const hc = hero.getContext('2d', {alpha: true});
  const ac = ambient.getContext('2d', {alpha: true});
  if (!hc || !ac) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a,v));
  const mix = (a,b,t) => a+(b-a)*t;
  const ease = v => v*v*(3-2*v);
  const random = seed => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const rnd = random(260809828);
  const rings = 15, spokes = 15;
  const nodes = [], edges = [];
  for (let i=0; i<rings; i++) {
    const u = i / (rings - 1);
    const envelope = Math.pow(Math.sin(Math.PI * (.07+.86*u)), .67);
    const radius = envelope * (.55 + .24 * Math.pow(Math.cos(u*Math.PI*2.1),2));
    for(let j=0; j<spokes; j++){
      const a = TAU * j/spokes + u*2.1 + (rnd()-.5)*.14;
      nodes.push({
        u,a,radius:radius*(.95+.10*rnd()),
        phase:rnd()*TAU,seed:rnd(),
        x:0,y:0,z:0,activation:0
      });
    }
  }
  const index = (i,j) => i*spokes+((j%spokes)+spokes)%spokes;
  for(let i=0;i<rings-1;i++){
    for(let j=0;j<spokes;j++){
      const source=index(i,j);
      edges.push({a:source,b:index(i+1,j),tone:0,phase:rnd(),speed:.12+.17*rnd()});
      if(i%2===0 || rnd()>.30)
        edges.push({a:source,b:index(i+1,j+1),tone:1,phase:rnd(),speed:.09+.15*rnd()});
      if(i%3===0 && rnd()>.35)
        edges.push({a:source,b:index(i+2<rings?i+2:i+1,j-1),tone:2,phase:rnd(),speed:.11+.16*rnd()});
      if(rnd()>.66)
        edges.push({a:source,b:index(i,j+1),tone:3,phase:rnd(),speed:.08+.12*rnd()});
    }
  }
  const foreground = {w:0,h:0,d:0};
  const background = {w:0,h:0,d:0};
  const pointer = {x:.57,y:.49,tx:.57,ty:.49,fx:.5,fy:.5,tfx:.5,tfy:.5,near:0,targetNear:0,presence:0,inside:false,anchorX:.57,anchorY:.49,tiltX:0,tiltY:0,targetTiltX:0,targetTiltY:0};
  let scroll=window.scrollY || 0, desiredScroll=scroll;
  let t=0, prior=0, lastFrame=0, request=0, visible=true;
  let heroBoundary=720;

  function resize(canvas,ctx,view,w,h,maxDpr){
    const d=Math.min(window.devicePixelRatio||1,maxDpr);
    const width=Math.max(1,Math.round(w)),height=Math.max(1,Math.round(h));
    if(view.w!==width || view.h!==height || view.d!==d){
      view.w=width;view.h=height;view.d=d;
      canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);
      ctx.setTransform(d,0,0,d,0,0);
    }
  }

  function geometry(time,hover,ambientMode,view){
    const mobile=view.w<610;
    const yRotation=.28 + time * (ambientMode?.19:.105) +
      (ambientMode?0:pointer.tiltX);
    const xRotation=-.34 + Math.sin(time*.24)*.075 +
      (ambientMode?0:pointer.tiltY);
    const cy=Math.cos(yRotation),sy=Math.sin(yRotation);
    const cx=Math.cos(xRotation),sx=Math.sin(xRotation);
    const expansion=ambientMode?1:1+pointer.near*hover*.036;
    const scale=(ambientMode ? (mobile?.74:.89) : (mobile?.81:.94)) *
      Math.min(view.w/3.9,view.h/2.6)*expansion;
    const centreX=view.w*(ambientMode?.67:.51),centreY=view.h*(ambientMode?.49:.50);
    for(const n of nodes){
      const bend=.075*Math.sin(n.u*TAU*1.45+time*.33+n.phase*.18);
      const r=n.radius*(1+.046*Math.sin(time*.49 + n.phase));
      const p=n.a + .08*Math.sin(time*.33 + n.u*4.5);
      const x=(n.u-.5)*3.30;
      const y=r*1.16*Math.cos(p) + bend;
      const z=r*.95*Math.sin(p) + .045*Math.cos(time*.30+n.phase);
      const x1=x*cy-z*sy;
      const z1=x*sy+z*cy;
      const y2=y*cx-z1*sx;
      const z2=y*sx+z1*cx;
      const depth=1.0+z2*.11;
      let projectedX=centreX+x1*scale/depth;
      let projectedY=centreY+y2*scale/depth;
      const mouseX=pointer.fx*view.w, mouseY=pointer.fy*view.h;
      const dx=projectedX-mouseX, dy=projectedY-mouseY;
      const fieldRadius=Math.min(view.w,view.h)*.48;
      const distance=Math.hypot(dx,dy);
      const push=Math.pow(Math.max(0,1-distance/fieldRadius),2)*hover*pointer.near;
      const inv=1/Math.max(1,distance);
      const force=fieldRadius*.050*push;
      if(!ambientMode){
        projectedX+=dx*inv*force;
        projectedY+=dy*inv*force;
      }
      n.x=projectedX;n.y=projectedY;n.z=z2;
      if(!ambientMode)n.activation=mix(n.activation,push,motion.matches?1:.12);
    }
    return {centreX,centreY,scale};
  }

  function bezier(ctx,a,b,mode){
    const dx=b.x-a.x,dy=b.y-a.y;
    const curve=mode===2?.20:mode===3?.32:.13;
    const bias=(a.z+b.z)*.035;
    const q1x=a.x+dx*.39, q1y=a.y+dy*curve-bias*40;
    const q2x=b.x-dx*.39, q2y=b.y-dy*curve+bias*40;
    ctx.moveTo(a.x,a.y);
    ctx.bezierCurveTo(q1x,q1y,q2x,q2y,b.x,b.y);
    return {q1x,q1y,q2x,q2y};
  }
  function interpolate(a,b,c,p){
    const q=1-p;
    return {
      x:q*q*q*a.x +3*q*q*p*c.q1x+3*q*p*p*c.q2x+p*p*p*b.x,
      y:q*q*q*a.y +3*q*q*p*c.q1y+3*q*p*p*c.q2y+p*p*p*b.y
    };
  }
  function paint(ctx,view,ambientMode,opacity,time){
    const {w,h}=view;
    ctx.clearRect(0,0,w,h);
    const hover=ambientMode?0:pointer.presence;
    const transform=geometry(time,hover,ambientMode,view);
    if(!ambientMode){
      // An inner axial contour suggests regulation without illustrating any single paper.
      const r=transform.scale*.31;
      ctx.beginPath();
      ctx.ellipse(transform.centreX+2,transform.centreY,r*.24,r,Math.sin(time*.13)*.18,0,TAU);
      ctx.strokeStyle='rgba(87,127,96,.075)';
      ctx.lineWidth=.8;
      ctx.stroke();
    }
    for(let k=0;k<edges.length;k++){
      const e=edges[k],a=nodes[e.a],b=nodes[e.b];
      const front=clamp((a.z+b.z+1.8)/3.5);
      const active=Math.max(a.activation,b.activation);
      const thin=e.tone===2 || e.tone===3;
      const alpha=(ambientMode?.065:.075)+(ambientMode?.16:.205)*front;
      ctx.beginPath();
      const controls=bezier(ctx,a,b,e.tone);
      ctx.lineWidth=(thin?.43:.55)+front*(ambientMode?.22:.34);
      const value=clamp((alpha*(thin?.56:1)+active*.16)*opacity,0,1);
      ctx.strokeStyle='rgba(45,95,66,'+value+')';
      ctx.stroke();
      const animated=!motion.matches && (k%(ambientMode?5:3)===0 || active>.18);
      if(animated){
        const speed=e.speed*(ambientMode?2.1:1.2)*(1+active*.20);
        const phase=(e.phase+time*speed)%1;
        const q=interpolate(a,b,controls,phase);
        const size=(ambientMode?.7:1.1)+front*(ambientMode?.55:.95)+active*.25;
        ctx.beginPath();ctx.arc(q.x,q.y,size,0,TAU);
        ctx.fillStyle='rgba(54,112,73,'+
          clamp((ambientMode?.15:.39)+front*(ambientMode?.14:.30)+active*.08,0,1)*opacity+')';
        ctx.fill();
      }
    }
    const sorted=nodes.slice().sort((a,b)=>a.z-b.z);
    for(const n of sorted){
      const front=clamp((n.z+1.3)/2.8);
      const active=n.activation;
      const rad=(ambientMode?.66:1.05)+front*(ambientMode?.8:1.35)+active*.5;
      
      ctx.beginPath();ctx.arc(n.x,n.y,rad,0,TAU);
      ctx.fillStyle='rgba(40,91,64,'+
        clamp(((ambientMode?.15:.30)+front*(ambientMode?.21:.44)+active*.12)*opacity,0,1)+')';
      ctx.fill();
    }
  }

  function tick(timestamp){
    request=0;
    if(document.hidden)return;
    if(!motion.matches && timestamp-lastFrame<29){request=requestAnimationFrame(tick);return}
    const delta=prior?Math.min(.06,(timestamp-prior)/1000):0;
    prior=timestamp;lastFrame=timestamp;
    if(!motion.matches)t+=delta;
    scroll=mix(scroll,desiredScroll,motion.matches?1:.09);
    pointer.x=mix(pointer.x,pointer.tx,motion.matches?1:.10);
    pointer.y=mix(pointer.y,pointer.ty,motion.matches?1:.10);
    pointer.fx=mix(pointer.fx,pointer.tfx,motion.matches?1:.14);
    pointer.fy=mix(pointer.fy,pointer.tfy,motion.matches?1:.14);
    pointer.near=mix(pointer.near,pointer.inside?pointer.targetNear:0,motion.matches?1:.045);
    pointer.presence=mix(pointer.presence,pointer.inside?1:0,motion.matches?1:.045);
    pointer.tiltX=mix(pointer.tiltX,pointer.inside?pointer.targetTiltX:0,motion.matches?1:.055);
    pointer.tiltY=mix(pointer.tiltY,pointer.inside?pointer.targetTiltY:0,motion.matches?1:.055);
    const heroRect=heroStage.getBoundingClientRect();
    if(visible){
      resize(hero,hc,foreground,heroRect.width,heroRect.height,1.5);
      paint(hc,foreground,false,1,t);
    }
    const reveal=ease(clamp((scroll-heroBoundary*.26)/(heroBoundary*.58)));
    const op=reveal*(window.innerWidth<650?.83:.90);
    ambientStage.style.opacity=String(op);
    if(op>.001){
      resize(ambient,ac,background,window.innerWidth,window.innerHeight,
        window.innerWidth<650?1.16:1.32);
      // The ambient field keeps moving independently from user interaction.
      paint(ac,background,true,.72,t*.82+scroll*.00045);
    }
    if(!motion.matches)request=requestAnimationFrame(tick);
  }
  function play(){if(request || document.hidden)return;prior=0;request=requestAnimationFrame(tick)}
  function layout(){
    const h=document.querySelector('.hero');
    if(h){const box=h.getBoundingClientRect();heroBoundary=box.bottom+window.scrollY}
    if(motion.matches)play();
  }
  // The entire first-page composition, including text and footer, is
  // one continuous hover surface. The sculpture's canvas stays in place.
  // Entering the interactive region does not change the sculpture's pose.
  // Interaction is measured as a continuous displacement from the point of
  // entry, not as an abrupt absolute rotation tied to hover state.
  function updatePointerFromEvent(e,fresh=false){
    const area=heroArea.getBoundingClientRect();
    const figure=heroStage.getBoundingClientRect();
    if(area.width<=0||area.height<=0||figure.width<=0||figure.height<=0)return;
    const x=clamp((e.clientX-area.left)/area.width);
    const y=clamp((e.clientY-area.top)/area.height);
    const fx=(e.clientX-figure.left)/figure.width;
    const fy=(e.clientY-figure.top)/figure.height;

    if(fresh||!pointer.inside){
      pointer.inside=true;
      pointer.anchorX=x;
      pointer.anchorY=y;
      pointer.x=pointer.tx=x;
      pointer.y=pointer.ty=y;
      pointer.fx=pointer.tfx=fx;
      pointer.fy=pointer.tfy=fy;
      pointer.targetTiltX=0;
      pointer.targetTiltY=0;
      pointer.targetNear=0;
      // Crucially, no geometry state jumps at the boundary.
      if(motion.matches)play();
      return;
    }

    pointer.tx=x;
    pointer.ty=y;
    pointer.tfx=fx;
    pointer.tfy=fy;
    pointer.targetTiltX=clamp((x-pointer.anchorX)*.17,-.080,.080);
    pointer.targetTiltY=clamp((y-pointer.anchorY)*.115,-.060,.060);
    const dx=(fx-.5)/.57,dy=(fy-.5)/.59;
    pointer.targetNear=Math.exp(-1.2*(dx*dx+dy*dy));
    if(motion.matches)play();
  }
  heroArea.addEventListener('pointerenter',e=>{
    if(e.pointerType==='touch')return;
    updatePointerFromEvent(e,true);
  },{passive:true});
  heroArea.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    updatePointerFromEvent(e);
  },{passive:true});
  heroArea.addEventListener('mousemove',e=>updatePointerFromEvent(e),{passive:true});
  heroArea.addEventListener('pointerleave',()=>{
    pointer.inside=false;
    pointer.targetNear=0;
    pointer.targetTiltX=0;
    pointer.targetTiltY=0;
    if(motion.matches)play();
  },{passive:true});
  window.addEventListener('scroll',()=>{
    desiredScroll=window.scrollY||0;
    if(motion.matches)play();
  },{passive:true});
  window.addEventListener('resize',layout,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)play()});
  motion.addEventListener('change',()=>{
    if(request)cancelAnimationFrame(request);
    request=0;play();
  });
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible)play();
    },{rootMargin:'110px'}).observe(heroStage);
  }
  layout();play();
})();