(() => {
"use strict";
document.documentElement.classList.add("js");
const year=document.querySelector("#year");
if(year) year.textContent=String(new Date().getFullYear());
const toggle=document.querySelector(".menu-button"),nav=document.querySelector("#mobile-navigation");
const close=()=>{if(!toggle||!nav)return;toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open menu");nav.hidden=true};
toggle?.addEventListener("click",()=>{const active=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(active));toggle.setAttribute("aria-label",active?"Close menu":"Open menu");nav.hidden=!active});
nav?.querySelectorAll("a").forEach(x=>x.addEventListener("click",close));
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
const incoming=document.querySelectorAll("[data-enter]");
if(!("IntersectionObserver" in window)||reduce.matches)incoming.forEach(x=>x.classList.add("entered"));
else{
 const ob=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add("entered");ob.unobserve(item.target)}}),{threshold:.02,rootMargin:"0px 0px -12px 0px"});
 incoming.forEach(x=>ob.observe(x));
}
const canvas=document.querySelector("#field");
if(!canvas)return;
const stage=canvas.parentElement,ctx=canvas.getContext("2d",{alpha:true});
if(!ctx)return;
let w=0,h=0,ratio=1,clock=0,last=0,lastDraw=0,visible=true,frame=0,px=.55,py=.5,sx=.55,sy=.5,inside=false,power=0;
const curves=88,steps=94,tau=2*Math.PI;
function resize(){
const box=stage.getBoundingClientRect(),nw=Math.round(box.width),nh=Math.round(box.height),dpr=Math.min(window.devicePixelRatio||1,1.6);
if(!nw||!nh||nw===w&&nh===h&&dpr===ratio)return;
w=nw;h=nh;ratio=dpr;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
}
const gauss=(n,s)=>Math.exp(-1.7*(n/s)**2);
function yAt(i,x,t){
 const v=i/(curves-1),base=.075+v*.85,saddle=.5+.035*Math.sin(t*.19);
 let y=base+.15*gauss(x-.44,.23)*Math.tanh((base-saddle)/.13)
 -.14*gauss(x-.76,.19)*Math.tanh((base-.54)/.15)
 +.009*Math.sin(x*9.5+v*9+t*.33)*gauss(x-.5,.38)*Math.sin(v*Math.PI*1.6);
 const dx=x-sx,dy=y-sy;
 y+=power*.103*Math.exp(-1.4*(dx*dx/.013225+dy*dy/.0484))*Math.tanh(dy*10);
 return y;
}
function paint(t){
 ctx.clearRect(0,0,w,h);
 ctx.lineWidth=.65;ctx.strokeStyle="rgba(111,135,115,.11)";
 [.18,.44,.76].forEach((p,j)=>{
 const x=12+(w-24)*p;ctx.beginPath();ctx.moveTo(x,h*.07);ctx.lineTo(x,h*.93);ctx.stroke();
 if(j){ctx.strokeStyle="rgba(93,123,100,.15)";ctx.beginPath();ctx.moveTo(x-4,h*.93);ctx.lineTo(x+4,h*.93);ctx.stroke()}
 });
 for(let i=0;i<curves;i++){
 const v=i/(curves-1),core=1-Math.abs(v-.5)*2,strong=i%11===0;
 ctx.beginPath();
 for(let s=0;s<=steps;s++){
  const p=s/steps,x=12+p*(w-24),y=yAt(i,p,t)*h;
  if(!s)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 ctx.lineWidth=(strong?.55:.34)+.28;
 ctx.strokeStyle="rgba(51,87,66,"+Math.min((.105+core*.10)*(strong?1.85:1),.38)+")";
 ctx.stroke();
 }
 for(let j=0;j<9;j++){
  const v=8+j*8,p=(j*.137+.22+t*.011)%1,x=12+p*(w-24),y=yAt(v,p,t)*h;
  ctx.beginPath();ctx.arc(x,y,j%3===0?2.1:1.15,0,tau);
  ctx.fillStyle=j%3===0?"rgba(62,105,76,.70)":"rgba(64,92,72,.45)";ctx.fill();
 }
 if(power>.025){ctx.beginPath();ctx.arc(sx*w,sy*h,3.2,0,tau);ctx.fillStyle="rgba(70,112,83,"+(power*.3)+")";ctx.fill()}
}
function render(time){
frame=0;
if(!visible||document.hidden)return;
resize();if(!w||!h)return;
if(!reduce.matches&&time-lastDraw<28){frame=requestAnimationFrame(render);return}
const dt=last?Math.min((time-last)/1000,.08):0;last=time;lastDraw=time;
if(!reduce.matches)clock+=dt;
const k=reduce.matches?1:.075;sx+=(px-sx)*k;sy+=(py-sy)*k;
power+=((inside?1:0)-power)*(reduce.matches?1:.055);
paint(clock);
if(!reduce.matches)frame=requestAnimationFrame(render);
}
function start(){if(frame||!visible||document.hidden)return;last=0;frame=requestAnimationFrame(render)}
stage.addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const r=stage.getBoundingClientRect();px=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));py=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));inside=true;if(reduce.matches)start()},{passive:true});
stage.addEventListener("pointerleave",()=>{inside=false;if(reduce.matches)start()},{passive:true});
window.addEventListener("resize",()=>{resize();if(reduce.matches)start()},{passive:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)start()});
if("IntersectionObserver" in window){
 const watch=new IntersectionObserver(items=>{visible=items[0].isIntersecting;if(visible)start()},{rootMargin:"100px"});watch.observe(stage);
}
reduce.addEventListener("change",()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;start()});
start();
})();