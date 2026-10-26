import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {Window} from 'happy-dom';
import {transform} from 'esbuild';
import vm from 'node:vm';
import {normalizeProfile,profileMedia} from '../profile-schema.mjs';
import {preserveVisualGroups,OVERLAY_PRESETS} from '../visual-schema.mjs';
import {BACKGROUNDS,backgroundPoster,backgroundStyle} from '../background-catalog.mjs';
import {createProfileBackground} from '../profile-background.mjs';
import {createProfilePlayer} from '../profile-music.mjs';
import {createVisualEditor} from '../editor-visual.mjs';
import {createAdditionalEditor} from '../editor-additions.mjs';
import {createEditorLayout} from '../editor-layout.mjs';
import {createStudioControls} from '../studio-controls.mjs';
import {createStudioLanguage,tr} from '../studio-i18n.mjs?v=20261026-4';
import {createQuickGuide} from '../studio-guide.mjs';
import {FONTS} from '../font-catalog.mjs';
import {HU} from '../studio-hu.mjs?v=20261026-4';
import {mp3Frames,verifyMp3} from '../supabase/functions/profile-api/audio-file.mjs';
import {badgeError} from '../badge-policy.mjs';
import {badgeCapabilities} from '../supabase/functions/profile-api/badge-authority.mjs';
const read=file=>fs.readFileSync(file,'utf8'),seeds=JSON.parse(read('supabase/seed-profiles.json')),base=normalizeProfile(seeds.internalcheats),checks=[],windows=[];
const check=async(name,run)=>{await run();checks.push(name);};
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
function environment(file='customize/index.html'){
  const win=new Window({url:'https://ascendo.lol/'+file.replace('index.html',''),settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(win);win.document.write(read(file));win.document.close();
  const prefs=new Map();win.matchMedia=query=>{if(!prefs.has(query)){const pref=new win.EventTarget();pref.matches=false;prefs.set(query,pref);}return prefs.get(query);};
  Object.defineProperty(win.HTMLMediaElement.prototype,'paused',{get(){return this.__paused!==false;},configurable:true});
  win.HTMLMediaElement.prototype.play=function(){this.__paused=false;this.dispatchEvent(new win.Event('playing'));return Promise.resolve();};win.HTMLMediaElement.prototype.pause=function(){if(this.__paused!==false)return;this.__paused=true;this.dispatchEvent(new win.Event('pause'));};win.HTMLMediaElement.prototype.load=function(){};
  win.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);win.cancelAnimationFrame=clearTimeout;
  globalThis.document=win.document;globalThis.window=win;return win;
}
try{
await check('all twelve backgrounds persist without changing defaults; original sources and local stills verify',()=>{
  assert.equal(Object.keys(BACKGROUNDS).length,12);assert.equal(base.background.kind,'video');
  for(const id of Object.keys(BACKGROUNDS)){const value=normalizeProfile({...base,background:{kind:'preset',preset:id,url:''}});assert.equal(value.background.preset,id);assert.ok(fs.existsSync('.'+backgroundPoster(id)));const css=backgroundStyle(id);if(css)assert.ok(fs.existsSync('.'+css.split('?')[0]));}
  const provenance=JSON.parse(read('vendor/react-bits/backgrounds/SOURCES.json'));assert.equal(provenance.commit,'e12c22192ac7b4b452c5e2feb9b586d74765d696');for(const file of provenance.files)assert.equal(createHash('sha256').update(fs.readFileSync(file.file)).digest('hex'),file.sha256,file.file);
  for(const id of Object.keys(BACKGROUNDS).filter(id=>id!=='flux-lines')){assert.ok(fs.existsSync(`vendor/backgrounds/${id}.mjs`));assert.match(read(`background-islands/${id}.jsx`),/mountReactBackground/);}
  assert.match(read('background-islands/grid-scan.jsx'),/"enableWebcam":false/);assert.match(read('background-islands/grid-scan.jsx'),/"enableGyro":false/);assert.match(read('vendor/react-bits/backgrounds/LICENSE.md'),/Commons Clause/);
});
await check('reduced-motion selection uses each original still without importing a renderer',()=>{
  const win=environment('internalcheats/index.html');win.matchMedia('(prefers-reduced-motion: reduce)').matches=true;const stage=document.querySelector('.video-stage'),controller=createProfileBackground(stage);
  for(const id of Object.keys(BACKGROUNDS)){controller.update({...base,background:{kind:'preset',preset:id}});assert.equal(stage.dataset.preset,id);assert.match(stage.querySelector('.profile-background-preset__poster').style.backgroundImage,new RegExp(backgroundPoster(id)));assert.equal(stage.querySelector('.profile-background-preset__poster').hidden,false);assert.equal(stage.querySelector('.profile-background-preset').style.backgroundImage,'');assert.equal(stage.querySelectorAll('canvas').length,0);}
  assert.equal(document.querySelectorAll('link[href*="vendor/backgrounds"]').length,0);controller.update(base);assert.equal(stage.dataset.preset,'');controller.destroy();assert.equal(stage.querySelector('.profile-background-preset'),null);
});
await check('music defaults preserve video audio and old-client saves retain uploaded music and exact volume',()=>{
  assert.deepEqual(base.music,{source:'video',url:'',volume:65});const url='https://fstdttaxflayhtwhnbih.supabase.co/storage/v1/object/public/profile-media/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.mp3';
  const custom=normalizeProfile({...base,music:{source:'mp3',url,volume:27}});assert.ok(profileMedia(custom).includes(url));assert.equal(normalizeProfile(preserveVisualGroups(seeds.internalcheats,custom)).music.volume,27);
  for(const music of [null,{volume:-1},{volume:70.1},{volume:'50'},{source:'script'},{url:'javascript:alert(1)'},{arbitrary:'css'}])assert.throws(()=>normalizeProfile({...base,music}));
});
await check('live backgrounds replace their poster without double exposure in public and editor stages',async()=>{
  for(const file of ['internalcheats/index.html','customize/index.html']){
    const win=environment(file),stage=document.querySelector('.video-stage,.preview-stage'),style=document.createElement('style');style.textContent=read('styles.css')+'\n'+read('profile-visual.css');document.head.append(style);
    const callbacks=[];let active=0;const controller=createProfileBackground(stage,{ensureStyles:async()=>{},loadRenderer:async()=>({mountBackground:(container,events)=>{assert.notEqual(win.getComputedStyle(container).display,'none');container.append(document.createElement('canvas'));callbacks.push(events);active++;return ()=>{active--;};}})});
    assert.equal(createProfileBackground(stage),controller);
    for(const id of Object.keys(BACKGROUNDS)){
      controller.update({...base,background:{kind:'preset',preset:id}});await flush();const host=stage.querySelector('.profile-background-preset'),poster=host.querySelector('.profile-background-preset__poster'),canvas=host.querySelector('.profile-background-preset__canvas');
      assert.equal(stage.querySelectorAll('.profile-background-preset').length,1);assert.equal(active,1);assert.doesNotMatch(win.getComputedStyle(host).backgroundImage,/url\(/);assert.equal(host.style.backgroundImage,'');assert.equal(poster.hidden,false);assert.equal(win.getComputedStyle(canvas).visibility,'hidden');
      callbacks.at(-1).onReady();assert.equal(poster.hidden,true);assert.equal(win.getComputedStyle(poster).display,'none');assert.equal(win.getComputedStyle(canvas).visibility,'visible');
      const video=stage.querySelector('video');assert.equal(win.getComputedStyle(video).visibility,'hidden');assert.equal(win.getComputedStyle(video).opacity,'0');
      callbacks.at(-1).onError();assert.equal(active,0);assert.equal(poster.hidden,false);assert.equal(win.getComputedStyle(canvas).visibility,'hidden');assert.equal(canvas.children.length,0);
    }
    controller.update(base);assert.equal(stage.dataset.preset,'');assert.notEqual(win.getComputedStyle(stage.querySelector('video')).visibility,'hidden');controller.destroy();assert.equal(active,0);
  }
});
await check('rapid background switching ignores stale loads, readiness and failure callbacks',async()=>{
  environment('internalcheats/index.html');const stage=document.querySelector('.video-stage'),pending=new Map(),events=new Map(),mounted=[],released=[];
  const controller=createProfileBackground(stage,{ensureStyles:async()=>{},loadRenderer:id=>new Promise(resolve=>pending.set(id,()=>resolve({mountBackground:(container,callbacks)=>{mounted.push(id);events.set(id,callbacks);container.append(document.createElement('canvas'));return ()=>released.push(id);}})))});
  const select=id=>controller.update({...base,background:{kind:'preset',preset:id}});select('beams');select('antigravity');pending.get('antigravity')();await flush();events.get('antigravity').onReady();pending.get('beams')();await flush();assert.deepEqual(mounted,['antigravity']);
  select('ballpit');pending.get('ballpit')();await flush();events.get('ballpit').onReady();events.get('antigravity').onReady();events.get('antigravity').onError();assert.equal(stage.dataset.preset,'ballpit');assert.equal(stage.querySelector('.profile-background-preset__poster').hidden,true);assert.equal(stage.querySelectorAll('canvas').length,1);assert.deepEqual(released,['antigravity']);controller.destroy();assert.deepEqual(released,['antigravity','ballpit']);
});
await check('synchronous renderer failures clean up immediately and leave only the still fallback',async()=>{
  environment('internalcheats/index.html');const stage=document.querySelector('.video-stage');let releases=0;
  const controller=createProfileBackground(stage,{ensureStyles:async()=>{},loadRenderer:async()=>({mountBackground:(container,events)=>{container.append(document.createElement('canvas'));events.onError();return ()=>releases++;}})});
  controller.update({...base,background:{kind:'preset',preset:'beams'}});await flush();assert.equal(releases,1);assert.equal(stage.querySelectorAll('canvas').length,0);assert.equal(stage.querySelector('.profile-background-preset__poster').hidden,false);assert.equal(stage.querySelector('.profile-background-preset').classList.contains('is-ready'),false);controller.destroy();assert.equal(releases,1);
});
await check('MP3 validation requires consecutive Layer III frames and safely skips ID3 metadata',async()=>{
  const frame=Buffer.alloc(417);frame.set([255,251,144,0]);const bytes=Buffer.concat([frame,frame,frame]);assert.equal(mp3Frames(bytes),true);assert.equal(mp3Frames(Buffer.from('ID3notaudio')),false);assert.equal(mp3Frames(Buffer.alloc(8192)),false);
  const fetchBefore=globalThis.fetch;const stored=Buffer.concat([Buffer.from([73,68,51,4,0,0,0,0,0,20]),Buffer.alloc(20),bytes]);let reads=0;
  globalThis.fetch=async(url,{headers})=>{reads++;const [,a,b]=headers.Range.match(/bytes=(\d+)-(\d+)/);return new Response(stored.subarray(Number(a),Number(b)+1),{status:206});};
  assert.equal(await verifyMp3('https://storage.invalid/file.mp3',stored.length),true);assert.equal(reads,2);globalThis.fetch=async()=>new Response(bytes,{status:200});await assert.rejects(()=>verifyMp3('https://storage.invalid/file.mp3',bytes.length));globalThis.fetch=fetchBefore;
});
await check('independent audio handles video muting, entry gates, zero, seventy-percent cap and visibility cleanup',async()=>{
  const win=environment('internalcheats/index.html'),video=document.querySelector('#musicBackground'),player=createProfilePlayer(video,{preview:true});player.update({source:'mp3',url:'https://example.com/music.mp3',volume:37},{source:'https://example.com/background.mp4'});await flush();
  const audio=player.current();assert.equal(audio.tagName,'AUDIO');assert.equal(audio.muted,true);assert.equal(video.muted,true);assert.equal(audio.paused,true);player.volume(37);await flush();assert.equal(audio.paused,false);assert.equal(audio.muted,false);assert.equal(audio.volume,.37);assert.equal(video.muted,true);
  player.volume(100);assert.equal(audio.volume,.7);player.volume(0);assert.equal(audio.volume,0);assert.equal(audio.muted,true);
  video.dataset.entryBlocked='true';video.dispatchEvent(new win.Event('ascendo:background'));assert.equal(audio.paused,true);video.dataset.entryBlocked='false';player.volume(20);await flush();assert.equal(audio.paused,false);
  Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new win.Event('visibilitychange'));assert.equal(audio.paused,true);assert.equal(video.paused,true);Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new win.Event('visibilitychange'));await flush();assert.equal(audio.paused,false);
  player.setActive(false);await flush();assert.equal(audio.paused,true);assert.equal(video.paused,true);player.setActive(true);await flush();assert.equal(audio.paused,false);
  player.update({source:'video',url:'https://example.com/music.mp3',volume:48},{source:'https://example.com/background.mp4'});assert.equal(player.current(),video);assert.equal(audio.getAttribute('src'),null);assert.equal(video.volume,.48);player.destroy();assert.equal(document.querySelector('[data-profile-music]'),null);
});
await check('public reduced-motion poster does not request video until visitor interaction',async()=>{
  const win=environment('internalcheats/index.html');win.matchMedia('(prefers-reduced-motion: reduce)').matches=true;const video=document.querySelector('#musicBackground'),player=createProfilePlayer(video);player.fromDataset();await flush();assert.equal(video.getAttribute('src'),null);player.start(true);await flush();assert.match(video.src,/music-background/);player.destroy();
});
await check('MP4 resumes after repeated visibility and focus changes without reloading or losing the chosen volume',async()=>{
  for(const quiet of ['reduced','saveData','normal']){
    const win=environment('internalcheats/index.html');if(quiet==='reduced')win.matchMedia('(prefers-reduced-motion: reduce)').matches=true;if(quiet==='saveData')Object.defineProperty(win.navigator,'connection',{value:{saveData:true},configurable:true});
    const video=document.getElementById('musicBackground');let loads=0;video.load=()=>loads++;Object.defineProperty(video,'readyState',{get:()=>video.getAttribute('src')?3:0,configurable:true});const player=createProfilePlayer(video);player.fromDataset();await player.start(true);player.volume(41);await flush();const initialLoads=loads;video.currentTime=17;
    for(let round=0;round<4;round++){Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new win.Event('visibilitychange'));assert.equal(video.paused,true);Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new win.Event('visibilitychange'));await flush();assert.equal(video.paused,false);assert.equal(video.volume,.41);assert.equal(video.currentTime,17);assert.equal(document.body.classList.contains('media-poster-only'),false,quiet+' round '+round);}
    assert.equal(loads,initialLoads);video.pause();assert.equal(document.body.classList.contains('has-video'),true);win.dispatchEvent(new win.Event('focus'));await flush();assert.equal(video.paused,false);player.destroy();
  }
});
await check('bio and social-label colors validate, retain automatic defaults and survive older-client saves',()=>{
  assert.deepEqual(base.textColors,{bio:null,socialLabel:null});const saved=normalizeProfile({...base,textColors:{bio:'#12ABCD',socialLabel:'#FFaa22'}});assert.deepEqual(saved.textColors,{bio:'#12abcd',socialLabel:'#ffaa22'});const old=structuredClone(base);delete old.textColors;assert.deepEqual(normalizeProfile(preserveVisualGroups(old,saved)).textColors,saved.textColors);
  for(const textColors of [{bio:'red'},{socialLabel:'url(x)'},{bio:'#fff'},{bio:42},{script:'bad'},[]])assert.throws(()=>normalizeProfile({...base,textColors}));
});
await check('autoplay denial uses a muted fallback, interrupted loads do not mute, and MP3 starts independently',async()=>{
  for(const errorName of ['NotAllowedError','AbortError']){const win=environment('internalcheats/index.html'),video=document.getElementById('musicBackground');let tries=0;const play=win.HTMLMediaElement.prototype.play;video.play=function(){if(++tries===1)return Promise.reject(new win.DOMException('fixture',errorName));return play.call(this);};const player=createProfilePlayer(video);player.fromDataset();await flush();assert.equal(tries,errorName==='NotAllowedError'?2:1);assert.equal(video.muted,errorName==='NotAllowedError');player.destroy();}
  const win=environment('internalcheats/index.html'),video=document.getElementById('musicBackground');video.play=()=>new Promise(()=>{});const player=createProfilePlayer(video);player.update({source:'mp3',url:'https://example.com/music.mp3',volume:35},{source:'https://example.com/waiting.mp4'});await flush();assert.equal(player.current().paused,false);assert.equal(player.current().volume,.35);assert.equal(video.muted,true);player.destroy();
});
await check('every overlay is directly selectable and keeps independent editable settings across switching and disabling',()=>{
  environment();const editor=createVisualEditor({isBusy:()=>false,onChange(){}});editor.fill(base);assert.equal(document.querySelectorAll('[data-overlay-preset]').length,15);
  for(const preset of OVERLAY_PRESETS){editor.fill(base);document.querySelector(`[data-overlay-preset="${preset}"]`).click();let value=editor.collect();assert.equal(value.overlays.enabled,true);assert.equal(value.overlays.layers[0].preset,preset);document.getElementById(`layer-${preset}-density`).value='72';document.getElementById(`layer-${preset}-colorMode`).value='custom';document.getElementById(`layer-${preset}-color`).value='#20ff60';document.getElementById(`layer-${preset}-enabled`).checked=false;value=editor.collect();assert.equal(value.overlays.layers[0].density,72);assert.equal(value.overlays.layers[0].enabled,false);assert.equal(value.overlays.layers[0].color,'#20ff60');editor.fill(normalizeProfile({...base,...value}));assert.equal(editor.collect().overlays.layers[0].preset,preset);}
  editor.fill(base);for(const preset of ['rain','petals','fireworks'])document.querySelector(`[data-overlay-preset="${preset}"]`).click();document.querySelector('[data-overlay-preset=embers]').click();assert.equal(editor.collect().overlays.layers.length,3);document.getElementById('overlaysEnabled').checked=false;assert.equal(editor.collect().overlays.layers.length,3);assert.equal(editor.collect().overlays.enabled,false);
});
await check('Hungarian covers every rendered editor label, translates dynamically, preserves user input and saves only language',async()=>{
  const win=environment();const noop=()=>{},visual=createVisualEditor({isBusy:()=>false,onChange:noop}),extra=createAdditionalEditor({isBusy:()=>false,onChange:noop,previewSound:noop,replayEntry:noop,replayTitle:noop});visual.fill(base);extra.fill(base);createEditorLayout({});const controls=createStudioControls(document.getElementById('profileForm'));let requests=[];
  const locale=createStudioLanguage({request:async(path,options)=>{requests.push([path,options]);return {language:'en'};},onChange:()=>controls.refresh()});await locale.setAccount('isolated-owner');const name=document.getElementById('displayName');name.value='Snow Founder';const preview=document.getElementById('previewCard');preview.textContent='Snow Founder';win.sessionStorage.setItem('ascendo-editor-draft','private draft');locale.apply('hu');await flush();assert.equal(document.documentElement.lang,'hu');assert.equal(name.value,'Snow Founder');assert.equal(preview.textContent,'Snow Founder');assert.equal(document.querySelector('#studio-section-backgrounds .studio-section-title').textContent,'Háttér és zene');assert.equal(document.getElementById('backgroundKind').options[0].textContent,'Videó saját hanggal');assert.equal(tr('Uploading 45%'),'Feltöltés: 45%');assert.equal(tr('This badge contains a reserved word.'),'Ez a jelvény védett szót tartalmaz.');
  const status=document.getElementById('editorStatus');status.textContent='Published. Your profile is updated.';await flush();assert.equal(status.textContent,'Közzétéve. A profilod frissült.');locale.apply('en');await flush();assert.equal(document.getElementById('backgroundKind').options[0].textContent,'Video with its own audio');assert.equal(name.value,'Snow Founder');assert.equal(win.sessionStorage.getItem('ascendo-editor-draft'),'private draft');
  document.getElementById('studioLanguage').click();await flush();assert.deepEqual(requests.at(-1),['/preferences',{method:'PUT',body:{language:'hu'}}]);assert.equal(requests.filter(([path])=>path==='/me').length,0);
  const brands=new Set([...Object.values(FONTS),...Object.values(BACKGROUNDS),'Ctrl K','EN','HU']);const source=[];const visit=node=>{if(node.nodeType===3){const text=node.textContent.trim();if(/[a-z]/i.test(text))source.push(text);}else if(node.nodeType===1&&!node.closest('#previewPanel,#previewDialog,#studioIdentity,#editorStatus,script,style,.studio-options')){for(const child of node.childNodes)visit(child);}};locale.apply('en');await flush();visit(document.body);for(const string of source)if(!brands.has(string)&&!/^\d|https:| · |% glass/.test(string))assert.ok(HU[string],string);
  locale.destroy();controls.destroy();
});
await check('Quick Guide is opt-in, traverses real controls and closes without changing a draft',async()=>{
  const win=environment(),noop=()=>{},visual=createVisualEditor({isBusy:()=>false,onChange:noop}),extra=createAdditionalEditor({isBusy:()=>false,onChange:noop,previewSound:noop,replayEntry:noop,replayTitle:noop});visual.fill(base);extra.fill(base);const layout=createEditorLayout({}),guide=createQuickGuide({layout});guide.ready();const dialog=document.querySelector('.studio-guide'),trigger=document.getElementById('quickGuide');assert.equal(dialog.open,false);document.getElementById('displayName').value='Keep this draft';trigger.click();await flush();assert.equal(dialog.open,true);const actions=dialog.querySelectorAll('.studio-guide__actions button');for(let i=0;i<5;i++){actions[2].click();await flush();assert.equal(dialog.open,true);}actions[1].click();assert.equal(dialog.open,true);actions[0].click();await flush();assert.equal(dialog.open,false);assert.equal(document.getElementById('displayName').value,'Keep this draft');assert.equal(document.activeElement,trigger);trigger.click();dialog.dispatchEvent(new win.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert.deepEqual(visual.collect().overlays,base.overlays);
});
await check('backend checks MP3 ownership before publication and preference endpoint ignores forged owners',async()=>{
  let source=read('supabase/functions/profile-api/index.ts');let code=source.slice(source.indexOf('async function publishFiles'),source.indexOf('function validMagic'));code=(await transform(code,{loader:'ts',format:'esm'})).code;let copies=0;const origin='https://example.supabase.co/storage/v1/object/public/profile-media/',path='owner/song.mp3',owned=[{path,state:'ready',kind:'audio',mime:'audio/mpeg'}];const context={url:'https://example.supabase.co',profileMedia,publicUrl:path=>origin+path,HttpError:class extends Error{constructor(status,message){super(message);this.status=status;}},command:async()=>owned,admin:{storage:{from:()=>({copy:async()=>{copies++;return {};},remove:async()=>({})})}}};vm.createContext(context);vm.runInContext(code+';globalThis.publish=publishFiles',context);
  await assert.rejects(()=>context.publish('owner',{...base,music:{source:'mp3',url:'https://foreign.invalid/file.mp3'}}),/own uploaded MP3/);assert.equal(copies,0);await context.publish('owner',{...base,music:{source:'mp3',url:origin+path}});assert.equal(copies,1);owned[0].kind='video';await assert.rejects(()=>context.publish('owner',{...base,music:{source:'mp3',url:origin+path}}),/own uploaded MP3/);
  assert.match(source,/profile_owner:user.id,selected_language:input.language\?\?null/);assert.match(source,/Object.keys\(input\).some\(key=>key!=='language'\)/);const migration=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_studio_audio_preferences.sql'));const sql=read('supabase/migrations/'+migration);assert.match(sql,/security invoker/);assert.match(sql,/enable row level security/);assert.match(sql,/from public,anon,authenticated/);assert.doesNotMatch(sql,/update private.profiles|update auth.users|disable row level/);
});
await check('authenticated API accepts only owned MP3 uploads and stores language independently from profile revisions',async()=>{
  let handler,language='en',reserved=0,ready=0,validAudio=false;const owner='11111111-1111-4111-8111-111111111111',uploadId='22222222-2222-4222-8222-222222222222',slug='isolated-owner';
  const client={auth:{getUser:async()=>({data:{user:{id:owner}}})},rpc:async(name,{operation,payload,...params})=>{if(name==='profile_editor_language'){assert.equal(params.profile_owner,owner);if(params.selected_language)language=params.selected_language;return {data:language};}if(operation==='session')return {data:true};if(operation==='mine')return {data:{slug,config:base,previous:null,revision:8}};if(operation==='uploads')return {data:[]};if(operation==='reserve'){reserved++;return {data:true};}if(operation==='upload')return {data:{id:uploadId,path:owner+'/'+uploadId+'.mp3',mime:'audio/mpeg',bytes:2000,kind:'audio',state:'pending'}};if(operation==='ready'){ready++;return {data:true};}throw Error(operation);},storage:{from:()=>({createSignedUploadUrl:async()=>({data:{token:'fixture-token'}}),createSignedUrl:async()=>({data:{signedUrl:'https://fixture.invalid/song.mp3'}}),getPublicUrl:path=>({data:{publicUrl:'https://fixture.invalid/'+path}}),info:async()=>({data:{size:2000,contentType:'audio/mpeg'}})})}};
  const source=(await transform(read('supabase/functions/profile-api/index.ts').replace(/^import .*;\r?\n/gm,''),{loader:'ts',format:'esm'})).code;
  vm.runInNewContext(source,{Deno:{env:{get:()=> 'https://fixture.supabase.co'},serve:callback=>handler=callback},createClient:()=>client,normalizeProfile,profileMedia,badgeError,badgeCapabilities,preserveVisualGroups,verifyMp3:async()=>validAudio,crypto:webcrypto,MAX_IMAGE:5e6,MAX_VIDEO:5e7,OWNER_QUOTA:25e7,TextEncoder,TextDecoder,Request,Response,URL,Uint8Array,console,atob});
  const token=owner+'.'+Buffer.from(JSON.stringify({session_id:'33333333-3333-4333-8333-333333333333'})).toString('base64url')+'.fixture',call=(path,method='GET',body)=>handler(new Request('https://fixture.invalid/profile-api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}));
  assert.equal((await call('/preferences','PUT',{language:'hu',owner:'another'})).status,400);assert.equal((await call('/preferences','PUT',{language:'script'})).status,400);assert.equal((await call('/preferences','PUT',{language:'hu'})).status,200);assert.equal((await (await call('/preferences')).json()).language,'hu');
  for(const input of [{kind:'audio',mime:'video/mp4',bytes:1000},{kind:'video',mime:'audio/mpeg',bytes:1000},{kind:'audio',mime:'audio/mpeg',bytes:50_000_001},{kind:'audio',mime:'audio/wav',bytes:1000}])assert.equal((await call('/uploads','POST',input)).status,400);
  assert.equal(reserved,0);assert.equal((await call('/uploads','POST',{kind:'audio',mime:'audio/mpeg',bytes:2000})).status,200);assert.equal(reserved,1);assert.equal((await call('/uploads/'+uploadId+'/complete','POST',{})).status,400);assert.equal(ready,0);validAudio=true;assert.equal((await call('/uploads/'+uploadId+'/complete','POST',{})).status,200);assert.equal(ready,1);
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{for(const win of windows)await win.happyDOM.close();}
