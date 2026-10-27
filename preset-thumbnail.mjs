import {createAvatarFrames} from './avatar-frames.mjs?v=20261027-1';
import {electricContour} from './electric-contour.mjs?v=20261027-1';
import {electricPaths} from './electric-styles.mjs?v=20261027-1';
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
 const width=layoutWidth(config.cardLayout);panel.style.width='100%';scope.style.setProperty('--layout-width',width+'px');scope.style.width=width+'px';scope.style.maxWidth='none';scope.inert=true;host.setAttribute('aria-hidden','true');host.replaceChildren(stage,scope);
 const frames=createAvatarFrames(panel,{reduced:{matches:true}});frames.update(config);
 const borders=[];
 if(config.electricBorder.enabled){
  const e=config.electricBorder,targets=[...(e.card?[panel.dataset.tiled==='true'?panel.querySelector('.profile-identity'):panel]:[]),...(e.panels?[...panel.querySelectorAll('.social-link,.now-playing,.profile-widget')]:[]),...(e.avatar?[panel.querySelector('.avatar')]:[])].filter(Boolean);
  for(const target of targets){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('profile-electric');const paths=Array.from({length:3},()=>doc.createElementNS(svg.namespaceURI,'path'));svg.append(...paths);target.classList.add('profile-electric-target');target.append(svg);borders.push({target,svg,paths});}
 }
 function paintBorders(){for(const {target,svg,paths}of borders){const w=target.offsetWidth,h=target.offsetHeight;if(!w||!h)continue;const style=win.getComputedStyle(target),radii=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k=>style[k].includes('%')?parseFloat(style[k])/100*Math.min(w,h):parseFloat(style[k])||0);svg.style.width=w+10+'px';svg.style.height=h+10+'px';svg.style.left=-5-(parseFloat(style.borderLeftWidth)||0)+'px';svg.style.top=-5-(parseFloat(style.borderTopWidth)||0)+'px';svg.style.right=svg.style.bottom='auto';svg.setAttribute('viewBox',`0 0 ${w+10} ${h+10}`);const e=config.electricBorder,d=electricPaths(electricContour(w,h,radii),e,0,{reduced:true});for(const [i,path]of paths.entries()){path.setAttribute('d',i===1?d.secondary:d.primary);path.setAttribute('stroke',i===1?e.secondary:e.color);path.setAttribute('stroke-width',String(i===0?e.width+2.7:e.width));path.setAttribute('opacity',String(i===0?e.glow/100:.85));path.setAttribute('stroke-dasharray',d.dash);}}}
 let disposed=false;
 function fit(){if(disposed)return;const available=host.clientWidth||260,height=host.clientHeight||170,content=Math.max(panel.scrollHeight,panel.offsetHeight,300),scale=Math.min((available-20)/width,(height-20)/content);scope.style.transform='translate(-50%,-50%) scale('+scale+')';paintBorders();frames.geometry();}
 const observer=win.ResizeObserver?new win.ResizeObserver(fit):null;observer?.observe(host);observer?.observe(panel);doc.fonts?.ready?.then(fit);for(const image of scope.querySelectorAll('img'))image.addEventListener('load',fit,{once:true});fit();
 return ()=>{disposed=true;observer?.disconnect();frames.destroy();host.replaceChildren();};
}
