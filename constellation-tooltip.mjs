let serial = 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const intersection = (a, b) => Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left)) * Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));

export function constellationTooltipPosition(anchor, size, bounds, obstacles = []) {
  const gap = 10, width = Math.min(size.width,bounds.right-bounds.left), height = Math.min(size.height,bounds.bottom-bounds.top);
  const x = (anchor.left+anchor.right-width)/2, y = (anchor.top+anchor.bottom-height)/2;
  const candidates = [
    {left:x,top:anchor.top-height-gap,side:'top'},
    {left:x,top:anchor.bottom+gap,side:'bottom'},
    {left:anchor.right+gap,top:y,side:'right'},
    {left:anchor.left-width-gap,top:y,side:'left'}
  ].map((point,index) => {
    const left = clamp(point.left,bounds.left,bounds.right-width), top = clamp(point.top,bounds.top,bounds.bottom-height);
    const rect = {left,top,right:left+width,bottom:top+height};
    const score = intersection(rect,anchor)*20 + obstacles.reduce((sum,item)=>sum+intersection(rect,item),0)*4 + Math.abs(left-point.left)+Math.abs(top-point.top)+index;
    return {...rect,side:point.side,score};
  });
  return candidates.reduce((best,item)=>item.score<best.score?item:best);
}

export function createConstellationTooltip(panel, {clock} = {}) {
  const doc = panel.ownerDocument, win = doc.defaultView, abort = new win.AbortController(), signal = abort.signal;
  const listen = (target,event,handler,options={}) => target.addEventListener(event,handler,{...options,signal});
  const request = callback => clock ? clock.request(callback) : win.requestAnimationFrame(callback);
  const cancel = id => clock ? clock.cancel(id) : win.cancelAnimationFrame(id);
  let sky, tip, platform, handle, active, hovered, focused, dismissed, inTip=false, frame=0, followUntil=0, openTimer, closeTimer, hiddenTimer, destroyed=false;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const linkFor = node => node?.closest?.('.profile-constellation .social-link');
  const eligible = link => !!sky && !!link?.isConnected && sky.contains(link) && !panel.inert && !doc.hidden && win.getComputedStyle(link).position==='absolute';
  function clearTimers() {win.clearTimeout(openTimer);win.clearTimeout(closeTimer);win.clearTimeout(hiddenTimer);}
  function detachDescription() {
    if(!active || !tip)return;
    const ids=(active.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==tip.id);
    if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');
  }
  function hide(immediate=false) {
    clearTimers();if(frame)cancel(frame);frame=0;detachDescription();active=undefined;
    if(!tip)return;tip.dataset.open='false';tip.style.pointerEvents='none';
    if(immediate)tip.hidden=true;else hiddenTimer=win.setTimeout(()=>{if(!active)tip.hidden=true;},150);
  }
  function suspend() {hovered=focused=dismissed=undefined;inTip=false;hide(true);}
  function ensure() {
    if(tip)return;
    tip=doc.createElement('div');tip.className='constellation-tooltip';tip.id='constellation-tooltip-'+(++serial);tip.setAttribute('role','tooltip');tip.setAttribute('data-user-content','');tip.hidden=true;
    platform=doc.createElement('span');platform.className='constellation-tooltip__platform';handle=doc.createElement('span');handle.className='constellation-tooltip__handle';tip.append(platform,handle);
    listen(tip,'pointerenter',()=>{inTip=true;win.clearTimeout(closeTimer);if(frame)cancel(frame);frame=0;});
    listen(tip,'pointerleave',()=>{inTip=false;hovered=undefined;closeSoon();});
  }
  function bounds() {
    const viewport=win.visualViewport, left=viewport?.offsetLeft||0, top=viewport?.offsetTop||0;
    const result={left:left+12,top:top+12,right:left+(viewport?.width||win.innerWidth)-12,bottom:top+(viewport?.height||win.innerHeight)-12};
    const preview=panel.closest('.studio-preview'), dialog=panel.closest('dialog[open]'), limit=(dialog||preview)?.getBoundingClientRect();
    if(limit){result.left=Math.max(result.left,limit.left+8);result.right=Math.min(result.right,limit.right-8);result.top=Math.max(result.top,limit.top+8);result.bottom=Math.min(result.bottom,limit.bottom-8);}
    return result;
  }
  function position() {
    if(!eligible(active)||!tip){hide(true);return false;}
    const b=bounds(), anchor=active.getBoundingClientRect();
    if(b.right-b.left<40||b.bottom-b.top<40||anchor.bottom<b.top||anchor.top>b.bottom||anchor.right<b.left||anchor.left>b.right){hide(true);return false;}
    tip.style.maxWidth=Math.min(280,b.right-b.left)+'px';tip.style.maxHeight=(b.bottom-b.top)+'px';
    const size=tip.getBoundingClientRect(), obstacles=[...sky.querySelectorAll('.social-link,.avatar')].filter(node=>node!==active).map(node=>node.getBoundingClientRect());
    const point=constellationTooltipPosition(anchor,size,b,obstacles);
    tip.style.left=point.left+'px';tip.style.top=point.top+'px';tip.dataset.side=point.side;
    return true;
  }
  function tick(time) {
    frame=0;if(!position())return;
    if(!inTip&&!reduced.matches&&time<followUntil)frame=request(tick);
  }
  function follow() {if(!active||inTip)return;followUntil=win.performance.now()+420;if(!frame)frame=request(tick);}
  function show(link) {
    if(destroyed||link===dismissed||!eligible(link)){if(active&&!eligible(active))hide(true);return;}
    clearTimers();ensure();detachDescription();active=link;
    const host=panel.closest('dialog[open]')||doc.body;if(tip.parentElement!==host)host.append(tip);
    tip.dataset.profileTheme=panel.dataset.profileTheme||'original';
    platform.textContent=link.querySelector('.social-link__platform')?.textContent||'';handle.textContent=link.querySelector('.social-link__handle')?.textContent||'';
    for(const [source,target]of [['.social-link__platform',platform],['.social-link__handle',handle]]){
      const node=link.querySelector(source);if(!node)continue;const style=win.getComputedStyle(node);
      for(const property of ['color','fontFamily','fontSize','fontWeight','letterSpacing','lineHeight'])target.style[property]=style[property];
    }
    const ids=new Set((link.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(tip.id);link.setAttribute('aria-describedby',[...ids].join(' '));
    tip.hidden=false;tip.style.pointerEvents='auto';tip.style.visibility='hidden';
    if(position()){tip.style.visibility='';tip.dataset.open='true';follow();}
  }
  function closeSoon() {
    win.clearTimeout(openTimer);win.clearTimeout(closeTimer);
    closeTimer=win.setTimeout(()=>{if(inTip)return;if(eligible(hovered)&&hovered!==dismissed)show(hovered);else if(eligible(focused)&&focused!==dismissed)show(focused);else hide();},140);
  }
  listen(panel,'pointerover',event=>{
    if(event.pointerType==='touch')return;const link=linkFor(event.target);if(!eligible(link)||link.contains(event.relatedTarget))return;
    hovered=link;inTip=false;win.clearTimeout(closeTimer);win.clearTimeout(openTimer);
    if(active)show(link);else openTimer=win.setTimeout(()=>{if(hovered===link)show(link);},80);
  });
  listen(panel,'pointerout',event=>{const link=linkFor(event.target);if(!link||link.contains(event.relatedTarget))return;if(dismissed===link)dismissed=undefined;if(tip?.contains(event.relatedTarget))return;if(hovered===link)hovered=undefined;closeSoon();});
  listen(panel,'pointermove',event=>{if(event.pointerType!=='touch'&&linkFor(event.target)===active)follow();},{passive:true});
  listen(panel,'focusin',event=>{const link=linkFor(event.target);if(!eligible(link))return;focused=link;dismissed=undefined;show(link);});
  listen(panel,'focusout',event=>{const link=linkFor(event.target);if(link?.contains(event.relatedTarget))return;if(focused===link)focused=undefined;if(dismissed===link)dismissed=undefined;closeSoon();});
  listen(doc,'keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();dismissed=active;hovered=focused=undefined;inTip=false;hide(true);}});
  listen(panel,'ascendo:creative-side',suspend);
  listen(doc,'visibilitychange',()=>{if(doc.hidden)suspend();});
  listen(win,'scroll',event=>{if(!tip?.contains(event.target))suspend();},{capture:true,passive:true});
  listen(win,'resize',suspend,{passive:true});listen(win,'pagehide',suspend);
  listen(panel.closest('.preview-card')||panel,'ascendo:preview-size',suspend);
  if(doc.fonts)listen(doc.fonts,'loadingdone',()=>{if(active){position();follow();}});
  function update() {
    const next=panel.querySelector('.profile-constellation');
    if(next!==sky){suspend();sky?.removeAttribute('data-tooltip-ready');sky=next;}
    if(sky)sky.dataset.tooltipReady='true';
    if(active){if(!eligible(active))suspend();else show(active);}
    if(!sky){tip?.remove();tip=platform=handle=undefined;}
  }
  function destroy() {if(destroyed)return;destroyed=true;suspend();abort.abort();sky?.removeAttribute('data-tooltip-ready');tip?.remove();sky=tip=undefined;}
  return {update,destroy,suspend};
}
