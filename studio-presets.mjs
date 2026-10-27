import {tr} from './studio-i18n.mjs?v=20261027-9';
import {normalizeProfile} from './profile-schema.mjs?v=20261027-9';
import {createPresetThumbnail} from './preset-thumbnail.mjs?v=20261027-9';
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
export const sameSnapshot=(a,b)=>JSON.stringify(ordered(normalizeProfile(a)))===JSON.stringify(ordered(normalizeProfile(b)));

export function createStudioPresets({request,getDraft,loadDraft,getPreviewUrls=()=>undefined,isBusy=()=>false}){
 const doc=document,win=doc.defaultView,make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text)node.textContent=tr(text);return node;};
 const button=(label,run)=>{const b=make('button','studio-button',label);b.type='button';b.addEventListener('click',run);return b;};
 const trigger=button('Presets',open);trigger.id='profilePresets';trigger.setAttribute('aria-haspopup','dialog');doc.querySelector('.studio-header__actions').prepend(trigger);
 const dialog=make('dialog','studio-presets');dialog.setAttribute('aria-labelledby','presetsTitle');
 const heading=make('div','studio-presets__heading'),title=make('h2','','Saved presets');title.id='presetsTitle';const closeButton=button('Close',close);heading.append(title,closeButton);
 const help=make('p','studio-help','Save your current preview. Loading a preset stays private until Save changes.');
 const form=make('form','studio-presets__save'),label=make('label','studio-label','Preset name'),name=make('input','studio-input');name.maxLength=40;name.required=true;name.autocomplete='off';label.append(name);
 const save=make('button','studio-button studio-button--primary','Save preset');save.type='submit';form.append(label,save);
 const list=make('div','studio-presets__list'),status=make('p','studio-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const confirmation=make('div','studio-presets__confirm');confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-labelledby','presetConfirmation');
 const confirmationText=make('p','studio-help');confirmationText.id='presetConfirmation';const renameLabel=make('label','studio-label','New preset name'),renameInput=make('input','studio-input');renameInput.id='presetRenameName';renameInput.maxLength=40;renameInput.autocomplete='off';renameLabel.append(renameInput);renameLabel.hidden=true;renameInput.disabled=true;const confirmActions=make('div','studio-presets__actions'),cancel=button('Cancel',()=>cancelConfirmation()),accept=button('Load preset',()=>{if(!renameLabel.hidden){renameInput.setCustomValidity(renameInput.value.trim()?'':tr('Give your preset a name (up to 40 characters).'));if(!renameInput.reportValidity())return;}const run=pending;cancelConfirmation(false);run?.();});confirmActions.append(cancel,accept);confirmation.append(confirmationText,renameLabel,confirmActions);
 dialog.append(heading,help,form,confirmation,list,status);doc.body.append(dialog);
 let busy=false,writing=false,ticket=0,items=[],returnFocus,pending,confirmReturn,menuState;let menuSerial=0,cacheEpoch=0;const cache=new Map(),cacheVersions=new Map(),thumbnails=[];
 function message(text,error=false){status.textContent=tr(text);status.dataset.error=String(error);}
 function controls(){trigger.disabled=isBusy();save.disabled=busy||!!pending||isBusy();name.disabled=writing||!!pending;for(const b of list.querySelectorAll('button'))b.disabled=busy||!!pending||isBusy();dialog.setAttribute('aria-busy',String(busy));}
 function reveal(node){node?.scrollIntoView({block:'nearest',behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 function cancelConfirmation(focus=true){pending=undefined;confirmation.hidden=true;renameLabel.hidden=true;renameInput.disabled=true;controls();if(focus){confirmReturn?.focus({preventScroll:true});reveal(confirmReturn);}}
 function ask(text,label,run,renameValue){confirmReturn=menuState?.trigger||doc.activeElement;closeMenu();pending=run;confirmationText.textContent=tr(text);accept.textContent=tr(label);confirmation.hidden=false;renameLabel.hidden=renameValue===undefined;renameInput.disabled=renameLabel.hidden;if(renameValue!==undefined){renameInput.value=renameValue;renameInput.setCustomValidity('');}controls();confirmation.scrollIntoView({block:'nearest',behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});if(renameValue===undefined)cancel.focus({preventScroll:true});else{renameInput.focus({preventScroll:true});renameInput.select();}}
 function closeMenu(focus=false){if(!menuState)return;const {trigger,menu}=menuState;menu.hidden=true;trigger.setAttribute('aria-expanded','false');menuState=undefined;if(focus&&trigger.isConnected)trigger.focus({preventScroll:true});}
 function openMenu(trigger,menu,last=false){closeMenu();menu.hidden=false;trigger.setAttribute('aria-expanded','true');menuState={trigger,menu};const buttons=menu.querySelectorAll('button');buttons[last?buttons.length-1:0]?.focus({preventScroll:true});}
 function focusPreset(id){const row=[...list.children].find(node=>node.dataset.presetId===id);row?.querySelector('[data-preset-menu]')?.focus({preventScroll:true});reveal(row);}
 async function mutate(item,method,body,success,config){
  const generation=++ticket;busy=true;controls();message('');
  try{
   const result=await request('/presets/'+item.id,{method,body});invalidate(item.id);
   if(config){const stored=await read(item.id);if(stored.version!==result.version)throw Error('This preset changed in another tab. Reopen Presets and try again.');if(!sameSnapshot(config,stored.config))throw Error('Could not verify the updated preset. Reopen Presets and try again.');}
   if(generation!==ticket||!dialog.open)return;await refresh();message(success);focusPreset(item.id);
  }catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
 }
 renameInput.addEventListener('input',()=>renameInput.setCustomValidity(''));
 renameInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();accept.click();}});
 doc.addEventListener('pointerdown',event=>{if(menuState&&!menuState.menu.contains(event.target)&&!menuState.trigger.contains(event.target))closeMenu();});
 function clearThumbnails(){for(const dispose of thumbnails.splice(0))dispose();}
 function invalidate(id){cache.delete(id);cacheVersions.set(id,(cacheVersions.get(id)||0)+1);}
 async function read(id){if(cache.has(id))return cache.get(id);const epoch=cacheEpoch,version=cacheVersions.get(id)||0;const value=await request('/presets/'+id);const result={...value,config:normalizeProfile(value.config)};if(epoch===cacheEpoch&&version===(cacheVersions.get(id)||0))cache.set(id,result);return result;}
 async function refresh(){const current=++ticket;busy=true;controls();try{const value=await request('/presets');if(current!==ticket||!dialog.open)return;items=value;render(current);}catch(error){if(current===ticket)message(error.message,true);}finally{if(current===ticket){busy=false;controls();}}}
 function render(current=ticket){
  closeMenu();clearThumbnails();list.replaceChildren();if(!items.length){list.append(make('p','studio-help','No presets yet.'));return;}
  const queue=[];
  for(const item of items){
   const row=make('div','studio-presets__row'),thumbnail=make('div','preset-thumbnail'),body=make('div','studio-presets__body'),text=make('strong');text.textContent=item.name;text.setAttribute('data-user-content','');row.dataset.presetId=item.id;
   const actions=make('div','studio-presets__actions');
   const load=button('Load',()=>{if(busy||isBusy())return;ask('Replace your current preview with this preset? Unpublished changes will be replaced.','Load preset',async()=>{
    busy=true;controls();const generation=++ticket;
    try{const value=await read(item.id);if(generation!==ticket||!dialog.open)return;await loadDraft(structuredClone(value.config),{isCurrent:()=>generation===ticket&&dialog.open});if(generation===ticket&&dialog.open)close();}
    catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
   });});
   const remove=button('Delete',()=>{if(busy||isBusy())return;ask('Delete this saved preset?','Delete preset',async()=>{
    const generation=++ticket;busy=true;controls();try{await request('/presets/'+item.id,{method:'DELETE'});invalidate(item.id);if(generation!==ticket||!dialog.open)return;await refresh();message('Preset deleted.');}catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
   });});
   const rename=button('Rename',()=>{if(busy||isBusy())return;ask('Rename preset','Rename preset',()=>mutate(item,'PATCH',{name:renameInput.value.trim(),version:item.version??1},'Preset renamed.'),item.name);});
   const update=button('Update',()=>{if(busy||isBusy())return;let config;try{config=normalizeProfile(structuredClone(getDraft()));}catch(error){message(error.message,true);return;}ask('Replace this preset with your current preview? Your public profile will not change.','Update preset',()=>mutate(item,'PUT',{config,version:item.version??1},'Preset updated. Your public profile is unchanged.',config));});
   const more=button('⋯',()=>{if(menuState?.trigger===more)closeMenu(true);else openMenu(more,menu);});more.dataset.presetMenu='';more.setAttribute('aria-label',tr('Preset actions')+': '+item.name);more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');
   const menu=make('div','studio-presets__menu');menu.id='presetActions'+(++menuSerial);menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label',tr('Preset actions'));more.setAttribute('aria-controls',menu.id);
   for(const [action,kind]of [[rename,'rename'],[update,'update'],[remove,'delete']]){action.dataset.presetAction=kind;action.setAttribute('role','menuitem');menu.append(action);action.addEventListener('click',()=>closeMenu());}
   more.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openMenu(more,menu,event.key==='ArrowUp');}});
   menu.addEventListener('keydown',event=>{const buttons=[...menu.querySelectorAll('button')],at=buttons.indexOf(doc.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length].focus();}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);}else if(event.key==='Tab')closeMenu();});
   load.setAttribute('aria-label',tr('Load preset')+': '+item.name);remove.setAttribute('aria-label',tr('Delete preset')+': '+item.name);actions.append(load,more,menu);body.append(text,actions);row.append(thumbnail,body);list.append(row);
   queue.push(async()=>{try{const value=await read(item.id);if(current!==ticket||!dialog.open||!thumbnail.isConnected)return;thumbnails.push(createPresetThumbnail(thumbnail,value.config,{previewUrls:getPreviewUrls()}));}catch{if(current===ticket)thumbnail.textContent=tr('Preview unavailable');}});
  }
  // At most two requests at a time; no thumbnail polling or idle animation loops.
  for(let i=0;i<Math.min(2,queue.length);i++)(async()=>{while(queue.length&&current===ticket&&dialog.open)await queue.shift()();})();
 }
 async function open(){if(isBusy())return;closeMenu();returnFocus=doc.activeElement;cacheEpoch++;cache.clear();cancelConfirmation(false);clearThumbnails();list.replaceChildren(make('p','studio-help','Loading presets…'));message('');dialog.showModal();name.focus();await refresh();}
 function close(){closeMenu();ticket++;busy=false;writing=false;cancelConfirmation(false);clearThumbnails();dialog.close();controls();returnFocus?.focus({preventScroll:true});}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||pending||isBusy()||!form.reportValidity())return;let config;try{config=normalizeProfile(structuredClone(getDraft()));}catch(error){message(error.message,true);return;}
  const generation=++ticket;busy=true;writing=true;controls();message('Saving preset…');
  try{
   const created=await request('/presets',{method:'POST',body:{name:name.value.trim(),config}});invalidate(created.id);const stored=await read(created.id);
   if(!sameSnapshot(config,stored.config)){await request('/presets/'+created.id,{method:'DELETE'}).catch(()=>{});invalidate(created.id);throw Error('This preset did not keep every setting. Nothing was published. Please try saving it again.');}
   if(generation!==ticket||!dialog.open)return;writing=false;name.value='';await refresh();message('Preset saved. Your public profile is unchanged.');
  }catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;writing=false;controls();}}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(menuState){closeMenu(true);return;}if(pending)cancelConfirmation();else close();});
 doc.addEventListener('ascendo:language',()=>{trigger.textContent=tr('Presets');title.textContent=tr('Saved presets');help.textContent=tr('Save your current preview. Loading a preset stays private until Save changes.');label.firstChild.textContent=tr('Preset name');save.textContent=tr('Save preset');closeButton.textContent=tr('Close');cancel.textContent=tr('Cancel');renameLabel.firstChild.textContent=tr('New preset name');if(!pending)render();controls();});
 win.addEventListener('pagehide',event=>{ticket++;clearThumbnails();if(dialog.open)dialog.close();if(!event.persisted){dialog.remove();trigger.remove();}});
 controls();return {close,refresh:controls};
}
