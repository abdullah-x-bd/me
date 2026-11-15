(() => {
  "use strict";
  /*
   * Emergence: self-organizing pathways from local interactions.
   * Agents sense and reinforce neighboring traces; the traces evaporate and
   * diffuse. The shared field creates temporary routes, loops, intersections
   * and branches, none of which is prescribed by the implementation.
   * This is an abstract generative artwork, not research data.
   */
  const canvas=document.getElementById("emergence-field");
  if(!canvas)return;
  const stage=canvas.closest(".emergence-stage");
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!stage||!ctx)return;
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const TAU=Math.PI*2;
  let seed=8219507;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  let cw=0,ch=0,gw=0,gh=0,dpr=1;
  let trail,nextTrail,food,nextFood,agents=[],droplets=[],nutrients=[];
  let frame=0,clock=0,raf=0,last=0,visible=true,lastDraw=0,carry=0;
  const pointer={inside:false,x:0,y:0};
  let paletteKey="",palette;

  function getPalette(){
    const theme=document.documentElement.dataset.theme==="dark"?"dark":"light";
    if(palette&&paletteKey===theme)return palette;
    paletteKey=theme;
    palette=theme==="dark"?{
      dust:["rgba(116,158,127,0.22)","rgba(132,187,147,0.31)","rgba(166,230,181,0.44)"],
      agent:["rgba(151,210,167,0.68)","rgba(192,247,202,0.87)","rgba(246,196,125,0.90)"],
      halo:"rgba(92,160,119,0.08)",accent:"rgba(235,188,125,0.19)"
    }:{
      dust:["rgba(62,117,74,0.14)","rgba(58,120,75,0.24)","rgba(35,98,57,0.38)"],
      agent:["rgba(47,101,62,0.66)","rgba(25,98,52,0.86)","rgba(159,107,63,0.93)"],
      halo:"rgba(71,129,84,0.07)",accent:"rgba(166,121,77,0.13)"
    };
    return palette;
  }
  const idx=(x,y)=>y*gw+x;
  function sense(x,y,kind){
    const xx=Math.floor(x),yy=Math.floor(y);
    if(xx<1||xx>=gw-1||yy<1||yy>=gh-1)return 0;
    const k=idx(xx,yy),t=trail[k];
    const preference=kind>.73?.24:1;
    // High concentrations eventually become less attractive, allowing
    // overused routes to split and neighbouring routes to compete.
    return preference*(t-.22*t*t)+food[k]*1.8;
  }
  function makeAgent(x,y){
    return {
      x,y,angle:rand()*TAU,
      speed:.55+rand()*.34,
      sensor:4.4+rand()*2.4,
      spread:.8+rand()*.35,
      turn:.55+rand()*.30,
      size:rand(),kind:rand()
    };
  }
  function reset(){
    gw=Math.round(clamp(cw/3.9,155,340));
    gh=Math.round(clamp(ch/3.15,48,80));
    const n=gw*gh;
    trail=new Float32Array(n);nextTrail=new Float32Array(n);
    food=new Float32Array(n);nextFood=new Float32Array(n);
    droplets=[];agents=[];
    nutrients=Array.from({length:10},(_,i)=>({
      x:gw*(.075+i*.094)+((rand()+rand()+rand())-1.5)*gw*.018,
      y:gh*(.48+.31*Math.sin(i*2.10)+((rand()+rand()+rand())-1.5)*.11)
    }));
    const num=Math.round(clamp(cw*1.52,980,2100));
    for(let k=0;k<num;k++){
      let x,y;
      if(rand()<.39){
        x=rand()*(gw-3)+1.5;
        y=rand()*(gh-3)+1.5;
      }else{
        const colony=Math.floor(rand()*8);
        const cx=gw*(.08+colony*.119);
        const cy=gh*(.50+Math.sin(colony*1.43)*.19);
        x=clamp(cx+(rand()+rand()+rand()-1.5)*gw*.10,1,gw-2);
        y=clamp(cy+(rand()+rand()+rand()-1.5)*gh*.65,1,gh-2);
      }
      agents.push(makeAgent(x,y));
    }
    // Warm up the independent system so a network is already visible.
    for(let i=0;i<80;i++)step();
  }

  function step(){
    if(frame%7===0){
      for(let ni=0;ni<nutrients.length;ni++){
        const n=nutrients[ni];
        feed(n.x+2.3*Math.sin(frame*.007+ni),
             n.y+1.8*Math.cos(frame*.005+ni*1.43),.12);
      }
    }
    if(pointer.inside&&frame%4===0)feed(pointer.x,pointer.y,.22);
    const lessMotion=motion.matches;
    for(let i=0;i<agents.length;i++){
      const a=agents[i],dir=a.angle,d=a.sensor;
      const f=sense(a.x+Math.cos(dir)*d,a.y+Math.sin(dir)*d,a.kind);
      const l=sense(a.x+Math.cos(dir+a.spread)*d,a.y+Math.sin(dir+a.spread)*d,a.kind);
      const r=sense(a.x+Math.cos(dir-a.spread)*d,a.y+Math.sin(dir-a.spread)*d,a.kind);
      const turn=a.turn*(lessMotion?.65:1);
      if(l>f&&l>r)a.angle+=turn;
      else if(r>f&&r>l)a.angle-=turn;
      else if(f<l&&f<r)a.angle+=(rand()-.5)*turn*2;
      else a.angle+=(rand()-.5)*turn*.24;
      if(rand()<.018)a.angle+=(rand()-.5)*1.28;
      a.x+=Math.cos(a.angle)*a.speed;
      a.y+=Math.sin(a.angle)*a.speed;
      if(a.x<1.1||a.x>gw-2.1){
        a.x=clamp(a.x,1.1,gw-2.1);
        a.angle=Math.PI-a.angle+(rand()-.5)*.5;
      }
      if(a.y<1.1||a.y>gh-2.1){
        a.y=clamp(a.y,1.1,gh-2.1);
        a.angle=-a.angle+(rand()-.5)*.5;
      }
      const k=idx(a.x|0,a.y|0);
      trail[k]=Math.min(3.1,trail[k]+.18);
    }
    // Decay and spread happen through neighboring cells only. There are
    // no predefined paths, symbolic shapes, keyframes or global transitions.
    for(let y=1;y<gh-1;y++){
      const row=y*gw;
      for(let x=1;x<gw-1;x++){
        const k=row+x,v=trail[k];
        const neighbour=(trail[k-1]+trail[k+1]+trail[k-gw]+trail[k+gw])*.25;
        nextTrail[k]=Math.min(3.1,(v*.63+neighbour*.37)*.926);
        const fv=food[k];
        const adjacent=(food[k-1]+food[k+1]+food[k-gw]+food[k+gw])*.25;
        nextFood[k]=(fv*.84+adjacent*.16)*.986;
      }
    }
    [trail,nextTrail]=[nextTrail,trail];
    [food,nextFood]=[nextFood,food];
    frame++;
  }

  function feed(gx,gy,weight){
    const radius=4.8;
    for(let y=Math.max(1,Math.floor(gy-radius*2));
      y<Math.min(gh-1,Math.ceil(gy+radius*2));y++){
      for(let x=Math.max(1,Math.floor(gx-radius*2));
        x<Math.min(gw-1,Math.ceil(gx+radius*2));x++){
        const distance=((x-gx)**2+(y-gy)**2)/(radius*radius);
        const influence=Math.exp(-distance*1.4)*weight;
        const k=idx(x,y);
        food[k]=Math.min(5.0,food[k]+influence);
      }
    }
  }

  function interact(event){
    if(event.pointerType==="touch")return;
    const r=stage.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const x=clamp((event.clientX-r.left)/r.width,0,1);
    const y=clamp((event.clientY-r.top)/r.height,0,1);
    const gx=x*(gw-1),gy=y*(gh-1);
    const count=pointer.inside
      ?Math.max(1,Math.ceil(Math.hypot(gx-pointer.x,gy-pointer.y)/2)):1;
    for(let i=1;i<=count;i++){
      const q=i/count;
      feed(pointer.inside?pointer.x+(gx-pointer.x)*q:gx,
           pointer.inside?pointer.y+(gy-pointer.y)*q:gy,1.25);
    }
    pointer.inside=true;pointer.x=gx;pointer.y=gy;
    droplets.push({x:gx,y:gy,born:clock});
    if(droplets.length>35)droplets.shift();
    schedule();
  }

  function draw(){
    if(!cw||!ch)return;
    const p=getPalette();
    ctx.clearRect(0,0,cw,ch);
    const halo=ctx.createRadialGradient(cw*.5,ch*.53,5,cw*.5,ch*.53,cw*.48);
    halo.addColorStop(0,p.halo);
    halo.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=halo;ctx.fillRect(0,0,cw,ch);
    const sx=cw/gw,sy=ch/gh;
    // Dots are both the agents and the trace of their collective routes.
    // The pathways are visible, but no line segments are ever drawn.
    const dust=[[],[],[]];
    for(let y=1;y<gh-1;y++){
      for(let x=1;x<gw-1;x++){
        const k=idx(x,y),t=trail[k],f=food[k];
        if(t<.12&&f<.1)continue;
        const level=t+f*.26>.92?2:t+f*.26>.39?1:0;
        if(level===0&&Math.sin(x*12.989+y*78.23)<-.30)continue;
        dust[level].push(
          (x+.22*Math.sin(y*1.71+x*3.0))*sx,
          (y+.22*Math.sin(x*1.13+y*2.2))*sy
        );
      }
    }
    for(let level=0;level<3;level++){
      const cells=dust[level];if(!cells.length)continue;
      ctx.beginPath();
      const size=[.52,.68,.95][level];
      for(let i=0;i<cells.length;i+=2){
        ctx.moveTo(cells[i]+size,cells[i+1]);
        ctx.arc(cells[i],cells[i+1],size,0,TAU);
      }
      ctx.fillStyle=p.dust[level];ctx.fill();
    }

    const kinds=[[],[],[]];
    for(let i=0;i<agents.length;i++){
      const a=agents[i],x=a.x*sx,y=a.y*sy;
      const f=food[idx(a.x|0,a.y|0)];
      const kind=f>.44?2:a.size>.67?1:0;
      kinds[kind].push(x,y);
    }
    for(let kind=0;kind<3;kind++){
      const coords=kinds[kind];if(!coords.length)continue;
      ctx.beginPath();
      const radius=[.76,1.18,1.56][kind];
      for(let k=0;k<coords.length;k+=2){
        ctx.moveTo(coords[k]+radius,coords[k+1]);
        ctx.arc(coords[k],coords[k+1],radius,0,TAU);
      }
      ctx.fillStyle=p.agent[kind];ctx.fill();
    }

    // Feedback from the cursor is temporary; the self-organized pathways
    // persist and keep changing after the visitor moves elsewhere.
    for(let i=droplets.length-1;i>=0;i--){
      const d=droplets[i],age=clock-d.born;
      if(age>1.3){droplets.splice(i,1);continue;}
      const x=d.x*sx,y=d.y*sy;
      const gradient=ctx.createRadialGradient(x,y,0,x,y,21+age*32);
      const opacity=.13*Math.exp(-age*3.5);
      gradient.addColorStop(0,p.accent.replace(/0\.\d+\)/,opacity.toFixed(3)+")"));
      gradient.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=gradient;ctx.fillRect(x-70,y-70,140,140);
    }
  }

  function resize(){
    const r=stage.getBoundingClientRect();
    const ww=Math.round(r.width),hh=Math.round(r.height);
    if(!ww||!hh)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(ww===cw&&hh===ch&&ratio===dpr)return;
    cw=ww;ch=hh;dpr=ratio;
    canvas.width=Math.round(cw*dpr);
    canvas.height=Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    reset();draw();
  }
  function tick(now){
    raf=0;
    if(!visible||document.hidden)return;
    const dt=last?clamp((now-last)/1000,0,.05):1/60;
    last=now;clock+=dt;carry+=dt;
    const rate=motion.matches?18:42;
    const maxSteps=motion.matches?1:3;
    let count=0;
    while(carry>1/rate&&count<maxSteps){
      step();carry-=1/rate;count++;
    }
    if(carry>.2)carry=.2;
    if(motion.matches&&now-lastDraw<64){schedule();return;}
    lastDraw=now;draw();schedule();
  }
  function schedule(){
    if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  function refresh(){resize();schedule();}
  stage.addEventListener("pointerenter",interact,{passive:true});
  stage.addEventListener("pointermove",interact,{passive:true});
  stage.addEventListener("pointerleave",()=>{
    pointer.inside=false;
  },{passive:true});
  if("ResizeObserver" in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener("resize",refresh,{passive:true});
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible&&raf){
        cancelAnimationFrame(raf);raf=0;last=0;carry=0;
      }
      if(visible)refresh();
    },{rootMargin:"100px"}).observe(stage);
  }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      if(raf)cancelAnimationFrame(raf);
      raf=0;last=0;carry=0;
    }else refresh();
  });
  window.addEventListener("site-theme-change",()=>{
    paletteKey="";refresh();
  });
  motion.addEventListener?.("change",refresh);
  refresh();
})();