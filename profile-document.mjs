import {Window} from 'happy-dom';
import {normalizeProfile} from './profile-schema.mjs';
import {renderProfile} from './profile-view.mjs';
import {profileSlug,metadataHtml,jsonForHtml} from './share-policy.mjs';

export function renderProfileDocument(template,slug,result){
  if(profileSlug('/'+slug)!==slug||!Number.isSafeInteger(result.revision)||result.revision<1)throw Error('Invalid published profile.');
  const config=normalizeProfile(result.config);
  const win=new Window({url:'https://ascendo.lol/'+slug+'/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
  const previous=globalThis.document;globalThis.document=win.document;
  try{
    const html=template.replace('<!--PROFILE_METADATA-->',metadataHtml(slug,config)).replace('PROFILE_SLUG',slug)
      .replace('<!--PROFILE_BOOTSTRAP-->',`<script id="profileBootstrap" type="application/json">${jsonForHtml({slug,revision:result.revision,config})}</script>`);
    win.document.write(html);win.document.close();
    const panel=win.document.querySelector('.profile__panel');renderProfile(panel,config);
    const video=win.document.getElementById('musicBackground');
    video.dataset.backgroundKind=config.background.kind;
    video.dataset.backgroundSrc=config.background.kind==='video'?config.background.url:'';
    video.dataset.mobileSrc=config.background.mobile;
    video.dataset.musicSource=config.music.source;video.dataset.musicSrc=config.music.url;video.dataset.musicVolume=String(config.music.volume);
    const poster=config.background.kind==='image'?config.background.url:config.background.kind==='video'?config.background.poster:'';
    if(poster){video.setAttribute('poster',poster);const stage=win.document.querySelector('.video-stage');stage.style.backgroundImage='url('+JSON.stringify(poster)+')';stage.style.backgroundSize='cover';stage.style.backgroundPosition='center';}
    return '<!doctype html>'+String.fromCharCode(10)+win.document.documentElement.outerHTML;

  }finally{globalThis.document=previous;win.happyDOM.close();}
}
