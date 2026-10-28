import {API_URL,PUBLISHABLE_KEY} from './customizer-config.mjs';
import {normalizeHandle} from './handle-policy.mjs?v=20261025-13';

export function routeHandle(path){
  const match=path.match(/^\/([A-Za-z0-9-]{3,24})\/?$/);if(!match)return '';
  try{return normalizeHandle(match[1]);}catch{return '';}
}
export async function resolveProfileRoute(){
  const clearPending=()=>document.documentElement.classList.remove('profile-route-pending');
  const slug=routeHandle(location.pathname);if(!slug){clearPending();return false;}
  let config;
  try{const response=await fetch(`${API_URL}/public/${encodeURIComponent(slug)}`,{headers:{apikey:PUBLISHABLE_KEY},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});if(!response.ok){clearPending();return false;}config=(await response.json()).config;if(!config?.name){clearPending();return false;}}catch{clearPending();return false;}
  for(const [file,version]of [['profile-expression.css?v=20261028-1','20261027-1'],['profile-appearance.css','20261027-1'],['profile-custom.css','20261025-4'],['profile-effects.css','20261025-6'],['profile-visual.css','20261026-1'],['profile-additions.css','20261025-12'],['profile-palette.css','20261025-14']]){
    if(!document.querySelector(`link[href^="/${file}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=`/${file}?v=${version}`;document.head.append(link);}
  }
  const template=document.createElement('template');template.innerHTML=`
  <div class="video-stage" aria-hidden="true"><video id="musicBackground" class="video-stage__video" playsinline loop preload="none" data-background-kind="black"></video><div class="video-stage__shade"></div></div>
  <a class="back-link" href="/" data-transition aria-label="Back to Ascendo home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg><span>back</span></a>
  <main class="profile" id="profileContent"><section class="profile__panel"><span class="avatar avatar--large"><img src="/assets/ascendo-icon-180.png" alt="" width="112" height="112"></span><h1 class="profile__name"></h1></section></main>
  <div class="media-controls" id="mediaControls" role="group" aria-label="Background volume" hidden><button class="volume-button" id="volumeButton" type="button" aria-label="Show volume control" aria-expanded="false" aria-controls="volumePanel"><svg class="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z"/><path class="volume-waves" d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/><path class="volume-mute" d="m16 9 6 6m0-6-6 6"/></svg></button><div class="volume-panel" id="volumePanel" aria-hidden="true" inert><input class="volume-slider" id="volumeControl" type="range" min="0" max="70" value="65" step="1" aria-label="Background audio volume" aria-valuetext="65 percent"><span class="volume-value" id="volumeValue" aria-hidden="true">65%</span></div></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  template.content.querySelector('h1').textContent=config.name;
  template.content.querySelector('.profile__panel').setAttribute('aria-label',`${config.name} profile`);
  document.dispatchEvent(new Event('ascendo:leave-notfound'));
  document.body.className='page page--profile';document.body.dataset.person=slug;document.body.replaceChildren(template.content);
  clearPending();
  document.title=`${config.name} | Ascendo`;
  const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=`https://ascendo.lol/${slug}/`;document.head.append(canonical);
  if(location.pathname!==`/${slug}/`)history.replaceState(history.state,'',`/${slug}/${location.search}${location.hash}`);
  try{localStorage.setItem(`ascendo-profile-v1:${slug}`,JSON.stringify(config));}catch{}
  document.dispatchEvent(new Event('ascendo:profile-ready'));
  await import('./profile-client.mjs?v=20261028-1');
  return true;
}
if(document.body.classList.contains('page--notfound'))resolveProfileRoute();
