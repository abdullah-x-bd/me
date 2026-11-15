(() => {
  'use strict';
  /*
   * Emergence: distributed representation in a continuous latent field.
   * A neural-inspired nonlinear feature mixer evolves a high-dimensional
   * state. Thousands of dots reveal an intersecting, folded projection.
   * Pointer input changes distributed feature activations and therefore
   * rearranges distant regions instead of pushing away nearby particles.
   *
   * This is a conceptual artwork, not a trained model or empirical result.
   */
  const canvas = document.getElementById('emergence-field');
  if (!canvas) return;
  const stage = canvas.closest('.emergence-stage');
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx || !stage) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI*2;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = (x) => {const p=clamp(x,0,1);return p*p*(3-2*p);};
  const pulses=[];
  let w=0,h=0,dpr=1,points=[],theme='',color=null;
  let raf=0,last=0,t=0,visible=true,held=0,painted=0;
  const input={inside:false,x:.5,y:.5,targetX:.5,targetY:.5,weight:0,targetWeight:0,lastX:.5,lastY:.5,lastPulse:-9};
  const state=new Float32Array(8);
  const stateTarget=new Float32Array(8);
  const nonlinear=new Float32Array(14);
  let coherence=0, previousCoherence=0;

  function makePRNG(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  const rnd=makePRNG(20261115);
  const W1=Array.from({length:14},(_,i)=>Array.from({length:8},(_,j)=>
    Math.sin(i*2.781+j*1.317+i*j*.417)*.77+Math.cos(i*.671-j*1.479)*.40));
  const W2=Array.from({length:8},(_,i)=>Array.from({length:14},(_,j)=>
    Math.cos(i*1.73+j*1.813+i*j*.297)*.46));

  function palette(){
    const next=document.documentElement.dataset.theme==='dark'?'dark':'light';
    if(next===theme&&color)return color;
    theme=next;
    color=theme==='dark'?{
      main:['166,230,190','110,187,151','204,248,209'],
      gold:'249,199,132',
      halo:'rgba(109,196,145,.115)',
      cloud:'rgba(114,190,143,.060)'
    }:{
      main:['21,87,52','48,127,82','28,103,63'],
      gold:'169,108,58',
      halo:'rgba(83,151,99,.070)',
      cloud:'rgba(67,136,85,.044)'
    };
    return color;
  }
  const rgba=(rgb,a)=>'rgba('+rgb+','+clamp(a,0,1).toFixed(3)+')';

  function makePoints(){
    const n=Math.round(clamp(w*10.0,5100,12600));
    const list=[];
    for(let i=0;i<n;i++){
      const u=(i*.61803398875+.13)%1*2-1;
      const v=(i*.75487766625+.19)%1*2-1;
      const z=(i*.569840291+.71)%1*2-1;
      const sheet=i%4;
      const q=rnd(),r=rnd(),s=rnd();
      list.push({u,v,z,sheet,q,r,s,phase:rnd()*TAU,thickness:rnd(),shine:rnd(),sourceX:u*.96,sourceY:v*.90,px:0,py:0,size:0,alpha:0,accent:false});
    }
    return list;
  }

  function makeInput(t){
    const p=input;
    // Nonlinear mixed features vary continuously, with no hand-drawn
    // destination shapes or fixed set of responses to pointer positions.
    const values=[
      Math.sin(t*.51),Math.cos(t*.35),Math.sin(t*.21+1.7),
      p.weight*Math.sin(p.x*TAU*1.7),
      p.weight*Math.cos(p.y*TAU*1.25),
      p.weight*(2*p.x-1),
      p.weight*(2*p.y-1),
      Math.sin(t*.13+p.x*p.weight*5.2)
    ];
    for(let j=0;j<14;j++){
      let sum=(j%3-1)*.23;
      for(let k=0;k<8;k++)sum+=W1[j][k]*values[k];
      nonlinear[j]=Math.tanh(sum*.65);
    }
    for(let j=0;j<8;j++){
      let sum=0;
      for(let k=0;k<14;k++)sum+=W2[j][k]*nonlinear[k];
      stateTarget[j]=Math.tanh(sum*.84);
    }
  }

  function addPulse(x,y,power){
    pulses.push({x,y,born:t,power});
    if(pulses.length>7)pulses.shift();
  }

  function project(p,time,coh){
    const u=p.u,v=p.v,L=p.sheet;
    const s=state,m=p.phase;
    const secondary=L>=2;
    // Two interacting feature subspaces are folded into the same projected
    // representation. Their intersection is not a scripted icon or motif.
    const phase=u*(secondary?4.2:5.8)
      +1.2*Math.sin(u*(secondary?3.6:2.8)+s[secondary?4:0]*2.3)
      +(L%2)*.53+s[secondary?6:1]*2.4+time*(secondary?-.21:.14);
    const body=secondary
      ? (-.26*Math.sin(u*2.3+s[5]*2.5)
          +.28*Math.sin(u*6.6+s[6]*2.0+.6)
          +.09*Math.cos(u*10.8+s[0]*1.6))
      : (.40*Math.sin(phase)+.13*Math.sin(u*3.1+s[5]*2.4))
          *(.90+.10*Math.cos(u*2.5+s[2]));
    const foldSize=(secondary?.075:.085)+.13*Math.abs(Math.cos(u*4.4+(L%2)*1.6+s[7]*1.3));
    const fold=v*foldSize*(.75+.4*Math.cos(phase+v*.95));
    const depth=.41*Math.cos(phase+v*2.8)+.18*Math.sin(u*3.3+v*2.9+s[2]*2);
    const perspective=1/(1+.19*depth);
    const manifoldX=(u*.87+
      (secondary?-.11:.11)*Math.sin(v*4.1+phase)*Math.cos(u*3.2+s[6]*2)
      +depth*(secondary?-.07:.07))*perspective;
    const manifoldY=(body+fold+(L%2?-.035:.035)+depth*(secondary?-.10:.12)
      +.048*Math.sin(u*13.0+v*2.5+s[4]*2.7))*perspective;
    const wanderingX=p.sourceX+.12*Math.sin(time*.19+m*1.8+p.v*6);
    const wanderingY=p.sourceY*.74+.075*Math.sin(time*.25+m+p.u*8);
    const mixLevel=smooth((coh-.24)/.64);
    const localScatter=(1-mixLevel)*.035;
    return {
      x:mix(wanderingX,manifoldX,mixLevel)+Math.sin(m+time*.37)*localScatter,
      y:mix(wanderingY,manifoldY,mixLevel)+Math.cos(m*1.3+time*.31)*localScatter,
      depth,
      morph:mixLevel,
      resonance: Math.pow(.5+.5*Math.sin(phase*2+v*5+s[3]*3),3)
    };
  }

  function pulseStrength(u){
    let power=0;
    for(const p of pulses){
      const age=t-p.born;
      if(age<0||age>4.0)continue;
      const radius=age*.38;
      const separation=Math.abs(u*.5+.5-p.x);
      const envelope=Math.exp(-Math.pow((separation-radius)*8.5,2))*Math.exp(-age*.42);
      power=Math.max(power,p.power*envelope);
    }
    return power;
  }

  function update(dt){
    const p=input,follow=1-Math.exp(-dt*5.2);
    p.x=mix(p.x,p.targetX,follow);p.y=mix(p.y,p.targetY,follow);
    p.weight=mix(p.weight,p.targetWeight,1-Math.exp(-dt*3.8));
    makeInput(t);
    const k=1-Math.exp(-dt*2.3);
    for(let j=0;j<8;j++)state[j]=mix(state[j],stateTarget[j],k);

    // Smooth, critical-threshold coherence transition: diffuse activity
    // becomes a legible folded representation, then reorganizes again.
    const drive=.5+.5*Math.sin(t*.53-.32)+.045*Math.sin(t*.23+1.7);
    const critical=1/(1+Math.exp(-(drive-.59)*14.0));
    const target=.15+.84*critical;
    coherence=mix(coherence,target,1-Math.exp(-dt*4.5));
    if(previousCoherence<.70 && coherence>=.70){
      const source=clamp(.5+state[2]*.24,.08,.92);
      addPulse(source,.5,1.25);
    }
    previousCoherence=coherence;

    const c=clamp(coherence+p.weight*.11,0,1);
    for(const dot of points){
      const v=project(dot,t,c);
      const pulse=pulseStrength(dot.u);
      dot.px=w*(.5+v.x*.485);
      dot.py=h*(.5+v.y*.485);
      const depthIllum=.62+.36*(v.depth+1)*.5;
      const focus=Math.pow(.5+.5*Math.sin(dot.v*11.0+dot.u*12.0+state[1]*2+dot.sheet*.8),2);
      dot.alpha=clamp((.21+.55*v.morph)*depthIllum*(.70+.60*focus)+pulse*.38,0,1);
      dot.size=clamp(.60+dot.thickness*.96+Math.max(0,v.depth)*.52+pulse*1.2, .38, 3.2);
      dot.accent=(pulse>.24 && dot.shine>.42) || (dot.shine>.955 && v.morph>.55);
      dot.layer=clamp(Math.floor((v.depth+1)*1.6),0,3);
    }
  }

  function draw(){
    if(!w||!h)return;
    const pal=palette();
    ctx.clearRect(0,0,w,h);
    const grad=ctx.createRadialGradient(w*.5,h*.51,h*.04,w*.5,h*.51,w*.44);
    grad.addColorStop(0,pal.halo);
    grad.addColorStop(.53,pal.cloud);
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,w,h);

    // Sparse shared feature illuminations make the distributed activity
    // visible without adding a conventional neural graph or connecting lines.
    if(coherence>.52){
      const intensity=smooth((coherence-.52)/.44);
      for(let j=0;j<3;j++){
        const u=clamp((j-1)*.48+state[j+2]*.13,-.84,.84);
        const fy=.5+.16*Math.sin(u*6.5+state[j]*2.0+j*1.4);
        const fx=w*(.5+u*.45);
        const py=h*fy;
        const radius=h*(.34+.05*j);
        const aura=ctx.createRadialGradient(fx,py,0,fx,py,radius);
        aura.addColorStop(0,rgba(pal.main[j%3],intensity*(theme==='dark'?.078:.043)));
        aura.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=aura;
        ctx.fillRect(fx-radius,py-radius,radius*2,radius*2);
      }
    }

    // Batched point-only rendering with depth and illumination distinctions.
    const buckets=Array.from({length:12},()=>[]);
    for(const p of points){
      if(p.px<0||p.px>w||p.py<0||p.py>h)continue;
      const border=clamp(Math.min(p.px,w-p.px)/(w*.05),0,1)
        *clamp(Math.min(p.py,h-p.py)/9,0,1);
      if(border<.04||p.alpha<.13)continue;
      const sz=p.size*border;
      const sizeGroup=sz<.95?0:sz<1.55?1:2;
      const group=p.accent?2:p.layer>1?1:0;
      buckets[sizeGroup*4+group].push(p.px,p.py);
    }
    const alpha=[.29,.43,.59];
    const radii=[.65,1.15,1.78];
    for(let n=0;n<12;n++){
      const data=buckets[n];if(!data.length)continue;
      const shade=n%4;
      const size=Math.floor(n/4);
      ctx.beginPath();
      const r=radii[size];
      for(let i=0;i<data.length;i+=2){
        ctx.moveTo(data[i]+r,data[i+1]);
        ctx.arc(data[i],data[i+1],r,0,TAU);
      }
      const v=shade===2?pal.gold:pal.main[shade===1?2:0];
      ctx.fillStyle=rgba(v,shade===2?.73:alpha[size]+coherence*.20);
      ctx.fill();
    }
  }

  function fit(){
    const rect=stage.getBoundingClientRect();
    const ww=Math.round(rect.width),hh=Math.round(rect.height);
    if(!ww||!hh)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(w===ww&&h===hh&&dpr===ratio)return;
    w=ww;h=hh;dpr=ratio;
    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    points=makePoints();
    for(let j=0;j<8;j++)state[j]=0;
    update(1/60);
    draw();
  }

  function move(e){
    if(e.pointerType==='touch')return;
    const rect=stage.getBoundingClientRect();
    const x=clamp((e.clientX-rect.left)/rect.width,0,1);
    const y=clamp((e.clientY-rect.top)/rect.height,0,1);
    const first=!input.inside;
    const travel=Math.hypot((x-input.lastX)*w,(y-input.lastY)*h);
    input.inside=true;
    input.targetX=x;
    input.targetY=y;
    input.targetWeight=1;
    if(first){
      input.x=x;
      input.y=y;
      addPulse(x,y,1.0);
      input.lastPulse=t;
      input.lastX=x;
      input.lastY=y;
    }else if(travel>65&&t-input.lastPulse>.15){
      addPulse(x,y,.85);
      input.lastPulse=t;
      input.lastX=x;
      input.lastY=y;
    }
    schedule();
  }
  stage.addEventListener('pointerenter',move,{passive:true});
  stage.addEventListener('pointermove',move,{passive:true});
  stage.addEventListener('pointerleave',()=>{
    input.inside=false;
    input.targetWeight=0;
  },{passive:true});

  function tick(now){
    raf=0;
    if(!visible||document.hidden)return;
    const dt=last?clamp((now-last)/1000,0,.055):1/60;
    last=now;
    held+=dt;
    if(reduced.matches&&now-painted<60){schedule();return;}
    painted=now;
    const d=clamp(held,0,.11);
    held=0;
    t+=d*(reduced.matches?.67:1);
    update(d);
    draw();
    schedule();
  }
  function schedule(){
    if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  function refresh(){fit();schedule();}
  if('ResizeObserver' in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener('resize',refresh,{passive:true});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible&&raf){cancelAnimationFrame(raf);raf=0;last=0;held=0;}
      if(visible)refresh();
    },{rootMargin:'110px'}).observe(stage);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      if(raf)cancelAnimationFrame(raf);
      raf=0;last=0;held=0;
    }else refresh();
  });
  window.addEventListener('site-theme-change',()=>{theme='';refresh();});
  reduced.addEventListener?.('change',()=>{painted=0;refresh();});
  refresh();
})();
