(() => {
  'use strict';
  // ATTENTION / computational textile. Slow, composed, and locally interactive.
  const canvas=document.getElementById('emergence-field');
  const stage=canvas?.closest('.emergence-stage');
  const ctx=canvas?.getContext('2d', {alpha:true});
  if(!canvas||!stage||!ctx)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const gauss=(x,s)=>Math.exp(-.5*x*x/(s*s));
  let W=0,H=0,DPR=1,t=0,last=0,raf=0,visible=true,theme='',P=null,lastDraw=0;
  let focus={inside:false,x:.43,y:.5,power:0,tx:.43,ty:.5,targetPower:0,remote1:.77,remote2:.13,r1:.77,r2:.13};
  let resonance=[];
  // An attention connection has a visible lifespan, independent of RAF speed
  // or how many pointermove events the browser sends.
  let seams=[];
  let lastSelection=-10;
  let lastSelectedX=.43;
  let nextAmbientSelection=2.6;
  function selectSeam(x,y,strength){
    const [a,b]=attentionTargets(x,y);
    const far=Math.abs(x-a)>=Math.abs(x-b)?a:b;
    const near=far===a?b:a;
    for(const seam of seams) seam.release=Math.min(seam.release,t+.95);
    seams.push({x,y,far,near,born:t,release:t+5.0,strength});
    seams=seams.slice(-2);
    lastSelection=t;lastSelectedX=x;
  }
  function seamStrength(seam){
    return seam.strength*smooth((t-seam.born)/.82)*smooth((seam.release-t)/1.35);
  }
  let levels=64,segments=160;
  function palette(){
    const next=document.documentElement.dataset.theme==='dark'?'dark':'light';
    if(next===theme&&P)return P;
    theme=next;
    P=theme==='dark'?{
      fiber:[176,216,186],mid:[116,169,137],fine:[201,230,200],
      highlight:[240,195,125],shadow:[37,82,60],background:[76,136,97],
      glyph:[220,235,217], strength:1.12
    }:{
      fiber:[48,99,64],mid:[101,152,108],fine:[36,93,59],
      highlight:[163,113,66],shadow:[110,156,113],background:[91,151,105],
      glyph:[44,105,68],strength:1
    };
    return P;
  }
  const rgba=(rgb,a)=>'rgba('+rgb.join(',')+','+clamp(a,0,1).toFixed(3)+')';

  // This is a continuous doubly curved woven surface, not a plot of attention weights.
  // Separate folds are dynamically coupled by the non-local focus rule below.
  function surface(u,v){
    const autonom=t*.075;
    const src=focus.power*.80*gauss(u-focus.x,.072);
    const r1=focus.power*.73*gauss(u-focus.r1,.075);
    const r2=focus.power*.65*gauss(u-focus.r2,.067);
    let after=0;
    for(const e of resonance)after+=e.p*gauss(u-e.x,.085);
    const creases = .47*Math.sin(u*13.2+autonom*.55)+.32*Math.cos(u*20.2-autonom*.4)
                   +.17*Math.sin(u*34.9+autonom*.6);
    const growth = .63+.37*Math.cos(v*2.8+u*6.7+autonom);
    const folded=creases*.24+ .15*Math.sin(u*5.5+autonom*.29);
    const depth=(.35*Math.cos(v*3.2+u*12.5+autonom*.7)+folded)
                +(.69*src+.61*r1-.48*r2)*Math.cos(v*3.0+u*3.6);
    // Lifting the weaving at 3 separate nonlocal positions adds volume, not a ripple.
    const lift=(src*.94-r1*.85+r2*.81)*Math.sin(v*2.9+u*2.1);
    const lateral=.012*Math.sin(v*5.6+u*6.9+autonom*.54)
                   +.013*depth*Math.sin(v*2.9+u*4.1);
    const center=.5+.044*Math.sin(u*8.0+autonom*.16)+.025*Math.cos(u*16.8-autonom*.31);
    const thickness=.18+.035*Math.cos(u*10.0+autonom*.32)+.030*Math.sin(u*16.0-autonom*.4);
    // Three stationary compression folds impart an origami-like structure.
    // They are part of the textile, not icons and not cursor decorations.
    const pleat1=.092*gauss(u-.215,.044)*Math.sin(v*4.35+.85);
    const pleat2=-.112*gauss(u-.515,.052)*Math.sin(v*4.05-.48);
    const pleat3=.078*gauss(u-.815,.054)*Math.sin(v*4.8+.61);
    const pleat=(pleat1+pleat2+pleat3)*(W<580?.57:1);
    const X = .055+u*.89+lateral+pleat*.19*Math.cos(v*3.4);
    const Y = center+v*thickness*(1+.22*growth)+depth*.083+lift*(W<580?.095:.142)
      +pleat+after*.017*Math.cos(v*5+u*8);
    return {x:X*W,y:Y*H,z:depth,react:src+r1+r2,edge:Math.min(u,1-u)};
  }
  function attentionTargets(x,y){
    // Two spatially separated anchors vary smoothly with input. No modulo
    // arithmetic, branch switching, or wraparound discontinuity.
    const left=.18+.055*(1-x)+.022*Math.sin(x*3.2+y*1.1);
    const right=.79+.055*x+.022*Math.cos(x*2.8-y*1.5);
    return [clamp(left,.12,.29),clamp(right,.71,.90)];
  }
  function ambient(){
    const x=.50+.21*Math.sin(t*.043),y=.45+.06*Math.cos(t*.052);
    const [a,b]=attentionTargets(x,y);
    focus.tx=x;focus.ty=y;
    focus.remote1=a;focus.remote2=b;
    focus.targetPower=.085+.035*(.5+.5*Math.sin(t*.17));
    if(t>=nextAmbientSelection){
      selectSeam(x,y,.36);
      nextAmbientSelection=t+6.8;
    }
  }
  function paint(){
    if(!W||!H)return;
    const pal=palette();
    ctx.clearRect(0,0,W,H);
    const light=ctx.createRadialGradient(W*.5,H*.48,H*.02,W*.5,H*.48,W*.46);
    light.addColorStop(0,rgba(pal.background,theme==='dark'?.060:.030));
    light.addColorStop(.72,rgba(pal.background,theme==='dark'?.019:.010));
    light.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=light;ctx.fillRect(0,0,W,H);

    // Woven strands: fine smooth uninterrupted B-spline-like contour lines.
    // Occluding ribbons between contours provide the shading of a pleated sheet.
    const mesh=[];
    for(let j=0;j<=levels;j++){
      const v=(j/levels)*2-1;
      const row=[];
      for(let i=0;i<=segments;i++)row.push(surface(i/segments,v));
      mesh.push(row);
    }

    for(let j=0;j<levels;j++){
      const a=mesh[j],b=mesh[j+1];
      // Contiguous strips create subtle 3-dimensional chiaroscuro.
      for(let k=0;k<segments;k+=4){
        const c=a[k+2],depth=c.z,brightness=clamp((depth+.7)*.5,0,1);
        const edge=gauss(j/levels-.5,.51);
        const bandIndex=j/levels;
        const tint = (depth+.13*Math.sin(bandIndex*15+t*.12))>0?pal.mid:pal.shadow;
        const alp=(theme==='dark'?.021:.018)+brightness*(theme==='dark'?.050:.041);
        ctx.fillStyle=rgba(tint,alp*edge);
        ctx.beginPath();
        ctx.moveTo(a[k].x,a[k].y);
        for(let n=k+1;n<=Math.min(k+4,segments);n++)ctx.lineTo(a[n].x,a[n].y);
        for(let n=Math.min(k+4,segments);n>=k;n--)ctx.lineTo(b[n].x,b[n].y);
        ctx.closePath();ctx.fill();
      }
    }

    // 65 layers of exceptionally thin filaments, with depth-aware opacity.
    for(let j=0;j<=levels;j++){
      const row=mesh[j], v=(j/levels)*2-1;
      const central=1-Math.abs(v);
      const accent=j%11===0;
      const rgb=accent?pal.fine:(j%3===0?pal.fiber:pal.mid);
      const baseline=(theme==='dark'?.31:.31)+central*.16;
      ctx.lineWidth=accent?1.05:.58;
      ctx.beginPath();
      ctx.moveTo(row[0].x,row[0].y);
      for(let i=1;i<=segments;i++)ctx.lineTo(row[i].x,row[i].y);
      ctx.strokeStyle=rgba(rgb,baseline);
      ctx.stroke();
    }
    // Warp threads almost perpendicular to the long filaments. These make
    // the plane read as a physical textile rather than just wavy contour art.
    for(let i=2;i<segments;i+=3){
      const p=.27+.26*Math.cos(i*.091+t*.05);
      const bright=i%15===2;
      ctx.strokeStyle=rgba(bright?pal.fiber:pal.mid,(bright?.17:.064)*pal.strength);
      ctx.lineWidth=bright?.75:.45;
      ctx.beginPath();
      ctx.moveTo(mesh[0][i].x,mesh[0][i].y);
      for(let j=2;j<=levels;j+=2)ctx.lineTo(mesh[j][i].x,mesh[j][i].y);
      ctx.stroke();
    }

    // Only one principal relation is visible most of the time. A former
    // relation can overlap briefly as it fades, producing a legible transfer
    // of attention rather than dozens of constantly changing strokes.
    for(const seam of seams){
      const energy=seamStrength(seam);
      if(energy<.015)continue;
      for(let side=0;side<2;side++){
        // One remote fold is the primary relation. The second is a subdued echo.
        const targetX=side===0?seam.far:seam.near;
        const count=side===0?13:6;
        const weight=energy*(side===0?1:.43);
        const lift=(side===0?-1:1)*(H*.14+.009*W);
        for(let i=0;i<count;i++){
          const v=(i/(count-1)-.5)*1.05;
          const source=surface(seam.x,v*.49+seam.y*.27-.14);
          const target=surface(targetX,(side===0?-.20:.23)+v*.63);
          const drift=(i-(count-1)*.5)/(count-1);
          const offset=drift*H*.047;
          const curve=lift*(1-.30*Math.abs(drift));
          ctx.beginPath();
          ctx.moveTo(source.x,source.y);
          ctx.bezierCurveTo(
            lerp(source.x,target.x,.34),source.y+curve+offset,
            lerp(source.x,target.x,.66),target.y+curve-offset,
            target.x,target.y
          );
          ctx.lineWidth=i%4===0?.92:.54;
          ctx.strokeStyle=rgba(pal.highlight,weight*(i%4===0?.43:.24));
          ctx.stroke();
        }
        // Gold catches on the actual fibers, with no circular connection nodes.
        for(let v=-.53;v<=.54;v+=.14){
          const q=surface(targetX,v);
          ctx.fillStyle=rgba(pal.highlight,weight*.35);
          ctx.fillRect(q.x-.40,q.y-.51,.8,1.02);
        }
      }
      for(let v=-.53;v<=.54;v+=.14){
        const q=surface(seam.x,v);
        ctx.fillStyle=rgba(pal.highlight,energy*.39);
        ctx.fillRect(q.x-.46,q.y-.53,.92,1.06);
      }
    }

  }
  function tick(now){
    raf=0;if(document.hidden||!visible)return;
    const dt=last?clamp((now-last)/1000,0,.06):1/60;last=now;
    if(reduced.matches&&now-lastDraw<38){schedule();return;}
    lastDraw=now;
    t+=dt*(reduced.matches?.45:1);
    if(!focus.inside)ambient();
    const follow=1-Math.exp(-dt*2.9);
    const remoteFollow=1-Math.exp(-dt*1.65);
    focus.x=lerp(focus.x,focus.tx,follow);
    focus.y=lerp(focus.y,focus.ty,follow);
    focus.r1=lerp(focus.r1,focus.remote1,remoteFollow);
    focus.r2=lerp(focus.r2,focus.remote2,remoteFollow);
    focus.power=lerp(focus.power,focus.targetPower,1-Math.exp(-dt*2.3));
    // The active connection follows attention gradually while older ones
    // remain as a brief visual memory of the previous region.
    if(focus.inside&&seams.length){
      const active=seams[seams.length-1];
      active.x=lerp(active.x,focus.x,1-Math.exp(-dt*.82));
      active.y=lerp(active.y,focus.y,1-Math.exp(-dt*.70));
    }
    for(const e of resonance)e.p*=Math.exp(-dt*.80);
    resonance=resonance.filter(e=>e.p>.018).slice(-3);
    seams=seams.filter(seam=>t<seam.release);
    paint();schedule();
  }
  function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick)}
  function pointer(e){
    if(e.pointerType==='touch')return;
    const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    const x=clamp((e.clientX-r.left)/r.width,.02,.98);
    const y=clamp((e.clientY-r.top)/r.height,.04,.96);
    const [a,b]=attentionTargets(x,y);
    const entering=!focus.inside;
    focus.inside=true;
    focus.tx=x;focus.ty=y;
    focus.remote1=a;focus.remote2=b;
    focus.targetPower=.84;
    if(entering){
      selectSeam(x,y,1);
      resonance=[];
    }else if(Math.abs(x-lastSelectedX)>.155&&t-lastSelection>1.65){
      resonance.push({x:lastSelectedX,p:.20});
      selectSeam(x,y,1);
    }
    schedule();
  }
  stage.addEventListener('pointerenter',pointer,{passive:true});
  stage.addEventListener('pointermove',pointer,{passive:true});
  stage.addEventListener('pointerleave',()=>{
    focus.inside=false;
    focus.targetPower=.11;
    // Let the current relation finish fading, without snapping back.
  },{passive:true});
  stage.addEventListener('pointercancel',()=>{focus.inside=false;focus.targetPower=.11;},{passive:true});
  function fit(){
    const r=stage.getBoundingClientRect();const ww=Math.round(r.width),hh=Math.round(r.height);
    if(!ww||!hh)return;
    const pd=Math.min(window.devicePixelRatio||1,1.6);
    if(ww===W&&hh===H&&pd===DPR)return;
    W=ww;H=hh;DPR=pd;levels=W<580?40:64;segments=W<580?100:160;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);paint();
  }
  function refresh(){fit();schedule()}
  if('ResizeObserver'in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener('resize',refresh,{passive:true});
  if('IntersectionObserver'in window)new IntersectionObserver(es=>{
    visible=es[0].isIntersecting;
    if(!visible&&raf){cancelAnimationFrame(raf);raf=0;last=0;}
    if(visible)refresh();
  },{rootMargin:'130px'}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}else refresh()});
  window.addEventListener('site-theme-change',refresh);
  reduced.addEventListener?.('change',refresh);
  refresh();
})();