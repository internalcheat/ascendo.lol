import {tr} from './studio-i18n.mjs?v=20261027-1';
import {normalizeProfile} from './profile-schema.mjs?v=20261027-1';
import {createPresetThumbnail} from './preset-thumbnail.mjs?v=20261027-1';
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
 const confirmationText=make('p','studio-help');confirmationText.id='presetConfirmation';const confirmActions=make('div','studio-presets__actions'),cancel=button('Cancel',()=>cancelConfirmation()),accept=button('Load preset',()=>{const run=pending;cancelConfirmation(false);run?.();});confirmActions.append(cancel,accept);confirmation.append(confirmationText,confirmActions);
 dialog.append(heading,help,form,confirmation,list,status);doc.body.append(dialog);
 let busy=false,ticket=0,items=[],returnFocus,pending,confirmReturn;const cache=new Map(),thumbnails=[];
 function message(text,error=false){status.textContent=tr(text);status.dataset.error=String(error);}
 function controls(){trigger.disabled=isBusy();save.disabled=busy||!!pending||isBusy();name.disabled=busy||!!pending;for(const b of list.querySelectorAll('button'))b.disabled=busy||!!pending||isBusy();dialog.setAttribute('aria-busy',String(busy));}
 function cancelConfirmation(focus=true){pending=undefined;confirmation.hidden=true;controls();if(focus)confirmReturn?.focus({preventScroll:true});}
 function ask(text,label,run){pending=run;confirmReturn=doc.activeElement;confirmationText.textContent=tr(text);accept.textContent=tr(label);confirmation.hidden=false;controls();cancel.focus({preventScroll:true});}
 function clearThumbnails(){for(const dispose of thumbnails.splice(0))dispose();}
 async function read(id){if(cache.has(id))return cache.get(id);const value=await request('/presets/'+id);const result={...value,config:normalizeProfile(value.config)};cache.set(id,result);return result;}
 async function refresh(){const current=++ticket;busy=true;controls();try{const value=await request('/presets');if(current!==ticket||!dialog.open)return;items=value;render(current);}catch(error){if(current===ticket)message(error.message,true);}finally{if(current===ticket){busy=false;controls();}}}
 function render(current=ticket){
  clearThumbnails();list.replaceChildren();if(!items.length){list.append(make('p','studio-help','No presets yet.'));return;}
  const queue=[];
  for(const item of items){
   const row=make('div','studio-presets__row'),thumbnail=make('div','preset-thumbnail'),body=make('div','studio-presets__body'),text=make('strong');text.textContent=item.name;
   const actions=make('div','studio-presets__actions');
   const load=button('Load',()=>{if(busy||isBusy())return;ask('Replace your current preview with this preset? Unpublished changes will be replaced.','Load preset',async()=>{
    busy=true;controls();const generation=++ticket;
    try{const value=await read(item.id);if(generation!==ticket||!dialog.open)return;await loadDraft(structuredClone(value.config),{isCurrent:()=>generation===ticket&&dialog.open});if(generation===ticket&&dialog.open)close();}
    catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
   });});
   const remove=button('Delete',()=>{if(busy||isBusy())return;ask('Delete this saved preset?','Delete preset',async()=>{
    const generation=++ticket;busy=true;controls();try{await request('/presets/'+item.id,{method:'DELETE'});cache.delete(item.id);if(generation!==ticket||!dialog.open)return;await refresh();message('Preset deleted.');}catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
   });});
   load.setAttribute('aria-label',tr('Load preset')+': '+item.name);remove.setAttribute('aria-label',tr('Delete preset')+': '+item.name);actions.append(load,remove);body.append(text,actions);row.append(thumbnail,body);list.append(row);
   queue.push(async()=>{try{const value=await read(item.id);if(current!==ticket||!dialog.open||!thumbnail.isConnected)return;thumbnails.push(createPresetThumbnail(thumbnail,value.config,{previewUrls:getPreviewUrls()}));}catch{if(current===ticket)thumbnail.textContent=tr('Preview unavailable');}});
  }
  // At most two requests at a time; no thumbnail polling or idle animation loops.
  for(let i=0;i<Math.min(2,queue.length);i++)(async()=>{while(queue.length&&current===ticket&&dialog.open)await queue.shift()();})();
 }
 async function open(){if(isBusy())return;returnFocus=doc.activeElement;cache.clear();cancelConfirmation(false);message('');dialog.showModal();name.focus();await refresh();}
 function close(){ticket++;busy=false;cancelConfirmation(false);clearThumbnails();dialog.close();controls();returnFocus?.focus({preventScroll:true});}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||pending||isBusy()||!form.reportValidity())return;let config;try{config=normalizeProfile(structuredClone(getDraft()));}catch(error){message(error.message,true);return;}
  const generation=++ticket;busy=true;controls();message('Saving preset…');
  try{
   const created=await request('/presets',{method:'POST',body:{name:name.value.trim(),config}});cache.delete(created.id);const stored=await read(created.id);
   if(!sameSnapshot(config,stored.config)){await request('/presets/'+created.id,{method:'DELETE'}).catch(()=>{});cache.delete(created.id);throw Error('This preset did not keep every setting. Nothing was published. Please try saving it again.');}
   if(generation!==ticket||!dialog.open)return;name.value='';await refresh();message('Preset saved. Your public profile is unchanged.');
  }catch(error){if(generation===ticket)message(error.message,true);}finally{if(generation===ticket){busy=false;controls();}}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(pending)cancelConfirmation();else close();});
 doc.addEventListener('ascendo:language',()=>{trigger.textContent=tr('Presets');title.textContent=tr('Saved presets');help.textContent=tr('Save your current preview. Loading a preset stays private until Save changes.');label.firstChild.textContent=tr('Preset name');save.textContent=tr('Save preset');closeButton.textContent=tr('Close');cancel.textContent=tr('Cancel');if(!pending)render();controls();});
 win.addEventListener('pagehide',event=>{ticket++;clearThumbnails();if(dialog.open)dialog.close();if(!event.persisted){dialog.remove();trigger.remove();}});
 controls();return {close,refresh:controls};
}
