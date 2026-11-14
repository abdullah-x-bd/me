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

// The animated institutional model is maintained in site-visual.js.
// A citation disclosure always has one active ledger at a time.
const citationLedgers=[...document.querySelectorAll("details.citation-details")];
citationLedgers.forEach(d=>d.addEventListener("toggle",()=>{
 if(d.open)citationLedgers.forEach(other=>{if(other!==d)other.open=false});
}));
document.addEventListener("pointerdown",e=>{
 if(!e.target.closest("details.citation-details"))citationLedgers.forEach(d=>{d.open=false});
});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape")citationLedgers.forEach(d=>{d.open=false});
});


})();
