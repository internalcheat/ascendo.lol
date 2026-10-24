import { request, session, storeSession, freshSession } from './editor-api.mjs';
import { normalizeProfile, ICONS, MAX_IMAGE, MAX_VIDEO } from './profile-schema.mjs?v=20261025-3';
import { renderProfile, bindMusic, element, replayNameEffect, bindNameEffectVisibility } from './profile-view.mjs?v=20261025-3';
import { PUBLISHABLE_KEY } from './customizer-config.mjs';

const byId = id => document.getElementById(id);
const form = byId('profileForm');
const status = byId('editorStatus');
const video = byId('previewVideo');
const panel = byId('previewCard');
const model = { saved:null, draft:null, previous:null, defaults:null, revision:0, baselineRevision:0, slug:'', uploads:new Map(), busy:false, activeUploads:0, dirty:false, previewFrame:0 };
const previewUrls = new Map();
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
  model.dirty=value;
  byId('saveState').textContent=value?'Unpublished changes':'All changes saved';
  byId('saveChanges').disabled=model.busy || model.activeUploads>0 || !value;
}
function collect() {
  const current=model.draft;
  const kind=byId('backgroundKind').value;
  const backgroundUrl=kind==='video'?byId('videoUrl').value:kind==='image'?byId('imageUrl').value:'';
  return {
    name:byId('displayName').value,bio:byId('bio').value,badge:byId('badge').value,
    accent:byId('accent').value,effect:byId('effect').value,glow:Number(byId('glow').value),opacity:Number(byId('opacity').value),
    effectSpeed:Number(byId('effectSpeed').value),effectStrength:Number(byId('effectStrength').value),
    avatar:{url:byId('avatarUrl').value,poster:byId('avatarPoster').value,x:Number(byId('avatarX').value),y:Number(byId('avatarY').value)},
    background:{kind,url:backgroundUrl,mobile:backgroundUrl===current.background.url?current.background.mobile:'',poster:byId('backgroundPoster').value},
    soundtrack:{title:byId('songTitle').value,artist:byId('songArtist').value},socials:current.socials
  };
}
function fill(config) {
  model.draft=structuredClone(config);
  const values={displayName:config.name,bio:config.bio,badge:config.badge,accent:config.accent,effect:config.effect,glow:config.glow,opacity:config.opacity,avatarUrl:config.avatar.url,avatarPoster:config.avatar.poster,avatarX:config.avatar.x,avatarY:config.avatar.y,backgroundKind:config.background.kind,videoUrl:config.background.kind==='video'?config.background.url:'',imageUrl:config.background.kind==='image'?config.background.url:'',backgroundPoster:config.background.poster,songTitle:config.soundtrack.title,songArtist:config.soundtrack.artist};
  for(const [id,value]of Object.entries(values)) byId(id).value=value;
  byId('effectSpeed').value=config.effectSpeed;
  byId('effectStrength').value=config.effectStrength;
  renderSocials();
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
  let config;
  try { config=normalizeProfile(collect()); }
  catch(error) { byId('previewHint').textContent=error.message; return; }
  byId('previewHint').textContent='';
  renderProfile(panel,config,{previewUrls});
  updateEffectControls();
  const source=previewUrls.get(config.background.url)||config.background.url;
  const poster=previewUrls.get(config.background.poster)||config.background.poster;
  const posterImage=byId('previewPoster');
  const isVideo=config.background.kind==='video';
  posterImage.hidden=config.background.kind==='black'||(!poster && isVideo);
  if(config.background.kind==='image') posterImage.src=source;
  else if(poster) posterImage.src=poster;
  else posterImage.removeAttribute('src');
  byId('previewSound').hidden=!isVideo;
  if(!isVideo) { video.pause();video.removeAttribute('src');video.load();video.hidden=true; }
  else {
    video.hidden=false;
    video.poster=poster;
    if(video.getAttribute('src')!==source) {
      video.pause();video.muted=true;video.src=source;
    }
    const visible=!document.hidden&&(!matchMedia('(max-width: 820px)').matches||byId('studioGrid').dataset.tab==='preview');
    if(visible&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});
    else video.pause();
  }
  updateMusic();
}

function updateEffectControls() {
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
      if(!confirm('Remove this unused upload? Saved current/previous media cannot be removed.')) return;
      remove.disabled=true;
      try{await request(`/uploads/${upload.id}`,{method:'DELETE'});await library();message('Unused file removed.');}
      catch(error){message(error.message,true);remove.disabled=false;}
    });row.append(remove);container.append(row);
  }
  byId('storageUsage').textContent=`${(used/1_000_000).toFixed(1)} MB / 250 MB used. Original Ascendo assets do not count toward your upload allowance.`;
}

async function uploadFile(file,kind,group) {
  if(file.size>(kind==='video'?MAX_VIDEO:MAX_IMAGE)||file.size===0) throw new Error(kind==='video'?'Choose an MP4 up to 50 MB. Compress larger files first.':'Choose an image up to 5 MB.');
  const mime=file.type;
  if((kind==='video'&&mime!=='video/mp4')||(kind!=='video'&&!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))) throw new Error('Unsupported file. Use MP4 video or JPEG, PNG, GIF, or WebP images.');
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
    const kind=group.dataset.upload;
    if(file.size>(kind==='video'?MAX_VIDEO:MAX_IMAGE)||file.size===0){group.querySelector('[data-upload-status]').textContent=kind==='video'?'Choose an MP4 up to 50 MB.':'Choose an image up to 5 MB.';input.value='';return;}
    const target=group.parentElement.querySelector('input[type=url]');
    input.disabled=true;model.activeUploads++;markDirty();
    const generation=(mediaGenerations.get(kind)||0)+1;
    mediaGenerations.set(kind,generation);
    try {
      const poster=(kind==='avatar'||kind==='video')?await posterFrom(file):null;
      const completed=await uploadFile(file,kind,group);
      target.value=completed.url;
      if(kind==='avatar')byId('avatarPoster').value='';
      if(kind==='video'){byId('backgroundKind').value='video';byId('backgroundPoster').value='';}
      if(kind==='backgroundImage')byId('backgroundKind').value='image';
      if(poster){const still=await uploadFile(poster,'poster',group);if(generation===mediaGenerations.get(kind))byId(kind==='avatar'?'avatarPoster':'backgroundPoster').value=still.url;}
      group.querySelector('[data-upload-status]').textContent='Uploaded privately. Save changes to publish.';
      schedulePreview();await library();
    } catch(error) {group.querySelector('[data-upload-status]').textContent=error.message;message(error.message,true);}
    finally{input.disabled=false;input.value='';model.activeUploads--;markDirty();}
  });
}

form.addEventListener('input',event=>{
  if(event.target.type==='file')return;
  if(event.target.id==='avatarUrl'&&byId('avatarPoster').value===model.draft?.avatar.poster)byId('avatarPoster').value='';
  schedulePreview();
});
form.addEventListener('change',event=>{if(event.target.tagName==='SELECT')schedulePreview();});
byId('addSocial').addEventListener('click',()=>{model.draft.socials.push({icon:'website',label:'Website',handle:'My website',action:'link',value:'https://'});renderSocials();schedulePreview();});
byId('previewSound').addEventListener('click',()=>{video.muted=false;video.volume=.65;video.play().catch(()=>{byId('previewHint').textContent='Video playback is unavailable. Check the direct URL or choose another file.';});});
byId('discardChanges').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(!model.dirty||confirm('Discard your unpublished changes?')){fill(model.saved);model.revision=model.baselineRevision;markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Unpublished changes discarded.');}});
byId('resetProfile').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(confirm('Preview the original Ascendo profile? It will not publish until you save.')){fill(model.defaults);markDirty();rememberDraft();message('Original settings loaded into your private preview. Save to publish them.');}});
byId('restorePrevious').addEventListener('click',()=>{if(model.activeUploads){message('Finish or cancel your upload first.',true);return;}if(model.previous&&confirm('Preview the previous saved version?')){fill(model.previous);markDirty();rememberDraft();message('Previous version loaded privately. Save to publish it.');}});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(model.busy||model.activeUploads)return;
  let config;
  try{config=normalizeProfile(collect());}catch(error){message(error.message,true);return;}
  model.busy=true;form.setAttribute('aria-busy','true');markDirty();message('Publishing your profile…');
  const disabledBefore=[...form.elements].map(control=>[control,control.disabled]);
  for(const [control]of disabledBefore)control.disabled=true;
  try{
    const saved=await request('/me',{method:'PUT',body:{revision:model.revision,config}});
    model.previous=model.saved;model.saved=saved.config;model.revision=saved.revision;model.baselineRevision=saved.revision;fill(saved.config);markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Published. Your profile is updated.',false,true);await library().then(preview).catch(()=>message('Published. The media list could not refresh; reload it later.',false,true));
  }catch(error){rememberDraft();message(error.message,true);if(error.status===409)byId('reloadLatest').hidden=false;if(error.status===401){const link=element('a','studio-button','Sign in again');link.href='/login/';status.after(link);}}
  finally{for(const [control,disabled]of disabledBefore)control.disabled=disabled;byId('restorePrevious').disabled=!model.previous;model.busy=false;form.removeAttribute('aria-busy');markDirty(model.dirty);}
});
byId('logoutButton').addEventListener('click',async()=>{
  if(model.busy){message('Wait for publishing to finish before logging out.',true);return;}
  if(model.dirty&&!confirm('Log out and discard unpublished changes?'))return;
  if(model.activeUploads){message('Finish or cancel the upload before logging out.',true);return;}
  try{if(session())await request('/session',{method:'DELETE'});}catch(error){message(error.message,true);return;}
  clearDraft();storeSession(null);location.replace('/login/');
});
function selectTab(tab){
  byId('studioGrid').dataset.tab=tab;
  byId('editTab').setAttribute('aria-selected',String(tab==='edit'));byId('previewTab').setAttribute('aria-selected',String(tab==='preview'));
  byId('editTab').tabIndex=tab==='edit'?0:-1;byId('previewTab').tabIndex=tab==='preview'?0:-1;
  if(tab==='edit')video.pause();else preview();
}
for(const [id,tab]of [['editTab','edit'],['previewTab','preview']]){
  byId(id).addEventListener('click',()=>selectTab(tab));
  byId(id).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'edit':event.key==='End'?'preview':tab==='edit'?'preview':'edit';selectTab(next);byId(next==='edit'?'editTab':'previewTab').focus();});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
window.addEventListener('pagehide',()=>{video.pause();if(model.previewFrame)cancelAnimationFrame(model.previewFrame);});
window.addEventListener('beforeunload',event=>{if(model.dirty||model.activeUploads){event.preventDefault();event.returnValue='';}});

async function initialize(){
  if(!session()){location.replace('/login/');return;}
  try{
    const current=await request('/me');
    model.slug=current.slug;model.saved=normalizeProfile(current.config);model.defaults=normalizeProfile(current.defaults);model.previous=current.previous?normalizeProfile(current.previous):null;model.revision=current.revision;model.baselineRevision=current.revision;
    byId('studioIdentity').textContent=`Editing ${model.saved.name} · Your profile URL stays ascendo.lol/${model.slug}/`;
    byId('viewProfile').href=`/${model.slug}/`;byId('viewProfile').hidden=false;
    await library();fill(model.saved);markDirty(false);byId('restorePrevious').disabled=!model.previous;
    byId('editorContent').hidden=false;message('');
    try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(draft?.slug===model.slug){fill(normalizeProfile(draft.config));model.revision=draft.revision;markDirty();message('Restored your unpublished draft. Save changes when ready.');if(draft.revision!==current.revision){byId('reloadLatest').hidden=false;message('Your draft is safe, but the saved profile changed. Load the latest version before publishing.',true);}}}catch{}
  }catch(error){message(error.message,true);if(error.status===401){storeSession(null);const link=element('a','studio-button','Sign in again');link.href='/login/';status.after(link);}}
}
byId('reloadLatest').addEventListener('click',async()=>{
  if(model.busy||model.activeUploads)return;
  if(!confirm('Discard this draft and load the latest saved profile?'))return;
  try{const current=await request('/me');model.saved=normalizeProfile(current.config);model.previous=current.previous;model.revision=current.revision;model.baselineRevision=current.revision;fill(model.saved);markDirty(false);clearDraft();byId('reloadLatest').hidden=true;message('Latest saved profile loaded.');}catch(error){message(error.message,true);}
});
initialize();
