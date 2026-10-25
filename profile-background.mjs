import {BACKGROUNDS,backgroundPoster,backgroundStyle,loadBackground} from './background-catalog.mjs?v=20261025-15';
export const FLUX_POSTER='/assets/flux-lines-poster.webp';
const styles=new WeakMap();
const controllers=new WeakMap();
function loadStyles(doc,id){
  const href=backgroundStyle(id);if(!href)return Promise.resolve();
  if(!styles.has(doc))styles.set(doc,new Map());const cache=styles.get(doc);
  if(!cache.has(href))cache.set(href,new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>{cache.delete(href);link.remove();reject(Error('Styles unavailable'));};doc.head.append(link);}));
  return cache.get(href);
}

export function createProfileBackground(stage,{onStatus=()=>{},loadRenderer=loadBackground,ensureStyles=loadStyles}={}){
  if(controllers.has(stage))return controllers.get(stage);
  const doc=stage.ownerDocument,win=doc.defaultView;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const host=doc.createElement('div');host.className='profile-background-preset';host.setAttribute('aria-hidden','true');host.hidden=true;
  const poster=doc.createElement('div');poster.className='profile-background-preset__poster';
  const canvas=doc.createElement('div');canvas.className='profile-background-preset__canvas';host.append(poster,canvas);stage.append(host);
  const abort=new win.AbortController();
  let selected='',dispose,generation=0,suspended=false,destroyed=false,visible=true;
  const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{const next=entries[0].isIntersecting;if(next!==visible){visible=next;sync();}}):null;observer?.observe(stage);
  function stop(){generation++;dispose?.();dispose=undefined;canvas.replaceChildren();poster.hidden=false;host.classList.remove('is-ready');}
  async function sync(){
    stop();host.hidden=!selected;stage.dataset.preset=selected;poster.style.backgroundImage=selected?`url("${backgroundPoster(selected)}")`:'';
    if(!selected||destroyed||suspended||doc.hidden||!visible)return;
    const name=BACKGROUNDS[selected];
    if(reduced.matches||win.navigator.connection?.saveData){onStatus(`${name} · Still preview`);return;}
    const current=generation;onStatus(`Loading ${name}…`);
    try{
      const [,module]=await Promise.all([ensureStyles(doc,selected),loadRenderer(selected)]);
      if(current!==generation||destroyed||!selected)return;
      const release=(module.mountBackground||module.mountFluxLines)(canvas,{onReady:()=>{if(current!==generation)return;poster.hidden=true;host.classList.add('is-ready');onStatus(`${name} · Live preview`);},onError:()=>{if(current!==generation)return;stop();onStatus(`${name} · Animation unavailable. Showing still preview.`);}});
      if(current===generation)dispose=release;else release?.();
    }catch{if(current===generation){stop();onStatus(`${name} · Animation unavailable. Showing still preview.`);}}
  }
  reduced.addEventListener('change',sync,{signal:abort.signal});
  doc.addEventListener('visibilitychange',()=>doc.hidden?stop():sync(),{signal:abort.signal});
  win.addEventListener('pagehide',event=>{if(event.persisted){suspended=true;stop();}else destroy();},{signal:abort.signal});
  win.addEventListener('pageshow',()=>{if(suspended){suspended=false;sync();}},{signal:abort.signal});
  function destroy(){if(destroyed)return;destroyed=true;abort.abort();observer?.disconnect();stop();host.remove();controllers.delete(stage);delete stage.dataset.preset;}
  if(Object.hasOwn(BACKGROUNDS,stage.dataset.preset||'')){selected=stage.dataset.preset;sync();}
  const controller={update(config){const next=config.background.kind==='preset'&&Object.hasOwn(BACKGROUNDS,config.background.preset)?config.background.preset:'';if(next===selected)return;selected=next;sync();if(!next)onStatus('');},destroy};controllers.set(stage,controller);return controller;
}
