(() => {
  'use strict';
  const button=document.getElementById('logoSecret');
  if(!button)return;
  button.disabled=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let count=0;
  let firstClick=0;
  let active;
  const animations=new Set();
  function clean(){for(const animation of animations)animation.cancel();animations.clear();active?.remove();active=undefined;count=0;}
  button.addEventListener('click',()=>{
    if(active)return;
    const now=performance.now();
    if(now-firstClick>3000){count=0;firstClick=now;}
    if(++count<5)return;
    count=0;
    const burst=document.createElement('span');burst.className='logo-burst';burst.setAttribute('aria-hidden','true');button.append(burst);active=burst;
    const ring=document.createElement('span');ring.className='logo-burst__ring';burst.append(ring);
    const ringAnimation=ring.animate(reduced.matches?[{opacity:0},{opacity:.65},{opacity:0}]:[{opacity:0,transform:'scale(.3)'},{opacity:.65,offset:.18},{opacity:0,transform:'scale(1.25)'}],{duration:reduced.matches?400:1200,easing:'cubic-bezier(.16,1,.3,1)'});
    animations.add(ringAnimation);
    if(!reduced.matches){
      const total=matchMedia('(pointer: coarse)').matches?6:10;
      for(let index=0;index<total;index++){
        const spark=document.createElement('span');spark.className='logo-burst__spark';burst.append(spark);
        const angle=index/total*Math.PI*2;const distance=90+index%3*15;
        const animation=spark.animate([{opacity:0,transform:'translate(0,0) scale(.5)'},{opacity:.85,offset:.2},{opacity:0,transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance*.65}px) scale(.3)`}],{duration:1200,easing:'cubic-bezier(.12,.7,.2,1)'});
        animations.add(animation);
      }
    }
    ringAnimation.finished.then(clean,clean);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clean();});
  window.addEventListener('pagehide',clean);
  reduced.addEventListener('change',clean);
})();
