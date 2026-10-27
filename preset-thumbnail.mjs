import {renderProfile} from './profile-view.mjs?v=20261027-1';
import {normalizeProfile} from './profile-schema.mjs?v=20261027-1';
import {layoutWidth} from './visual-schema.mjs?v=20261027-1';
import {backgroundPoster} from './background-catalog.mjs?v=20261025-15';
import {applyBackgroundAppearance} from './profile-appearance.mjs?v=20261027-1';
export function createPresetThumbnail(host,input,{previewUrls}={}){
 const doc=host.ownerDocument,win=doc.defaultView,config=normalizeProfile(input),stage=doc.createElement('div'),scope=doc.createElement('div'),panel=doc.createElement('article');
 stage.className='preset-thumbnail__background';scope.className='preview-card preset-thumbnail__profile';panel.className='profile__panel';scope.append(panel);
 const poster=config.background.kind==='preset'?backgroundPoster(config.background.preset):config.background.kind==='image'?config.background.url:config.background.poster;
 if(poster)stage.style.backgroundImage='url('+JSON.stringify(previewUrls?.get(poster)||poster)+')';applyBackgroundAppearance(stage,config);
 // Quiet thumbnails never create players, run effects or modify the live editor.
 const quiet={...config,effect:config.effect==='typewriter'?'none':config.effect,avatar:{...config.avatar,url:config.avatar.poster||config.avatar.url},widgets:{...config.widgets,embeds:{...config.widgets.embeds,items:[]}}};
 renderProfile(panel,quiet,{previewUrls});
 for(const image of scope.querySelectorAll('img')){image.loading='lazy';image.decoding='async';}
 scope.querySelectorAll('iframe,video,audio').forEach(node=>node.remove());
 scope.querySelectorAll('a,button').forEach(node=>node.tabIndex=-1);
 const width=layoutWidth(config.cardLayout);scope.style.width=width+'px';scope.style.maxWidth='none';scope.inert=true;host.setAttribute('aria-hidden','true');host.replaceChildren(stage,scope);
 let disposed=false;
 function fit(){if(disposed)return;const available=host.clientWidth||260,height=host.clientHeight||170,content=Math.max(panel.scrollHeight,panel.offsetHeight,300),scale=Math.min((available-20)/width,(height-20)/content);scope.style.transform='translate(-50%,-50%) scale('+scale+')';}
 const observer=win.ResizeObserver?new win.ResizeObserver(fit):null;observer?.observe(host);observer?.observe(panel);doc.fonts?.ready?.then(fit);for(const image of scope.querySelectorAll('img'))image.addEventListener('load',fit,{once:true});fit();
 return ()=>{disposed=true;observer?.disconnect();host.replaceChildren();};
}
