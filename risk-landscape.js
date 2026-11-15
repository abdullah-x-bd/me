(() => {
  "use strict";
  const canvas=document.getElementById("system-landscape");
  if(!canvas)return;
  const stage=canvas.closest(".system-landscape-stage");
  const modeButtons=[...document.querySelectorAll("[data-landscape-mode]")];
  const status=document.getElementById("system-landscape-status");
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx||!stage)return;

  // A conceptual demonstration, not empirical model output.
  // Each raised tile stands for part of a larger interdependent system.
  // Amber pulses depict propagation; the mint boundary depicts containment.
  const NX=28,NY=11,GATE=14;
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,f)=>a+(b-a)*f;
  const seed=(i,j)=>Math.sin(i*32.5287+j*78.233)*43758.5453%1;
  let w=0,h=0,dpr=1,mode="uncontained",visible=true;
  let frame=0,last=0,lastDraw=0,t=0,nextAuto=6.8;
  let recentAction=0,dragging=false,lastDrag=-1;
  let hover={i:-1,j:-1,alpha:0};
  const shocks=[{i:5,j:5,when:-.75}];
  const centers=[];
  let layout={step:0,halfX:0,halfY:0,rowStep:0,x0:0,y0:0,shear:0};

  function resize(){
    const r=stage.getBoundingClientRect();
    const cw=Math.round(r.width),ch=Math.round(r.height);
    if(cw<1||ch<1)return;
    const dd=Math.min(window.devicePixelRatio||1,1.55);
    if(cw!==w||ch!==h||dpr!==dd){
      w=cw;h=ch;dpr=dd;
      canvas.width=Math.round(w*dpr);
      canvas.height=Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    const step=Math.min(w*.88/(NX+1.2),36);
    const shear=step*.28;
    const rowStep=Math.min(11.2,h*.44/NY);
    layout={step,halfX:step*.37,halfY:Math.max(2.2,step*.112),
      rowStep,shear,x0:(w-(NX-1)*step)/2,
      y0:h*.44-(NY-1)*rowStep*.48};
    centers.length=0;
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
      centers.push({i,j,x:layout.x0+i*step+(j-(NY-1)*.5)*shear,
        y:layout.y0+j*rowStep+i*.31});
    }
    draw();
  }

  function shock(i,j){
    shocks.push({i:clamp(i,0,NX-1),j:clamp(j,0,NY-1),when:t});
    while(shocks.length>5)shocks.shift();
    recentAction=t;
    nextAuto=t+9;
    if(status)status.textContent=mode==="safeguarded"?
      "Disturbance introduced. The safeguard boundary restricts its spread.":
      "Disturbance introduced. Watch the wave cross the system.";
    if(motion.matches)draw();
    else start();
  }

  function attenuation(s,i,j){
    const crossing=(s.i<GATE)!==(i<GATE);
    return mode==="safeguarded"&&crossing?.015:1;
  }

  function activation(i,j){
    let value=0;
    for(const s of shocks){
      const age=motion.matches?.9:t-s.when;
      if(age<0||age>6.5)continue;
      const distance=Math.hypot((i-s.i)*.93,(j-s.j)*1.25);
      const radius=age*6.0;
      const band=Math.exp(-Math.pow((distance-radius)/2.05,2));
      const wake=Math.exp(-distance*.15-age*.88)*.16;
      value=Math.max(value,(band*.97+wake)*Math.exp(-age*.085)*attenuation(s,i,j));
    }
    return clamp(value,0,1);
  }

  function polygon(points,color,stroke){
    ctx.beginPath();
    ctx.moveTo(points[0][0],points[0][1]);
    for(let n=1;n<points.length;n++)ctx.lineTo(points[n][0],points[n][1]);
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.fill();
    if(stroke){ctx.lineWidth=.55;ctx.strokeStyle=stroke;ctx.stroke();}
  }

  const rgba=(rgb,a)=>"rgba("+rgb+","+clamp(a,0,1)+")";
  function draw(){
    if(!w||!h)return;
    const dark=document.documentElement.dataset.theme==="dark";
    ctx.clearRect(0,0,w,h);
    const inactive=dark?"128,174,145":"80,117,91";
    const left=dark?"61,107,81":"79,123,91";
    const right=dark?"43,84,65":"60,103,73";
    const amber=dark?"244,164,109":"178,93,56";
    const amberSide=dark?"169,95,52":"138,75,43";
    const safe=dark?"128,232,170":"59,151,105";
    const safeSide=dark?"56,141,95":"54,120,83";
    const hX=layout.halfX,hY=layout.halfY;
    const items=centers.slice().sort((a,b)=>(a.j-b.j)||a.i-b.i);

    // Wide, low-rise architectural terrain. No nodes, orbiting, or connecting wires.
    for(const p of items){
      const a=activation(p.i,p.j);
      const frontier=mode==="safeguarded"&&p.i===GATE-1;
      const nearHover=hover.i>=0?Math.hypot((p.i-hover.i)*.85,p.j-hover.j):999;
      const hovered=hover.alpha*Math.exp(-nearHover*nearHover*.25);
      const terrain=(Math.sin(p.i*.49+p.j*.77)*.5+.5)*4.0+
        (Math.sin(p.i*.17-p.j*.89)*.5+.5)*3;
      const breathing=motion.matches?0:Math.sin(t*1.3+p.i*.39+p.j*.68)*1.6;
      const rise=5+terrain+breathing+a*40+(frontier?9:0)+hovered*8;
      const x=p.x,y=p.y;
      const topY=y-rise;
      const palette=frontier?safe:amber;
      const sidePalette=frontier?safeSide:amberSide;
      const risk=!frontier?a:0;
      const faceAlpha=frontier?.52+hovered*.16:.20+risk*.70+hovered*.18;
      const sideAlpha=frontier?.36:.12+risk*.59+hovered*.12;
      const idleAlpha=.21+hovered*.18;
      // Right/left faces make the change in pillar height legible.
      polygon([[x,topY+hY],[x+hX,topY],[x+hX,y],[x,y+hY]],
        rgba(frontier?sidePalette:risk>.035?sidePalette:right,sideAlpha));
      polygon([[x-hX,topY],[x,topY+hY],[x,y+hY],[x-hX,y]],
        rgba(frontier?sidePalette:risk>.035?sidePalette:left,sideAlpha*.76));
      polygon([[x,topY-hY],[x+hX,topY],[x,topY+hY],[x-hX,topY]],
        rgba(frontier?palette:risk>.035?palette:inactive,frontier?faceAlpha:risk>.035?faceAlpha:idleAlpha),
        hovered>.17?rgba(safe,.22*hovered):null);
      if(risk>.22){
        ctx.beginPath();ctx.arc(x,topY,Math.max(1.1,hX*.12),0,Math.PI*2);
        ctx.fillStyle=rgba(amber,.14+risk*.61);ctx.fill();
      }
    }

    // The containment boundary is a single continuous translucent plane.
    if(mode==="safeguarded"){
      const top=centers.find(c=>c.i===GATE-1&&c.j===0);
      const bottom=centers.find(c=>c.i===GATE-1&&c.j===NY-1);
      if(top&&bottom){
        ctx.save();
        ctx.lineWidth=1;
        ctx.setLineDash([3,7]);
        ctx.strokeStyle=rgba(safe,.56);
        ctx.beginPath();ctx.moveTo(top.x+layout.step*.50,top.y-38);
        ctx.lineTo(bottom.x+layout.step*.50,bottom.y+8);ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  function pick(x,y){
    let nearest=null,min=Infinity;
    for(const p of centers){
      const dx=(p.x-x)/(layout.step*.75);
      const dy=(p.y-y)/(layout.rowStep*.95+3);
      const score=dx*dx+dy*dy;
      if(score<min){min=score;nearest=p;}
    }
    return min<8?nearest:null;
  }
  function point(e){
    const rect=stage.getBoundingClientRect();
    return pick(e.clientX-rect.left,e.clientY-rect.top);
  }
  function move(e){
    const p=point(e);
    hover.i=p?p.i:-1;hover.j=p?p.j:-1;hover.alpha=p?1:0;
    if(dragging&&p&&(p.i!==lastDrag)){
      lastDrag=p.i;shock(p.i,p.j);
    }
    if(motion.matches)draw();else start();
  }
  function selectMode(next){
    if(next!=="safeguarded"&&next!=="uncontained")return;
    mode=next;
    for(const btn of modeButtons){
      const pressed=btn.dataset.landscapeMode===mode;
      btn.setAttribute("aria-pressed",String(pressed));
      btn.classList.toggle("active",pressed);
    }
    shocks.length=0;
    shock(4,Math.floor(NY/2));
    if(status)status.textContent=mode==="safeguarded"?
      "Safeguards active. The boundary interrupts the disturbance.":
      "Safeguards inactive. Disturbances can spread through the whole system.";
    draw();
  }
  for(const btn of modeButtons){
    btn.addEventListener("click",()=>selectMode(btn.dataset.landscapeMode));
  }
  stage.addEventListener("pointermove",move,{passive:true});
  stage.addEventListener("pointerleave",()=>{hover.i=-1;hover.j=-1;hover.alpha=0;if(motion.matches)draw();});
  stage.addEventListener("pointerdown",e=>{
    if(e.button!==undefined&&e.button!==0)return;
    dragging=true;lastDrag=-1;
    const p=point(e);
    if(p){lastDrag=p.i;shock(p.i,p.j);}
    try{stage.setPointerCapture(e.pointerId);}catch(_){}
  });
  stage.addEventListener("pointerup",e=>{
    dragging=false;lastDrag=-1;
    try{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}catch(_){}
  });
  stage.addEventListener("pointercancel",()=>{dragging=false;lastDrag=-1;});
  stage.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();shock(5,Math.floor(NY/2));
    }
  });

  function start(){if(!frame&&visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;
    if(!visible||document.hidden)return;
    if(now-lastDraw<29){start();return;}
    const dt=last?Math.min((now-last)/1000,.06):0;
    last=now;lastDraw=now;t+=dt;
    if(t>nextAuto){
      if(t-recentAction>6)shock(4,Math.floor(NY/2));
      nextAuto=t+8.6;
    }
    draw();start();
  }
  function refresh(){resize();if(motion.matches)draw();else start();}
  if("ResizeObserver" in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener("resize",refresh,{passive:true});
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
      if(visible)refresh();
    },{rootMargin:"120px"}).observe(stage);
  }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
    else refresh();
  });
  motion.addEventListener?.("change",()=>{
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;refresh();
  });
  window.addEventListener("site-theme-change",refresh);
  refresh();
})();
