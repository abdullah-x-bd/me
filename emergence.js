(() => {
  "use strict";
  /*
   * Emergence | Living Swarm
   *
   * A field of soft dots, not strokes. Seven fuzzy colonies breathe, migrate,
   * drift, overlap, break apart and recombine without any visitor input.
   * Interaction is LOCAL to whichever dots are under the cursor, never
   * assigned to a fixed group: wakefulness diffuses to neighbouring regions,
   * waves propagate outwards, and old traces fade after the visitor leaves.
   *
   * Abstract generative artwork about collective behaviour and emergence.
   * No claims of modelling empirical results. No clicking or controls.
   */
  const canvas = document.getElementById("emergence-field");
  if (!canvas) return;
  const stage = canvas.closest(".emergence-stage");
  const ctx = canvas.getContext("2d", {alpha:true});
  if (!stage || !ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const mix = (a,b,t) => a+(b-a)*t;
  const TAU = Math.PI*2;
  const NX = 54, NY = 14, COLONIES = 7, MAX_WAVES = 9;
  const cells = NX*NY;
  const energy = new Float32Array(cells);
  const buffer = new Float32Array(cells);
  const waves = [];
  const point = {inside:false,x:.5,y:.5,tx:.5,ty:.5,engage:0,target:0,lastWaveX:.5,lastWaveY:.5,lastWaveTime:-10};

  let w=0,h=0,dpr=1,particles=[],visible=true,raf=0,lastTime=0,lastDraw=0;
  let clock=.85,pending=0,nextSpontaneous=3.1,themeKey="",colors=null;

  function random(seed){
    return ()=>{
      seed=(Math.imul(1664525,seed)+1013904223)>>>0;
      return seed/4294967296;
    };
  }
  const rand = random(913742);
  const noise = () => (rand()+rand()+rand()+rand()-2)*.70;

  function makeParticles(){
    // Each cloud occupies overlapping territory. No preset geometric motif.
    const count=Math.round(clamp(w*1.78,950,2190));
    const out=[];
    for(let i=0;i<count;i++){
      const group=i%COLONIES;
      const satellite=rand()<.11;
      const dx=noise()*(satellite?.22:.14);
      const dy=noise()*(satellite?.40:.29);
      const seed=rand(), phase=rand()*TAU;
      const p={
        id:i,group,dx,dy,seed,phase,
        jitter:rand()*TAU,light:rand(),radius:rand(),
        x:0,y:0,intensity:0,velocity:rand()
      };
      const home=habitat(p,clock);
      p.x=home.x;p.y=home.y;
      out.push(p);
    }
    return out;
  }

  function habitat(p,t){
    const g=p.group, a=p.phase;
    // Fuzzy groups change both shape and position, slowly merging and parting.
    const centerX=.105+g*.1315
      +.045*Math.sin(t*.29+g*1.43)
      +.020*Math.cos(t*.13+g*2.11);
    const centerY=.49+.145*Math.sin(t*.37+g*1.91)
      +.035*Math.cos(t*.21+g*.71);
    const expansion=1+.28*Math.sin(t*.52+g*.83);
    const stream=.014*Math.sin(t*.87+p.dy*13+a);
    return {
      x:centerX+p.dx*expansion+stream
        +.014*Math.cos(t*.47+p.dx*20+a),
      y:centerY+p.dy*(1+.18*Math.sin(t*.62+g))
        +.025*Math.sin(t*.78+p.dx*11+a)
    };
  }

  function addWave(x,y,power){
    waves.push({x,y,power,born:clock});
    if(waves.length>MAX_WAVES)waves.shift();
  }

  function inject(x,y,power,rx=2.5,ry=2.0){
    const gx=x*(NX-1),gy=y*(NY-1);
    const x0=Math.max(0,Math.floor(gx-rx*2)),x1=Math.min(NX-1,Math.ceil(gx+rx*2));
    const y0=Math.max(0,Math.floor(gy-ry*2)),y1=Math.min(NY-1,Math.ceil(gy+ry*2));
    for(let j=y0;j<=y1;j++){
      const yy=(j-gy)/ry;
      for(let i=x0;i<=x1;i++){
        const xx=(i-gx)/rx;
        const strength=Math.exp(-(xx*xx+yy*yy)*1.35)*power;
        const k=j*NX+i;
        energy[k]=Math.min(1,energy[k]+strength*(1-energy[k]));
      }
    }
  }

  function sample(x,y){
    const fx=clamp(x,0,1)*(NX-1),fy=clamp(y,0,1)*(NY-1);
    const a=Math.floor(fx),b=Math.floor(fy),c=Math.min(NX-1,a+1),d=Math.min(NY-1,b+1);
    const tx=fx-a,ty=fy-b;
    return mix(
      mix(energy[b*NX+a],energy[b*NX+c],tx),
      mix(energy[d*NX+a],energy[d*NX+c],tx),ty
    );
  }

  function updateEnergy(dt){
    const fade=Math.exp(-dt*.58);
    const spread=clamp(dt*6.7,0,.28);
    const width=w, height=h;
    for(let j=0;j<NY;j++){
      for(let i=0;i<NX;i++){
        const k=j*NX+i,e=energy[k];
        const a=energy[k-(i>0?1:0)],b=energy[k+(i<NX-1?1:0)];
        const c=energy[k-(j>0?NX:0)],d=energy[k+(j<NY-1?NX:0)];
        let value=mix(e,(a+b+c+d)*.25,spread)*fade;
        const x=i/(NX-1),y=j/(NY-1);

        // Each event creates an expanding wave, visible through local
        // activation of dots, not through a drawn circle or a fixed flower.
        for(let n=waves.length-1;n>=0;n--){
          const wave=waves[n];
          const age=clock-wave.born;
          if(age<0||age>4.8)continue;
          const dx=(x-wave.x)*width,dy=(y-wave.y)*height*1.25;
          const distance=Math.hypot(dx,dy);
          const radius=age*(width*.105+58);
          const spreadWidth=30+age*11;
          const ring=Math.exp(-Math.pow((distance-radius)/spreadWidth,2)*1.2)
            *wave.power*Math.exp(-age*.29);
          value=Math.max(value,ring*.78);
        }
        buffer[k]=Math.min(1,value);
      }
    }
    energy.set(buffer);

    if(point.inside){
      // Continuous local feedback while present, including when stationary.
      inject(point.tx,point.ty,clamp(dt*5,0,.25),2.5,2.4);
    }
  }

  function updateParticles(dt){
    const k=1-Math.exp(-dt*(reduced.matches?2.7:4.8));
    const activationK=1-Math.exp(-dt*8);
    for(const p of particles){
      const home=habitat(p,clock);
      let x=home.x,y=home.y;
      const a=sample(p.x,p.y);

      // Whichever dots are under the cursor respond; nothing is permanently
      // assigned to the pointer. Attraction is local, irregular and gentle.
      let nearness=0;
      if(point.engage>.001){
        const dx=(p.x-point.x)*w;
        const dy=(p.y-point.y)*h;
        nearness=Math.exp(-(dx*dx/(118*118)+dy*dy/(75*75))*1.35)*point.engage;
        const offset=.016*Math.sin(p.phase+clock*.71);
        x+=(point.x-p.x)*nearness*.34+offset*nearness;
        y+=(point.y-p.y)*nearness*.22+.016*Math.cos(p.phase*1.7+clock)*nearness;
      }

      // Local activation accelerates a region's independent motion and
      // transfers activity to neighbours by the diffusive energy substrate.
      const life=Math.max(a,nearness);
      x+=life*(.017*Math.cos(clock*2.1+p.phase*2.3)+.008*Math.sin(p.dy*22+clock*1.1));
      y+=life*(.025*Math.sin(clock*1.6+p.jitter)+.010*Math.cos(p.dx*25+clock*.9));
      const strength=k*(1+life*.75);
      p.x=mix(p.x,clamp(x,-.035,1.035),strength);
      p.y=mix(p.y,clamp(y,-.035,1.035),strength);
      p.intensity=mix(p.intensity,clamp(life,0,1),activationK);
    }
  }

  function getColors(){
    const theme=document.documentElement.dataset.theme==="dark"?"dark":"light";
    if(theme===themeKey&&colors)return colors;
    themeKey=theme;
    colors=theme==="dark"
      ? {
        base:[162,204,174],high:[184,244,204],warm:[238,195,133],
        halo:[113,177,138],alpha:.52,active:.92
      }
      : {
        base:[54,105,70],high:[56,151,94],warm:[176,127,75],
        halo:[99,157,116],alpha:.46,active:.86
      };
    return colors;
  }

  const rgba=(rgb,a)=>"rgba("+rgb.join(",")+","+clamp(a,0,1).toFixed(3)+")";

  function draw(){
    if(!w||!h||!particles.length)return;
    const pal=getColors();
    ctx.clearRect(0,0,w,h);

    const body=ctx.createRadialGradient(w*.5,h*.52,8,w*.5,h*.52,w*.53);
    body.addColorStop(0,rgba(pal.halo,.065));
    body.addColorStop(.64,rgba(pal.halo,.024));
    body.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=body;
    ctx.fillRect(0,0,w,h);

    // Twenty-four batched dot paths: 3 radii x 2 tones x 2 activity levels,
    // plus a second soft halo layer. Not a single line segment is rendered.
    const dots=Array.from({length:12},()=>[]);
    const glows=Array.from({length:3},()=>[]);
    let bright=0,visibleDots=0;
    for(const p of particles){
      const px=p.x*w,py=p.y*h;
      if(px<0||px>w||py<0||py>h)continue;
      const fade=clamp(Math.min(px,w-px)/(w*.055),0,1)
        *clamp(Math.min(py,h-py)/11,0,1);
      if(fade<=.08)continue;

      const active=p.intensity;
      const sizeKind=p.radius<.54?0:p.radius<.88?1:2;
      const brightKind=active>.22?1:0;
      const warmth=p.light>.965?1:0;
      const tone=warmth?2:brightKind;
      const size=[.73,1.12,1.74][sizeKind]*(1+.38*active);
      // Inactive particles remain present, but responsive areas feel luminous.
      const opacity=fade*(pal.alpha+active*.40)*(.78+p.seed*.22);
      const bin=(sizeKind*4)+(brightKind*2)+warmth;
      dots[bin].push(px,py,size,opacity);
      if(active>.26){
        glows[tone].push(px,py,size*(2.2+active),active*fade);
        bright++;
      }
      visibleDots++;
    }

    const base=pal.base,high=pal.high,warm=pal.warm;
    // Draw soft luminous halos behind active dots.
    for(let type=0;type<glows.length;type++){
      const g=glows[type];if(!g.length)continue;
      const color=type===2?warm:type===1?high:base;
      ctx.beginPath();
      for(let i=0;i<g.length;i+=4){
        const x=g[i],y=g[i+1],r=g[i+2];
        ctx.moveTo(x+r,y);
        ctx.arc(x,y,r,0,TAU);
      }
      ctx.fillStyle=rgba(color,type===2?.10:.11);
      ctx.fill();
    }

    // Use one shared alpha per batch to avoid thousands of style changes.
    for(let kind=0;kind<dots.length;kind++){
      const group=dots[kind];if(!group.length)continue;
      const brightness=(kind%4)>=2;
      const amber=(kind%2)===1;
      const color=amber?warm:brightness?high:base;
      const level=brightness?pal.active:pal.alpha+.14;
      ctx.beginPath();
      for(let i=0;i<group.length;i+=4){
        const x=group[i],y=group[i+1],r=group[i+2];
        ctx.moveTo(x+r,y);
        ctx.arc(x,y,r,0,TAU);
      }
      ctx.fillStyle=rgba(color,level);
      ctx.fill();
    }
  }

  function frame(ts){
    raf=0;
    if(document.hidden||!visible)return;
    const dt=lastTime?clamp((ts-lastTime)/1000,0,.052):1/60;
    lastTime=ts;pending+=dt;
    if(reduced.matches&&ts-lastDraw<58){schedule();return;}
    lastDraw=ts;
    const step=clamp(pending,0,.10);pending=0;
    clock+=step*(reduced.matches?.58:1);
    const f=1-Math.exp(-step*9);
    point.x=mix(point.x,point.tx,f);
    point.y=mix(point.y,point.ty,f);
    point.engage=mix(point.engage,point.target,1-Math.exp(-step*4.1));

    if(clock>=nextSpontaneous){
      const g=Math.floor(rand()*COLONIES);
      const x=clamp(.11+g*.13+.07*Math.sin(clock*.26+g),.05,.95);
      const y=clamp(.48+.18*Math.sin(clock*.31+g*1.5),.14,.86);
      addWave(x,y,.55);
      inject(x,y,.26,2,1.7);
      nextSpontaneous=clock+3.5+rand()*1.7;
    }

    updateEnergy(step);
    updateParticles(step);
    draw();
    schedule();
  }

  function schedule(){
    if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame);
  }

  function atPointer(e){
    if(e.pointerType==="touch")return;
    const bounds=stage.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const x=clamp((e.clientX-bounds.left)/bounds.width,0,1);
    const y=clamp((e.clientY-bounds.top)/bounds.height,0,1);
    const first=!point.inside;
    const dx=(x-point.lastWaveX)*w,dy=(y-point.lastWaveY)*h;
    point.tx=x;point.ty=y;point.inside=true;point.target=1;
    if(first){point.x=x;point.y=y;}
    // Instant local activation on every move. No throttle or click required.
    inject(x,y,first?.94:.38,2.25,2.25);
    if(first||Math.hypot(dx,dy)>42&&clock-point.lastWaveTime>.12){
      addWave(x,y,first?1.05:.72);
      point.lastWaveX=x;point.lastWaveY=y;point.lastWaveTime=clock;
    }
    schedule();
  }

  stage.addEventListener("pointerenter",atPointer,{passive:true});
  stage.addEventListener("pointermove",atPointer,{passive:true});
  stage.addEventListener("pointerleave",()=>{
    point.inside=false;point.target=0;
    // The energy grid, waves and colonies continue evolving independently.
  },{passive:true});

  function resize(){
    const r=stage.getBoundingClientRect();
    const ww=Math.round(r.width),hh=Math.round(r.height);
    if(ww<1||hh<1)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(ww===w&&hh===h&&ratio===dpr)return;
    const changed=ww!==w||hh!==h;
    w=ww;h=hh;dpr=ratio;
    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(changed||!particles.length)particles=makeParticles();
    draw();
  }

  function refresh(){resize();draw();schedule();}
  if("ResizeObserver" in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener("resize",refresh,{passive:true});
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible&&raf){cancelAnimationFrame(raf);raf=0;lastTime=0;pending=0;}
      if(visible)refresh();
    },{rootMargin:"100px"}).observe(stage);
  }
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      if(raf)cancelAnimationFrame(raf);
      raf=0;lastTime=0;pending=0;
    }else refresh();
  });
  window.addEventListener("site-theme-change",()=>{themeKey="";refresh();});
  reduced.addEventListener?.("change",()=>{lastDraw=0;refresh();});

  refresh();
})();
