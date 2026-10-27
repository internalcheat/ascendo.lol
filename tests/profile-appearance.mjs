import assert from 'node:assert/strict';import fs from 'node:fs';import {Window} from 'happy-dom';
import {normalizeProfile} from '../profile-schema.mjs';import {preserveVisualGroups,LAYOUTS} from '../visual-schema.mjs';
import {APPEARANCE_GROUPS,BORDER_STYLES} from '../appearance-schema.mjs';import {electricContour} from '../electric-contour.mjs';import {electricPaths} from '../electric-styles.mjs';
import {renderProfile} from '../profile-view.mjs';import {applyBackgroundAppearance} from '../profile-appearance.mjs';import {createProfileEffects} from '../profile-effects.mjs';
import {createProfileExpression} from '../profile-expression.mjs';
import {createAvatarFrames} from '../avatar-frames.mjs';import {createProfilePlayer} from '../profile-music.mjs';import {sameSnapshot} from '../studio-presets.mjs';import {createPresetThumbnail} from '../preset-thumbnail.mjs';
import {createVisualEditor} from '../editor-visual.mjs';import {createAppearanceEditor} from '../editor-appearance.mjs';import {appearanceProfile} from './fixtures/appearance-profile.mjs';
import {createStudioLanguage,tr} from '../studio-i18n.mjs';import {APPEARANCE_HU} from '../appearance-hu.mjs';
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats,base=normalizeProfile(seed),checks=[],windows=[];
const check=async(name,run)=>{await run();checks.push(name);};
function environment(){const win=new Window({url:'https://ascendo.lol/customize/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(win);win.document.write(fs.readFileSync('customize/index.html','utf8'));win.document.close();globalThis.document=win.document;globalThis.window=win;const queries=new Map();win.matchMedia=q=>{if(!queries.has(q)){const item=new win.EventTarget();item.matches=false;queries.set(q,item);}return queries.get(q);};const frames=new Map();let id=0;win.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};win.cancelAnimationFrame=n=>frames.delete(n);win.HTMLCanvasElement.prototype.getContext=()=>null;return {win,frames,panel:document.getElementById('previewCard'),scope:document.querySelector('.preview-card')};}
try{
await check('appearance groups stay off for existing profiles and preserve old-client settings',()=>{
 for(const key of APPEARANCE_GROUPS)assert.equal(base[key].enabled,false);assert.equal(base.electricBorder.style,'lightning');assert.equal(base.electricBorder.width,1.3);
 const saved=appearanceProfile(seed),old=structuredClone(saved);for(const key of APPEARANCE_GROUPS)delete old[key];for(const key of ['style','width','glow','secondary','reactive'])delete old.electricBorder[key];
 const next=normalizeProfile(preserveVisualGroups(old,saved));for(const key of [...APPEARANCE_GROUPS,'electricBorder'])assert.deepEqual(next[key],saved[key]);
 for(const bad of [{backgroundAppearance:{blur:25}},{backgroundAppearance:{darkness:-1}},{backgroundAppearance:{saturation:151}},{backgroundAppearance:{x:'10'}},{backgroundAppearance:{tintColor:'red'}},{glass:{enabled:1}},{glass:{radius:49}},{glass:{css:'bad'}},{avatarFrame:{style:'<svg>'}},{avatarFrame:{speed:0}},{avatarFrame:{width:NaN}},{electricBorder:{style:'evil'}},{electricBorder:{width:5}},{electricBorder:{glow:101}},{electricBorder:{reactive:'yes'}}])assert.throws(()=>normalizeProfile({...seed,...bad}));
});
await check('border styles are distinct, finite, bounded and steady with reduced motion',()=>{
 const points=electricContour(300,180,[6,24,12,38]),paths=new Set();
 for(const style of Object.keys(BORDER_STYLES)){const settings={...base.electricBorder,style,intensity:100};const a=electricPaths(points,settings,500),b=electricPaths(points,settings,1500);for(const part of [a.primary,a.secondary])assert.doesNotMatch(part,/NaN|Infinity|undefined/);paths.add(JSON.stringify(a));assert.notDeepEqual(a,b,style);assert.deepEqual(electricPaths(points,settings,0,{reduced:true}),electricPaths(points,settings,5000,{reduced:true}));}
 assert.equal(paths.size,5);
});
await check('background controls affect only the backdrop and glass settings work in every layout',()=>{
 const {panel}=environment(),stage=document.getElementById('previewStage'),video=document.getElementById('previewVideo');video.src='https://ascendo.lol/unchanged.mp4';
 for(const cardLayout of LAYOUTS){const config=appearanceProfile(seed,{cardLayout});renderProfile(panel,config);applyBackgroundAppearance(stage,config);assert.equal(panel.dataset.glass,'true');assert.equal(panel.style.getPropertyValue('--card-radius'),'34px');assert.equal(stage.style.getPropertyValue('--background-position'),'68% 37%');assert.equal(panel.querySelector('.avatar img').style.filter,'');assert.equal(video.src,'https://ascendo.lol/unchanged.mp4');}
 applyBackgroundAppearance(stage,base);renderProfile(panel,base);assert.equal(stage.dataset.backgroundLook,'false');assert.equal(panel.dataset.glass,'false');assert.equal(stage.querySelector('.background-look-tint').hidden,true);
});
await check('avatar frames follow the selected picture shape and clean up without replacing media',()=>{
 const {panel,win}=environment();renderProfile(panel,appearanceProfile(seed));const avatar=panel.querySelector('.avatar'),image=avatar.querySelector('img');Object.defineProperty(avatar,'offsetWidth',{value:144});Object.defineProperty(avatar,'offsetHeight',{value:190});avatar.style.borderRadius='24px';
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),frames=createAvatarFrames(panel,{reduced});
 for(const style of ['dashed','double','halo']){frames.update(appearanceProfile(seed,{avatarFrame:{...base.avatarFrame,enabled:true,style}}));assert.equal(panel.querySelectorAll('.profile-avatar-frame').length,1);assert.ok(avatar.querySelector('path').getAttribute('d').length>100);assert.equal(avatar.querySelector('img'),image);frames.setActive(false);assert.equal(avatar.querySelector('svg').style.display,'none');frames.setActive(true);}
 frames.update(base);assert.equal(panel.querySelector('.profile-avatar-frame'),null);assert.equal(avatar.classList.contains('profile-avatar-frame-target'),false);frames.destroy();
});
await check('editor round-trips independent appearance controls, disabled values and full snapshots',()=>{
 environment();const visual=createVisualEditor({onChange(){},isBusy:()=>false}),editor=createAppearanceEditor({isBusy:()=>false}),saved=appearanceProfile(seed);visual.fill(saved);editor.fill(saved);
 const a=visual.collect(),b=editor.collect(),actual=normalizeProfile({...saved,...a,...b,electricBorder:{...a.electricBorder,...b.electricBorder}});assert.ok(sameSnapshot(saved,actual));document.getElementById('backgroundLookEnabled').checked=false;editor.updateControls();assert.equal(editor.collect().avatarFrame.enabled,true);assert.equal(editor.collect().backgroundAppearance.blur,9);assert.equal(document.getElementById('backgroundAppearanceBlur').disabled,true);
 assert.ok(sameSnapshot(saved,JSON.parse(JSON.stringify(saved))));assert.equal(sameSnapshot(saved,{...saved,background:{...saved.background,url:'https://ascendo.lol/another.mp4'}}),false);
});
await check('restoring media reloads failed or stale sources without changing saved volume',()=>{
 const {win}=environment(),video=document.getElementById('previewVideo');let loads=0;win.HTMLMediaElement.prototype.load=function(){loads++;};win.HTMLMediaElement.prototype.pause=function(){};win.HTMLMediaElement.prototype.play=async function(){};
 const player=createProfilePlayer(video,{preview:true});player.update({source:'video',volume:29},{source:'https://ascendo.lol/first.mp4'});const before=loads;player.reload();assert.ok(loads>before);assert.equal(video.getAttribute('src'),'https://ascendo.lol/first.mp4');assert.equal(video.volume,.29);
 player.update({source:'video',volume:29},{source:'https://ascendo.lol/second.mp4'});player.reload();assert.equal(video.getAttribute('src'),'https://ascendo.lol/second.mp4');player.destroy();
});
await check('preset thumbnails are quiet, preserve the editor and release their observers',()=>{
 const {panel}=environment();renderProfile(panel,base);const savedAvatar=panel.querySelector('.avatar'),host=document.createElement('div');document.body.append(host);const dispose=createPresetThumbnail(host,appearanceProfile(seed));assert.ok(host.querySelector('.profile__name'));assert.equal(host.querySelector('video,audio,iframe'),null);assert.equal(panel.querySelector('.avatar'),savedAvatar);assert.equal(host.getAttribute('aria-hidden'),'true');dispose();assert.equal(host.children.length,0);
});
await check('borders can react to captured music independently without rerouting or muting it',async()=>{
 const {win,panel,frames}=environment(),video=document.getElementById('previewVideo');let energy=0,captures=0,stops=0;
 Object.defineProperty(video,'paused',{value:false,configurable:true});Object.defineProperty(video,'readyState',{value:4,configurable:true});video.src='https://ascendo.lol/fixture.mp4';video.volume=.4;video.muted=false;
 const track={stop(){stops++;}};video.captureStream=()=>{captures++;return {getAudioTracks:()=>[track],getTracks:()=>[track]};};win.MediaStream=class{};
 win.AudioContext=class{constructor(){this.state='running';}async resume(){}async close(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {frequencyBinCount:128,fftSize:256,getByteFrequencyData(a){a.fill(128);},getByteTimeDomainData(a){a.fill(128);}};}createMediaElementSource(){throw Error('Audio must not be rerouted');}};
 const config=appearanceProfile(seed,{musicReactive:{enabled:false},electricBorder:{...base.electricBorder,enabled:true,reactive:true}});renderProfile(panel,config);panel.addEventListener('ascendo:music-energy',event=>energy=event.detail.energy);const runtime=createProfileExpression(panel,{scope:panel.parentElement,video});runtime.update(config);assert.equal(captures,0);document.dispatchEvent(new win.Event('pointerdown'));for(let i=0;i<8;i++)await Promise.resolve();for(const fn of [...frames.values()]){frames.clear();fn(100);}assert.equal(captures,1);assert.ok(energy>.4);assert.equal(video.volume,.4);assert.equal(video.muted,false);assert.equal(panel.querySelector('.profile-music-visual'),null);runtime.destroy();assert.equal(stops,1);
});
await check('all new controls and errors have natural Hungarian translations',async()=>{
 environment();const locale=createStudioLanguage({request:async()=>({language:'en'})});await locale.setAccount('appearance-fixture');locale.apply('hu');for(const [en,hu]of Object.entries(APPEARANCE_HU))assert.equal(tr(en),hu);locale.apply('en');
});
console.log(JSON.stringify({passed:checks.length,checks}));
}finally{for(const win of windows)await win.happyDOM.close();}
