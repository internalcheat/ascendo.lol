import {applyBackgroundAppearance} from './profile-appearance.mjs?v=20261027-1';
import {createProfileExpression} from './profile-expression.mjs?v=20261027-1';
import { API_URL, PUBLISHABLE_KEY } from './customizer-config.mjs';
import { normalizeProfile } from './profile-schema.mjs?v=20261027-1';
import { renderProfile, bindMusic, bindNameEffectVisibility } from './profile-view.mjs?v=20261027-1';
import { createProfileEffects } from './profile-effects.mjs?v=20261027-1';
import { createProfileBackground } from './profile-background.mjs?v=20261026-1';
import {createProfileAdditions} from './profile-additions.mjs?v=20261027-1';
import {themePalette,channels} from './profile-palette.mjs?v=20261027-1';

bindNameEffectVisibility();

async function profile(slug, apply) {
  const cacheKey=`ascendo-profile-v1:${slug}`;
  let bootstrapped=false;
  try{const initial=JSON.parse(document.getElementById('profileBootstrap')?.textContent||'null');if(initial?.slug===slug&&Number.isSafeInteger(initial.revision)&&initial.revision>0){apply(normalizeProfile(initial.config),initial.revision);bootstrapped=true;}}catch{}
  try {
    const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
    if(cached&&!bootstrapped)apply(normalizeProfile(cached.config||cached),cached.revision);
  }catch{}
  try {
    const response=await fetch(`${API_URL}/public/${encodeURIComponent(slug)}`,{headers:{apikey:PUBLISHABLE_KEY},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return;
    const result=await response.json();
    const config=normalizeProfile(result.config);
    apply(config,result.revision);
    try{localStorage.setItem(cacheKey,JSON.stringify({config,revision:result.revision}));}catch{}
  }catch{}
}

const panel=document.querySelector('.page--profile .profile__panel');
if(panel){
  const background=createProfileBackground(document.querySelector('.video-stage'));
  const effects=createProfileEffects(panel,{scope:panel.closest('.profile')});
  const additions=createProfileAdditions(document.body,panel);
  const video=document.getElementById('musicBackground');
  const expression=createProfileExpression(panel,{scope:panel.closest('.profile'),video});
  const update=bindMusic(video,panel);
  let rendered;
  profile(document.body.dataset.person,(config,revision)=>{
    if(Number.isSafeInteger(revision)&&revision>0)document.body.dataset.profileRevision=String(revision);
    const serialized=JSON.stringify(config);
    if(serialized===rendered)return;
    rendered=serialized;
    renderProfile(panel,config);
    effects.update(config);
    expression.update(config);
    background.update(config);
    const palette=themePalette(config),accent=palette.primary;
    document.body.style.setProperty('--profile-accent',accent);
    document.body.style.setProperty('--accent-rgb',[1,3,5].map(offset=>parseInt(accent.slice(offset,offset+2),16)).join(','));
    document.body.style.setProperty('--profile-secondary',palette.secondary);document.body.style.setProperty('--secondary-rgb',channels(palette.secondary).join(','));
    if(!config.pageTitle.enabled)document.title=`${config.name} | Ascendo`;
    video.dataset.backgroundKind=config.background.kind;
    video.dataset.backgroundSrc=config.background.kind==='video'?config.background.url:'';
    video.dataset.mobileSrc=config.background.mobile;
    video.dataset.musicSource=config.music.source;video.dataset.musicSrc=config.music.url;video.dataset.musicVolume=String(config.music.volume);
    const poster=['black','preset'].includes(config.background.kind)?'':config.background.kind==='image'?config.background.url:config.background.poster;
    if(poster)video.setAttribute('poster',poster);else video.removeAttribute('poster');
    const stage=document.querySelector('.video-stage');
    stage.style.backgroundImage=poster?`url(${JSON.stringify(poster)})`:'';
    stage.style.backgroundSize='cover';stage.style.backgroundPosition='center';
    applyBackgroundAppearance(stage,config);
    additions.update(config);
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
