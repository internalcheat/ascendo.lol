import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
import {normalizeProfile} from '../profile-schema.mjs';
import {preserveVisualGroups} from '../visual-schema.mjs';
import {EXPRESSION_GROUPS} from '../expression-schema.mjs';
import {renderProfile} from '../profile-view.mjs';
import {createExpressionEditor} from '../editor-expression.mjs';
import {createProfileExpression} from '../profile-expression.mjs';
import {createStudioLanguage,tr} from '../studio-i18n.mjs';
import {EXPRESSION_HU} from '../expression-hu.mjs';
import {plainBio} from '../share-policy.mjs';
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats,checks=[],windows=[];
const check=async(name,run)=>{await run();checks.push(name);};
const enabled=()=>normalizeProfile({...seed,bio:'**Bold** *italic* __underlined__\n> A quote\n[**safe link**](https://ascendo.lol/)',socialStyle:{enabled:true,layout:'icons',surface:'outline'},detailColors:{enabled:true,name:'#12ABCD',icons:'#ffca55',bioLink:'#00bb99'},richBio:{enabled:true,align:'left'},holographic:{enabled:true,finish:'pearl'},musicReactive:{enabled:true,style:'equalizer'},signature:{enabled:true,mode:'draw',paths:[[[0,50],[500,120],[1000,50]]]}});
function environment(){
 const win=new Window({url:'https://ascendo.lol/customize/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
 win.document.write(fs.readFileSync('customize/index.html','utf8'));win.document.close();windows.push(win);globalThis.document=win.document;globalThis.window=win;
 const queries=new Map();win.matchMedia=query=>{if(!queries.has(query)){const m=new win.EventTarget();m.matches=false;queries.set(query,m);}return queries.get(query);};
 const frames=new Map();let serial=0;win.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};win.cancelAnimationFrame=id=>frames.delete(id);
 const context={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},closePath(){},setTransform(){}};
 win.HTMLCanvasElement.prototype.getContext=()=>context;
 const panel=win.document.getElementById('previewCard'),video=win.document.getElementById('previewVideo');return {win,panel,video,frames,context};
}
try{
await check('six style groups default OFF, validate independently and preserve omitted old-client settings',()=>{
 const baseline=normalizeProfile(seed);for(const key of EXPRESSION_GROUPS)assert.equal(baseline[key].enabled,false);
 const saved=enabled(),legacy={...seed};const result=normalizeProfile(preserveVisualGroups(legacy,saved));for(const key of EXPRESSION_GROUPS)assert.deepEqual(result[key],saved[key]);
 const off=normalizeProfile({...saved,holographic:{...saved.holographic,enabled:false}});assert.equal(off.signature.enabled,true);assert.equal(off.holographic.finish,'pearl');assert.equal(off.detailColors.name,'#12abcd');
});
await check('server-shared validation rejects CSS, markup paths, giant signatures, nonfinite numbers and forged group fields',()=>{
 for(const change of [{socialStyle:{enabled:1}},{socialStyle:{layout:'html'}},{socialStyle:{radius:41}},{socialStyle:{iconSize:15}},{detailColors:{name:'red'}},{detailColors:{script:'evil'}},{holographic:{finish:'url(evil)'}},{musicReactive:{intensity:Infinity}},{musicReactive:{smoothing:96}},{signature:{paths:'<svg>'}},{signature:{paths:[[[0,0],[1001,20]]]}},{signature:{paths:Array(13).fill([[0,0],[1,1]])}},{signature:{paths:[Array(401).fill([0,0])]}},{signature:{paths:[[[0,0],[1,NaN]]]}},{signature:{text:'x'.repeat(49)}},{richBio:{align:'justify;display:none'}}])assert.throws(()=>normalizeProfile({...seed,...change}));
});
await check('rich bios safely format links, emphasis, underline and quotes while plain profiles retain original text',()=>{
 const {panel}=environment();renderProfile(panel,enabled());assert.ok(panel.querySelector('.profile__bio strong'));assert.ok(panel.querySelector('.profile__bio em'));assert.ok(panel.querySelector('.profile__bio u'));assert.ok(panel.querySelector('blockquote'));assert.equal(panel.querySelector('.profile__bio a').rel,'noopener noreferrer');
 renderProfile(panel,{...enabled(),bio:'<img src=x onerror=alert(1)> [bad](javascript:alert) **safe**'});assert.equal(panel.querySelector('.profile__bio img'),null);assert.equal(panel.querySelector('.profile__bio a'),null);
 renderProfile(panel,{...enabled(),richBio:{enabled:false},bio:'**unchanged**'});assert.equal(panel.querySelector('.profile__bio strong'),null);assert.equal(panel.querySelector('.profile__bio').textContent,'**unchanged**');
 renderProfile(panel,{...enabled(),bio:'***bold and italic***'});assert.equal(panel.querySelector('.profile__bio strong em').textContent,'bold and italic');
 assert.equal(plainBio('**Hello** __world__\n> [friend](https://ascendo.lol/)'),'Hello world friend');
});
await check('social actions, local masks, independent colors and signatures survive rendering and return to Auto cleanly',()=>{
 const {panel}=environment(),config=enabled();renderProfile(panel,config);
 assert.equal(panel.dataset.socialStyle,'icons');assert.equal(panel.querySelector('[data-copy]').dataset.copy,'internalcheats');assert.equal(panel.style.getPropertyValue('--detail-name'),'#12abcd');assert.ok(panel.querySelector('.social-link__symbol').hasAttribute('data-local-mark'));assert.ok(panel.querySelector('.profile-signature svg'));
 const signature=panel.querySelector('.profile-signature');renderProfile(panel,{...config,glow:22});assert.equal(panel.querySelector('.profile-signature'),signature);
 renderProfile(panel,{...config,socialStyle:{...config.socialStyle,enabled:false},detailColors:{...config.detailColors,enabled:false},signature:{...config.signature,enabled:false}});assert.equal(panel.dataset.socialStyle,'default');assert.equal(panel.style.getPropertyValue('--detail-name'),'');assert.equal(panel.hasAttribute('data-color-name'),false);assert.equal(panel.querySelector('.profile-signature'),null);
});
await check('editor round-trips all settings privately; toggles retain other groups and rich formatting remains text-only',()=>{
 const {win}=environment();let changes=0;const editor=createExpressionEditor({onChange:()=>changes++});const config=enabled();editor.fill(config);
 for(const key of EXPRESSION_GROUPS)assert.deepEqual(normalizeProfile({...seed,...editor.collect()})[key],config[key]);
 document.getElementById('holographicEnabled').checked=false;editor.updateControls();assert.equal(document.getElementById('holographicFinish').disabled,true);assert.equal(editor.collect().signature.enabled,true);assert.equal(editor.collect().holographic.finish,'pearl');
 document.getElementById('detailColorsNameAuto').checked=true;editor.updateControls();assert.equal(document.getElementById('detailColorsName').disabled,true);assert.equal(editor.collect().detailColors.name,null);
 const bio=document.getElementById('bio');bio.value='hello';bio.setSelectionRange(0,5);[...document.querySelectorAll('.bio-format-tools button')].find(b=>b.textContent==='Bold').click();assert.equal(bio.value,'**hello**');assert.equal(changes,1);
 document.getElementById('richBioEnabled').checked=false;editor.updateControls();assert.equal(bio.disabled,false);assert.equal(document.querySelector('.bio-format-tools button').disabled,true);assert.equal(win.sessionStorage.length,0);
});
await check('runtime uses independent surfaces, settles with no idle loop, respects reduced motion and cleans up',()=>{
 const {win,panel,video,frames}=environment(),config=enabled();renderProfile(panel,config);const runtime=createProfileExpression(panel,{scope:panel.parentElement,video});runtime.update(config);assert.equal(panel.querySelectorAll('.holo-finish').length,1);assert.equal(panel.querySelectorAll('.profile-music-visual').length,1);
 for(let turn=0;turn<5;turn++){const queued=[...frames.values()];frames.clear();for(const fn of queued)fn(turn*16);}assert.equal(frames.size,0);
 win.matchMedia('(prefers-reduced-motion: reduce)').matches=true;win.matchMedia('(prefers-reduced-motion: reduce)').dispatchEvent(new win.Event('change'));assert.equal(frames.size,0);
 runtime.update({...config,holographic:{...config.holographic,enabled:false},musicReactive:{...config.musicReactive,enabled:false}});assert.equal(panel.querySelector('.holo-finish'),null);assert.equal(panel.querySelector('.profile-music-visual'),null);runtime.destroy();assert.equal(frames.size,0);
});
await check('music analysis observes captured audio without rerouting media or changing playback, volume or sources',async()=>{
 const {win,panel,video,frames}=environment();let captures=0,contexts=0,reads=0,stops=0;
 Object.defineProperty(video,'paused',{value:false,configurable:true});Object.defineProperty(video,'readyState',{value:4,configurable:true});video.muted=false;video.volume=.5;video.src='https://ascendo.lol/test.mp4';
 const track={stop:()=>stops++};video.captureStream=()=>{captures++;return {getAudioTracks:()=>[track],getTracks:()=>[track]};};win.MediaStream=class{constructor(tracks){this.tracks=tracks;}};
 win.AudioContext=class{constructor(){contexts++;this.state='running';}async resume(){}async close(){}async suspend(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {frequencyBinCount:256,getByteFrequencyData(array){reads++;array.fill(130);},getByteTimeDomainData(array){array.fill(160);}};}createMediaElementSource(){throw Error('Must not reroute media');}};
 const config=enabled();renderProfile(panel,config);const runtime=createProfileExpression(panel,{scope:panel.parentElement,video});runtime.update(config);assert.equal(contexts,0);document.dispatchEvent(new win.Event('pointerdown'));for(let i=0;i<4;i++)await Promise.resolve();
 for(const fn of [...frames.values()]){frames.clear();fn(100);}assert.equal(captures,1);assert.equal(contexts,1);assert.ok(reads>0);assert.equal(video.volume,.5);assert.equal(video.paused,false);assert.equal(video.src,'https://ascendo.lol/test.mp4');
 runtime.update({...config,musicReactive:{...config.musicReactive,enabled:false}});assert.equal(stops,1);runtime.destroy();
});
await check('every new editor label, option and error has Hungarian coverage without translating user content',async()=>{
 environment();const editor=createExpressionEditor({onChange(){}});editor.fill(enabled());const locale=createStudioLanguage({request:async()=>({language:'en'})});await locale.setAccount('expression-fixture');locale.apply('hu');
 for(const [en,hu]of Object.entries(EXPRESSION_HU))assert.equal(tr(en),hu,en);
 assert.equal(document.getElementById('signatureMode').selectedOptions[0].textContent,'Rajzolt aláírás');locale.apply('en');
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{for(const win of windows)await win.happyDOM.close();}
