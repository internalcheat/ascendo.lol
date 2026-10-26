import {displayProfileUrl,SHARE_MAX_HEIGHT,profileSlug} from './share-policy.mjs?v=20261026-6';
const root=document.documentElement;
export async function prepareCapture(doc=document,win=window){
  const html=doc.documentElement;if(html.dataset.profileCapture!=='true')return;
  const expected=Number(new URL(win.location.href).searchParams.get('__ascendo_revision')),start=Date.now();
  const pause=()=>{for(const media of doc.querySelectorAll('audio,video')){media.muted=true;media.volume=0;media.pause();}};
  const wait=async(test,timeout=10000)=>{while(!test()){if(Date.now()-start>timeout)throw Error('timeout');await new Promise(resolve=>win.setTimeout(resolve,50));}};
  const frames=()=>new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
  try{
    pause();await wait(()=>doc.body?.dataset.profileRevision);if(Number(doc.body.dataset.profileRevision)!==expected)throw Error('profile_changed');
    const slug=doc.body.dataset.person;if(!profileSlug('/'+slug))throw Error('profile_changed');
    for(const video of doc.querySelectorAll('video'))video.preload='none';
    for(const frame of doc.querySelectorAll('iframe'))frame.loading='eager';
    if(doc.fonts){const requested=typeof doc.fonts.load==='function'?[...doc.querySelectorAll('.profile__name,.profile__bio,.social-link__platform,.social-link__handle,.profile-signature__text')].map(node=>{const style=win.getComputedStyle(node);return doc.fonts.load(`${style.fontWeight||400} ${style.fontSize||'16px'} ${style.fontFamily||'sans-serif'}`,node.textContent||'Ascendo').catch(()=>[]);}):[];await Promise.race([Promise.all([doc.fonts.ready,...requested]),new Promise(resolve=>win.setTimeout(resolve,4000))]);}
    await Promise.race([Promise.all([...doc.querySelectorAll('.profile img')].map(image=>image.decode?.().catch(()=>{})||Promise.resolve())),new Promise(resolve=>win.setTimeout(resolve,3000))]);
    const preset=doc.querySelector('.profile-background-preset');if(preset&&!preset.hidden){try{await wait(()=>preset.classList.contains('is-ready')||!preset.querySelector('.profile-background-preset__canvas')?.children.length&&Date.now()-start>6500,8000);}catch{}}
    const pendingEmbeds=()=>[...doc.querySelectorAll('.profile-widget iframe')].some(frame=>!frame.dataset.embedReady);
    const embedDeadline=Math.min(start+11500,Date.now()+3500);
    while(pendingEmbeds()&&Date.now()<embedDeadline)await new Promise(resolve=>win.setTimeout(resolve,100));
    for(const image of doc.querySelectorAll('.profile img'))if(image.complete&&!image.naturalWidth){image.src='/assets/ascendo-icon-180.png';try{await image.decode?.();}catch{}}
    for(const frame of doc.querySelectorAll('.profile-widget iframe')){
      const loaded=frame.dataset.embedReady==='true';
      if(!loaded){const tile=doc.createElement('div');tile.className='share-capture-fallback';const title=doc.createElement('strong');title.textContent=frame.getAttribute('title')||'Media player';const detail=doc.createElement('span');detail.textContent='Open the profile to play';tile.append(title,detail);frame.replaceWith(tile);}
    }
    for(const animation of doc.getAnimations?.()||[]){try{const timing=animation.effect?.getComputedTiming();if(timing&&Number.isFinite(timing.endTime))animation.finish();else animation.pause();}catch{}}
    for(const name of doc.querySelectorAll('.profile__name .name-text')){name.style.clipPath='none';name.style.width='auto';name.style.maxWidth='100%';}
    if(!doc.querySelector('.share-capture-footer')){const footer=doc.createElement('footer');footer.className='share-capture-footer';footer.textContent=displayProfileUrl(slug);doc.body.append(footer);}
    doc.querySelector('.profile')?.dispatchEvent(new win.Event('ascendo:preview-size',{bubbles:true}));await frames();pause();
    if(Number(doc.body.dataset.profileRevision)!==expected)throw Error('profile_changed');
    const height=Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight);if(Math.ceil(height*1.5)>SHARE_MAX_HEIGHT)throw Error('too_large');
    html.dataset.shareCaptureState='ready';
  }catch(error){pause();html.dataset.shareCaptureError=['profile_changed','too_large','timeout'].includes(error.message)?error.message:'render_failed';html.dataset.shareCaptureState='failed';}
}
if(root.dataset.profileCapture==='true'){
  const timeout=setTimeout(()=>{if(!root.dataset.shareCaptureState){root.dataset.shareCaptureError='timeout';root.dataset.shareCaptureState='failed';}},14000);
  prepareCapture().finally(()=>clearTimeout(timeout));
}
