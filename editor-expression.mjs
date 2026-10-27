import {element} from './profile-view.mjs?v=20261027-5';
import {DETAIL_COLORS} from './expression-schema.mjs?v=20261027-1';
export function createExpressionEditor({onChange,isBusy=()=>false,replaySignature=()=>{}}){
 const doc=document,host=doc.getElementById('controlsPanel'),groups=new Map(),fields=new Map(),byId=id=>doc.getElementById(id);
 const definitions={
  socialStyle:['Social Button Styles',[
   ['layout','Button layout','select',[['rows','Glass rows'],['pills','Compact pills'],['icons','Icons only']]],
   ['surface','Button surface','select',[['glass','Glass'],['outline','Outline'],['solid','Solid']]],
   ['radius','Corner radius','range',[0,40,1]],['gap','Button spacing','range',[4,24,1]],['iconSize','Icon size','range',[16,36,1]]]],
  detailColors:['Precise Colors',Object.entries(DETAIL_COLORS).map(([id,label])=>[id,label,'color'])],
  richBio:['Richer Bios',[['align','Bio alignment','select',[['left','Left'],['center','Center'],['right','Right']]]]],
  holographic:['Holographic Finish',[
   ['finish','Card finish','select',[['foil','Holographic foil'],['pearl','Pearl'],['brushed','Brushed metal']]],
   ['intensity','Reflection strength','range',[0,100,1]],['speed','Reflection response','range',[.5,2,.1]]]],
  musicReactive:['Music-Reactive Visuals',[
   ['style','Music visual','select',[['waveform','Waveform'],['equalizer','Equalizer'],['halo','Avatar halo']]],
   ['color','Visual color','color'],['intensity','Visual strength','range',[0,100,1]],['smoothing','Visual smoothing','range',[0,95,1]]]],
  signature:['Animated Signature',[
   ['mode','Signature mode','select',[['draw','Draw a signature'],['text','Typed signature']]],
   ['text','Signature text','text',48],['font','Signature lettering','select',[['elegant','Elegant'],['classic','Classic'],['modern','Modern']]],
   ['color','Signature color','color'],['width','Signature width','range',[80,320,1]],['stroke','Stroke width','range',[1,6,.25]],['duration','Writing duration (ms)','range',[300,2400,50]]]]
 };
 const idFor=(group,key)=>group+key[0].toUpperCase()+key.slice(1);
 const button=(label,fn)=>{const node=element('button','studio-button',label);node.type='button';node.addEventListener('click',fn);return node;};
 for(const [group,[title,items]]of Object.entries(definitions)){
  const section=element('section','studio-section studio-panel'),heading=element('div','studio-section-heading'),toggle=element('label','studio-switch'),master=element('input');
  master.id=idFor(group,'enabled');master.type='checkbox';master.setAttribute('role','switch');master.setAttribute('aria-label','Enable '+title.toLowerCase());toggle.append(master,element('span'));toggle.lastChild.setAttribute('aria-hidden','true');heading.append(element('h2','',title),toggle);
  const grid=element('div','studio-fields');section.append(heading,grid);host.append(section);groups.set(group,{section,grid,master});
  for(const [key,label,type,options]of items){
   const wrapper=element('label','studio-label'),control=element(type==='select'?'select':'input','studio-input');control.id=idFor(group,key);if(type!=='select')control.type=type;
   if(type==='select')for(const [value,text]of options){const option=element('option','',text);option.value=value;control.append(option);}
   if(type==='range')Object.assign(control,{min:options[0],max:options[1],step:options[2]});
   if(type==='text')control.maxLength=options;
   wrapper.append(doc.createTextNode(label),control);let auto,output;
   if(type==='color'){auto=element('input');auto.type='checkbox';auto.id=control.id+'Auto';auto.setAttribute('aria-label','Automatic '+label.toLowerCase());const autoLabel=element('label','studio-check');autoLabel.append(auto,doc.createTextNode(' Auto'));const block=element('div');block.append(wrapper,autoLabel);grid.append(block);}else grid.append(wrapper);
   if(type==='range'){output=element('output');output.htmlFor=control.id;wrapper.append(output);}
   fields.set(control.id,{group,key,type,control,auto,output});
  }
 }
 const bio=byId('bio'),bioFields=groups.get('richBio').grid;
 byId('displayName').closest('.studio-section').after(groups.get('richBio').section);
 bioFields.prepend(bio.closest('label'));bio.closest('label').classList.add('full-width');
 const tools=element('div','bio-format-tools full-width');tools.setAttribute('role','group');tools.setAttribute('aria-label','Bio formatting');
 function format(before,after='',placeholder='text'){
  if(isBusy()||!byId('richBioEnabled').checked)return;
  const start=bio.selectionStart,end=bio.selectionEnd,selection=bio.value.slice(start,end)||placeholder;
  const value=bio.value.slice(0,start)+before+selection+after+bio.value.slice(end);if(value.length>1200)return;
  bio.value=value;bio.focus({preventScroll:true});bio.setSelectionRange(start+before.length,start+before.length+selection.length);onChange();
 }
 for(const [label,before,after]of [['Bold','**','**'],['Italic','*','*'],['Underline','__','__'],['Link','[','](https://example.com/)'],['Quote','> ','']])tools.append(button(label,()=>format(before,after)));
 bioFields.insertBefore(tools,bioFields.children[1]||null);
 const reactiveStatus=element('p','studio-help full-width');reactiveStatus.id='musicReactiveStatus';reactiveStatus.setAttribute('role','status');groups.get('musicReactive').grid.append(reactiveStatus);
 groups.get('musicReactive').grid.append(element('p','studio-help full-width','Reacts to playing music. Unsupported media keeps its normal sound and a still visual.'));
 const pad=element('canvas','expression-signature-pad full-width');pad.id='signaturePad';pad.width=1000;pad.height=240;pad.tabIndex=0;pad.setAttribute('aria-label','Draw your signature');pad.setAttribute('aria-describedby','signatureHint');
 const hint=element('p','studio-help full-width','Draw your signature, or choose typed text.');hint.id='signatureHint';hint.setAttribute('role','status');
 const actions=element('div','studio-effect-tools full-width');actions.append(button('Undo stroke',()=>{if(!isBusy()){paths.pop();redraw();onChange();}}),button('Clear signature',()=>{if(!isBusy()){paths=[];redraw();onChange();}}),button('Replay signature',replaySignature));groups.get('signature').grid.append(pad,hint,actions);
 let paths=[],drawing=null,pointer=null;
 function redraw(){
  let ctx;try{ctx=pad.getContext('2d');}catch{}if(!ctx)return;ctx.clearRect(0,0,1000,240);ctx.strokeStyle=byId('signatureColorAuto').checked?'#d9c2ff':byId('signatureColor').value;ctx.lineWidth=Number(byId('signatureStroke').value||2)*4;ctx.lineCap=ctx.lineJoin='round';
  for(const path of [...paths,...(drawing?[drawing]:[])]){ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 }
 function point(event){const r=pad.getBoundingClientRect();return [Math.max(0,Math.min(1000,(event.clientX-r.left)/r.width*1000)),Math.max(0,Math.min(240,(event.clientY-r.top)/r.height*240))];}
 pad.addEventListener('pointerdown',event=>{if(isBusy()||!byId('signatureEnabled').checked||byId('signatureMode').value!=='draw'||paths.length>=12||paths.reduce((n,p)=>n+p.length,0)>=1199||event.button!==0)return;event.preventDefault();pointer=event.pointerId;pad.setPointerCapture?.(pointer);drawing=[point(event)];redraw();});
 pad.addEventListener('pointermove',event=>{if(!drawing||event.pointerId!==pointer)return;const next=point(event),last=drawing.at(-1);if(drawing.length<400&&paths.reduce((n,p)=>n+p.length,0)+drawing.length<1200&&Math.hypot(next[0]-last[0],next[1]-last[1])>2){drawing.push(next);redraw();}});
 function end(event){if(!drawing||event.pointerId!==pointer)return;if(drawing.length===1)drawing.push([...drawing[0]]);paths.push(drawing);drawing=null;pointer=null;redraw();onChange();}
 pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',()=>{drawing=null;pointer=null;redraw();});
 pad.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='z'&&!isBusy()&&byId('signatureEnabled').checked){event.preventDefault();paths.pop();redraw();onChange();}});
 function collect(){
  const values=Object.fromEntries([...groups].map(([group,{master}])=>[group,{enabled:master.checked}]));
  for(const {group,key,type,control,auto}of fields.values())values[group][key]=auto?.checked?null:type==='range'?Number(control.value):control.value;
  values.signature.paths=structuredClone(paths);return values;
 }
 function fill(config){
  for(const [group,{master}]of groups)master.checked=config[group].enabled;
  for(const {group,key,type,control,auto}of fields.values()){const value=config[group][key];if(auto)auto.checked=value===null;control.value=value??(type==='color'?config.accent:'');}
  paths=structuredClone(config.signature.paths);drawing=null;redraw();updateControls();
 }
 function updateControls(){
  const busy=isBusy();for(const {master}of groups.values())master.disabled=busy;
  for(const {group,key,type,control,auto,output}of fields.values()){
   const enabled=!busy&&groups.get(group).master.checked;
   const irrelevant=group==='signature'&&(key==='font'&&byId('signatureMode').value!=='text'||key==='stroke'&&byId('signatureMode').value!=='draw')||group==='socialStyle'&&key==='radius'&&byId('socialStyleLayout').value==='pills';
   if(auto)auto.disabled=!enabled;control.disabled=!enabled||!!irrelevant||!!auto?.checked;
   if(output)output.textContent=type==='range'?control.value:'';
  }
  for(const btn of tools.querySelectorAll('button'))btn.disabled=busy||!byId('richBioEnabled').checked;
  for(const btn of actions.querySelectorAll('button'))btn.disabled=busy||!byId('signatureEnabled').checked;
  bio.disabled=busy;pad.hidden=byId('signatureMode').value!=='draw';pad.inert=busy||!byId('signatureEnabled').checked;pad.setAttribute('aria-disabled',String(pad.inert));
  byId('signatureText').closest('label').hidden=byId('signatureMode').value!=='text';byId('signatureFont').closest('label').hidden=byId('signatureMode').value!=='text';redraw();
 }
 return {collect,fill,updateControls};
}
