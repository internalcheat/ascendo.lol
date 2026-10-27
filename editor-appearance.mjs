import {element} from './profile-view.mjs?v=20261027-5';
import {BORDER_STYLES,FRAME_STYLES} from './appearance-schema.mjs?v=20261027-1';
export function createAppearanceEditor({isBusy=()=>false}){
 const doc=document,byId=id=>doc.getElementById(id),host=byId('controlsPanel'),fields=new Map(),masters=new Map();
 const definitions={
  backgroundAppearance:['Background Appearance','backgroundLookEnabled',[
   ['blur','Background blur','range',0,24,1,'px'],['darkness','Background darkness','range',0,80,1,'%'],['saturation','Background saturation','range',0,150,1,'%'],['vignette','Edge vignette','range',0,100,1,'%'],['x','Horizontal focal point','range',0,100,1,'%'],['y','Vertical focal point','range',0,100,1,'%'],['tint','Color tint strength','range',0,60,1,'%'],['tintColor','Background tint color','color']]],
  glass:['Card Glass','glassEnabled',[
   ['blur','Glass blur','range',0,36,1,'px'],['radius','Card corner radius','range',0,48,1,'px'],['shadow','Card shadow','range',0,100,1,'%'],['edge','Edge highlight','range',0,70,1,'%']]],
  avatarFrame:['Avatar Frame','avatarFrameEnabled',[
   ['style','Frame style','select',FRAME_STYLES],['color','Frame color','color'],['secondary','Second frame color','color'],['width','Frame thickness','range',1,5,.1,'px'],['gap','Frame spacing','range',2,10,1,'px'],['glow','Frame glow','range',0,100,1,'%'],['speed','Frame speed','range',.2,2,.1,'×']]]
 };
 function addField(grid,group,[key,label,type,...options]){
  const id=group+key[0].toUpperCase()+key.slice(1),wrapper=element('label',type==='checkbox'?'studio-check':'studio-label'),input=element(type==='select'?'select':'input',type==='checkbox'?'':'studio-input');input.id=id;
  if(type==='select')for(const [value,text]of Object.entries(options[0])){const node=element('option','',text);node.value=value;input.append(node);}
  else input.type=type;
  if(type==='range')Object.assign(input,{min:options[0],max:options[1],step:options[2]});
  if(type==='checkbox')wrapper.append(input,doc.createTextNode(' '+label));else wrapper.append(doc.createTextNode(label),input);
  let output;if(type==='range'){output=element('output');output.htmlFor=id;wrapper.insertBefore(output,input);}
  grid.append(wrapper);fields.set(id,{group,key,type,input,output,unit:options[3]||''});
 }
 for(const [group,[title,id,items]]of Object.entries(definitions)){
  const section=element('section','studio-section studio-panel'),heading=element('div','studio-section-heading'),toggle=element('label','studio-switch'),master=element('input');master.type='checkbox';master.id=id;master.setAttribute('role','switch');master.setAttribute('aria-label','Enable '+title.toLowerCase());toggle.append(master,element('span'));toggle.lastChild.setAttribute('aria-hidden','true');heading.append(element('h2','',title),toggle);const grid=element('div','studio-fields');section.append(heading,grid);host.append(section);masters.set(group,master);const detail=element('details','studio-appearance-advanced full-width'),summary=element('summary','','Advanced'),extra=element('div','studio-fields');detail.append(summary,extra);for(const item of items){const primary=group==='backgroundAppearance'?['blur','darkness','saturation']:group==='glass'?['blur','radius']:['style','color'];addField(primary.includes(item[0])?grid:extra,group,item);}grid.append(detail);
 }
 const border=byId('electricEnabled').closest('.studio-section').querySelector('.studio-fields');masters.set('electricBorder',byId('electricEnabled'));
 for(const item of [['style','Border style','select',BORDER_STYLES],['secondary','Second border color','color'],['width','Border thickness','range',.6,4,.1,'px'],['glow','Border glow','range',0,100,1,'%'],['reactive','React border to music','checkbox']])addField(border,'electricBorder',item);
 function collect(){const result={};for(const [group,master]of masters)result[group]=group==='electricBorder'?{}:{enabled:master.checked};for(const {group,key,type,input}of fields.values())result[group][key]=type==='checkbox'?input.checked:type==='range'?Number(input.value):input.value;return result;}
 function fill(config){for(const [group,master]of masters)if(group!=='electricBorder')master.checked=config[group].enabled;for(const {group,key,type,input}of fields.values()){if(type==='checkbox')input.checked=config[group][key];else input.value=config[group][key];}updateControls();}
 function updateControls(){for(const [group,master]of masters)if(group!=='electricBorder')master.disabled=isBusy();for(const {group,key,type,input,output,unit}of fields.values()){
   const irrelevant=key==='secondary'&&group==='electricBorder'&&byId('electricBorderStyle').value!=='dual'||key==='secondary'&&group==='avatarFrame'&&byId('avatarFrameStyle').value!=='double'||key==='speed'&&group==='avatarFrame'&&byId('avatarFrameStyle').value!=='dashed';
   input.disabled=isBusy()||!masters.get(group).checked||irrelevant;if(output){output.textContent=input.value+unit;input.setAttribute('aria-valuetext',output.textContent);}
  }}
 return {collect,fill,updateControls};
}
