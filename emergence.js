(() => {
  'use strict';
  /* The Unseen Model. Original, interactive computational sculpture.
     An online adaptive predictor learns cursor motion. Prediction errors
     drive nonlocal structural reconfiguration of a raymarched metamaterial.
     This is a conceptual artwork, not a trained neural network. */
  const canvas = document.getElementById('emergence-field');
  const stage = canvas?.closest('.emergence-stage');
  if (!canvas || !stage) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const G=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
  const vert=`attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;
  const frag=`precision highp float;
  uniform vec2 res;
  uniform float time;
  uniform float dark;
  uniform vec2 cursor;
  uniform vec2 predicted;
  uniform float attention;
  uniform float surprise;
  uniform float memory;
  uniform float morph;
  uniform float phase;
  uniform float age;
  #define PI 3.14159265
  float sat(float x){return clamp(x,0.0,1.0);}
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
  float gyroid(vec3 p){return dot(sin(p),cos(p.zxy));}
  float mapS(vec3 p){
    float x=p.x;
    float env=1.0+0.09*sin(x*2.18+time*.55+phase)+.09*sin(x*4.4+phase*.72);
    float center=.13*sin(x*1.45+time*.35+phase*.7);
    float fieldPulse=surprise*(.8+.2*cos(x*5.8+phase*4.3));
    p.y-=center+.085*fieldPulse*sin(x*4.5+phase*2.1);
    p.z+=memory*.10*sin(x*4.1+p.y*6.2+time*.12);
    vec3 tile=floor((p+vec3(2.0,.8,.8))*vec3(3.1,5.1,4.1));
    vec3 displacement=vec3(hash(tile),hash(tile+vec3(7.1)),hash(tile+vec3(13.7)))-.5;
    p+=surprise*displacement*.23;
    p.yz=rot(.13*sin(x*1.75+phase+time*.28)+.35*fieldPulse)*p.yz;
    // Enclosure is an irregular carved horizontal solid, not a wavy ribbon.
    float taper=1.0-.92*smoothstep(1.14,2.08,abs(x));
    float bound=length(vec2(p.y/(.45*env*taper),p.z/(.51*env*taper)))-1.0;
    bound=max(bound*.38,(abs(x)-2.055)*.54);
    // Multiple competing folded feature scales open and close its pores.
    vec3 q=p*vec3(10.4,12.2,10.5);
    q.xy+=vec2(.47*sin(x*3.4+phase),.33*cos(x*2.1+phase*1.3));
    q.xz=rot(.25*sin(x*1.2+time*.4)+.31*surprise)*q.xz;
    float g=gyroid(q);
    float h=gyroid(q*1.63+vec3(2.1,0.6,-1.3)+phase*.3);
    float blend=mix(g,.66*g+.43*h,morph);
    float walls=(abs(blend)-(.43+.07*sin(x*2.7+phase)))*.052;
    // Open central chamber, with folds bridging through and across it.
    float bore=length(vec2(p.y-.08*sin(x*2.7+phase),p.z*.95))-(.20+.07*sin(x*3.1+phase));
    float central=max(bound,max(walls,-bore));
    // Secondary cross bracing adds depth and structural continuity.
    float rib=length(vec2(sin(x*3.5+phase*.4)*.27-p.y,p.z-.26*cos(x*3.5+phase*.4)))-.040;
    float shell=min(central,max(rib,bound));
    // Prediction opens a small local cavity ahead of the visitor.
    vec2 pred=(predicted-.5)*vec2(res.x/res.y,-1.);
    vec3 focus=vec3(pred.x*1.05,pred.y*1.03,.20);
    if(attention>.03){
      float predictionCavity=length((p-focus)*vec3(.95,1.2,.8))-(.06+.25*attention);
      shell=max(shell,-predictionCavity);
    }
    // Surprise fractures the solid into tiny crystalline, irregular cells,
    // rather than forcing it into another horizontal ribbon shape.
    if(surprise>.05){
      vec3 fracCoord=fract((p+vec3(1.1,.7,.9))*vec3(3.1,5.1,4.1));
      vec3 edge=min(fracCoord,1.-fracCoord);
      float seam=min(edge.x,min(edge.y,edge.z));
      shell=max(shell,(.045*surprise-.005-seam)*.23);
    }
    return shell;
  }
  vec3 normal(vec3 p){float e=.004;return normalize(vec3(
    mapS(p+vec3(e,0,0))-mapS(p-vec3(e,0,0)),
    mapS(p+vec3(0,e,0))-mapS(p-vec3(0,e,0)),
    mapS(p+vec3(0,0,e))-mapS(p-vec3(0,0,e))));}
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*res)/res.y;
    vec3 ro=vec3(uv.x*1.05,uv.y*1.03,3.4);
    vec3 rd=vec3(0,0,-1);
    float t=2.55;float hit=0.;vec3 p=ro;
    for(int i=0;i<68;i++){
      p=ro+rd*t;
      float d=mapS(p);
      if(d<.0035){hit=1.;break;}
      t+=max(d*.66,.005);
      if(t>4.65)break;
    }
    float edgeFade=1.0-smoothstep(1.96,2.57,abs(uv.x));
    if(hit>0.5){
      vec3 n=normal(p);
      vec3 lightDir=normalize(vec3(-.54,.92,1.35));
      float diffuse=.19+.81*max(dot(n,lightDir),0.);
      float rim=pow(1.0-sat(n.z),2.6);
      float spec=pow(max(dot(reflect(-lightDir,n),vec3(0,0,1)),0.),22.0);
      float copper=.5+.5*sin(p.x*8.2+p.y*12.6+p.z*7.4+phase*2.3);
      copper=smoothstep(.83,.97,copper)*(.24+.65*surprise+.18*morph);
      vec3 jade=dark>.5?vec3(.16,.45,.29):vec3(.045,.23,.14);
      vec3 highlight=dark>.5?vec3(.66,.92,.71):vec3(.53,.73,.57);
      vec3 bronze=dark>.5?vec3(.99,.68,.38):vec3(.69,.43,.25);
      float etching=.78+.22*sin(p.x*65.+p.y*36.+p.z*21.+phase*4.);
      vec3 albedo=mix(jade,highlight,.37+.42*max(n.z,0.));
      albedo=mix(albedo,bronze,copper);
      float ao=.60+.40*max(0.,mapS(p+n*.075)/.075);
      vec3 col=albedo*(diffuse*.94+.19)*ao*etching;
      col+=spec*(dark>.5?.56:.32)*highlight;
      col+=rim*(dark>.5?.28:.18)*highlight;
      // A predicted position appears as an internal illumination, not a cursor ring.
      vec2 target=vec2((predicted.x-.5)*res.x/res.y,-(predicted.y-.5));
      float predictedLight=attention*exp(-pow((uv.x-target.x)*3.8,2.)-pow((uv.y-target.y)*4.2,2.));
      col+=bronze*predictedLight*.49*(.6+.4*abs(n.z));
      float shimmer=.25+.75*abs(sin(time*.54+p.x*8.+phase));
      col+=highlight*surprise*.16*shimmer;
      float alpha=sat(edgeFade*(.92+.08*diffuse));
      gl_FragColor=vec4(col,alpha);
    }else{
      // Negative space stays transparent, allowing the editorial page to breathe.
      float shadow=exp(-pow(uv.y*2.6,2.))*exp(-pow(uv.x*.54,4.));
      float glimmer=exp(-pow(uv.y*5.,2.))*exp(-pow(uv.x*.56,2.));
      vec3 tint=dark>.5?vec3(.27,.48,.34):vec3(.33,.48,.36);
      float a=edgeFade*(shadow*.026+glimmer*.022);
      gl_FragColor=vec4(tint,a);
    }
  }`;

  let glReady=false,program=null,uni={},buf=null;
  if(G){
    try{
      const shader=(type,text)=>{const s=G.createShader(type);G.shaderSource(s,text);G.compileShader(s);if(!G.getShaderParameter(s,G.COMPILE_STATUS))throw Error(G.getShaderInfoLog(s));return s;};
      program=G.createProgram();G.attachShader(program,shader(G.VERTEX_SHADER,vert));G.attachShader(program,shader(G.FRAGMENT_SHADER,frag));G.linkProgram(program);
      if(!G.getProgramParameter(program,G.LINK_STATUS))throw Error(G.getProgramInfoLog(program));
      G.useProgram(program);
      buf=G.createBuffer();G.bindBuffer(G.ARRAY_BUFFER,buf);G.bufferData(G.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),G.STATIC_DRAW);
      const pos=G.getAttribLocation(program,'position');G.enableVertexAttribArray(pos);G.vertexAttribPointer(pos,2,G.FLOAT,false,0,0);
      for(const k of ['res','time','dark','cursor','predicted','attention','surprise','memory','morph','phase','age'])uni[k]=G.getUniformLocation(program,k);
      G.disable(G.DEPTH_TEST);G.enable(G.BLEND);G.blendFunc(G.SRC_ALPHA,G.ONE_MINUS_SRC_ALPHA);
      const debug=G.getExtension('WEBGL_debug_renderer_info');
      const rendererName=String(G.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:G.RENDERER)||'');
      if(/swiftshader|llvmpipe|software rasterizer/i.test(rendererName))throw Error('Software WebGL renderer: use low-cost fallback');
      glReady=true;
    }catch(e){console.error('Unseen Model WebGL shader:',e);}
  }

  // Small genuinely adaptive online predictor. The weights adjust from
  // observed future cursor displacements; sudden reversals cause large errors.
  const learner={
    wx:[.73,0,.08,0],wy:[0,.73,0,.08],samples:[],last:null,
    velocity:[0,0],accel:[0,0],prediction:[.5,.5],
    surprise:0,shock:0,memory:0,mode:0,phase:0,observations:0,
    active:false,lastPointerTime:0
  };
  const HORIZON=.19;
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  function features(v,a){return [clamp(v[0]*HORIZON,-.45,.45),clamp(v[1]*HORIZON,-.45,.45),clamp(a[0]*HORIZON*HORIZON,-.42,.42),clamp(a[1]*HORIZON*HORIZON,-.42,.42)];}
  function processPointer(x,y,now){
    const L=learner;L.active=true;L.lastPointerTime=now;
    if(L.last){
      const dt=clamp((now-L.last.t),.012,.12);
      const nv=[clamp((x-L.last.x)/dt,-6,6),clamp((y-L.last.y)/dt,-6,6)];
      L.accel=[clamp((nv[0]-L.velocity[0])/dt,-80,80),clamp((nv[1]-L.velocity[1])/dt,-80,80)];
      L.velocity=[mix(L.velocity[0],nv[0],.46),mix(L.velocity[1],nv[1],.46)];
    }
    // Compare each matured prediction to the newly observed position.
    for(let i=L.samples.length-1;i>=0;i--){
      const s=L.samples[i];if(now-s.time<HORIZON*.8)continue;
      const target=[x-s.origin[0],y-s.origin[1]];
      const ex=clamp(target[0]-dot(L.wx,s.f),-.65,.65);
      const ey=clamp(target[1]-dot(L.wy,s.f),-.65,.65);
      const norm=.08+dot(s.f,s.f);
      const rate=.10/norm;
      for(let j=0;j<4;j++){L.wx[j]=clamp(L.wx[j]+rate*ex*s.f[j],-2,2);L.wy[j]=clamp(L.wy[j]+rate*ey*s.f[j],-2,2);}
      const error=Math.hypot(x-s.expected[0],y-s.expected[1]);
      const newSurprise=clamp((error-.020)*5.2,0,1);
      if(newSurprise>L.surprise)L.surprise=newSurprise;
      if(newSurprise>.17){
        L.shock=Math.max(L.shock,clamp(newSurprise*2.4,0,1));
        L.phase+=.32*newSurprise;
        L.memory=Math.min(1,L.memory+newSurprise*.3);
      }
      L.samples.splice(i,1);
      L.observations++;
    }
    const f=features(L.velocity,L.accel);
    const future=[clamp(x+dot(L.wx,f),0,1),clamp(y+dot(L.wy,f),0,1)];
    L.prediction=future;
    if(!L.samples.length||now-L.samples[L.samples.length-1].time>.052){
      L.samples.push({time:now,origin:[x,y],f,expected:future});
      if(L.samples.length>8)L.samples.shift();
    }
    L.last={x,y,t:now};
  }
  const pointer={x:.5,y:.5,inside:false};
  function onPointer(e){
    if(e.pointerType==='touch')return;
    const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    const x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1);
    if(!pointer.inside){learner.shock=Math.max(learner.shock,.27);learner.memory=Math.max(learner.memory,.13);}
    pointer.x=x;pointer.y=y;pointer.inside=true;
    processPointer(x,y,performance.now()/1000);
    schedule();
  }
  stage.addEventListener('pointerenter',onPointer,{passive:true});
  stage.addEventListener('pointermove',onPointer,{passive:true});
  stage.addEventListener('pointerleave',()=>{pointer.inside=false;learner.active=false;learner.last=null;learner.samples.length=0;},{passive:true});

  // Fallback keeps the page meaningful where WebGL is disabled.
  let fallback=null, fallbackCanvas=canvas, fDots=[];
  if(!glReady){
    if(G){
      fallbackCanvas=document.createElement('canvas');
      fallbackCanvas.setAttribute('aria-hidden','true');
      stage.appendChild(fallbackCanvas);
      canvas.style.display='none';
    }
    fallback=fallbackCanvas.getContext('2d');
    const random=(n)=>{let x=Math.sin(n*72.17)*43758.5453;return x-Math.floor(x);};
    for(let i=0;i<950;i++)fDots.push([random(i+3),random(i+12),random(i+92)]);
  }
  let width=0,height=0,dpr=1,raf=0,last=0,time=0,visible=true,lastPaint=0;
  function fit(){
    const r=stage.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);
    if(!w||!h)return;
    const scale=Math.min(window.devicePixelRatio||1,glReady?(w<700?.85:.80):1.5);
    if(w===width&&h===height&&scale===dpr)return;
    width=w;height=h;dpr=scale;
    const activeCanvas=glReady?canvas:fallbackCanvas;
    activeCanvas.width=Math.round(w*scale);activeCanvas.height=Math.round(h*scale);
    if(glReady)G.viewport(0,0,canvas.width,canvas.height);
    else fallback.setTransform(scale,0,0,scale,0,0);
  }
  function fallbackDraw(){
    const c=fallback;c.clearRect(0,0,width,height);
    const col=document.documentElement.dataset.theme==='dark'?'161,221,174':'37,100,61';
    for(const p of fDots){
      const a=p[0]*6.28+time*.24+learner.phase;
      const x=width*(.5+Math.sin(a*2.1+p[1]*9)*.36);
      const y=height*(.5+.34*Math.sin(a*1.3+p[2]*6));
      const r=.5+p[2]*1.8+learner.shock*1.7;
      c.fillStyle='rgba('+col+','+(.24+p[1]*.5)+')';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    }
  }
  function render(){
    if(!width||!height)return;
    if(!glReady){if(fallback)fallbackDraw();return;}
    const theme=document.documentElement.dataset.theme==='dark'?1:0;
    G.useProgram(program);
    G.uniform2f(uni.res,canvas.width,canvas.height);
    G.uniform1f(uni.time,time);
    G.uniform1f(uni.dark,theme);
    G.uniform2f(uni.cursor,pointer.x,pointer.y);
    G.uniform2f(uni.predicted,learner.prediction[0],learner.prediction[1]);
    G.uniform1f(uni.attention,learner.active?1:0);
    G.uniform1f(uni.surprise,learner.shock);
    G.uniform1f(uni.memory,learner.memory);
    G.uniform1f(uni.morph,learner.mode);
    G.uniform1f(uni.phase,learner.phase);
    G.uniform1f(uni.age,time);
    G.clearColor(0,0,0,0);G.clear(G.COLOR_BUFFER_BIT);
    G.drawArrays(G.TRIANGLES,0,6);
  }
  function tick(now){
    raf=0;if(!visible||document.hidden)return;
    const dt=last?clamp((now-last)/1000,0,.05):1/60;last=now;
    time+=dt*(reduced.matches?.55:1);
    const L=learner;
    L.surprise=Math.max(0,L.surprise-dt*.25);
    L.shock=Math.max(0,L.shock-dt*.21);
    L.memory=Math.max(0,L.memory-dt*.055);
    const targetMode=.5+.5*Math.sin(time*.30+L.phase*1.6)+L.shock*.48;
    L.mode=mix(L.mode,clamp(targetMode,0,1),1-Math.exp(-dt*.9));
    // Autonomous reconstruction is visible even if no visitor interacts.
    L.phase+=dt*(reduced.matches?.025:.058)+dt*L.shock*.25;
    if(now-lastPaint>(reduced.matches?80:30)){render();lastPaint=now;}
    schedule();
  }
  function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
  function refresh(){fit();render();schedule();}
  if('ResizeObserver' in window)new ResizeObserver(refresh).observe(stage);
  else window.addEventListener('resize',refresh,{passive:true});
  if('IntersectionObserver' in window){
    new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(!visible&&raf){cancelAnimationFrame(raf);raf=0;last=0;}if(visible)refresh();},{rootMargin:'120px'}).observe(stage);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}else refresh();});
  window.addEventListener('site-theme-change',refresh);
  reduced.addEventListener?.('change',refresh);
  // Minimal introspection hook for automated visual QA; no UI controls.
  if(new URLSearchParams(location.search).has('unseenTest')){
    window.__unseenModelTest={learner,render,fit,onPointer,getGL:()=>G,getReady:()=>glReady};
  }
  refresh();
})();
