import {cursorImage} from './cursor-art.mjs?v=20261027-5';
import {CURSOR_IDS,CURSOR_PACKS} from './cursor-packs.mjs?v=20261027-5';
import {createProfileEffects} from './profile-effects.mjs?v=20261027-5';
export function createCursorEditor({isBusy=()=>false}={}){
 const doc=document,win=doc.defaultView,source=doc.getElementById('cursorStyle'),label=source.closest('label'),abort=new win.AbortController(),signal=abort.signal;
 const make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
 for(const [id,pack]of Object.entries(CURSOR_PACKS)){const option=make('option','',pack.name);option.value=id;option.dataset.userContent='';source.append(option);}
 const picker=make('fieldset','cursor-picker full-width'),legend=make('legend','studio-label','Cursor style'),choices=make('div','cursor-picker__choices');choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label','Cursor style');
 const search=make('input','studio-input cursor-picker__search');search.type='search';search.placeholder='Find a cursor…';search.setAttribute('aria-label','Find a cursor');search.autocomplete='off';
 const empty=make('p','studio-help','No cursors found.');empty.hidden=true;empty.setAttribute('role','status');picker.append(legend,search,choices,empty);label.before(picker);label.hidden=true;source.dataset.visualPicker='';
 const buttons=new Map(),images=new Map();
 const loader=win.IntersectionObserver?new win.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const img=entry.target;img.src=img.dataset.src;loader.unobserve(img);}},{root:choices,rootMargin:'100px'}):null;
 for(const style of CURSOR_IDS){
  const pack=CURSOR_PACKS[style],button=make('button','cursor-choice'),art=make('span','cursor-choice__art'),name=pack?.name||source.querySelector(`[value="${style}"]`).textContent,title=make('span','cursor-choice__name',name);button.type='button';button.dataset.cursorStyle=style;button.setAttribute('role','radio');button.setAttribute('aria-checked','false');if(pack)title.dataset.userContent='';
  for(const kind of pack?['cursor','pointer']:['cursor']){const image=make('img','cursor-choice__image');image.alt='';image.width=36;image.height=36;art.append(image);if(pack){image.dataset.src=pack[kind].path;image.decoding='async';if(loader)loader.observe(image);else{image.loading='lazy';image.src=image.dataset.src;}}else images.set(style,image);}
  button.append(art,title);choices.append(button);buttons.set(style,button);
  button.addEventListener('click',()=>{if(source.disabled||isBusy())return;if(source.value!==style){source.value=style;source.dispatchEvent(new win.Event('change',{bubbles:true}));}sync();},{signal});
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const visible=[...buttons.values()].filter(node=>!node.hidden),at=visible.indexOf(button),index=event.key==='Home'?0:event.key==='End'?visible.length-1:(at+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+visible.length)%visible.length,next=visible[index];next.click();next.focus({preventScroll:true});},{signal});
 }
 search.addEventListener('input',event=>{event.stopPropagation();const query=search.value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();let count=0;for(const [id,button]of buttons){const name=(CURSOR_PACKS[id]?.name||id).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();button.hidden=!name.includes(query);if(!button.hidden)count++;}empty.hidden=count>0;choices.scrollTop=0;sync();},{signal});
 search.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();search.value='';search.dispatchEvent(new win.Event('input',{bubbles:true}));}else if(event.key==='Enter'){event.preventDefault();[...buttons.values()].find(node=>!node.hidden&&!node.disabled)?.focus();}},{signal});
 const credit=make('p','studio-help cursor-picker__credit'),link=make('a','','Artwork by Sweezy');link.href='https://sweezy-cursors.com/top-cursors/?filter=top';link.target='_blank';link.rel='noopener noreferrer';credit.append(link);const note=make('p','studio-help','Sweezy packs keep their original colors. Animated packs use still cursor images.');picker.append(credit,note);
 const pad=make('div','cursor-test full-width');pad.id='cursorTestArea';pad.setAttribute('role','group');pad.setAttribute('aria-label','Cursor test area');
 const surface=make('div','cursor-test__surface'),title=make('span','cursor-test__title','Try it here'),copy=make('p','cursor-test__copy','Move, click, or select this text.'),test=make('button','studio-button','Test click'),status=make('p','studio-help');status.setAttribute('role','status');status.hidden=true;test.type='button';surface.append(title,copy,test);pad.append(surface,status);source.closest('.studio-fields').append(pad);
 pad.addEventListener('ascendo:cursor-status',event=>{status.hidden=false;status.textContent=event.detail.message;},{signal});
 const runtime=createProfileEffects(surface,{scope:pad,preview:true});let colorKey;
 function sync(){const focus=buttons.get(source.value)?.hidden?[...buttons.values()].find(node=>!node.hidden):buttons.get(source.value);for(const [style,button]of buttons){const selected=source.value===style;button.setAttribute('aria-checked',String(selected));button.tabIndex=button===focus?0:-1;button.disabled=source.disabled||isBusy();}}
 source.addEventListener('change',()=>{sync();status.hidden=true;},{signal});
 function update(config){const color=config.colorTheme==='monochrome'?'#f2f2f2':config.cursorEffects.color;if(color!==colorKey){colorKey=color;for(const [style,img]of images)img.src=cursorImage({...config.cursorEffects,style,color});picker.style.setProperty('--cursor-choice-color',color);}
  sync();runtime.update({...config,cardLayout:'classic',cardEffects:{...config.cardEffects,enabled:false},entranceEffects:{...config.entranceEffects,enabled:false},electricBorder:{...config.electricBorder,enabled:false},overlays:{...config.overlays,enabled:false}});
 }
 const visibility=new win.MutationObserver(sync);visibility.observe(source,{attributes:true,attributeFilter:['disabled']});
 win.addEventListener('pagehide',event=>{if(event.persisted)return;abort.abort();visibility.disconnect();loader?.disconnect();picker.remove();pad.remove();label.hidden=false;delete source.dataset.visualPicker;},{signal});
 return {update,refresh:sync};
}
