import { API_URL, PUBLISHABLE_KEY } from './customizer-config.mjs';
import { normalizeProfile } from './profile-schema.mjs?v=20261025-9';
import { renderProfile, bindMusic, bindNameEffectVisibility } from './profile-view.mjs?v=20261025-9';
import { createProfileEffects } from './profile-effects.mjs?v=20261025-7';
import { createProfileBackground } from './profile-background.mjs?v=20261025-9';

bindNameEffectVisibility();

async function profile(slug, apply) {
  const cacheKey=`ascendo-profile-v1:${slug}`;
  try {
    const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
    if(cached)apply(normalizeProfile(cached));
  }catch{}
  try {
    const response=await fetch(`${API_URL}/public/${encodeURIComponent(slug)}`,{headers:{apikey:PUBLISHABLE_KEY},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return;
    const result=await response.json();
    const config=normalizeProfile(result.config);
    apply(config);
    try{localStorage.setItem(cacheKey,JSON.stringify(config));}catch{}
  }catch{}
}

const panel=document.querySelector('.page--profile .profile__panel');
if(panel){
  const background=createProfileBackground(document.querySelector('.video-stage'));
  const effects=createProfileEffects(panel,{scope:panel.closest('.profile')});
  const video=document.getElementById('musicBackground');
  const update=bindMusic(video,panel);
  let rendered;
  profile(document.body.dataset.person,config=>{
    const serialized=JSON.stringify(config);
    if(serialized===rendered)return;
    rendered=serialized;
    renderProfile(panel,config);
    effects.update(config);
    background.update(config);
    const accent=config.colorTheme==='monochrome'?'#f2f2f2':config.accent;
    document.body.style.setProperty('--profile-accent',accent);
    document.body.style.setProperty('--accent-rgb',[1,3,5].map(offset=>parseInt(accent.slice(offset,offset+2),16)).join(','));
    document.title=`${config.name} | Ascendo`;
    video.dataset.backgroundKind=config.background.kind;
    video.dataset.backgroundSrc=config.background.kind==='video'?config.background.url:'';
    video.dataset.mobileSrc=config.background.mobile;
    const poster=['black','preset'].includes(config.background.kind)?'':config.background.kind==='image'?config.background.url:config.background.poster;
    if(poster)video.setAttribute('poster',poster);else video.removeAttribute('poster');
    const stage=document.querySelector('.video-stage');
    stage.style.backgroundImage=poster?`url(${JSON.stringify(poster)})`:'';
    stage.style.backgroundSize='cover';stage.style.backgroundPosition='center';
    video.dispatchEvent(new Event('ascendo:background'));
    update();
  });
}
if(document.body.classList.contains('page--home')){
  for(const card of document.querySelectorAll('.founder-pill')){
    const slug=new URL(card.href).pathname.split('/').filter(Boolean)[0];
    profile(slug,config=>{
      card.querySelector('.founder-pill__name').textContent=config.name;
      card.setAttribute('aria-label',`Open ${config.name}'s profile`);
      const image=card.querySelector('.avatar img');
      const source=card.querySelector('.avatar source');
      if(image.src!==config.avatar.url)image.src=config.avatar.url;
      image.style.objectPosition=`${config.avatar.x}% ${config.avatar.y}%`;
      if(source){if(config.avatar.poster)source.srcset=config.avatar.poster;else source.remove();}
      if(config.avatar.poster)image.addEventListener('error',()=>{source?.remove();image.src=config.avatar.poster;},{once:true});
    });
  }
}
