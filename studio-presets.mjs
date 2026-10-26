import {tr} from './studio-i18n.mjs?v=20261026-8';
export function createStudioPresets({request,getDraft,loadDraft,isBusy=()=>false}){
 const doc=document,win=doc.defaultView,make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text)node.textContent=tr(text);return node;};
 const button=(label,run)=>{const b=make('button','studio-button',label);b.type='button';b.addEventListener('click',run);return b;};
 const trigger=button('Presets',open);trigger.id='profilePresets';trigger.setAttribute('aria-haspopup','dialog');doc.querySelector('.studio-header__actions').prepend(trigger);
 const dialog=make('dialog','studio-presets');dialog.setAttribute('aria-labelledby','presetsTitle');
 const heading=make('div','studio-presets__heading'),title=make('h2','','Saved presets');title.id='presetsTitle';const closeButton=button('Close',close);heading.append(title,closeButton);
 const help=make('p','studio-help','Save your current preview. Loading a preset stays private until Save changes.');
 const form=make('form','studio-presets__save'),label=make('label','studio-label','Preset name'),name=make('input','studio-input');name.maxLength=40;name.required=true;name.autocomplete='off';label.append(name);
 const save=make('button','studio-button studio-button--primary','Save preset');save.type='submit';form.append(label,save);
 const list=make('div','studio-presets__list'),status=make('p','studio-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');dialog.append(heading,help,form,list,status);doc.body.append(dialog);
 let busy=false,ticket=0,items=[],returnFocus;
 function message(text,error=false){status.textContent=tr(text);status.dataset.error=String(error);}
 function controls(){trigger.disabled=isBusy();save.disabled=busy||isBusy();name.disabled=busy;closeButton.disabled=false;for(const b of list.querySelectorAll('button'))b.disabled=busy||isBusy();dialog.setAttribute('aria-busy',String(busy));}
 async function refresh(){const current=++ticket;busy=true;controls();try{const value=await request('/presets');if(current!==ticket)return;items=value;render();}catch(error){if(current===ticket)message(error.message,true);}finally{if(current===ticket){busy=false;controls();}}}
 function render(){
  list.replaceChildren();if(!items.length){list.append(make('p','studio-help','No presets yet.'));return;}
  for(const item of items){
   const row=make('div','studio-presets__row'),text=make('strong','',item.name);text.textContent=item.name;
   const actions=make('div','studio-presets__actions'),load=button('Load',async()=>{
    if(busy||isBusy())return;if(!win.confirm(tr('Replace your current preview with this preset? Unpublished changes will be replaced.')))return;
    busy=true;controls();const current=++ticket;try{const value=await request('/presets/'+item.id);if(current!==ticket||!dialog.open)return;loadDraft(value.config);close();}catch(error){message(error.message,true);}finally{busy=false;controls();}
   }),remove=button('Delete',async()=>{
    if(busy||isBusy()||!win.confirm(tr('Delete this saved preset?')))return;
    busy=true;controls();try{await request('/presets/'+item.id,{method:'DELETE'});await refresh();message('Preset deleted.');}catch(error){message(error.message,true);}finally{busy=false;controls();}
   });load.setAttribute('aria-label',tr('Load preset')+': '+item.name);remove.setAttribute('aria-label',tr('Delete preset')+': '+item.name);actions.append(load,remove);row.append(text,actions);list.append(row);
  }
 }
 async function open(){if(isBusy())return;returnFocus=doc.activeElement;message('');dialog.showModal();name.focus();await refresh();}
 function close(){ticket++;busy=false;dialog.close();returnFocus?.focus({preventScroll:true});}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||isBusy()||!form.reportValidity())return;let config;try{config=structuredClone(getDraft());}catch(error){message(error.message,true);return;}
  busy=true;controls();try{await request('/presets',{method:'POST',body:{name:name.value.trim(),config}});name.value='';await refresh();message('Preset saved. Your public profile is unchanged.');}catch(error){message(error.message,true);}finally{busy=false;controls();}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 doc.addEventListener('ascendo:language',()=>{trigger.textContent=tr('Presets');title.textContent=tr('Saved presets');help.textContent=tr('Save your current preview. Loading a preset stays private until Save changes.');label.firstChild.textContent=tr('Preset name');save.textContent=tr('Save preset');closeButton.textContent=tr('Close');render();controls();});
 win.addEventListener('pagehide',event=>{ticket++;if(dialog.open)dialog.close();if(!event.persisted){dialog.remove();trigger.remove();}});
 controls();return {close,refresh:controls};
}

