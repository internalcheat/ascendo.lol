import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {normalizeProfile} from '../profile-schema.mjs';
import {preserveVisualGroups,FONTS,LAYOUTS,TEXT_SIZES,OVERLAY_PRESETS} from '../visual-schema.mjs';
import {ENTRY_SOUNDS,FEATURE_GROUPS,parseEmbedUrl,embedSource} from '../feature-schema.mjs';
import {renderProfile} from '../profile-view.mjs';
import {createProfileAdditions} from '../profile-additions.mjs';
import {createAdditionalEditor} from '../editor-additions.mjs';
import {createProfileEffects} from '../profile-effects.mjs';
import {createOverlayParticles} from '../overlay-particles.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const seed=JSON.parse(read('supabase/seed-profiles.json')).internalcheats;
const windows=[],checks=[];
async function check(label,run){await run();checks.push(label);}
function environment(reduced=false){
  const win=new Window({url:'https://ascendo.lol/internalcheats/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(win);
  win.document.write(read('internalcheats/index.html'));win.document.close();
  const preferences=new Map();win.matchMedia=query=>{if(!preferences.has(query)){const value=new win.EventTarget();value.matches=query.includes('reduced')?reduced:false;preferences.set(query,value);}return preferences.get(query);};
  win.HTMLMediaElement.prototype.play=function(){this.__paused=false;return Promise.resolve();};win.HTMLMediaElement.prototype.pause=function(){this.__paused=true;};win.HTMLMediaElement.prototype.load=function(){};
  globalThis.document=win.document;return {win,doc:win.document,panel:win.document.querySelector('.profile__panel'),scope:win.document.body};
}
const config=extra=>normalizeProfile({...seed,...extra});
const fixture={
  soundtrackCard:{enabled:true},
  widgets:{game:{enabled:true,game:'VALORANT',rows:[{label:'Sensitivity',value:'0.32 / 800 DPI'},{label:'Crosshair',value:'0;s;1;P;c;5',copy:true}]},hardware:{enabled:true,rows:[{label:'Mouse',value:'Lightweight wireless'},{label:'PC',value:'Long hardware description '.repeat(8)}]},about:{enabled:true,text:'A little about me.\nSecond line.',rows:[{label:'Languages',value:'Magyar / English'}]},embeds:{enabled:true,items:[{id:'spotify',url:'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',title:'My playlist',showTracks:true},{id:'youtube',url:'https://youtu.be/dQw4w9WgXcQ'},{id:'apple',url:'https://music.apple.com/us/album/test/123456789?i=123456790'},{id:'twitch',url:'https://www.twitch.tv/monstercat'}]}}
};

try{
await check('new groups are independently disabled and omitted groups preserve saved values',()=>{
  const initial=config({});for(const name of ['soundtrackCard','enterScreen','pageTitle'])assert.equal(initial[name].enabled,false);for(const value of Object.values(initial.widgets))assert.equal(value.enabled,false);
  const enabled=config({...fixture,enterScreen:{enabled:true,subtitle:'Welcome'},pageTitle:{enabled:true,lines:['Hello']}}),legacy={...seed};
  const result=config(preserveVisualGroups(legacy,enabled));for(const key of FEATURE_GROUPS)assert.deepEqual(result[key],enabled[key]);
  const off=config({...enabled,soundtrackCard:{enabled:false}});assert.equal(off.widgets.game.enabled,true);assert.equal(off.enterScreen.enabled,true);assert.equal(off.background.url,seed.background.url);
});
await check('shared validation rejects malformed values, out-of-range controls and injected markup',()=>{
  for(const extra of [{soundtrackCard:{enabled:'yes'}},{enterScreen:{sound:'evil'}},{enterScreen:{volume:101}},{enterScreen:{title:'x'.repeat(101)}},{pageTitle:{lines:Array(9).fill('x')}},{pageTitle:{speed:39}},{pageTitle:{effect:'script'}},{widgets:{game:{rows:Array(13).fill({label:'x',value:'x'})}}},{widgets:{about:{text:'x'.repeat(1201)}}},{widgets:{embeds:{items:[{id:'x',url:'javascript:alert(1)'}]}}},{widgets:{embeds:{items:[{id:'x',url:'https://youtu.be/dQw4w9WgXcQ',provider:'spotify'}]}}},{widgets:{embeds:{items:[{id:'x'},{id:'x'}]}}},{typography:{display:'url(evil)'}},{cardLayout:'<script>'}])assert.throws(()=>config(extra));
});
await check('embed allowlist canonicalizes provider links and never accepts arbitrary iframe sources',()=>{
  const pairs=[['https://open.spotify.com/intl-hu/album/37i9dQZF1DXcBWIGoYBM5M?si=x','spotify'],['https://www.youtube.com/watch?v=dQw4w9WgXcQ','youtube'],['https://www.youtube.com/playlist?list=PLabcdefghijk12345','youtube'],['https://music.apple.com/hu/playlist/chill/pl.abc123','apple'],['https://www.twitch.tv/videos/1234567','twitch']];
  for(const [url,provider]of pairs){const media=parseEmbedUrl(url);assert.equal(media.provider,provider);assert.match(embedSource(media),/^https:\/\//);}
  for(const url of ['https://open.spotify.com.evil.test/track/37i9dQZF1DXcBWIGoYBM5M','https://evil.test/youtube','https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ','http://youtu.be/dQw4w9WgXcQ','https://www.twitch.tv:444/test','data:text/html,evil','<iframe src=x>'])assert.throws(()=>parseEmbedUrl(url));
  const twitch=embedSource(parseEmbedUrl('https://twitch.tv/testchannel'),{parent:'evil.test'});assert.match(twitch,/parent=ascendo.lol/);assert.match(twitch,/autoplay=false/);
});
await check('Soundtrack removes cleanly while optional widgets and native players retain their DOM',()=>{
  const {panel}=environment();const enabled=config(fixture);renderProfile(panel,enabled);assert.equal(panel.querySelectorAll('.now-playing').length,1);assert.equal(panel.querySelectorAll('.profile-widget').length,7);
  const frame=panel.querySelector('iframe'),avatar=panel.querySelector('.avatar');assert.equal(frame.height,'352');assert.equal(frame.loading,'lazy');assert.equal(frame.referrerPolicy,'strict-origin-when-cross-origin');
  renderProfile(panel,{...enabled,bio:'An unrelated change'});assert.equal(panel.querySelector('iframe'),frame);assert.equal(panel.querySelector('.avatar'),avatar);
  renderProfile(panel,{...enabled,soundtrackCard:{enabled:false}});assert.equal(panel.querySelector('.now-playing'),null);assert.equal(panel.querySelector('iframe'),frame);assert.equal(panel.querySelector('[data-widget-kind=game] [data-copy]').dataset.copy,'0;s;1;P;c;5');
  renderProfile(panel,seed);assert.equal(panel.querySelector('iframe'),null);assert.equal(panel.querySelector('.profile-widget'),null);assert.equal(panel.querySelector('.now-playing'),null);
});
await check('all 12 layouts and 38 fonts render maximum settings without losing controls or media',()=>{
  const {panel,scope,win}=environment();let time=0,serial=0;const frames=new Map();win.requestAnimationFrame=run=>{frames.set(++serial,run);return serial;};win.cancelAnimationFrame=id=>frames.delete(id);
  const effects=createProfileEffects(panel,{scope});const values=config({...fixture,name:'VeryLongName'.repeat(3),bio:'Long biography '.repeat(70),socials:Array.from({length:16},(_,index)=>({...seed.socials[0],handle:'Long social handle '.repeat(4),label:'Link '+index})),typography:{sizes:Object.fromEntries(Object.entries(TEXT_SIZES).map(([id,[,max]])=>[id,max]))}});
  for(const layout of LAYOUTS)for(const font of Object.keys(FONTS)){const next=config({...values,cardLayout:layout,typography:{...values.typography,display:font,body:font}});renderProfile(panel,next);effects.update(next);assert.equal(panel.dataset.layout,layout);assert.equal(panel.querySelectorAll('.social-link').length,16);assert.equal(panel.querySelectorAll('.profile-widget').length,7);assert.equal(panel.querySelectorAll('h1').length,1);assert.equal(panel.querySelectorAll('iframe').length,3);assert.equal(panel.querySelectorAll('.profile-tile-boundary .profile-tile-boundary').length,0);assert.equal(panel.style.getPropertyValue('--size-name'),'72px');time++;}
  effects.destroy();assert.equal(LAYOUTS.length,12);assert.equal(Object.keys(FONTS).length,38);assert.ok(time===456);
});
await check('enter screen gates only the chosen profile, preserves media and restores controls',async()=>{
  const {panel,scope,win,doc}=environment();renderProfile(panel,config(fixture));const video=doc.getElementById('musicBackground'),controller=createProfileAdditions(scope,panel);
  const options=config({...fixture,enterScreen:{enabled:true,title:'Welcome inside',subtitle:'A second line',soundEnabled:true,sound:'glass'}});controller.update(options);assert.equal(controller.isGated(),true);assert.equal(video.dataset.entryBlocked,'true');assert.equal(doc.querySelector('.profile-enter-subtitle').textContent,'A second line');assert.equal(doc.querySelector('.profile').inert,true);assert.equal(panel.querySelector('iframe').hasAttribute('src'),false);
  doc.querySelector('.profile-enter-button').click();assert.equal(controller.isGated(),false);assert.equal(video.dataset.entryBlocked,'false');assert.equal(doc.querySelector('.profile').inert,false);assert.ok(panel.querySelector('iframe').getAttribute('src'));assert.equal(doc.activeElement,panel.querySelector('h1'));
  controller.replayEntry();controller.update(config({...options,enterScreen:{enabled:false}}));assert.equal(controller.isGated(),false);assert.ok(panel.querySelector('iframe').getAttribute('src'));assert.equal(scope.classList.contains('profile-entry-active'),false);controller.destroy();assert.equal(doc.querySelector('.profile-enter-screen'),null);
});
await check('private title and entrance previews never affect editor tab or replay on unrelated edits',()=>{
  const {panel,win,doc}=environment();const scope=doc.createElement('div');scope.className='preview-card';panel.before(scope);scope.append(panel);const originalTitle=doc.title;const controller=createProfileAdditions(scope,panel,{preview:true});
  const value=config({pageTitle:{enabled:true,lines:['A private title'],effect:'scroll'},enterScreen:{enabled:true,title:'Enter'}});controller.update(value);assert.equal(doc.title,originalTitle);assert.equal(controller.isGated(),true);controller.enter({quiet:true});controller.update({...value,bio:'Unrelated'});assert.equal(controller.isGated(),false);controller.update({...value,enterScreen:{...value.enterScreen,subtitle:'New line'}});assert.equal(controller.isGated(),true);assert.ok(doc.querySelector('.profile-title-preview').textContent.length);controller.destroy();
});
await check('reduced-motion titles remain static and offscreen/title timers resume safely',()=>{
  const {panel,scope,win,doc}=environment(true),controller=createProfileAdditions(scope,panel);const value=config({pageTitle:{enabled:true,lines:['Static first','Second'],effect:'typewriter'}});controller.update(value);assert.equal(doc.title,'Static first');Object.defineProperty(doc,'hidden',{value:true,configurable:true});doc.dispatchEvent(new win.Event('visibilitychange'));Object.defineProperty(doc,'hidden',{value:false,configurable:true});doc.dispatchEvent(new win.Event('visibilitychange'));assert.equal(doc.title,'Static first');controller.update(config({}));assert.equal(doc.title,'InternalCheats | Ascendo');controller.destroy();
});
await check('empty enabled overlays receive a visible starter and all preset renderers draw bounded decorations',()=>{
  assert.equal(config({overlays:{enabled:true}}).overlays.layers[0].preset,'snow');assert.equal(config({}).overlays.layers.length,0);
  let draws=0;const noop=()=>{},context=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(target,key)=>key in target?target[key]:()=>{draws++;},set:(target,key,value)=>{target[key]=value;return true;}});const engine=createOverlayParticles({width:1280,height:720,getContext:()=>context});
  for(const preset of OVERLAY_PRESETS){draws=0;engine.draw([{preset,enabled:true,opacity:35,density:35,speed:1,colorMode:'original',color:'#c19aff'}],4000,'#c19aff',128);assert.ok(draws>0,preset);}engine.destroy();assert.match(read('profile-visual.css'),/\.page--profile \.profile-atmosphere \{ position: fixed; z-index: 0/);
});
await check('six original PCM sounds and every new font verify against provenance hashes',()=>{
  const sounds=JSON.parse(read('assets/entry-sounds/SOURCES.json'));assert.equal(Object.keys(ENTRY_SOUNDS).length,6);
  for(const id of Object.keys(ENTRY_SOUNDS)){const data=fs.readFileSync(new URL(`../assets/entry-sounds/${id}.wav`,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.equal(data.readUInt16LE(20),1);assert.equal(data.readUInt16LE(22),1);assert.equal(data.readUInt32LE(24),44100);let peak=0;for(let index=44;index<data.length;index+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(index)));assert.ok(peak>1000&&peak<32767);}
  const families=JSON.parse(read('assets/fonts/SOURCES-EXPANSION.json'));assert.equal(families.length,30);let count=0;for(const family of families){assert.ok(read(`assets/fonts/${family.id}-LICENSE.txt`).includes('FONT LICENSE'));for(const file of family.files){const data=fs.readFileSync(new URL('../assets/fonts/'+file.file,import.meta.url));assert.equal(data.subarray(0,4).toString(),'wOF2');assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);count++;}}assert.equal(count,100);assert.doesNotMatch(read('fonts.css'),/https?:\/\//);assert.ok(sounds);
});
await check('editor controls retain independent values, disabled sections and rearrange widget fields',()=>{
  const {doc,win}=environment();doc.body.innerHTML='<div id="controlsPanel"></div>';let changes=0;const editor=createAdditionalEditor({onChange:()=>changes++,isBusy:()=>false,previewSound(){},replayEntry(){},replayTitle(){}});const value=config(fixture);editor.fill(value);assert.deepEqual(config({...seed,...editor.collect()}).widgets,value.widgets);assert.equal(doc.getElementById('enterTitle').disabled,true);doc.getElementById('enterEnabled').checked=true;doc.getElementById('enterSubtitle').value='Hello';editor.updateControls();assert.equal(doc.getElementById('enterTitle').disabled,false);assert.equal(doc.getElementById('enterVolume').disabled,true);doc.getElementById('gameWidgetRows').querySelector('[data-row-move="1"]').click();assert.equal(editor.collect().widgets.game.rows[0].label,'Crosshair');assert.equal(changes,1);doc.getElementById('hardwareWidgetEnabled').checked=false;editor.updateControls();assert.equal(editor.collect().widgets.hardware.rows[0].value,'Lightweight wireless');assert.equal(editor.collect().widgets.game.enabled,true);assert.equal(editor.collect().enterScreen.subtitle,'Hello');
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{for(const win of windows)await win.happyDOM.close();}
