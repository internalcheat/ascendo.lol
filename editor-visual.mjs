import { FONTS, TEXT_SIZES, LAYOUTS, OVERLAY_PRESETS } from './visual-schema.mjs?v=20261026-6';
import { element } from './profile-view.mjs?v=20261026-6';
import {FONT_GROUPS} from './font-catalog.mjs?v=20261025-11';

export function createVisualEditor({onChange,isBusy}) {
  const byId=id=>document.getElementById(id),host=byId('visualSections');
  const title=value=>value.charAt(0).toUpperCase()+value.slice(1);
  let layers=[];
  function section(name,help){const node=element('section','studio-section studio-panel studio-visual');const heading=element('div','studio-section-heading');heading.append(element('h2','',name));node.append(heading,element('p','studio-help',help));const fields=element('div','studio-fields');node.append(fields);host.append(node);return {node,heading,fields};}
  function input(id,type,value){const node=element('input',type==='checkbox'?'':'studio-input');node.id=id;node.type=type;if(type==='checkbox')node.checked=!!value;else node.value=value??'';return node;}
  function field(parent,label,control,wide=false){const wrapper=element('label',`${control.type==='checkbox'?'studio-check':'studio-label'}${wide?' full-width':''}`);if(control.type==='checkbox')wrapper.append(control,document.createTextNode(' '+label));else wrapper.append(document.createTextNode(label),control);parent.append(wrapper);return wrapper;}
  function select(id,choices){const node=element('select','studio-input');node.id=id;for(const [value,label]of choices){const option=element('option','',label);option.value=value;node.append(option);}return node;}
  function range(parent,id,label,min,max,value,step=1){const node=input(id,'range',value);Object.assign(node,{min,max,step});const wrapper=field(parent,label,node);const output=element('output');output.id=id+'Value';output.htmlFor=id;wrapper.insertBefore(output,node);return node;}
  function toggle(heading,id,label){const wrapper=element('label','studio-switch');const node=input(id,'checkbox',false);node.setAttribute('role','switch');node.setAttribute('aria-label',label);wrapper.append(node,element('span'));wrapper.lastChild.setAttribute('aria-hidden','true');heading.append(wrapper);}
  function button(label,action,className='studio-button'){const node=element('button',className,label);node.type='button';node.addEventListener('click',action);return node;}
  const fonts=section('Fonts','Two faces, one identity. All font files are hosted by Ascendo, not Google.');
  function fontSelect(id){const control=element('select','studio-input');control.id=id;for(const [name,choices]of Object.entries(FONT_GROUPS)){const group=element('optgroup');group.label=name;for(const [value,label]of Object.entries(choices)){const option=element('option','',label);option.value=value;group.append(option);}control.append(group);}return control;}
  field(fonts.fields,'Display font',fontSelect('displayFont'));field(fonts.fields,'Body font',fontSelect('bodyFont'));
  const sizes=section('Text Sizes','Auto keeps the original responsive sizing. Choose a custom size for any part of your card.');
  for(const [id,[min,max,value,label]]of Object.entries(TEXT_SIZES)){
    const group=element('div','size-setting');const heading=element('div','size-setting__heading');heading.append(element('span','',label));field(heading,'Auto',input(`sizeAuto-${id}`,'checkbox',true));group.append(heading);range(group,`size-${id}`,'Custom size',min,max,value);sizes.fields.append(group);
  }
  const layout=section('Card Layout','Same profile, a different composition. Your existing avatar and widgets move with you.');layout.fields.classList.add('layout-options');
  const descriptions={classic:'The original centered glass card.',crest:'A circular picture above the edge.',portrait:'A tall picture beside your identity.',bento:'Your socials and widgets as a tile grid.',magazine:'An editorial identity column beside your features.',deck:'A layered card deck with a centered identity.',stack:'Separate glass cards in a focused vertical stack.',wall:'A wide identity header above a wall of tiles.',spine:'A quiet timeline connecting your cards.',collage:'An asymmetric identity and feature collage.',flow:'A centered profile with flowing social pills.',numbers:'A clean numbered sequence of profile panels.'};
  for(const value of LAYOUTS){const wrapper=element('label','layout-option');const radio=input(`layout-${value}`,'radio',value);radio.name='cardLayout';radio.value=value;radio.checked=value==='classic';const thumbnail=element('span','layout-thumbnail');thumbnail.dataset.layout=value;thumbnail.setAttribute('aria-hidden','true');for(const name of ['picture','identity','tile','tile','tile'])thumbnail.append(element('i',`layout-thumbnail__${name}`));wrapper.append(radio,thumbnail,element('strong','',title(value)),element('span','studio-help',descriptions[value]));layout.fields.append(wrapper);}
  const border=section('Electric Border','A fine, living outline. Choose a separate color and the surfaces it follows.');toggle(border.heading,'electricEnabled','Enable electric borders');
  field(border.fields,'Border color',input('electricColor','color','#c19aff'));range(border.fields,'electricIntensity','Intensity',0,100,35);range(border.fields,'electricSpeed','Speed',.5,2,1,.1);
  const targets=element('div','electric-targets full-width');for(const [id,label]of [['electricCard','Main card'],['electricPanels','Panels'],['electricAvatar','Profile picture']])field(targets,label,input(id,'checkbox',true));border.fields.append(targets);
  const overlays=section('Overlays','Layer up to three atmospheres and one uploaded image or video, behind your cards.');toggle(overlays.heading,'overlaysEnabled','Enable page overlays');
  const layerList=element('div','overlay-layers full-width');layerList.id='overlayLayers';overlays.fields.append(layerList);
  const emptyHint=element('p','studio-help full-width','Choose up to three effects. Each has its own controls.');emptyHint.id='overlayEmptyHint';overlays.fields.append(emptyHint);
  const picker=element('div','overlay-picker full-width');picker.setAttribute('role','group');picker.setAttribute('aria-label','Overlay effects');const presetButtons=new Map();
  for(const preset of OVERLAY_PRESETS){const choice=button(title(preset),()=>{
    readLayers();const existing=layers.find(layer=>layer.preset===preset);
    if(existing){const row=layerList.querySelector(`[data-preset="${preset}"]`);row.querySelector('input').focus();row.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
    if(layers.length>=3){notice.textContent='Remove a layer before adding another. Maximum: three effects.';return;}
    layers.push({preset,enabled:true,opacity:35,density:35,speed:1,colorMode:'original',color:byId('accent').value||'#c19aff'});byId('overlaysEnabled').checked=true;notice.textContent='';renderLayers();onChange();
  },'studio-button overlay-preset');choice.dataset.overlayPreset=preset;choice.setAttribute('aria-pressed','false');picker.append(choice);presetButtons.set(preset,choice);}overlays.fields.insertBefore(picker,layerList);
  const custom=element('div','overlay-custom full-width');field(custom,'Custom media layer',input('overlayMediaEnabled','checkbox',false));
  const source=element('div','full-width');const url=input('overlayUrl','url','');url.readOnly=true;url.placeholder='Upload a transparent image or MP4';field(source,'Your uploaded overlay',url);
  const upload=element('div','studio-upload');upload.dataset.upload='overlay';const file=input('overlayFile','file');file.accept='image/jpeg,image/png,image/webp,image/gif,video/mp4';file.setAttribute('aria-label','Upload custom overlay');const progress=element('progress');progress.max=100;progress.value=0;progress.hidden=true;progress.setAttribute('aria-label','Overlay upload progress');const cancel=button('Cancel upload',()=>{});cancel.dataset.cancel='';cancel.hidden=true;const uploadStatus=element('span','studio-help');uploadStatus.dataset.uploadStatus='';upload.append(file,progress,cancel,uploadStatus);source.append(upload);custom.append(source);
  const poster=input('overlayPoster','hidden',''),kind=input('overlayKind','hidden','image');custom.append(poster,kind);
  const mediaFields=element('div','studio-fields');field(mediaFields,'Image / video fit',select('overlayFit',[['contain','Contain'],['cover','Cover']]));range(mediaFields,'overlayMediaOpacity','Media opacity',0,100,35);field(mediaFields,'Remove green screen',input('overlayKeyEnabled','checkbox',false));field(mediaFields,'Key color',input('overlayKeyColor','color','#00ff00'));range(mediaFields,'overlayTolerance','Key tolerance',0,100,25);range(mediaFields,'overlaySoftness','Edge softness',1,50,10);const removeMedia=button('Remove custom media',()=>{byId('overlayUrl').value='';byId('overlayPoster').value='';byId('overlayMediaEnabled').checked=false;onChange();});removeMedia.id='removeOverlayMedia';custom.append(mediaFields,removeMedia);overlays.fields.append(custom);
  const notice=element('p','studio-help full-width');notice.id='visualStatus';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');overlays.fields.append(notice);
  byId('overlaysEnabled').addEventListener('input',()=>{if(byId('overlaysEnabled').checked&&!layers.length&&!byId('overlayMediaEnabled').checked){layers.push({preset:'snow',enabled:true,opacity:35,density:35,speed:1,colorMode:'original',color:byId('accent').value||'#c19aff'});renderLayers();}});

  function readLayers(){
    for(const row of layerList.children){const layer=layers.find(item=>item.preset===row.dataset.preset);if(!layer)continue;for(const control of row.querySelectorAll('[data-layer-field]'))layer[control.dataset.layerField]=control.type==='checkbox'?control.checked:control.type==='range'?Number(control.value):control.value;}
  }
  function renderLayers(){
    layerList.replaceChildren();
    layers.forEach((layer,index)=>{
      const row=element('div','overlay-layer');row.dataset.preset=layer.preset;const heading=element('div','overlay-layer__heading');heading.append(element('strong','',title(layer.preset)));
      const enabled=input(`layer-${layer.preset}-enabled`,'checkbox',layer.enabled);enabled.dataset.layerField='enabled';field(heading,'Enabled',enabled);row.append(heading);const fields=element('div','studio-fields');
      for(const [key,label,min,max,step]of [['opacity','Opacity',0,100,1],['density','Density',0,100,1],['speed','Speed',.25,2,.05]]){const control=range(fields,`layer-${layer.preset}-${key}`,label,min,max,layer[key],step);control.dataset.layerField=key;}
      const mode=select(`layer-${layer.preset}-colorMode`,[['original','Original palette'],['accent','Profile accent'],['custom','Custom color']]);mode.value=layer.colorMode;mode.dataset.layerField='colorMode';field(fields,'Color source',mode);const color=input(`layer-${layer.preset}-color`,'color',layer.color);color.dataset.layerField='color';field(fields,'Custom color',color);row.append(fields);
      const actions=element('div','social-editor__actions');for(const [label,change]of [['Move up',-1],['Move down',1],['Remove',0]]){const action=button(label,()=>{readLayers();if(change===0){layers.splice(index,1);if(!layers.length&&!byId('overlayMediaEnabled').checked)byId('overlaysEnabled').checked=false;}else [layers[index],layers[index+change]]=[layers[index+change],layers[index]];renderLayers();onChange();});action.setAttribute('aria-label',`${label}: ${title(layer.preset)} overlay`);action.dataset.layerAction=String(change);action.disabled=change===-1&&index===0||change===1&&index===layers.length-1;actions.append(action);}row.append(actions);layerList.append(row);
    });updateControls();
  }
  function collect(){
    readLayers();
    return {
      typography:{display:byId('displayFont').value,body:byId('bodyFont').value,sizes:Object.fromEntries(Object.keys(TEXT_SIZES).map(id=>[id,byId(`sizeAuto-${id}`).checked?null:Number(byId(`size-${id}`).value)]))},
      cardLayout:document.querySelector('[name=cardLayout]:checked').value,
      electricBorder:{enabled:byId('electricEnabled').checked,color:byId('electricColor').value,intensity:Number(byId('electricIntensity').value),speed:Number(byId('electricSpeed').value),card:byId('electricCard').checked,panels:byId('electricPanels').checked,avatar:byId('electricAvatar').checked},
      overlays:{enabled:byId('overlaysEnabled').checked,layers:structuredClone(layers),media:{enabled:byId('overlayMediaEnabled').checked,kind:byId('overlayKind').value,url:byId('overlayUrl').value,poster:byId('overlayPoster').value,fit:byId('overlayFit').value,opacity:Number(byId('overlayMediaOpacity').value),key:{enabled:byId('overlayKeyEnabled').checked,color:byId('overlayKeyColor').value,tolerance:Number(byId('overlayTolerance').value),softness:Number(byId('overlaySoftness').value)}}}
    };
  }
  function fill(config){
    byId('displayFont').value=config.typography.display;byId('bodyFont').value=config.typography.body;
    for(const [id,[,,fallback]]of Object.entries(TEXT_SIZES)){const value=config.typography.sizes[id];byId(`sizeAuto-${id}`).checked=value===null;byId(`size-${id}`).value=value??fallback;}
    byId(`layout-${config.cardLayout}`).checked=true;
    const settings={electricEnabled:config.electricBorder.enabled,electricColor:config.electricBorder.color,electricIntensity:config.electricBorder.intensity,electricSpeed:config.electricBorder.speed,electricCard:config.electricBorder.card,electricPanels:config.electricBorder.panels,electricAvatar:config.electricBorder.avatar,overlaysEnabled:config.overlays.enabled,overlayMediaEnabled:config.overlays.media.enabled,overlayKind:config.overlays.media.kind,overlayUrl:config.overlays.media.url,overlayPoster:config.overlays.media.poster,overlayFit:config.overlays.media.fit,overlayMediaOpacity:config.overlays.media.opacity,overlayKeyEnabled:config.overlays.media.key.enabled,overlayKeyColor:config.overlays.media.key.color,overlayTolerance:config.overlays.media.key.tolerance,overlaySoftness:config.overlays.media.key.softness};
    for(const [id,value]of Object.entries(settings)){const control=byId(id);if(control.type==='checkbox')control.checked=value;else control.value=value;}
    layers=structuredClone(config.overlays.layers);renderLayers();updateControls();
  }
  function updateControls(){
    const busy=isBusy(),electric=byId('electricEnabled').checked,overlays=byId('overlaysEnabled').checked,media=byId('overlayMediaEnabled').checked,key=byId('overlayKeyEnabled').checked;
    emptyHint.hidden=!overlays||layers.length>0||media&&!!byId('overlayUrl').value;
    for(const id of Object.keys(TEXT_SIZES))byId(`size-${id}`).disabled=busy||byId(`sizeAuto-${id}`).checked;
    for(const control of border.fields.querySelectorAll('input,select'))control.disabled=busy||!electric;
    for(const control of custom.querySelectorAll('input,select,button'))if(control.type!=='file'&&!control.hasAttribute('data-cancel'))control.disabled=busy||!overlays||(control.id!=='overlayMediaEnabled'&&control.id!=='overlayUrl'&&!media);
    for(const id of ['overlayKeyColor','overlayTolerance','overlaySoftness'])byId(id).disabled=busy||!overlays||!media||!key;
    byId('overlayFile').disabled=busy||!overlays;
    byId('removeOverlayMedia').disabled=busy||!overlays||!byId('overlayUrl').value;
    layerList.querySelectorAll('[data-layer-field]').forEach(control=>{const row=control.closest('[data-preset]');const enabled=row.querySelector('[data-layer-field=enabled]').checked;const mode=row.querySelector('[data-layer-field=colorMode]').value;control.disabled=busy||!overlays||(control.dataset.layerField!=='enabled'&&!enabled)||(control.dataset.layerField==='color'&&mode!=='custom');});
    layerList.querySelectorAll('[data-layer-action]').forEach(control=>{const index=[...layerList.children].indexOf(control.closest('[data-preset]'));const direction=Number(control.dataset.layerAction);control.disabled=busy||!overlays||direction===-1&&index===0||direction===1&&index===layers.length-1;});
    for(const [preset,button]of presetButtons){button.disabled=busy;button.setAttribute('aria-pressed',String(layers.some(layer=>layer.preset===preset)));}
    for(const control of host.querySelectorAll('input[type=range]')){const output=byId(control.id+'Value');if(output){const speed=control.id.toLowerCase().includes('speed');output.textContent=control.id.startsWith('size-')?`${control.value}px`:speed?`${Number(control.value).toFixed(2).replace(/0$/,'')}×`:`${control.value}%`;control.setAttribute('aria-valuetext',output.textContent);}}
  }

  const expand=byId('expandPreview'),dialog=byId('previewDialog'),previewPanel=byId('previewPanel'),dock=byId('previewDock');
  function notifySize(){byId('previewCard').closest('.preview-card').dispatchEvent(new Event('ascendo:preview-size',{bubbles:true}));}
  expand.addEventListener('click',()=>{if(isBusy())return;byId('expandedPreviewSlot').append(previewPanel);expand.hidden=true;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');notifySize();});
  byId('closeExpandedPreview').addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else{dialog.removeAttribute('open');closePreview();}});
  function closePreview(){dock.before(previewPanel);expand.hidden=false;notifySize();expand.focus({preventScroll:true});}
  dialog.addEventListener('close',closePreview);
  return {collect,fill,updateControls,expanded:()=>dialog.open};
}
