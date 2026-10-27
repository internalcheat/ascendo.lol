import {CURSOR_STYLES,cursorImage} from './cursor-art.mjs?v=20261027-4';
import {createProfileEffects} from './profile-effects.mjs?v=20261027-4';

export function createCursorEditor({isBusy=()=>false}={}){
 const doc=document,win=doc.defaultView,source=doc.getElementById('cursorStyle'),label=source.closest('label'),abort=new win.AbortController(),signal=abort.signal;
 const make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
 const picker=make('fieldset','cursor-picker full-width'),legend=make('legend','studio-label','Cursor style'),choices=make('div','cursor-picker__choices');choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label','Cursor style');picker.append(legend,choices);label.before(picker);label.hidden=true;source.dataset.visualPicker='';
 const buttons=new Map(),images=new Map();
 for(const style of CURSOR_STYLES){const button=make('button','cursor-choice'),image=make('img','cursor-choice__image'),name=source.querySelector(`[value="${style}"]`).textContent;button.type='button';button.dataset.cursorStyle=style;button.setAttribute('role','radio');button.setAttribute('aria-checked','false');image.alt='';image.width=40;image.height=40;button.append(image,make('span','',name));choices.append(button);buttons.set(style,button);images.set(style,image);
  button.addEventListener('click',()=>{if(source.disabled||isBusy())return;if(source.value!==style){source.value=style;source.dispatchEvent(new win.Event('change',{bubbles:true}));}sync();},{signal});
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const at=CURSOR_STYLES.indexOf(source.value),index=event.key==='Home'?0:event.key==='End'?3:(at+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+4)%4,next=buttons.get(CURSOR_STYLES[index]);next.click();next.focus({preventScroll:true});},{signal});
 }
 const pad=make('div','cursor-test full-width');pad.id='cursorTestArea';pad.setAttribute('role','group');pad.setAttribute('aria-label','Cursor test area');
 const surface=make('div','cursor-test__surface'),title=make('span','cursor-test__title','Try it here'),copy=make('p','cursor-test__copy','Move, click, or select this text.'),test=make('button','studio-button','Test click');test.type='button';surface.append(title,copy,test);pad.append(surface);source.closest('.studio-fields').append(pad);
 const runtime=createProfileEffects(surface,{scope:pad,preview:true});let colorKey;
 function sync(){for(const [style,button]of buttons){const selected=source.value===style;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1;button.disabled=source.disabled||isBusy();}}
 source.addEventListener('change',sync,{signal});
 function update(config){const color=config.colorTheme==='monochrome'?'#f2f2f2':config.cursorEffects.color;if(color!==colorKey){colorKey=color;for(const [style,img]of images)img.src=cursorImage({...config.cursorEffects,style,color});picker.style.setProperty('--cursor-choice-color',color);}
  sync();runtime.update({...config,cardLayout:'classic',cardEffects:{...config.cardEffects,enabled:false},entranceEffects:{...config.entranceEffects,enabled:false},electricBorder:{...config.electricBorder,enabled:false},overlays:{...config.overlays,enabled:false}});
 }
 const visibility=new win.MutationObserver(sync);visibility.observe(source,{attributes:true,attributeFilter:['disabled']});
 win.addEventListener('pagehide',event=>{if(event.persisted)return;abort.abort();visibility.disconnect();picker.remove();pad.remove();label.hidden=false;delete source.dataset.visualPicker;},{signal});
 return {update,refresh:sync};
}
