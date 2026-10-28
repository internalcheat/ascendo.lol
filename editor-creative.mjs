import {element} from './profile-view.mjs?v=20261028-2';
export function createCreativeEditor({onChange,isBusy=()=>false,uploadImage}){
 const doc=document,host=doc.getElementById('controlsPanel'),byId=id=>doc.getElementById(id),groups=[],stickerRows=[],linkRows=[];
 const button=(label,fn)=>{const b=element('button','studio-button',label);b.type='button';b.addEventListener('click',()=>{if(!isBusy())fn();});return b;};
 function section(title,id){const node=element('section','studio-section studio-panel'),heading=element('div','studio-section-heading'),label=element('label','studio-switch'),master=element('input');master.type='checkbox';master.id=id;master.setAttribute('role','switch');master.setAttribute('aria-label','Enable '+title.toLowerCase());label.append(master,element('span'));label.lastChild.setAttribute('aria-hidden','true');heading.append(element('h2','',title),label);const body=element('div','studio-fields');node.append(heading,body);host.append(node);const group={node,master,body};groups.push(group);return group;}
 function field(parent,label,id,type,value,options){const wrap=element('label','studio-label'),input=element(type==='select'?'select':type==='textarea'?'textarea':'input','studio-input');input.id=id;
  if(type==='select')for(const [key,name]of options){const n=element('option','',name);n.value=key;input.append(n);}else if(type!=='textarea')input.type=type;
  if(type==='range'){Object.assign(input,{min:options[0],max:options[1],step:options[2]??1});}
  if(['text','textarea'].includes(type))input.maxLength=options||80;input.value=value;
  wrap.append(doc.createTextNode(label),input);if(type==='checkbox'){wrap.className='studio-check';input.checked=value;}
  if(type==='range'){const output=element('output');output.htmlFor=id;output.textContent=value;input.addEventListener('input',()=>{output.textContent=input.value;});wrap.append(output);}
  parent.append(wrap);return input;
 }
 function color(parent,label,id){const box=element('div');const input=field(box,label,id,'color','#c19aff'),auto=field(box,'Auto',id+'Auto','checkbox',true);auto.setAttribute('aria-label','Automatic '+label.toLowerCase());parent.append(box);return input;}
 function imageFields(parent,id){const box=element('div','full-width'),url=field(box,'Image',id,'url','');url.readOnly=true;const poster=element('input');poster.type='hidden';poster.id=id+'Poster';box.append(poster);
  const upload=element('div','studio-upload'),file=element('input');file.type='file';file.accept='image/jpeg,image/png,image/webp,image/gif';file.setAttribute('aria-label','Upload creative image');
  const progress=element('progress');progress.max=100;progress.value=0;progress.hidden=true;progress.setAttribute('aria-label','Image upload progress');
  const cancel=element('button','studio-button','Cancel upload');cancel.type='button';cancel.dataset.cancel='';cancel.hidden=true;const status=element('span','studio-help');status.setAttribute('role','status');upload.append(file,progress,cancel,status);
  const remove=button('Remove image',()=>{url.value='';poster.value='';onChange();});upload.append(remove);box.append(upload);parent.append(box);
  file.addEventListener('change',async()=>{const selected=file.files[0];if(!selected||isBusy())return;try{status.textContent='Uploading image…';const result=await uploadImage(selected,upload);if(!url.isConnected)return;url.value=result.url;poster.value=result.poster||'';status.textContent='Uploaded privately. Save changes to publish.';onChange();}catch(error){status.textContent=error.message;}finally{file.value='';updateControls();}});
  return{url,poster,file,remove};
 }
 const flip=section('Double-Sided Card','flipEnabled');
 const flipTitle=field(flip.body,'Reverse title','flipTitle','text','',80),flipText=field(flip.body,'Reverse text','flipText','textarea','',1200),artwork=imageFields(flip.body,'flipArtwork');flipText.rows=4;
 color(flip.body,'Reverse accent','flipColor');const duration=field(flip.body,'Flip duration (ms)','flipDuration','range',650,[300,1200,50]);
 const links=element('div','creative-link-rows full-width');flip.body.append(links);
 let linkCounter=0;
 function addLink(value={label:'Website',url:'https://example.com/'}){const row=element('div','creative-editor-row'),fields=element('div','studio-fields'),index=linkCounter++;
  const label=field(fields,'Link label','flipLinkLabel'+index,'text',value.label,60),url=field(fields,'Link URL','flipLinkUrl'+index,'url',value.url);row.append(fields,button('Remove link',()=>{const i=linkRows.findIndex(x=>x.row===row);linkRows.splice(i,1);row.remove();onChange();updateControls();}));links.append(row);linkRows.push({row,label,url});
 }
 const addLinkButton=button('Add reverse link',()=>{if(linkRows.length<6){addLink();updateControls();onChange();}});flip.body.append(addLinkButton);
 const stars=section('Constellation Socials','constellationEnabled');
 field(stars.body,'Orbit spread','constellationSpread','range',90,[65,100]);field(stars.body,'Connection glow','constellationLineOpacity','range',35,[0,100]);field(stars.body,'Social node size','constellationNodeSize','range',48,[40,56]);field(stars.body,'Gentle icon movement','constellationMotion','checkbox',true);
 stars.body.append(element('p','studio-help full-width','Uses your existing social links. Small cards show compact, readable buttons.'));
 const stickers=section('Glass Stickers','stickersEnabled'),list=element('div','creative-sticker-rows full-width');stickers.body.append(list);
 function addSticker(value={id:crypto.randomUUID(),kind:'emoji',text:'✦',url:'',poster:'',edge:'right',position:15,offset:4,size:64,rotation:-8,opacity:85,motion:true,color:null}){
  const row=element('div','creative-editor-row'),fields=element('div','studio-fields'),prefix='sticker-'+value.id+'-';row.dataset.stickerId=value.id;
  const controls={};controls.kind=field(fields,'Sticker type',prefix+'kind','select',value.kind,[['emoji','Emoji'],['note','Handwritten note'],['image','Image']]);controls.text=field(fields,'Sticker text',prefix+'text','text',value.text,80);
  const image=imageFields(fields,prefix+'image');image.url.value=value.url;image.poster.value=value.poster;
  controls.edge=field(fields,'Card edge',prefix+'edge','select',value.edge,[['top','Top'],['right','Right'],['bottom','Bottom'],['left','Left']]);
  for(const [key,label,min,max]of [['position','Position along edge',10,90],['offset','Edge inset',-12,24],['size','Sticker size',32,120],['rotation','Sticker rotation',-30,30],['opacity','Sticker opacity',20,100]])controls[key]=field(fields,label,prefix+key,'range',value[key],[min,max]);
  controls.motion=field(fields,'Sticker hover movement',prefix+'motion','checkbox',value.motion);controls.color=color(fields,'Sticker color',prefix+'color');controls.color.value=value.color||'#c19aff';controls.color.closest('div').querySelector('input[type=checkbox]').checked=value.color===null;
  const tools=element('div','studio-effect-tools');for(const [label,delta]of [['Move up',-1],['Move down',1],['Remove sticker',0]])tools.append(button(label,()=>{const i=stickerRows.findIndex(x=>x.row===row),j=i+delta;if(delta===0){stickerRows.splice(i,1);row.remove();}else if(j>=0&&j<stickerRows.length){[stickerRows[i],stickerRows[j]]=[stickerRows[j],stickerRows[i]];for(const item of stickerRows)list.append(item.row);}onChange();updateControls();}));
  row.append(fields,tools);list.append(row);stickerRows.push({id:value.id,row,controls,image});
 }
 const addStickerButton=button('Add sticker',()=>{if(stickerRows.length<8){addSticker();updateControls();onChange();}});stickers.body.append(addStickerButton);
 function collect(){return{
  flipCard:{enabled:flip.master.checked,title:flipTitle.value,text:flipText.value,artwork:artwork.url.value,poster:artwork.poster.value,color:byId('flipColorAuto').checked?null:byId('flipColor').value,duration:Number(duration.value),links:linkRows.map(x=>({label:x.label.value,url:x.url.value}))},
  constellation:{enabled:stars.master.checked,spread:Number(byId('constellationSpread').value),lineOpacity:Number(byId('constellationLineOpacity').value),nodeSize:Number(byId('constellationNodeSize').value),motion:byId('constellationMotion').checked},
  stickers:{enabled:stickers.master.checked,items:stickerRows.map(({id,controls:c,image})=>({id,kind:c.kind.value,text:c.text.value,url:image.url.value,poster:image.poster.value,edge:c.edge.value,position:Number(c.position.value),offset:Number(c.offset.value),size:Number(c.size.value),rotation:Number(c.rotation.value),opacity:Number(c.opacity.value),motion:c.motion.checked,color:byId(c.color.id+'Auto').checked?null:c.color.value}))}
 };}
 function fill(config){
  flip.master.checked=config.flipCard.enabled;flipTitle.value=config.flipCard.title;flipText.value=config.flipCard.text;artwork.url.value=config.flipCard.artwork;artwork.poster.value=config.flipCard.poster;byId('flipColorAuto').checked=config.flipCard.color===null;byId('flipColor').value=config.flipCard.color||config.accent;duration.value=config.flipCard.duration;
  links.replaceChildren();linkRows.length=0;for(const value of config.flipCard.links)addLink(value);
  stars.master.checked=config.constellation.enabled;for(const key of ['spread','lineOpacity','nodeSize','motion']){const n=byId('constellation'+key[0].toUpperCase()+key.slice(1));if(n.type==='checkbox')n.checked=config.constellation[key];else n.value=config.constellation[key];}
  stickers.master.checked=config.stickers.enabled;list.replaceChildren();stickerRows.length=0;for(const value of config.stickers.items)addSticker(value);updateControls();
 }
 function updateControls(){
  for(const group of groups){group.master.disabled=isBusy();for(const node of group.body.querySelectorAll('input,select,textarea,button'))if(!node.hasAttribute('data-cancel'))node.disabled=isBusy()||!group.master.checked;}
  byId('flipColor').disabled||=byId('flipColorAuto').checked;addLinkButton.disabled||=linkRows.length>=6;addStickerButton.disabled||=stickerRows.length>=8;
  for(const {row,controls:c,image}of stickerRows){c.text.closest('label').hidden=c.kind.value==='image';image.url.closest('.full-width').hidden=c.kind.value!=='image';c.color.closest('div').hidden=c.kind.value==='image';c.color.disabled||=byId(c.color.id+'Auto').checked;}
  for(const output of host.querySelectorAll('.creative-editor-row output')){const control=byId(output.htmlFor);if(control)output.textContent=control.value;}
 }
 return{collect,fill,updateControls};
}
