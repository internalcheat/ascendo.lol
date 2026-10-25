export const FLUX_POSTER='/assets/flux-lines-poster.webp';
const styles=new WeakMap();
function loadStyles(doc){
  if(!styles.has(doc))styles.set(doc,new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href='/vendor/flux-lines.css?v=20261025-9';link.addEventListener('load',resolve,{once:true});link.addEventListener('error',()=>{styles.delete(doc);link.remove();reject(Error('Flux Lines styles unavailable'));},{once:true});doc.head.append(link);}));
  return styles.get(doc);
}

export function createProfileBackground(stage,{onStatus=()=>{}}={}){
  const doc=stage.ownerDocument,win=doc.defaultView;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const host=doc.createElement('div');host.className='profile-background-preset';host.setAttribute('aria-hidden','true');host.hidden=true;
  const canvas=doc.createElement('div');canvas.className='profile-background-preset__canvas';host.append(canvas);stage.append(host);
  const abort=new win.AbortController();
  let selected=false,dispose,generation=0,suspended=false,destroyed=false;
  function stop(){generation++;dispose?.();dispose=undefined;canvas.replaceChildren();host.classList.remove('is-ready');}
  async function sync(){
    stop();host.hidden=!selected;stage.dataset.preset=selected?'flux-lines':'';
    if(!selected||destroyed||suspended)return;
    if(reduced.matches||win.navigator.connection?.saveData){onStatus('Flux Lines still preview · motion is reduced on this device.');return;}
    const current=generation;onStatus('Loading Flux Lines preview…');
    try{
      const [,module]=await Promise.all([loadStyles(doc),import('./vendor/flux-lines.mjs?v=20261025-9')]);
      if(current!==generation||destroyed||!selected)return;
      dispose=module.mountFluxLines(canvas,{onReady:()=>{if(current!==generation)return;host.classList.add('is-ready');onStatus('Flux Lines preview · move your cursor or click to interact. Save changes to apply.');},onError:message=>{if(current!==generation)return;stop();onStatus(message);}});
    }catch{if(current===generation){stop();onStatus('Flux Lines animation is unavailable. Showing its still preview.');}}
  }
  reduced.addEventListener('change',sync,{signal:abort.signal});
  win.addEventListener('pagehide',event=>{if(event.persisted){suspended=true;stop();}else destroy();},{signal:abort.signal});
  win.addEventListener('pageshow',()=>{if(suspended){suspended=false;sync();}},{signal:abort.signal});
  function destroy(){if(destroyed)return;destroyed=true;abort.abort();stop();host.remove();delete stage.dataset.preset;}
  if(stage.dataset.preset==='flux-lines'){selected=true;sync();}
  return {update(config){const next=config.background.kind==='preset'&&config.background.preset==='flux-lines';if(next===selected)return;selected=next;sync();if(!next)onStatus('');},destroy};
}
