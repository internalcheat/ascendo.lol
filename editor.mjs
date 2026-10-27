import {createAppearanceEditor} from './editor-appearance.mjs?v=20261027-1';
import {applyBackgroundAppearance} from './profile-appearance.mjs?v=20261027-1';
import {createStudioPresets} from './studio-presets.mjs?v=20261027-3';
import {createExpressionEditor} from './editor-expression.mjs?v=20261027-1';
import {createProfileExpression} from './profile-expression.mjs?v=20261027-1';
import { request, session, storeSession, freshSession } from './editor-api.mjs';
import { normalizeProfile, ICONS, MAX_IMAGE, MAX_VIDEO } from './profile-schema.mjs?v=20261027-1';
import { renderProfile, bindMusic, element, replayNameEffect, bindNameEffectVisibility } from './profile-view.mjs?v=20261027-1';
import { PUBLISHABLE_KEY } from './customizer-config.mjs';
import { createProfileEffects } from './profile-effects.mjs?v=20261027-1';
import { badgeError } from './badge-policy.mjs?v=20261025-4';
import { createVisualEditor } from './editor-visual.mjs?v=20261027-1';
import { createProfileBackground } from './profile-background.mjs?v=20261026-1';
import { createEditorLayout } from './editor-layout.mjs?v=20261027-3';
import {createAdditionalEditor} from './editor-additions.mjs?v=20261027-1';
import {createProfileAdditions} from './profile-additions.mjs?v=20261027-1';
import {createStudioControls} from './studio-controls.mjs?v=20261025-15';
import {applyStudioPalette} from './profile-palette.mjs?v=20261027-1';
import {BACKGROUNDS} from './background-catalog.mjs?v=20261025-15';
import {createProfilePlayer} from './profile-music.mjs?v=20261027-1';
import {createStudioLanguage,tr} from './studio-i18n.mjs?v=20261027-3';
import {createQuickGuide} from './studio-guide.mjs?v=20261027-3';
import {createStudioShare} from './studio-share.mjs?v=20261027-3';

const byId = id => document.getElementById(id);
const form = byId('profileForm');
const status = byId('editorStatus');
const video = byId('previewVideo');
for(const [id,name]of Object.entries(BACKGROUNDS))if(id!=='flux-lines'){const option=element('option','',name);option.value=`preset:${id}`;byId('backgroundKind').append(option);}
const musicPlayer=createProfilePlayer(video,{preview:true});
const panel = byId('previewCard');
const profileBackground=createProfileBackground(byId('previewStage'),{onStatus:message=>{byId('backgroundPresetStatus').textContent=message;}});
const model = { saved:null, draft:null, previous:null, defaults:null, revision:0, baselineRevision:0, slug:'', uploads:new Map(), busy:false, activeUploads:0, dirty:false, previewFrame:0, canUseReservedBadges:false, uploadQuota:250_000_000 };
const previewUrls = new Map();
const visualEditor = createVisualEditor({onChange:schedulePreview,isBusy:()=>model.busy||model.activeUploads>0});
const additionalEditor=createAdditionalEditor({onChange:schedulePreview,isBusy:()=>model.busy||model.activeUploads>0,previewSound:(sound,volume)=>profileAdditions.previewSound(sound,volume),replayEntry:()=>profileAdditions.replayEntry(),replayTitle:()=>profileAdditions.replayTitle()});
const profileEffects = createProfileEffects(panel,{scope:panel.closest('.preview-card'),preview:true});
const profileAdditions=createProfileAdditions(panel.closest('.preview-card'),panel,{preview:true});
const profileExpression=createProfileExpression(panel,{scope:panel.closest('.preview-card'),video,onStatus:value=>{const status=document.getElementById('musicReactiveStatus');if(status)status.textContent=value;}});
const expressionEditor=createExpressionEditor({onChange:schedulePreview,isBusy:()=>model.busy||model.activeUploads>0,replaySignature:()=>profileExpression.replaySignature()});
const appearanceEditor=createAppearanceEditor({isBusy:()=>model.busy||model.activeUploads>0});
const studioLayout=createEditorLayout({isBusy:()=>model.busy||model.activeUploads>0,onNavigate:()=>{if(matchMedia('(max-width: 820px)').matches)byId('editTab').click();}});
const studioControls=createStudioControls(byId('editorContent'));
const quickGuide=createQuickGuide({layout:studioLayout});
const studioLanguage=createStudioLanguage({request,onChange:()=>{studioControls.close();studioControls.refresh();}});
const studioShare=createStudioShare({request,getSaved:()=>model.saved?{slug:model.slug,revision:model.baselineRevision,config:model.saved}:null,isBusy:()=>model.busy||model.activeUploads>0});
const studioPresets=createStudioPresets({request,getDraft:()=>{if(!studioControls.validate())throw Error('Use a valid hex color.');return model.draft?normalizeProfile(collect()):null;},getPreviewUrls:()=>previewUrls,loadDraft:async(config,{isCurrent})=>{
  await library();if(!isCurrent())return;
  panel.querySelector('.avatar')?.remove();renderedPreview=undefined;
  fill(config);musicPlayer.reload();schedulePreview();
  if(matchMedia('(max-width: 820px)').matches)selectTab('preview');
  message('Preset loaded into your private preview. Save changes to publish.');
},isBusy:()=>!model.saved||model.busy||model.activeUploads>0});
let renderedPreview;
const effectFields = {
  cursorEffects:{enabled:'cursorEnabled',style:'cursorStyle',color:'cursorColor',size:'cursorSize',trail:'cursorTrail',trailLength:'cursorTrailLength',trailSmoothness:'cursorTrailSmoothness',clickEffect:'cursorClickEffect'},
  cardEffects:{enabled:'cardEnabled',tilt:'cardTilt',parallax:'cardParallax',glow:'cardGlow',intensity:'cardIntensity',speed:'cardSpeed'},
  entranceEffects:{enabled:'entranceEnabled',style:'entranceStyle',direction:'entranceDirection',duration:'entranceDuration',distance:'entranceDistance',zoom:'entranceZoom',stagger:'entranceStagger'}
};
const updateMusic = bindMusic(video,panel);
bindNameEffectVisibility();
const reducedNames = matchMedia('(prefers-reduced-motion: reduce)');
const effectHints = {
  none:'Plain, crisp text with no animation or glow.',
  glow:'A steady glow, not an animation. Adjust it with Name glow.',
  glitch:'Layered cyan and purple slices with short, readable glitch bursts.',
  shimmer:'A bright reflection sweeps across your name.',
  typewriter:'Reveals your name once. Use Replay effect to watch it again.',
  pulse:'A smooth neon glow that breathes in and out.',
  aurora:'Flowing lavender, cyan and accent-color light.',
  wave:'A gentle wave travels through the individual letters.',
  float:'Your name slowly rises and settles.'
};
let uploadModule;
const mediaGenerations = new Map();
const draftKey='ascendo-editor-draft';
function rememberDraft(){try{sessionStorage.setItem(draftKey,JSON.stringify({slug:model.slug,revision:model.revision,config:normalizeProfile(collect())}));}catch{}}
function clearDraft(){try{sessionStorage.removeItem(draftKey);}catch{}}

function message(value, error = false, success = false) {
  status.textContent=value;
  status.dataset.error=String(error);
  status.dataset.success=String(success);
}
function markDirty(value = true) {
  studioShare.refresh();studioPresets.refresh();
  model.dirty=value;
  byId('saveState').textContent=value?'Unpublished changes':'All changes saved';
  byId('saveChanges').disabled=model.busy || model.activeUploads>0 || !value || !!badgeError(byId('badge').value,model.canUseReservedBadges);
}
function collect() {
  const current=model.draft,visual=visualEditor.collect(),appearance=appearanceEditor.collect();
  const backgroundChoice=byId('backgroundKind').value,kind=backgroundChoice.startsWith('preset')?'preset':backgroundChoice,preset=backgroundChoice==='preset'?'flux-lines':backgroundChoice.slice(7);
  const backgroundUrl=kind==='video'?byId('videoUrl').value:kind==='image'?byId('imageUrl').value:'';
  return {
    name:byId('displayName').value,bio:byId('bio').value,badge:byId('badge').value,
    colorTheme:byId('colorTheme').value,accent:byId('accent').value,effect:byId('effect').value,glow:Number(byId('glow').value),opacity:Number(byId('opacity').value),
    themeColors:{primary:byId('themePrimary').value,secondary:byId('themeSecondary').value},
    textColors:{bio:byId('bioColorAuto').checked?null:byId('bioColor').value,socialLabel:byId('socialLabelColorAuto').checked?null:byId('socialLabelColor').value},
    effectSpeed:Number(byId('effectSpeed').value),effectStrength:Number(byId('effectStrength').value),
    ...visual,...appearance,electricBorder:{...visual.electricBorder,...appearance.electricBorder},
    ...additionalEditor.collect(),
    ...expressionEditor.collect(),
    ...Object.fromEntries(Object.entries(effectFields).map(([group,fields])=>[group,Object.fromEntries(Object.entries(fields).map(([key,id])=>{
      const control=byId(id);
      return [key,control.type==='checkbox'?control.checked:control.type==='range'?Number(control.value):control.value];
    }))])),
    avatar:{url:byId('avatarUrl').value,poster:byId('avatarPoster').value,x:Number(byId('avatarX').value),y:Number(byId('avatarY').value)},
    background:{kind,...(kind==='preset'?{preset}:{}),url:backgroundUrl,mobile:backgroundUrl===current.background.url?current.background.mobile:'',poster:byId('backgroundPoster').value},
    music:{source:byId('musicSource').value,url:byId('musicUrl').value,volume:Number(byId('musicVolume').value)},
    soundtrack:{title:byId('songTitle').value,artist:byId('songArtist').value},socials:current.socials
  };
}
function fill(config) {
  config=normalizeProfile(config);
  byId('colorTheme').value=config.colorTheme;
  byId('themePrimary').value=config.themeColors.primary;byId('themeSecondary').value=config.themeColors.secondary;
  for(const [id,key,fallback]of [['bioColor','bio','#eee6f6'],['socialLabelColor','socialLabel','#c3b7ce']]){byId(id+'Auto').checked=config.textColors[key]===null;byId(id).value=config.textColors[key]||fallback;}
  studioControls.close();
  model.draft=structuredClone(config);
  visualEditor.fill(config);
  additionalEditor.fill(config);
  expressionEditor.fill(config);
  appearanceEditor.fill(config);
  const values={displayName:config.name,bio:config.bio,badge:config.badge,accent:config.accent,effect:config.effect,glow:config.glow,opacity:config.opacity,avatarUrl:config.avatar.url,avatarPoster:config.avatar.poster,avatarX:config.avatar.x,avatarY:config.avatar.y,backgroundKind:config.background.kind,videoUrl:config.background.kind==='video'?config.background.url:'',imageUrl:config.background.kind==='image'?config.background.url:'',backgroundPoster:config.background.poster,songTitle:config.soundtrack.title,songArtist:config.soundtrack.artist};
  for(const [id,value]of Object.entries(values)) byId(id).value=value;
  if(config.background.kind==='preset'&&config.background.preset!=='flux-lines')byId('backgroundKind').value=`preset:${config.background.preset}`;
  byId('musicSource').value=config.music.source;byId('musicUrl').value=config.music.url;byId('musicVolume').value=config.music.volume;
  byId('effectSpeed').value=config.effectSpeed;
  byId('effectStrength').value=config.effectStrength;
  for(const [group,fields]of Object.entries(effectFields))for(const [key,id]of Object.entries(fields)){
    const control=byId(id);
    if(control.type==='checkbox')control.checked=config[group][key];else control.value=config[group][key];
  }
  renderSocials();
  studioControls.refresh({force:true});
  preview();
}
function schedulePreview() {
  markDirty();
  rememberDraft();
  if(model.previewFrame) cancelAnimationFrame(model.previewFrame);
  model.previewFrame=requestAnimationFrame(()=>{model.previewFrame=0;preview();});
}
function preview() {
  if(!model.draft) return;
  const chosenKind=byId('backgroundKind').value;
  for(const [id,show]of [['videoUrl',chosenKind==='video'],['backgroundPoster',chosenKind==='video'],['imageUrl',chosenKind==='image']])byId(id).closest('.full-width').hidden=!show;
  byId('musicUploadFields').hidden=byId('musicSource').value!=='mp3';
  let config;
  try { config=normalizeProfile(collect()); }
  catch(error) { byId('previewHint').textContent=error.message; return; }
  byId('previewHint').textContent='';
  applyStudioPalette(document.body,config);
  const contentKey=JSON.stringify({...config,backgroundAppearance:undefined,avatarFrame:undefined,cursorEffects:undefined,cardEffects:undefined,entranceEffects:undefined,electricBorder:undefined,overlays:undefined,previewUrls:[...previewUrls]});
  if(contentKey!==renderedPreview){renderProfile(panel,config,{previewUrls});renderedPreview=contentKey;}
  profileEffects.update(config,{previewUrls});
  profileExpression.update(config);
  profileBackground.update(config);
  applyBackgroundAppearance(byId('previewStage'),config);
  profileAdditions.update(config);
  updateEffectControls();
  updateProfileEffectControls();
  visualEditor.updateControls();
  additionalEditor.updateControls();
  expressionEditor.updateControls();
  appearanceEditor.updateControls();
  validateBadge();
  const source=previewUrls.get(config.background.url)||config.background.url;
  const poster=previewUrls.get(config.background.poster)||config.background.poster;
  const posterImage=byId('previewPoster');
  const isVideo=config.background.kind==='video';
  posterImage.hidden=['black','preset'].includes(config.background.kind)||(!poster && isVideo);
  if(config.background.kind==='image') posterImage.src=source;
  else if(poster) posterImage.src=poster;
  else posterImage.removeAttribute('src');
  byId('previewSound').hidden=!isVideo&&config.music.source!=='mp3';
  byId('musicVolumeValue').textContent=`${config.music.volume}%`;byId('musicVolume').setAttribute('aria-valuetext',`${config.music.volume}%`);
  video.hidden=!isVideo;video.poster=poster;
  musicPlayer.update(config.music,{source:isVideo?source:'',resolve:value=>previewUrls.get(value)||value,visible:visualEditor.expanded()||!matchMedia('(max-width: 820px)').matches||byId('studioGrid').dataset.tab==='preview'});
  updateMusic();
  studioLayout.refresh();
  studioControls.refresh();
}

function updateEffectControls() {
  byId('accent').disabled=model.busy;
  for(const id of ['bioColor','socialLabelColor'])byId(id).disabled=model.busy||byId(id+'Auto').checked;
  for(const id of ['themePrimary','themeSecondary'])byId(id).disabled=model.busy||byId('colorTheme').value!=='custom';
  const effect=byId('effect').value;
  const animated=!['none','glow'].includes(effect);
  byId('effectSpeed').disabled=!animated;
  byId('effectStrength').disabled=!animated || effect==='typewriter';
  byId('replayEffect').disabled=!animated || reducedNames.matches;
  byId('effectSpeedValue').textContent=`${(Number(byId('effectSpeed').value)/100).toFixed(1)}×`;
  byId('effectStrengthValue').textContent=`${byId('effectStrength').value}%`;
  byId('effectSpeed').setAttribute('aria-valuetext',`${(Number(byId('effectSpeed').value)/100).toFixed(1)} times normal speed`);
  byId('effectStrength').setAttribute('aria-valuetext',`${byId('effectStrength').value} percent`);
  byId('effectHelp').textContent=(effectHints[effect] || '')+(reducedNames.matches?' Your device requests reduced motion, so animations are intentionally still.':'');
}
byId('replayEffect').addEventListener('click',()=>replayNameEffect(panel));
reducedNames.addEventListener('change',updateEffectControls);

function validateBadge() {
  const control=byId('badge');
  const error=badgeError(control.value,model.canUseReservedBadges);
  byId('badgeError').textContent=error;
  control.setCustomValidity(tr(error));
  control.setAttribute('aria-invalid',String(!!error));
  byId('saveChanges').disabled=model.busy||model.activeUploads>0||!model.dirty||!!error;
  return !error;
}
function updateProfileEffectControls() {
  const cursor=byId('cursorEnabled').checked, card=byId('cardEnabled').checked, entrance=byId('entranceEnabled').checked;
  const style=byId('entranceStyle').value;
  for(const [group,fields]of Object.entries(effectFields))for(const [key,id]of Object.entries(fields)){
    if(key==='enabled')continue;
    let enabled=group==='cursorEffects'?cursor:group==='cardEffects'?card:entrance;
    if(['trailLength','trailSmoothness'].includes(key))enabled&&=byId('cursorTrail').checked;
    if(key==='direction')enabled&&=style==='slide';
    if(key==='distance')enabled&&=['slide','stagger'].includes(style);
    if(key==='zoom')enabled&&=style==='zoom';
    if(key==='stagger')enabled&&=style==='stagger';
    byId(id).disabled=!enabled||model.busy;
  }
  for(const [id,format]of Object.entries({cursorSize:value=>`${value}px`,cursorTrailLength:value=>`${value} points`,cursorTrailSmoothness:value=>`${value}%`,cardIntensity:value=>`${value}%`,cardSpeed:value=>`${Number(value).toFixed(1)}×`,entranceDuration:value=>`${value}ms`,entranceDistance:value=>`${value}px`,entranceZoom:value=>`${value}%`,entranceStagger:value=>`${value}ms`})){
    const control=byId(id), label=format(control.value);
    byId(`${id}Value`).textContent=label;control.setAttribute('aria-valuetext',label);
  }
  byId('replayEntrance').disabled=!entrance||reducedNames.matches||model.busy;
  byId('profileMotionHelp').textContent=reducedNames.matches?'Reduced motion is on: trails, click effects, 3D motion and entrances stay still. Your saved settings are retained.':'Effects run only in your preview until you save. Hover effects need a mouse; touch devices keep normal controls.';
}
byId('badge').addEventListener('input',validateBadge);
byId('replayEntrance').addEventListener('click',()=>profileEffects.replay());
reducedNames.addEventListener('change',updateProfileEffectControls);

function inputField(label,value,onChange,options = {}) {
  const wrapper=element('label','studio-label',label);
  const input=element(options.values?'select':'input','studio-input');
  if(options.values) for(const choice of options.values){const option=element('option','',choice);option.value=choice;input.append(option);}
  else {input.type='text';input.maxLength=options.limit||100;}
  input.value=value;
  input.addEventListener(options.values?'change':'input',()=>{onChange(input.value);schedulePreview();});
  wrapper.append(input);
  return wrapper;
}
function renderSocials() {
  const container=byId('socialRows');
  container.replaceChildren();
  model.draft.socials.forEach((row,index)=>{
    const wrapper=element('div','social-editor__row');
    const fields=element('div','studio-fields');
    fields.append(inputField('Platform label',row.label,value=>row.label=value,{limit:40}),inputField('Display handle',row.handle,value=>row.handle=value),inputField('Icon',row.icon,value=>row.icon=value,{values:ICONS}),inputField('Action',row.action,value=>row.action=value,{values:['link','copy']}),inputField('Link URL or exact copy value',row.value,value=>row.value=value,{limit:2048}));
    const actions=element('div','social-editor__actions');
    for(const [label,change]of [['Move up',-1],['Move down',1],['Remove',0]]){
      const button=element('button',`studio-button${change===0?' studio-button--danger':''}`,label);
      button.type='button';button.setAttribute('aria-label',`${label}: ${row.label||'social row'}`);
      button.disabled=(change===-1&&index===0)||(change===1&&index===model.draft.socials.length-1);
      button.addEventListener('click',()=>{
        if(change===0) model.draft.socials.splice(index,1);
        else [model.draft.socials[index],model.draft.socials[index+change]]=[model.draft.socials[index+change],model.draft.socials[index]];
        renderSocials();schedulePreview();
      });actions.append(button);
    }
    wrapper.append(fields,actions);container.append(wrapper);
  });
  byId('addSocial').disabled=model.draft.socials.length>=16;
}

async function library() {
  const result=await request('/uploads');
  const container=byId('mediaLibrary');container.replaceChildren();
  model.uploads.clear();
  let used=0;
  for(const upload of result){
    model.uploads.set(upload.id,upload);used+=upload.bytes;
    if(upload.preview) previewUrls.set(upload.url,upload.preview);
    else previewUrls.delete(upload.url);
    const row=element('div','media-library__item');
    row.append(element('span','',`${upload.kind} · ${(upload.bytes/1_000_000).toFixed(1)} MB · ${upload.state}`));
    const remove=element('button','studio-button studio-button--danger','Remove');remove.type='button';
    remove.addEventListener('click',async()=>{
      if(!confirm(tr('Remove this unused upload? Saved current/previous media cannot be removed.'))) return;
      remove.disabled=true;
      try{await request(`/uploads/${upload.id}`,{method:'DELETE'});await library();message('Unused file removed.');}
      catch(error){message(error.message,true);remove.disabled=false;}
    });row.append(remove);container.append(row);
  }
  byId('storageUsage').textContent=`${(used/1_000_000).toFixed(1)} MB / ${(model.uploadQuota/1_000_000).toFixed(0)} MB used. Original Ascendo assets do not count toward your upload allowance.`;
}

async function uploadFile(file,kind,group) {
  const isVideo=['video','overlayVideo'].includes(kind),isAudio=kind==='audio';
  if(file.size>(isVideo||isAudio?MAX_VIDEO:MAX_IMAGE)||file.size===0) throw new Error(isAudio?'Choose an MP3 up to 50 MB.':isVideo?'Choose an MP4 up to 50 MB. Compress larger files first.':'Choose an image up to 5 MB.');
  const mime=isAudio&&['audio/mp3','audio/mpeg',''].includes(file.type)&&/\.mp3$/i.test(file.name)?'audio/mpeg':file.type;
  if((isAudio&&mime!=='audio/mpeg')||(isVideo&&mime!=='video/mp4')||(!isVideo&&!isAudio&&!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))) throw new Error('Unsupported file. Use MP3 audio, MP4 video or JPEG, PNG, GIF, or WebP images.');
  const reserved=await request('/uploads',{method:'POST',body:{kind,mime,bytes:file.size}});
  if(!uploadModule) uploadModule=import('./vendor/upload.mjs');
  const {Upload}=await uploadModule;
  const progress=group.querySelector('progress');
  const cancel=group.querySelector('[data-cancel]');
  progress.hidden=false;cancel.hidden=false;
  let rejectUpload;
  const upload=new Upload(file,{
    endpoint:reserved.endpoint,headers:{apikey:PUBLISHABLE_KEY,'x-signature':reserved.token},
    onBeforeRequest:async connection=>{const current=await freshSession();connection.setHeader('Authorization',`Bearer ${current.access_token}`);},
    retryDelays:[0,1000,3000,5000,10000],chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
    metadata:{bucketName:'profile-drafts',objectName:reserved.path,contentType:mime,cacheControl:'3600'},
    onProgress:(sent,total)=>{progress.value=sent/total*100;group.querySelector('[data-upload-status]').textContent=`Uploading ${Math.round(progress.value)}%`;},
    onError:error=>rejectUpload(error)
  });
  const cancelHandler=async()=>{await upload.abort(true).catch(()=>{});await request(`/uploads/${reserved.id}`,{method:'DELETE'}).catch(()=>{});rejectUpload(new Error('Upload cancelled. Your saved profile is unchanged.'));};
  cancel.addEventListener('click',cancelHandler,{once:true});
  try {
    await new Promise((resolve,reject)=>{rejectUpload=reject;upload.options.onSuccess=resolve;upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);});
    const completed=await request(`/uploads/${reserved.id}/complete`,{method:'POST',body:{}});
    previewUrls.set(completed.url,completed.preview);
    return completed;
  } finally {cancel.removeEventListener('click',cancelHandler);cancel.hidden=true;progress.hidden=true;}
}

async function posterFrom(file) {
  const source=URL.createObjectURL(file);
  try {
    const canvas=document.createElement('canvas');
    let media;
    if(file.type==='video/mp4'){
      media=document.createElement('video');media.muted=true;media.playsInline=true;media.preload='auto';
      await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('The browser could not read this MP4. Use H.264 video with AAC audio.')),15000);media.onloadedmetadata=()=>{if(!media.videoWidth||!Number.isFinite(media.duration)){clearTimeout(timeout);reject(new Error('This file has no playable video.'));return;}media.currentTime=Math.min(1,media.duration/4);};media.onseeked=()=>{clearTimeout(timeout);resolve();};media.onerror=()=>{clearTimeout(timeout);reject(new Error('This MP4 is not supported by your browser.'));};media.src=source;});
      const ratio=Math.min(1,960/media.videoWidth);canvas.width=Math.round(media.videoWidth*ratio);canvas.height=Math.round(media.videoHeight*ratio);
    } else {
      media=new Image();media.src=source;await media.decode();
      const ratio=Math.min(1,512/Math.max(media.naturalWidth,media.naturalHeight));canvas.width=Math.max(1,Math.round(media.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(media.naturalHeight*ratio));
    }
    const context=canvas.getContext('2d');context.drawImage(media,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
    if(media instanceof HTMLVideoElement){media.removeAttribute('src');media.load();}
    return blob?new File([blob],'still-poster.webp',{type:'image/webp'}):null;
  } finally {URL.revokeObjectURL(source);}
}

for(const group of document.querySelectorAll('[data-upload]')){
  const input=group.querySelector('input[type=file]');
  input.addEventListener('change',async()=>{
    const file=input.files[0];if(!file)return;
    const kind=group.dataset.upload==='overlay'?(file.type==='video/mp4'?'overlayVideo':'overlayImage'):group.dataset.upload;
    const isVideo=['video','overlayVideo'].includes(kind),isOverlay=['overlayImage','overlayVideo'].includes(kind),isAudio=kind==='audio';
    if(file.size>(isVideo||isAudio?MAX_VIDEO:MAX_IMAGE)||file.size===0){group.querySelector('[data-upload-status]').textContent=isAudio?'Choose an MP3 up to 50 MB.':isVideo?'Choose an MP4 up to 50 MB.':'Choose an image up to 5 MB.';input.value='';return;}
    const target=group.parentElement.querySelector('input[type=url]');
    input.disabled=true;model.activeUploads++;markDirty();
    const generation=(mediaGenerations.get(kind)||0)+1;
    mediaGenerations.set(kind,generation);
    try {
      const poster=(kind==='avatar'||kind==='video'||isOverlay)?await posterFrom(file):null;
      const completed=await uploadFile(file,kind,group);
      target.value=completed.url;
      if(isAudio)byId('musicSource').value='mp3';
      if(isOverlay){byId('overlayKind').value=isVideo?'video':'image';byId('overlayPoster').value='';byId('overlayMediaEnabled').checked=true;}
      if(kind==='avatar')byId('avatarPoster').value='';
      if(kind==='video'){byId('backgroundKind').value='video';byId('backgroundPoster').value='';}
      if(kind==='backgroundImage')byId('backgroundKind').value='image';
      if(poster){const still=await uploadFile(poster,'poster',group);if(generation===mediaGenerations.get(kind))byId(isOverlay?'overlayPoster':kind==='avatar'?'avatarPoster':'backgroundPoster').value=still.url;}
      group.querySelector('[data-upload-status]').textContent='Uploaded privately. Save changes to publish.';
      schedulePreview();await library();
    } catch(error) {group.querySelector('[data-upload-status]').textContent=error.message;message(error.message,true);}
    finally{input.disabled=false;input.value='';model.activeUploads--;visualEditor.updateControls();markDirty();}
  });
}

form.addEventListener('input',event=>{
  if(event.target.type==='file')return;
  if(event.target.id==='accent'&&byId('colorTheme').value!=='original'){if(byId('colorTheme').value==='monochrome'){byId('colorTheme').value='custom';byId('themeSecondary').value='#bdbdbd';}byId('themePrimary').value=byId('accent').value;}
  if(event.target.id==='avatarUrl'&&byId('avatarPoster').value===model.draft?.avatar.poster)byId('avatarPoster').value='';
  schedulePreview();
});
form.addEventListener('change',event=>{if(event.target.tagName==='SELECT')schedulePreview();});
byId('addSocial').addEventListener('click',()=>{model.draft.socials.push({icon:'website',label:'Website',handle:'My website',action:'link',value:'https://'});renderSocials();schedulePreview();});
byId('previewSound').addEventListener('click',()=>{if(profileAdditions.isGated())profileAdditions.enter({quiet:true});musicPlayer.volume(Number(byId('musicVolume').value));});
byId('discardChanges').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(!model.dirty||confirm(tr('Discard your unpublished changes?'))){fill(model.saved);model.revision=model.baselineRevision;markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Unpublished changes discarded.');}});
byId('resetProfile').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(confirm(tr('Preview the original Ascendo profile? It will not publish until you save.'))){fill(model.defaults);markDirty();rememberDraft();message('Original settings loaded into your private preview. Save to publish them.');}});
byId('restorePrevious').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(model.previous&&confirm(tr('Preview the previous saved version?'))){fill(model.previous);markDirty();rememberDraft();message('Previous version loaded privately. Save to publish it.');}});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(model.busy||model.activeUploads)return;
  if(!studioControls.validate()){message('Use a valid hex color.',true);return;}
  let config;
  try{config=normalizeProfile(collect());if(config.music.source==='mp3'&&!config.music.url)throw Error('Upload an MP3 before saving this music source.');if(!validateBadge()){byId('badge').focus();message(badgeError(config.badge,model.canUseReservedBadges),true);return;}}catch(error){message(error.message,true);return;}
  model.busy=true;form.setAttribute('aria-busy','true');markDirty();message('Publishing your profile…');
  const disabledBefore=[...form.elements].map(control=>[control,control.disabled]);
  for(const [control]of disabledBefore)control.disabled=true;
  try{
    const saved=await request('/me',{method:'PUT',body:{revision:model.revision,config}});
    model.previous=model.saved;model.saved=saved.config;model.revision=saved.revision;model.baselineRevision=saved.revision;fill(saved.config);markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Published. Your profile is updated.',false,true);await library().then(preview).catch(()=>message('Published. The media list could not refresh; reload it later.',false,true));
  }catch(error){rememberDraft();message(error.message,true);if(error.status===409)byId('reloadLatest').hidden=false;if(error.status===401){const link=element('a','studio-button','Sign in again');link.href='/login/';status.after(link);}}
  finally{for(const [control,disabled]of disabledBefore)control.disabled=disabled;byId('restorePrevious').disabled=!model.previous;model.busy=false;form.removeAttribute('aria-busy');updateEffectControls();updateProfileEffectControls();visualEditor.updateControls();additionalEditor.updateControls();expressionEditor.updateControls();
  appearanceEditor.updateControls();markDirty(model.dirty);}
});
byId('logoutButton').addEventListener('click',async()=>{
  if(model.busy){message('Wait for publishing to finish before logging out.',true);return;}
  if(model.dirty&&!confirm(tr('Log out and discard unpublished changes?')))return;
  if(model.activeUploads){message('Finish or cancel the upload before logging out.',true);return;}
  try{if(session())await request('/session',{method:'DELETE'});}catch(error){message(error.message,true);return;}
  clearDraft();storeSession(null);location.replace('/login/');
});
function selectTab(tab){
  const changed=byId('studioGrid').dataset.tab!==tab;
  byId('studioGrid').dataset.tab=tab;
  byId('editTab').setAttribute('aria-selected',String(tab==='edit'));byId('previewTab').setAttribute('aria-selected',String(tab==='preview'));
  byId('editTab').tabIndex=tab==='edit'?0:-1;byId('previewTab').tabIndex=tab==='preview'?0:-1;
  if(tab==='edit'&&matchMedia('(max-width: 820px)').matches)musicPlayer.setActive(false);else preview();
  if(changed)studioLayout.transitionView(tab);
}
for(const [id,tab]of [['editTab','edit'],['previewTab','preview']]){
  byId(id).addEventListener('click',()=>selectTab(tab));
  byId(id).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'edit':event.key==='End'?'preview':tab==='edit'?'preview':'edit';selectTab(next);byId(next==='edit'?'editTab':'previewTab').focus();});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
byId('previewPanel').addEventListener('ascendo:visual-status',event=>{byId('visualStatus').textContent=event.detail.message;});
byId('previewPanel').addEventListener('ascendo:preview-size',preview);
window.addEventListener('pagehide',()=>{video.pause();if(model.previewFrame)cancelAnimationFrame(model.previewFrame);});
window.addEventListener('beforeunload',event=>{if(model.dirty||model.activeUploads){event.preventDefault();event.returnValue='';}});

async function initialize(){
  if(!session()){location.replace('/login/');return;}
  try{
    const current=await request('/me');
    if(current.onboarding){location.replace('/welcome/');return;}
    model.uploadQuota=current.uploadQuota||250_000_000;
    model.canUseReservedBadges=current.capabilities?.canUseReservedBadges===true;
    model.slug=current.slug;model.saved=normalizeProfile(current.config);model.defaults=normalizeProfile(current.defaults);model.previous=current.previous?normalizeProfile(current.previous):null;model.revision=current.revision;model.baselineRevision=current.revision;
    studioLanguage.setAccount(current.slug);quickGuide.ready();
    const publicSlug=model.slug==='szikraaaa'?'Szikraaaa':model.slug;
    byId('studioIdentity').textContent=`Editing ${model.saved.name} · Your profile URL stays ascendo.lol/${publicSlug}/`;
    byId('viewProfile').href=`/${publicSlug}/`;byId('viewProfile').hidden=false;
    await library();fill(model.saved);markDirty(false);byId('restorePrevious').disabled=!model.previous;
    byId('editorContent').hidden=false;message('');
    try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(draft?.slug===model.slug){fill(normalizeProfile(draft.config));model.revision=draft.revision;markDirty();message('Restored your unpublished draft. Save changes when ready.');if(draft.revision!==current.revision){byId('reloadLatest').hidden=false;message('Your draft is safe, but the saved profile changed. Load the latest version before publishing.',true);}}}catch{}
  }catch(error){message(error.message,true);if(error.status===401){storeSession(null);const link=element('a','studio-button','Sign in again');link.href='/login/';status.after(link);}}
}
byId('reloadLatest').addEventListener('click',async()=>{
  if(model.busy||model.activeUploads)return;
  if(!confirm(tr('Discard this draft and load the latest saved profile?')))return;
  try{const current=await request('/me');model.canUseReservedBadges=current.capabilities?.canUseReservedBadges===true;model.saved=normalizeProfile(current.config);model.previous=current.previous;model.revision=current.revision;model.baselineRevision=current.revision;fill(model.saved);markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Latest saved profile loaded.');}catch(error){message(error.message,true);}
});
initialize();
