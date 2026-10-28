import {creativeImage} from './creative-view.mjs?v=20261027-9';
export function createProfileCreative(panel,{surface}={}){
 const doc=panel.ownerDocument,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal;
 const toolbar=panel.closest('.preview-card')?.closest('.studio-preview')?.querySelector('.preview-toolbar');
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 let stage,rotor,back,toggle,config,key='',backVisible=false,destroyed=false;
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 function setSide(value,focus=false){
  if(!stage)return;backVisible=value;stage.classList.toggle('is-back',value);panel.inert=value;back.inert=!value;
  panel.setAttribute('aria-hidden',String(value));back.setAttribute('aria-hidden',String(!value));toggle.setAttribute('aria-pressed',String(value));toggle.setAttribute('aria-label',value?'Show front of profile':'Show reverse of profile');
  toggle.lastElementChild.textContent=value?'Front':'Flip';
  if(focus)toggle.focus({preventScroll:true});
  panel.dispatchEvent(new win.CustomEvent('ascendo:creative-side',{bubbles:true,detail:{back:value}}));
 }
 function remove(){
  if(!stage)return;panel.inert=false;panel.removeAttribute('aria-hidden');stage.before(panel);toggle.remove();toolbar?.classList.remove('preview-toolbar--flip');stage.remove();stage=rotor=back=toggle=null;backVisible=false;key='';
 }
 function update(next,{previewUrls}={}){
  if(destroyed)return;config=next;
  if(!config.flipCard.enabled){remove();return;}
  const value=config.flipCard,resolve=url=>previewUrls?.get(url)||url;
  if(!stage){
   stage=make('div','profile-flip-stage');rotor=make('div','profile-flip-rotor');back=make('section','profile-flip-back');back.setAttribute('aria-label','Reverse of profile');
   toggle=make('button','profile-flip-toggle');toggle.type='button';const mark=make('span','profile-flip-mark','↺');mark.setAttribute('aria-hidden','true');toggle.append(mark,make('span','','Flip'));
   panel.before(stage);stage.append(rotor);rotor.append(panel,back);
   (toolbar||doc.body).append(toggle);if(toolbar)toolbar.classList.add('preview-toolbar--flip');
   toggle.addEventListener('click',()=>setSide(!backVisible,true),{signal});setSide(false);
  }
  stage.style.setProperty('--flip-duration',value.duration+'ms');stage.dataset.reduced=String(reduced.matches);
  for(const variable of ['--profile-accent','--accent-rgb','--profile-secondary','--secondary-rgb','--profile-opacity','--display-font','--body-font'])stage.style.setProperty(variable,panel.style.getPropertyValue(variable));
  stage.dataset.profileTheme=config.colorTheme;
  stage.dataset.frontCompact=String(config.cardLayout==='bento'&&panel.dataset.hasWidgets==='false');
  const changed=JSON.stringify([value,config.name,resolve(value.artwork),resolve(value.poster)]);
  if(changed!==key){
   key=changed;const content=make('div','profile-flip-content');
   if(value.artwork){const art=make('div','profile-flip-artwork');art.append(creativeImage(doc,value.artwork,value.poster,resolve));content.append(art);}
   const heading=make('h2','profile-flip-title',value.title||config.name);content.append(heading);
   if(value.text){const text=make('div','profile-flip-text');for(const line of value.text.split('\n'))text.append(make('p','',line));content.append(text);}
   const links=make('nav','profile-flip-links');links.setAttribute('aria-label','Reverse-side links');
   for(const link of value.links){if(!link.label||!link.url)continue;const a=make('a','profile-flip-link',link.label);a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',link.label+' (opens in a new tab)');const arrow=make('span','','↗');arrow.setAttribute('aria-hidden','true');a.append(arrow);links.append(a);}
   if(links.children.length)content.append(links);back.replaceChildren(content);
  }
  back.style.setProperty('--reverse-color',value.color||'var(--profile-accent)');
  if(doc.documentElement.dataset.profileCapture==='true')setSide(false);
 }
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&backVisible&&(doc.activeElement===toggle||stage?.contains(doc.activeElement))){event.preventDefault();setSide(false,true);}},{signal});
 reduced.addEventListener('change',()=>{if(stage)stage.dataset.reduced=String(reduced.matches);},{signal});
 win.addEventListener('pagehide',event=>{if(event.persisted)setSide(false);else destroy();},{signal});
 function destroy(){if(destroyed)return;destroyed=true;abort.abort();remove();}
 return{update,destroy,front:()=>setSide(false)};
}
