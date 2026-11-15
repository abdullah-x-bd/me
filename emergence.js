(() => {
  'use strict';
  // ATTENTION / computational textile. Responsive canvas, no WebGL or assets.
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
  let resonance=[{x:.48,p:.6,r1:.12,r2:.81,age:1.2}];
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
    const autonom=t*.15;
    const src=focus.power*gauss(u-focus.x,.058);
    const r1=focus.power*.99*gauss(u-focus.r1,.065);
    const r2=focus.power*.90*gauss(u-focus.r2,.055);
    let after=0;
    for(const e of resonance)after+=e.p*gauss(u-e.x,.075);
    const creases = .47*Math.sin(u*13.2+autonom*.55)+.32*Math.cos(u*20.2-autonom*.4)
                   +.17*Math.sin(u*34.9+autonom*.6);
    const growth = .63+.37*Math.cos(v*2.8+u*6.7+autonom);
    const folded=creases*.24+ .15*Math.sin(u*5.5+autonom*.29);
    const depth=(.35*Math.cos(v*3.2+u*12.5+autonom*.7)+folded)
                +(.9*src+.83*r1-.65*r2)*Math.cos(v*3.0+u*3.6);
    // Lifting the weaving at 3 separate nonlocal positions adds volume, not a ripple.
    const lift=(src*1.47-r1*1.21+r2*1.18)*Math.sin(v*2.9+u*2.1);
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
    // Relation is deliberately long-range. Distinct regions respond together.
    let a=.09+.81*((.72-x*.71+.14*Math.sin(x*11+y*4))%1+1)%1;
    let b=.12+.75*((x*.40+.48+.13*Math.cos(x*8-y*5))%1+1)%1;
    if(Math.abs(a-x)<.20)a=x<.5?.83:.17;
    if(Math.abs(b-x)<.17)b=x<.5?.72:.23;
    if(Math.abs(a-b)<.12)b=(b+.28)%1;
    return [clamp(a,.07,.94),clamp(b,.07,.94)];
  }
  function ambient(){
    const x=.50+.35*Math.sin(t*.074),y=.42+.12*Math.cos(t*.084);
    const [a,b]=attentionTargets(x,y);
    focus.tx=x;focus.ty=y;
    focus.remote1=a;focus.remote2=b;
    focus.targetPower=.14+.08*(.5+.5*Math.sin(t*.29));
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

    // Attention is expressed as a lifted, many-to-many seam. These
    // hair-thin threads belong to the textile itself, not a node graph.
    const power=focus.power;
    if(power>.045){
      for(let z=0;z<2;z++){
        const targetX=z===0?focus.r1:focus.r2;
        const lift=(z===0?-1:1)*(H*.17+.012*W);
        const number=z===0?24:18;
        // Layers converge near the selected seam, then fan out across the fold.
        for(let i=0;i<number;i++){
          const v=(i/(number-1)-.5)*1.15;
          const source=surface(focus.x, v*.48+focus.y*.32-.16);
          const target=surface(targetX, (z===0?-.20:.26)+v*.65);
          const drift=(i-(number-1)*.5)/(number-1);
          const c1x=lerp(source.x,target.x,.33);
          const c2x=lerp(source.x,target.x,.67);
          const over=lift*(1-.31*Math.abs(drift));
          const offset=drift*H*.065;
          ctx.beginPath();ctx.moveTo(source.x,source.y);
          ctx.bezierCurveTo(c1x,source.y+over+offset,c2x,target.y+over-offset,target.x,target.y);
          ctx.lineWidth=(i%6===0?.84:.43);
          ctx.strokeStyle=rgba(pal.highlight,power*(i%6===0?.25:.10)*(z===0?1:.82));
          ctx.stroke();
        }
        // The seam itself catches light, but has no glowing circular node.
        for(let v=-.62;v<=.65;v+=.11){
          const q=surface(targetX,v);
          ctx.fillStyle=rgba(pal.highlight,power*.44);
          ctx.fillRect(q.x-.46,q.y-.55,.92,1.10);
        }
      }
      for(let v=-.62;v<=.65;v+=.11){
        const q=surface(focus.x,v);
        ctx.fillStyle=rgba(pal.highlight,power*.56);
        ctx.fillRect(q.x-.54,q.y-.6,1.08,1.20);
      }
    }

  }
  function tick(now){
    raf=0;if(document.hidden||!visible)return;
    const dt=last?clamp((now-last)/1000,0,.06):1/60;last=now;
    if(reduced.matches && now-lastDraw<32){schedule();return;}
    lastDraw=now;
    t+=dt*(reduced.matches?.45:1);
    if(!focus.inside)ambient();
    const k=1-Math.exp(-dt*5.9), slow=1-Math.exp(-dt*3.8);
    focus.x=lerp(focus.x,focus.tx,k);
    focus.y=lerp(focus.y,focus.ty,k);
    focus.r1=lerp(focus.r1,focus.remote1,slow);
    focus.r2=lerp(focus.r2,focus.remote2,slow);
    focus.power=lerp(focus.power,focus.targetPower,1-Math.exp(-dt*4));
    for(const e of resonance)e.p*=Math.exp(-dt*1.25);
    resonance=resonance.filter(e=>e.p>.012);
    paint();schedule();
  }
  function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick)}
  function pointer(e){
    const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    const x=clamp((e.clientX-r.left)/r.width,.02,.98);
    const y=clamp((e.clientY-r.top)/r.height,.04,.96);
    const [a,b]=attentionTargets(x,y);
    const distance=Math.abs(x-focus.tx);
    if(distance>.03)resonance.push({x:focus.tx,p:focus.power*.58,age:t});
    if(resonance.length>6)resonance.shift();
    focus.inside=true;
    focus.tx=x;focus.ty=y;
    focus.remote1=a;focus.remote2=b;
    focus.targetPower=1;
    schedule();
  }
  stage.addEventListener('pointerenter',pointer,{passive:true});
  stage.addEventListener('pointermove',pointer,{passive:true});
  stage.addEventListener('pointerleave',()=>{focus.inside=false;focus.targetPower=.15;},{passive:true});
  stage.addEventListener('pointercancel',()=>{focus.inside=false;focus.targetPower=.15;},{passive:true});
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