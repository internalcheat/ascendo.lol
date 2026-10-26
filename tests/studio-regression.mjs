import {EXPRESSION_GROUPS} from '../expression-schema.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Window } from 'happy-dom';
import { normalizeProfile, safeUrl, EFFECTS, profileMedia } from '../profile-schema.mjs';
import { renderProfile, bindMusic, replayNameEffect, bindNameEffectVisibility } from '../profile-view.mjs';
import { containsReservedBadge, badgeError, RESERVED_BADGES, RESERVED_BADGE_ERROR } from '../badge-policy.mjs';
import { confusables } from '../vendor/unicode-confusables-18.mjs';
import { createProfileEffects, nativeCursor } from '../profile-effects.mjs';
import { preserveVisualGroups, FONTS, TEXT_SIZES, LAYOUTS, OVERLAY_PRESETS, MEDIA_ORIGIN } from '../visual-schema.mjs';
import { hasH264Track } from '../supabase/functions/profile-api/overlay-video.mjs';
import { createOverlayParticles } from '../overlay-particles.mjs';
import { badgeCapabilities } from '../supabase/functions/profile-api/badge-authority.mjs';
import { transform,build } from 'esbuild';
const appBundle=async()=> (await build({entryPoints:['app.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;

const root=path.resolve('.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const seeds=JSON.parse(read('supabase/seed-profiles.json'));
const checks=[];
const check=async(name,callback)=>{await callback();checks.push(name);};
const windows=[];
function environment(file='internalcheats/index.html',reduced=false){
  const window=new Window({url:`https://ascendo.lol/${file.replace('index.html','')}`,settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
  windows.push(window);
  window.document.write(read(file));
  window.document.close();
  const preferences=new Map();
  window.matchMedia=query=>{if(!preferences.has(query)){const item=new window.EventTarget();item.matches=query.includes('reduced')?reduced:false;preferences.set(query,item);}return preferences.get(query);};
  Object.defineProperty(window.HTMLMediaElement.prototype,'paused',{get(){return this.__paused!==false;},configurable:true});
  window.HTMLMediaElement.prototype.play=function(){this.__paused=false;this.dispatchEvent(new window.Event('playing'));return Promise.resolve();};
  window.HTMLMediaElement.prototype.pause=function(){this.__paused=true;this.dispatchEvent(new window.Event('pause'));};
  window.HTMLMediaElement.prototype.load=function(){};
  window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);
  window.cancelAnimationFrame=clearTimeout;
  window.confirm=()=>true;
  return window;
}
const flush=async()=>{for(let count=0;count<10;count++)await new Promise(resolve=>setTimeout(resolve,0));};

try{
  await check('Flux Lines validates explicitly while old backgrounds and defaults stay intact',()=>{
    const config=normalizeProfile({...seeds.internalcheats,background:{kind:'preset',preset:'flux-lines',url:'',mobile:'',poster:''}});
    assert.equal(config.background.preset,'flux-lines');assert.equal(normalizeProfile(seeds.internalcheats).background.kind,'video');
    for(const preset of ['',undefined,'Flux Lines','https://example.com','<script>'])assert.throws(()=>normalizeProfile({...config,background:{...config.background,preset}}));
    const friend=normalizeProfile(JSON.parse(read('supabase/szikraaaa-profile.json')));assert.equal(friend.name,'Szikraaaa');assert.equal(friend.background.preset,'flux-lines');assert.equal(friend.socials.length,0);assert.equal(friend.bio,'');assert.equal(friend.badge,'');assert.equal(friend.cursorEffects.enabled,false);assert.equal(friend.cardEffects.enabled,false);assert.equal(friend.electricBorder.enabled,false);
    const window=environment('Szikraaaa/index.html');assert.equal(window.document.body.dataset.person,'szikraaaa');assert.equal(window.document.querySelector('[rel=canonical]').href,'https://ascendo.lol/Szikraaaa/');assert.equal(window.document.getElementById('musicBackground').dataset.backgroundKind,JSON.parse(window.document.getElementById('profileBootstrap').textContent).config.background.kind);assert.doesNotMatch(read('index.html'),/Szikraaaa|szikraaaa/);
  });
  await check('Flux Lines controller is opt-in, reduced-motion safe and cleans up pending selection',async()=>{
    const window=environment('Szikraaaa/index.html',true);globalThis.document=window.document;const {createProfileBackground}=await import('../profile-background.mjs');
    const stage=document.querySelector('.video-stage');const messages=[];const control=createProfileBackground(stage,{onStatus:message=>messages.push(message)});control.update(normalizeProfile(seeds.internalcheats));assert.equal(stage.querySelector('.profile-background-preset').hidden,true);
    const flux=normalizeProfile(JSON.parse(read('supabase/szikraaaa-profile.json')));control.update(flux);assert.equal(stage.dataset.preset,'flux-lines');assert.equal(stage.querySelector('.profile-background-preset').hidden,false);assert.match(messages.at(-1),/Still preview/);assert.equal(stage.querySelectorAll('canvas').length,0);assert.equal(document.querySelectorAll('link[href*="vendor/flux-lines"]').length,0);
    control.update(normalizeProfile(seeds.internalcheats));assert.equal(stage.querySelector('.profile-background-preset').hidden,true);control.destroy();assert.equal(stage.querySelector('.profile-background-preset'),null);
    const provenance=JSON.parse(read('vendor/react-bits/SOURCES.json'));assert.equal(provenance.revision,'e12c22192ac7b4b452c5e2feb9b586d74765d696');assert.match(read('vendor/react-bits/LICENSE.md'),/Commons Clause/);assert.match(read('vendor/react-bits/FluxLines.runtime.jsx'),/onContextLost/);assert.match(read('vendor/react-bits/FluxLines.jsx'),/const FRAGMENT/);assert.match(read('flux-island.jsx'),/\.\.\.LOOK/);
  });


  await check('visual groups default safely, reject malformed input and protect old-client saves',()=>{
    const plain=normalizeProfile(seeds.internalcheats);assert.equal(plain.cardLayout,'classic');assert.equal(plain.typography.display,'dm-sans');assert.equal(plain.electricBorder.enabled,false);assert.equal(plain.overlays.enabled,false);assert.ok(Object.values(plain.typography.sizes).every(value=>value===null));
    for(const overrides of [{typography:null},{typography:{display:'url(evil)'}},{typography:{body:'<style>'}},{typography:{sizes:{name:73}}},{typography:{sizes:{bio:11}}},{typography:{sizes:{name:'50'}}},{cardLayout:'evil'},{electricBorder:{enabled:1}},{electricBorder:{color:'red'}},{electricBorder:{intensity:101}},{electricBorder:{speed:0}},{overlays:{layers:Array(4).fill({preset:'snow'})}},{overlays:{layers:[{preset:'snow'},{preset:'snow'}]}},{overlays:{layers:[{preset:'unknown'}]}},{overlays:{layers:[{preset:'rain',colorMode:'css'}]}},{overlays:{media:{url:'https://example.com/overlay.png'}}},{overlays:{media:{key:{tolerance:101}}}}])assert.throws(()=>normalizeProfile({...plain,...overrides}),JSON.stringify(overrides));
    const customized=normalizeProfile({...plain,typography:{display:'cinzel',body:'outfit',sizes:{name:72}},cardLayout:'bento',electricBorder:{enabled:true},overlays:{enabled:true,layers:[{preset:'snow'},{preset:'petals'},{preset:'fireflies'}]}});
    const merged=normalizeProfile(preserveVisualGroups({...seeds.internalcheats,name:'Legacy edit'},customized));for(const field of ['typography','cardLayout','electricBorder','overlays'])assert.deepEqual(merged[field],customized[field]);
    const cleared=normalizeProfile({...customized,electricBorder:{...customized.electricBorder,enabled:false},overlays:{...customized.overlays,enabled:false}});assert.deepEqual(cleared.overlays.layers,customized.overlays.layers);assert.equal(cleared.typography.display,'cinzel');
  });
  await check('all font/layout combinations retain content, semantic actions, heading and avatar identity',()=>{
    const window=environment();globalThis.document=window.document;const panel=document.querySelector('.profile__panel');
    const config=normalizeProfile({...seeds.internalcheats,name:'A'.repeat(40),badge:'Founder',bio:'[A safe link](https://example.com/)',socials:Array.from({length:16},(_,index)=>({...seeds.internalcheats.socials[0],label:'Platform '+index,handle:'Long handle '+index}))});
    renderProfile(panel,config);const name=panel.querySelector('h1'),avatar=panel.querySelector('.avatar');
    for(const layout of LAYOUTS)for(const font of Object.keys(FONTS)){
      renderProfile(panel,{...config,cardLayout:layout,typography:{display:font,body:font,sizes:Object.fromEntries(Object.entries(TEXT_SIZES).map(([id,[,maximum]])=>[id,maximum]))}});
      assert.equal(panel.querySelector('h1'),name);assert.equal(panel.querySelector('.avatar'),avatar);assert.equal(panel.dataset.layout,layout);assert.equal(panel.querySelectorAll('.social-link').length,16);assert.equal(panel.querySelectorAll('h1').length,1);assert.equal(panel.querySelector('.profile__bio a').rel,'noopener noreferrer');assert.equal(panel.style.getPropertyValue('--size-name'),'72px');assert.match(panel.style.getPropertyValue('--body-font'),new RegExp(FONTS[font]));
    }
    renderProfile(panel,{...config,bio:'',badge:''});assert.equal(panel.querySelector('.profile__bio'),null);assert.equal(panel.querySelector('.profile-badge'),null);
  });
  await check('font assets are valid local WOFF2 with licenses and no Google network references',()=>{
    const css=read('fonts.css');assert.equal((css.match(/@font-face/g)||[]).length,116);assert.equal((css.match(/font-display: swap/g)||[]).length,116);
    assert.equal(Object.keys(FONTS).length,38); for(const file of fs.readdirSync(path.join(root,'assets/fonts')).filter(f=>f.endsWith('.woff2')))assert.equal(fs.readFileSync(path.join(root,'assets/fonts',file)).subarray(0,4).toString(),'wOF2');for(const id of Object.keys(FONTS))assert.match(read(`assets/fonts/${id}-LICENSE.txt`),/OPEN FONT LICENSE/i);
    for(const file of ['index.html','404.html','plugins/index.html','internalcheats/index.html','k3rlsen/index.html','bal4zs/index.html','login/index.html','customize/index.html','nagyorru/index.html']){assert.doesNotMatch(read(file),/fonts\.googleapis|fonts\.gstatic/);assert.match(read(file),/\/fonts.css\?v=/);}
  });
  await check('overlay files remain referenced when disabled and unsupported MP4 codecs are rejected',()=>{
    const url=MEDIA_ORIGIN+'11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.mp4';
    const config=normalizeProfile({...seeds.internalcheats,overlays:{enabled:false,media:{kind:'video',url,poster:url.replace('.mp4','.webp')}}});
    const schemaSource=read('profile-schema.mjs');assert.match(schemaSource,/profile\.overlays\?\.media\?\.url/);assert.match(schemaSource,/profile\.overlays\?\.media\?\.poster/);assert.equal(config.overlays.media.url,url);
    const box=(type,...parts)=>{const body=Buffer.concat(parts),header=Buffer.alloc(8);header.writeUInt32BE(body.length+8);header.write(type,4);return Buffer.concat([header,body]);};
    const fixture=codec=>box('moov',box('trak',box('mdia',box('hdlr',Buffer.alloc(8),Buffer.from('vide'),Buffer.alloc(12)),box('minf',box('stbl',box('stsd',Buffer.alloc(8),box(codec,Buffer.alloc(78))))))));
    assert.equal(hasH264Track(fixture('avc1')),true);assert.equal(hasH264Track(fixture('avc3')),true);assert.equal(hasH264Track(fixture('hvc1')),false);assert.equal(hasH264Track(Buffer.from('not a movie')),false);
  });
  await check('all fifteen overlay renderers use bounded particle counts without pixel-reading loops',()=>{
    let draws=0;const noop=()=>{};const context=new Proxy({createRadialGradient:()=>({addColorStop:noop}),arc:()=>draws++,ellipse:()=>draws++,fillRect:noop,fillText:noop},{get:(target,key)=>key in target?target[key]:noop,set:(target,key,value)=>{target[key]=value;return true;}});
    const engine=createOverlayParticles({width:1280,height:720,getContext:()=>context});
    for(const preset of OVERLAY_PRESETS)engine.draw([{preset,enabled:true,opacity:35,density:100,speed:1,colorMode:'original',color:'#c19aff'}],4000,'#c19aff',128);
    draws=0;engine.draw(['snow','snow','snow'].map(preset=>({preset,enabled:true,opacity:35,density:100,speed:1,colorMode:'custom',color:'#ffffff'})),5000,'#c19aff',128);assert.ok(draws<=128);engine.destroy();assert.doesNotMatch(read('chroma-key.mjs'),/getImageData|readPixels|putImageData/);
  });
  await check('all selected upload ownership is checked before any media is copied',async()=>{
    const owner='11111111-1111-1111-1111-111111111111',avatarPath=owner+'/22222222-2222-2222-2222-222222222222.webp',overlayPath=owner+'/44444444-4444-4444-4444-444444444444.png',foreign='33333333-3333-3333-3333-333333333333/55555555-5555-5555-5555-555555555555.png';
    const own=[{path:avatarPath,state:'ready'},{path:overlayPath,state:'ready'}];let copies=0,published=0;
    const api=read('supabase/functions/profile-api/index.ts');let code=api.slice(api.indexOf('async function publishFiles'),api.indexOf('function validMagic'));code=(await transform(code,{loader:'ts',format:'esm'})).code;
    const context={url:'https://fstdttaxflayhtwhnbih.supabase.co',profileMedia,publicUrl:path=>MEDIA_ORIGIN+path,HttpError:class extends Error{constructor(status,message){super(message);this.status=status;}},command:async operation=>{if(operation==='uploads')return own;if(operation==='published')published++;},admin:{storage:{from:()=>({copy:async()=>{copies++;return {error:null};},remove:async()=>({error:null})})}}};
    vm.createContext(context);vm.runInContext(code+';globalThis.publish=publishFiles',context);
    const invalid=normalizeProfile({...seeds.internalcheats,avatar:{...seeds.internalcheats.avatar,url:MEDIA_ORIGIN+avatarPath},overlays:{media:{kind:'image',url:MEDIA_ORIGIN+foreign}}});
    await assert.rejects(()=>context.publish(owner,invalid),/does not belong/);assert.equal(copies,0);assert.equal(published,0);
    await context.publish(owner,normalizeProfile({...invalid,overlays:{media:{kind:'image',url:MEDIA_ORIGIN+overlayPath}}}));assert.equal(copies,2);assert.equal(published,2);
  });
  await check('electric/Bento geometry, shared frames, reduced motion and unavailable graphics clean up safely',async()=>{
    const window=environment();globalThis.document=window.document;const panel=document.querySelector('.profile__panel'),scope=document.querySelector('.profile');let time=0,serial=0;const frames=new Map();window.requestAnimationFrame=callback=>{frames.set(++serial,callback);return serial;};window.cancelAnimationFrame=id=>frames.delete(id);Object.defineProperty(window.performance,'now',{value:()=>time,configurable:true});
    const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>{target[key]=value;return true;}});window.HTMLCanvasElement.prototype.getContext=function(type){return type==='2d'?context:null;};
    Object.defineProperty(window.HTMLElement.prototype,'offsetWidth',{get(){return this.classList.contains('avatar')?112:300;},configurable:true});Object.defineProperty(window.HTMLElement.prototype,'offsetHeight',{get(){return this.classList.contains('avatar')?112:200;},configurable:true});
    const tick=()=>{time+=20;for(const [id,callback]of [...frames]){frames.delete(id);callback(time);}};
    const config=normalizeProfile({...seeds.internalcheats,soundtrackCard:{enabled:true},cardLayout:'bento',electricBorder:{enabled:true,color:'#44ccff'},overlays:{enabled:true,layers:[{preset:'snow'},{preset:'petals'},{preset:'rain'}]}});renderProfile(panel,config);const effects=createProfileEffects(panel,{scope});effects.update(config);assert.equal(frames.size,1);tick();assert.equal(panel.querySelectorAll('.profile-electric').length,6);assert.ok([...panel.querySelectorAll('.profile-electric path')].some(node=>node.getAttribute('d').length>50));assert.equal(frames.size,1);
    Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(frames.size,0);Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(frames.size,1);
    window.matchMedia('(prefers-reduced-motion: reduce)').matches=true;window.matchMedia('(prefers-reduced-motion: reduce)').dispatchEvent(new window.Event('change'));assert.equal(frames.size,0);
    window.matchMedia('(prefers-reduced-motion: reduce)').matches=false;window.matchMedia('(prefers-reduced-motion: reduce)').dispatchEvent(new window.Event('change'));
    const url=MEDIA_ORIGIN+'11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png';const keyed=normalizeProfile({...config,electricBorder:{enabled:false},overlays:{enabled:true,media:{enabled:true,kind:'image',url,key:{enabled:true}}}});effects.update(keyed);const failed=scope.querySelector('.profile-overlay-media');assert.equal(failed.hidden,true);assert.equal(failed.getAttribute('src'),null);assert.equal(scope.querySelector('.profile-keyed-media').hidden,true);
    effects.update(normalizeProfile({...keyed,overlays:{...keyed.overlays,media:{...keyed.overlays.media,key:{enabled:false}}}}));const plain=scope.querySelector('.profile-overlay-media');plain.dispatchEvent(new window.Event('load'));assert.equal(plain.hidden,false);failed.dispatchEvent(new window.Event('error'));assert.equal(plain.hidden,false);
    const background=window.document.getElementById('musicBackground');await background.play();const video=normalizeProfile({...keyed,overlays:{enabled:true,media:{enabled:true,kind:'video',url:url.replace('.png','.mp4')}}});effects.update(video);const overlay=scope.querySelector('video.profile-overlay-media');assert.equal(overlay.muted,true);assert.equal(overlay.volume,0);assert.equal(background.paused,false);effects.update(normalizeProfile({...video,overlays:{...video.overlays,enabled:false}}));assert.equal(scope.querySelector('video.profile-overlay-media'),null);assert.equal(background.paused,false);effects.destroy();assert.equal(document.querySelectorAll('.profile-electric').length,0);assert.equal(document.querySelector('.profile-atmosphere'),null);assert.equal(frames.size,0);
  });

  await check('every reserved term and bounded obfuscations are blocked; ordinary Unicode stays allowed',()=>{
    const leet={'a':'4','e':'3','i':'1','l':'1','o':'0','s':'5','t':'7','b':'8','g':'9'};
    let assertions=0;
    for(const term of Object.values(RESERVED_BADGES).flat()){
      for(const value of [term,term.toUpperCase(),term.toLowerCase(),`x${term}x`,[...term].join(' '),[...term].join('.'),[...term].join('\u200b'),[...term].join('\u0301'),term.replace(/[aeilostbg]/gi,letter=>leet[letter.toLowerCase()]||letter),[...term].map(letter=>/[a-z]/i.test(letter)?String.fromCharCode(letter.charCodeAt(0)+0xfee0):letter).join('')]){
        if(value.length<=32){assert.equal(containsReservedBadge(value),true,value);assertions++;}
      }
    }
    for(const value of ['Hope','Dog lover','h0p3','Fоundеr','Аdmin','Ꭺdmin','Ꮪtaff','ADM١N','@dmin','f0und3r','adm!n','adm|n','1nterna1cheats','ＣＯ－ＯＷＮＥＲ','a\u2066b','\u202enimda'])assert.equal(badgeError(value),RESERVED_BADGE_ERROR,value);
    for(const value of ['', 'Stargazer','Moonlight','café ☕','🎮💜','猫好き','夏の空','Éclat'])assert.equal(containsReservedBadge(value),false,value);
    for(const term of Object.values(RESERVED_BADGES).flat())assert.equal(badgeError(term,true),'',term);
    assert.equal(badgeError('a\u202eb',true),RESERVED_BADGE_ERROR);
    assert.equal(Object.keys(confusables).length,6712);
    const start=performance.now();for(let count=0;count<1000;count++)containsReservedBadge('1'.repeat(32));assert.ok(performance.now()-start<3000);
    console.log(`Badge variants: ${assertions}`);
  });
  await check('effect groups normalize OFF, validate strictly and retain independent values',()=>{
    const plain=normalizeProfile(seeds.internalcheats);
    for(const group of ['cursorEffects','cardEffects','entranceEffects'])assert.equal(plain[group].enabled,false);
    assert.equal(plain.cursorEffects.color,seeds.internalcheats.accent);
    for(const override of [{cursorEffects:null},{cursorEffects:[]},{cursorEffects:{enabled:1}},{cursorEffects:{style:'<svg>'}},{cursorEffects:{color:'url(evil)'}},{cursorEffects:{size:41}},{cursorEffects:{trailLength:5.5}},{cursorEffects:{trailSmoothness:101}},{cursorEffects:{clickEffect:'script'}},{cardEffects:{enabled:'true'}},{cardEffects:{tilt:1}},{cardEffects:{intensity:-1}},{cardEffects:{speed:2.1}},{entranceEffects:{duration:249}},{entranceEffects:{distance:33}},{entranceEffects:{zoom:9}},{entranceEffects:{stagger:121}},{entranceEffects:{direction:'diagonal'}},{entranceEffects:{style:'script'}}])assert.throws(()=>normalizeProfile({...seeds.internalcheats,...override}),JSON.stringify(override));
    const customized=normalizeProfile({...plain,cursorEffects:{...plain.cursorEffects,enabled:true,style:'ring',size:40,trail:true,trailLength:12},cardEffects:{...plain.cardEffects,intensity:85},entranceEffects:{...plain.entranceEffects,enabled:true,style:'stagger'}});
    for(const cursorEffects of [{size:null},{url:'https://evil.example/cursor.svg'},{css:'cursor:none'},{markup:'<svg onload=alert(1)>'}])assert.throws(()=>normalizeProfile({...plain,cursorEffects}));
    const disabled=normalizeProfile({...customized,cursorEffects:{...customized.cursorEffects,enabled:false}});
    assert.deepEqual(disabled.cardEffects,customized.cardEffects);assert.deepEqual(disabled.entranceEffects,customized.entranceEffects);assert.equal(disabled.cursorEffects.size,40);assert.equal(disabled.cursorEffects.trail,true);
    for(const style of ['arrow','dot','ring','crosshair'])assert.match(nativeCursor({...plain.cursorEffects,style}),/^url\("data:image\/svg\+xml,/);
    assert.throws(()=>nativeCursor({...plain.cursorEffects,color:'\"><script>'}));
  });
  await check('actual backend rejects forged authority before media publication and persists isolated fixtures',async()=>{
    assert.deepEqual(badgeCapabilities({slug:'internalcheats'}),{canUseReservedBadges:true});assert.equal(badgeCapabilities({slug:'k3rlsen'}).canUseReservedBadges,true);assert.equal(badgeCapabilities({slug:'bal4zs'}).canUseReservedBadges,false);
    let handler, publicCopies=0,saves=0,uploadReads=0;
    const fixtures=new Map(Object.entries(seeds).map(([slug,config])=>[slug,{slug,config:structuredClone(config),defaults:config,previous:null,revision:1}]));
    const fakeClient={auth:{getUser:async token=>({data:{user:{id:token.split('.')[0]}}})},rpc:async(name,{operation,payload})=>{
      if(operation==='session')return {data:true};if(operation==='status')return {data:{needsHandle:false}};
      if(operation==='mine')return {data:fixtures.get(payload.owner)};
      if(operation==='uploads'){uploadReads++;return {data:[]};}
      if(operation==='save'){saves++;const fixture=fixtures.get(payload.owner);fixture.previous=fixture.config;fixture.config=payload.config;fixture.revision++;return {data:{config:fixture.config,revision:fixture.revision}};}
      throw new Error(operation);
    },storage:{from:()=>({copy:async()=>{publicCopies++;},getPublicUrl:path=>({data:{publicUrl:`https://test.supabase.co/storage/v1/object/public/profile-media/${path}`}})})}};
    let source=read('supabase/functions/profile-api/index.ts').replace(/^import .*;\r?\n/gm,'');source=(await transform(source,{loader:'ts',format:'esm'})).code;
    vm.runInNewContext(source,{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://test.supabase.co':'test-only'},serve:callback=>handler=callback},createClient:()=>fakeClient,normalizeProfile,profileMedia:profile=>[],MAX_IMAGE:5e6,MAX_VIDEO:5e7,OWNER_QUOTA:25e7,badgeError,badgeCapabilities,preserveVisualGroups,TextEncoder,TextDecoder,Request,Response,URL,Uint8Array,console,atob});
    const token=slug=>`${slug}.${Buffer.from(JSON.stringify({session_id:'11111111-1111-1111-1111-111111111111'})).toString('base64url')}.fixture`;
    const call=(slug,method,body)=>handler(new Request('https://example.com/profile-api/me',{method,headers:{Authorization:`Bearer ${token(slug)}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}));
    const me=await (await call('bal4zs','GET')).json();assert.equal(me.capabilities.canUseReservedBadges,false);
    uploadReads=0;
    const initial=JSON.stringify(fixtures.get('bal4zs'));
    for(const extra of [{capabilities:{canUseReservedBadges:true}},{slug:'internalcheats'},{name:'InternalCheats',owner:'internalcheats'},{user_metadata:{admin:true}}]){
      const result=await call('bal4zs','PUT',{revision:1,slug:'internalcheats',capabilities:{canUseReservedBadges:true},config:{...seeds.bal4zs,badge:'Founder',...extra}});
      assert.equal(result.status,400);assert.equal((await result.json()).error,RESERVED_BADGE_ERROR);
    }
    assert.equal(JSON.stringify(fixtures.get('bal4zs')),initial);assert.equal(publicCopies,0);assert.equal(saves,0);assert.equal(uploadReads,0);
    for(const slug of ['internalcheats','k3rlsen']){const result=await call(slug,'PUT',{revision:1,config:{...seeds[slug],badge:'Founder'}});assert.equal(result.status,200);}
    const config=normalizeProfile({...seeds.bal4zs,badge:'Moonlight',cursorEffects:{enabled:true,style:'crosshair'},cardEffects:{enabled:true,intensity:74},entranceEffects:{enabled:true,style:'zoom'},typography:{display:'outfit',body:'sora',sizes:{name:72}},cardLayout:'bento',electricBorder:{enabled:true},overlays:{enabled:true,layers:[{preset:'snow'},{preset:'rain'}]}});
    assert.equal((await call('bal4zs','PUT',{revision:1,config})).status,200);
    assert.deepEqual(JSON.parse(JSON.stringify(fixtures.get('bal4zs').config)),config);assert.equal(fixtures.get('internalcheats').config.cursorEffects.enabled,false);
    assert.equal((await call('bal4zs','PUT',{revision:1,config})).status,409);
    assert.equal((await call('bal4zs','PUT',{revision:2,config:{...config,cursorEffects:{enabled:'yes'}}})).status,400);
    assert.equal((await call('bal4zs','PUT',{revision:2,config:{...seeds.bal4zs,badge:'Moonlight',bio:'An older client edit'}})).status,200);assert.equal(fixtures.get('bal4zs').config.cardLayout,'bento');assert.equal(fixtures.get('bal4zs').config.typography.display,'outfit');assert.equal(fixtures.get('bal4zs').config.overlays.layers.length,2);
    const paletteConfig={...fixtures.get('bal4zs').config,colorTheme:'custom',themeColors:{primary:'#00aaff',secondary:'#ff0066'}};const paletteRevision=fixtures.get('bal4zs').revision;
    for(const invalid of [{primary:'red'},{primary:'#ffffff;display:none'},{secondary:'#fff'},{secondary:123}])assert.equal((await call('bal4zs','PUT',{revision:paletteRevision,config:{...paletteConfig,themeColors:invalid}})).status,400);
    assert.equal((await call('bal4zs','PUT',{revision:paletteRevision,config:paletteConfig})).status,200);const omitted={...paletteConfig};delete omitted.themeColors;assert.equal((await call('bal4zs','PUT',{revision:fixtures.get('bal4zs').revision,config:omitted})).status,200);assert.deepEqual(JSON.parse(JSON.stringify(fixtures.get('bal4zs').config.themeColors)),paletteConfig.themeColors);
    for(const input of [{kind:'overlayImage',mime:'image/png',bytes:5_000_001},{kind:'overlayVideo',mime:'video/mp4',bytes:50_000_001},{kind:'overlayImage',mime:'image/svg+xml',bytes:1000},{kind:'overlayVideo',mime:'video/webm',bytes:1000},{kind:'overlayVideo',mime:'image/png',bytes:1000}]){const result=await handler(new Request('https://example.com/profile-api/uploads',{method:'POST',headers:{Authorization:`Bearer ${token('bal4zs')}`,'Content-Type':'application/json'},body:JSON.stringify(input)}));assert.equal(result.status,400);}
  });
  await check('scoped runtime stays idle, bounds movement, cleans up and owns independent entrance layers',async()=>{
    const window=environment();const doc=window.document;const panel=doc.querySelector('.profile__panel'),scope=doc.querySelector('.profile');
    let frameTime=0;Object.defineProperty(window.performance,'now',{value:()=>frameTime,configurable:true});const frames=new Map();let frameNumber=0;window.requestAnimationFrame=callback=>{frames.set(++frameNumber,callback);return frameNumber;};window.cancelAnimationFrame=id=>frames.delete(id);
    const tick=()=>{frameTime+=16;for(const [id,callback]of [...frames]){frames.delete(id);callback(frameTime);}};
    const played=[];window.Element.prototype.animate=function(keyframes,options){let finish;const animation={keyframes,options,target:this,cancelled:false,finished:new Promise(resolve=>finish=resolve),cancel(){this.cancelled=true;finish();}};played.push(animation);return animation;};
    const runtime=createProfileEffects(panel,{scope,preview:true});const plain=normalizeProfile(seeds.internalcheats);runtime.update(plain);tick();assert.equal(frames.size,0);assert.equal(scope.querySelectorAll('.profile-cursor-point').length,0);
    assert.equal(scope.classList.contains('profile-custom-cursor'),false);window.matchMedia('(hover: hover) and (pointer: fine)').matches=true;
    const enabled=normalizeProfile({...plain,cursorEffects:{enabled:true,trail:true,clickEffect:'sparks'},cardEffects:{enabled:true,intensity:100},entranceEffects:{enabled:true,style:'stagger',stagger:120}});
    const boundary=scope.querySelector('.profile-effects-boundary');boundary.getBoundingClientRect=()=>({left:0,top:0,width:400,height:600});scope.getBoundingClientRect=()=>({left:0,top:0,width:800,height:1000});window.dispatchEvent(new window.Event('resize'));
    runtime.update(enabled);assert.ok(played.length>0);assert.ok(played.every(animation=>animation.options.delay<=600));const originalEntrances=played.length;runtime.update({...enabled,bio:'unrelated'});assert.equal(played.length,originalEntrances);
    const move=new window.PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:400,clientY:600});panel.dispatchEvent(move);
    for(let count=0;count<80;count++)tick();
    const surface=scope.querySelector('.profile-effects-surface');assert.match(surface.style.transform,/rotateX\(-[0-6]/);assert.match(surface.style.transform,/rotateY\([0-6]/);assert.ok(frames.size===0);
    for(let count=0;count<8;count++)panel.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse',clientX:100,clientY:100}));assert.equal(scope.querySelectorAll('.profile-click-particle').length,24);
    const off=normalizeProfile({...enabled,cursorEffects:{...enabled.cursorEffects,enabled:false},cardEffects:{...enabled.cardEffects,enabled:false},entranceEffects:{...enabled.entranceEffects,enabled:false}});runtime.update(off);assert.equal(scope.classList.contains('profile-custom-cursor'),false);assert.equal(surface.style.transform,'');assert.equal(frames.size,0);
    runtime.update(enabled);window.matchMedia('(prefers-reduced-motion: reduce)').matches=true;window.matchMedia('(prefers-reduced-motion: reduce)').dispatchEvent(new window.Event('change'));assert.equal(surface.style.transform,'');assert.equal(frames.size,0);
    window.matchMedia('(hover: hover) and (pointer: fine)').matches=false;window.matchMedia('(hover: hover) and (pointer: fine)').dispatchEvent(new window.Event('change'));assert.equal(scope.classList.contains('profile-custom-cursor'),false);
    const cachedHide=new window.Event('pagehide');Object.defineProperty(cachedHide,'persisted',{value:true});window.dispatchEvent(cachedHide);assert.ok(scope.querySelector('.profile-effects-boundary'));assert.equal(frames.size,0);
    window.dispatchEvent(new window.PageTransitionEvent('pageshow',{persisted:true}));
    window.dispatchEvent(new window.PageTransitionEvent('pagehide',{persisted:false}));assert.equal(scope.querySelector('.profile-effects-boundary'),null);assert.equal(scope.querySelector('.profile-cursor-decorations'),null);assert.equal(panel.parentElement,scope);
    for(const file of ['internalcheats/index.html','k3rlsen/index.html','bal4zs/index.html'])assert.doesNotMatch(read(file),/class="profile__panel" data-reveal/);
  });

  await check('new effects validate with legacy defaults and bounded speed and strength',()=>{
    for(const effect of EFFECTS){const config=normalizeProfile({...seeds.internalcheats,effect,effectSpeed:150,effectStrength:85});assert.equal(config.effect,effect);assert.equal(config.effectSpeed,150);assert.equal(config.effectStrength,85);}
    for(const override of [{effectSpeed:49},{effectSpeed:201},{effectSpeed:'100'},{effectStrength:-1},{effectStrength:101}])assert.throws(()=>normalizeProfile({...seeds.internalcheats,...override}));
    assert.equal(normalizeProfile(seeds.bal4zs).effectSpeed,100);
  });
  await check('safe layered names remain accessible and do not restart on unrelated edits',()=>{
    const window=environment();globalThis.document=window.document;const panel=document.querySelector('.profile__panel');
    for(const effect of EFFECTS){const config={...seeds.internalcheats,effect,effectSpeed:200,effectStrength:80};renderProfile(panel,config);const name=panel.querySelector('h1');assert.equal(name.getAttribute('aria-label'),config.name);assert.equal(name.textContent,config.name);assert.equal(name.querySelector('.name-text').getAttribute('aria-hidden'),'true');renderProfile(panel,{...config,bio:'New bio',glow:20});assert.equal(panel.querySelector('h1'),name);assert.equal(panel.querySelectorAll('h1').length,1);if(effect==='wave')assert.equal(name.querySelectorAll('.name-letter').length,config.name.length);}
    renderProfile(panel,{...seeds.internalcheats,name:'A <b> 👨‍💻',effect:'wave'});assert.equal(panel.querySelector('h1 b'),null);assert.equal(panel.querySelector('h1').textContent,'A <b> 👨‍💻');assert.equal(panel.querySelectorAll('.name-letter').length,7);
    renderProfile(panel,{...seeds.internalcheats,effect:'pulse',effectSpeed:200,effectStrength:0});assert.equal(panel.style.getPropertyValue('--effect-duration'),'1400ms');assert.equal(panel.style.getPropertyValue('--effect-color'),'rgb(255,255,255)');
    const animations=[{currentTime:500,plays:0,play(){this.plays++;}},{currentTime:900,plays:0,play(){this.plays++;}}];const entrance={id:'ascendo-profile-entrance',currentTime:300,play(){throw new Error('Do not replay entrance with name');}};panel.querySelector('h1').getAnimations=()=>[...animations,entrance];replayNameEffect(panel);assert.ok(animations.every(animation=>animation.currentTime===0&&animation.plays===1));assert.equal(entrance.currentTime,300);
    bindNameEffectVisibility();Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.ok(document.documentElement.classList.contains('name-effects-paused'));Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(document.documentElement.classList.contains('name-effects-paused'),false);
  });
  await check('browser uploads send one fresh Authorization header instead of appending duplicate JWTs',()=>{
    const source=read('editor.mjs');
    const headerExpression=source.match(/endpoint:reserved.endpoint,headers:(\{[^\n]+\}),/)[1];
    const optionsHeaders=vm.runInNewContext('('+headerExpression+')',{PUBLISHABLE_KEY:'public-key',reserved:{token:'signed-upload'}});
    assert.equal(Object.keys(optionsHeaders).filter(name=>name.toLowerCase()==='authorization').length,0);
    let xhr;
    class FakeXHR{constructor(){xhr=this;this.headers={};}open(){}setRequestHeader(name,value){const key=name.toLowerCase();this.headers[key]=this.headers[key]?this.headers[key]+', '+value:value;}}
    const stackSource=read('node_modules/tus-js-client/lib/browser/httpStack.js').replace('export default class XHRHttpStack','class XHRHttpStack');
    const stack=vm.runInNewContext(stackSource+';new XHRHttpStack()',{XMLHttpRequest:FakeXHR});
    const connection=stack.createRequest('POST','https://example.com/upload');
    for(const [name,value]of Object.entries(optionsHeaders))connection.setHeader(name,value);
    connection.setHeader('Authorization','Bearer fresh-test-token');
    assert.equal(xhr.headers.authorization,'Bearer fresh-test-token');
  });
  await check('all seeded profiles normalize without losing names, links or bio',()=>{
    for(const original of Object.values(seeds)){const config={...original,...Object.fromEntries(EXPRESSION_GROUPS.map(key=>[key,undefined]))};assert.deepEqual({...normalizeProfile(config),cursorEffects:undefined,cardEffects:undefined,entranceEffects:undefined,music:undefined,colorTheme:undefined,themeColors:undefined,textColors:undefined,typography:undefined,cardLayout:undefined,electricBorder:undefined,overlays:undefined,soundtrackCard:undefined,enterScreen:undefined,pageTitle:undefined,widgets:undefined,...Object.fromEntries(EXPRESSION_GROUPS.map(key=>[key,undefined]))},{...config,effectSpeed:100,effectStrength:65,cursorEffects:undefined,cardEffects:undefined,entranceEffects:undefined,music:undefined,colorTheme:undefined,themeColors:undefined,textColors:undefined,typography:undefined,cardLayout:undefined,electricBorder:undefined,overlays:undefined,soundtrackCard:undefined,enterScreen:undefined,pageTitle:undefined,widgets:undefined});}
    assert.equal(seeds.bal4zs.bio,'');
    assert.equal(seeds.bal4zs.socials[3].handle,'_bal4zs.exe_');
    for(const effect of EFFECTS)assert.equal(normalizeProfile({...seeds.internalcheats,effect}).effect,effect);
  });
  await check('unsafe URLs, malformed settings, giant fields and excessive rows are rejected',()=>{
    for(const url of ['javascript:alert(1)','data:text/html,bad','http://example.com','https://localhost/','https://127.0.0.1/','https://2130706433/','https://192.168.1.1/','https://user:password@example.com/','https://[::1]/'])assert.throws(()=>safeUrl(url,false),url);
    for(const override of [{name:''},{name:'a'.repeat(41)},{bio:'a'.repeat(1201)},{effect:'evil'},{glow:101},{opacity:0},{accent:'red'},{socials:Array(17).fill(seeds.internalcheats.socials[0])}])assert.throws(()=>normalizeProfile({...seeds.internalcheats,...override}));
    assert.equal(safeUrl('https://example.com/video.mp4?version=1'),'https://example.com/video.mp4?version=1');
  });
  await check('original media, plugin binaries and CNAME remain unchanged',()=>{
    assert.equal(execFileSync('git',['diff','--name-only','HEAD','--','CNAME','assets','downloads'],{cwd:root,encoding:'utf8'}).trim(),'');
    assert.equal(read('CNAME').trim(),'ascendo.lol');
    const tree=execFileSync('git',['ls-tree','-r','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n');
    for(const line of tree){const match=line.match(/^\d+ blob ([a-f0-9]+)\t(.+)$/);if(!match)continue;const [,expected,file]=match;if(!file.startsWith('assets/')&&!file.startsWith('downloads/'))continue;if(file.endsWith('.svg'))continue;assert.equal(execFileSync('git',['hash-object','--path='+file,file],{cwd:root,encoding:'utf8'}).trim(),expected,file);}
  });
  await check('HTML resources, IDs, minimal 404 and unlisted navigation are preserved',()=>{
    const pages=['index.html','internalcheats/index.html','k3rlsen/index.html','bal4zs/index.html','plugins/index.html','404.html','nagyorru/index.html','login/index.html','customize/index.html'];
    for(const file of pages){
      const html=read(file);const window=environment(file);const doc=window.document;
      const ids=[...doc.querySelectorAll('[id]')].map(element=>element.id);assert.equal(ids.length,new Set(ids).size,file);
      for(const element of doc.querySelectorAll('[src],[href],[poster],[data-mobile-src]'))for(const name of ['src','href','poster','data-mobile-src']){
        const value=element.getAttribute(name);if(!value||/^(https?:|#)/.test(value))continue;
        const asset=value.split('?')[0];const full=asset.startsWith('/')?path.join(root,asset):path.resolve(root,path.dirname(file),asset);assert.ok(fs.existsSync(full),`${file}: ${value}`);
      }
      if(!['bal4zs/index.html','customize/index.html'].includes(file))assert.doesNotMatch(html,/href=["'][^"']*bal4zs/);
      assert.doesNotMatch(html,/<input[^>]+type=["'](?:password|hidden)["'][^>]+value=["'][^"']+/);
      if(file.startsWith('login/')||file.startsWith('customize/'))assert.match(html,/noindex, nofollow/);
    }
    assert.equal(environment('index.html').document.querySelectorAll('.founder-pill').length,2);
    assert.equal(environment('404.html').document.querySelectorAll('main a').length,2);
    assert.doesNotMatch(read('404.html'),/nf-recovery|copyPath|previousPage|nf-footer/);
  });
  await check('renderer escapes profile content, preserves safe bio links and social actions',()=>{
    const window=environment();globalThis.document=window.document;
    const panel=document.querySelector('.profile__panel');
    const config=structuredClone(seeds.internalcheats);config.name='<img onerror=alert(1)>';config.bio='<script>bad</script>\n[safe](https://example.com/)\n[unsafe](javascript:alert)';config.badge='<b>text</b>';
    renderProfile(panel,config);
    assert.equal(panel.querySelector('h1').textContent,config.name);assert.equal(panel.querySelector('script'),null);assert.equal(panel.querySelector('[onerror]'),null);
    assert.equal(panel.querySelector('.profile-badge').textContent,config.badge);
    const link=panel.querySelector('.profile__bio a');assert.equal(link.href,'https://example.com/');assert.equal(link.rel,'noopener noreferrer');
    assert.equal(panel.querySelector('[data-copy]').dataset.copy,'internalcheats');
    assert.equal(panel.querySelectorAll('.social-link').length,3);
    renderProfile(panel,seeds.bal4zs);assert.equal(panel.querySelector('.profile__bio'),null);assert.equal(panel.querySelectorAll('.social-link').length,4);
  });
  await check('music card uses actual muted/playing/error state and duration',()=>{
    const window=environment();globalThis.document=window.document;const panel=document.querySelector('.profile__panel');renderProfile(panel,{...seeds.bal4zs,soundtrackCard:{enabled:true}});const video=document.querySelector('video');
    Object.defineProperty(video,'readyState',{value:3,configurable:true});Object.defineProperty(video,'currentSrc',{value:'https://example.com/video.mp4',configurable:true});Object.defineProperty(video,'duration',{value:265,configurable:true});video.currentTime=71;video.muted=true;video.__paused=false;
    const update=bindMusic(video,panel);update();assert.equal(panel.querySelector('.now-playing__state').textContent,'Muted');assert.equal(panel.querySelector('.now-playing__time').textContent,'1:11 / 4:25');
    video.muted=false;video.volume=.5;update();assert.equal(panel.querySelector('.now-playing__state').textContent,'Playing');
    Object.defineProperty(video,'error',{value:{message:'unavailable'}});update();assert.equal(panel.querySelector('.now-playing__state').textContent,'Unavailable');
  });
  await check('public player supports mobile selection, quiet posters and dynamic copy rows',async()=>{
    for(const reduced of [false,true]){
      const window=environment('internalcheats/index.html',reduced);let copied='';Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async value=>{copied=value;}}});window.isSecureContext=true;
      Object.assign(window.document.querySelector('video').dataset,{backgroundKind:'video',backgroundSrc:seeds.internalcheats.background.url,mobileSrc:seeds.internalcheats.background.mobile,musicSource:'video',musicSrc:'',musicVolume:'65'});
      vm.runInContext(await appBundle(),window);await flush();
      const video=window.document.querySelector('video');
      if(reduced)assert.equal(video.getAttribute('src'),null);else assert.match(video.src,/music-background.mp4/);
      const button=window.document.createElement('button');button.dataset.copy='dynamic-handle';button.dataset.platform='Discord';window.document.body.append(button);button.click();await flush();assert.equal(copied,'dynamic-handle');
      if(!reduced){video.dataset.backgroundKind='black';video.dispatchEvent(new window.Event('ascendo:background'));assert.equal(video.getAttribute('src'),null);video.dataset.backgroundKind='video';video.dispatchEvent(new window.Event('ascendo:background'));assert.match(video.src,/music-background.mp4/);}
      window.document.dispatchEvent(new window.Event('visibilitychange'));window.dispatchEvent(new window.Event('pagehide'));
    }
    const mobile=environment();Object.assign(mobile.document.querySelector('video').dataset,{backgroundKind:'video',backgroundSrc:seeds.internalcheats.background.url,mobileSrc:seeds.internalcheats.background.mobile,musicSource:'video',musicSrc:'',musicVolume:'65'});mobile.matchMedia('(max-width: 820px), (pointer: coarse)').matches=true;vm.runInContext(await appBundle(),mobile);await flush();assert.match(mobile.document.querySelector('video').src,/music-background-mobile.mp4/);
  });
  await check('Easter egg requires five activations and cleans up without overlaps',async()=>{
    const window=environment('index.html');const running=[];window.Element.prototype.animate=function(frames,options){let resolve;const animation={frames,options,finished:new Promise(done=>{resolve=done;}),cancel(){}};animation.resolve=resolve;running.push(animation);return animation;};
    vm.runInContext(read('extras.js'),window);const button=window.document.getElementById('logoSecret');assert.equal(button.disabled,false);
    for(let index=0;index<4;index++)button.click();assert.equal(window.document.querySelector('.logo-burst'),null);button.click();assert.equal(window.document.querySelectorAll('.logo-burst').length,1);assert.equal(running[0].options.duration,1200);button.click();assert.equal(window.document.querySelectorAll('.logo-burst').length,1);running[0].resolve();await flush();assert.equal(window.document.querySelector('.logo-burst'),null);
  });
  await check('editor previews privately, saves atomically, retains failed drafts and restores versions',async()=>{
    const window=environment('customize/index.html');
    for(const key of ['document','sessionStorage','localStorage','location','HTMLVideoElement','Image','File','Event'])Object.defineProperty(globalThis,key,{value:window[key],configurable:true,writable:true});
    globalThis.window=window;globalThis.matchMedia=window.matchMedia;globalThis.requestAnimationFrame=window.requestAnimationFrame;globalThis.cancelAnimationFrame=clearTimeout;globalThis.confirm=()=>true;
    window.sessionStorage.setItem('ascendo-editor-session',JSON.stringify({access_token:'unit-test-only',refresh_token:'unit-test-only',expires_at:Date.now()/1000+3600}));
    let stored={...structuredClone(seeds.internalcheats),badge:'Founder'},revision=1,previous=null,saveCalls=0,failSave=false;
    globalThis.fetch=async(url,options={})=>{
      const route=String(url).split('/profile-api')[1];let data,status=200;
      if(route==='/preferences')data={language:'en'};else if(route==='/uploads')data=[];
      else if(route==='/me'&&options.method==='PUT'){
        saveCalls++;if(failSave){status=409;data={error:'This profile changed in another tab.'};}
        else{const input=JSON.parse(options.body);assert.equal(input.revision,revision);previous=stored;stored=input.config;data={config:stored,revision:++revision};}
      }else if(route==='/me')data={slug:'internalcheats',config:stored,defaults:seeds.internalcheats,previous,revision,usage:0,capabilities:{canUseReservedBadges:true}};
      else throw new Error(`Unexpected endpoint ${route}`);
      return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    };
    await import(pathToFileURL(path.join(root,'editor.mjs')).href+'?unit=1');await flush();
    const byId=id=>document.getElementById(id);assert.equal(byId('editorContent').hidden,false);assert.equal(byId('displayName').value,'InternalCheats');
    for(const id of ['cursorEnabled','cardEnabled','entranceEnabled'])assert.equal(byId(id).checked,false);
    assert.equal(byId('cursorStyle').disabled,true);assert.equal(byId('cardIntensity').disabled,true);assert.equal(byId('entranceDuration').disabled,true);
    const edit=async(id,value)=>{const control=byId(id);if(['checkbox','radio'].includes(control.type))control.checked=value;else control.value=value;control.dispatchEvent(new window.Event(control.tagName==='SELECT'?'change':'input',{bubbles:true}));await flush();};
    assert.equal(document.querySelectorAll('.studio-nav-button').length,6);assert.equal(document.querySelectorAll('.studio-disclosure').length,28);assert.equal(document.querySelectorAll('.studio-floating-actions button').length,3);assert.equal(document.querySelectorAll('.studio-dock-slot').length,3);
    assert.equal(byId('studioSearch').form,null);assert.equal(document.querySelector('.studio-nav-button').form,null);assert.equal(byId('saveChanges').form,byId('profileForm'));
    const savedDraftBefore=sessionStorage.getItem('ascendo-editor-draft'),savedVideoBefore=byId('previewVideo'),savedAvatarBefore=byId('previewCard').querySelector('.avatar');
    document.querySelector('[data-category="appearance"]').click();assert.equal(byId('studio-section-style').hidden,false);assert.equal(byId('studio-section-identity').hidden,true);assert.equal(byId('displayFont').isConnected,true);
    byId('studioSearch').value='cursor';byId('studioSearch').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(byId('studio-section-cursor').hidden,false);assert.equal(byId('studio-section-cursor-toggle').getAttribute('aria-expanded'),'true');assert.equal(byId('studio-section-style').hidden,true);assert.match(byId('studioSearchCount').textContent,/found/);assert.ok(document.querySelectorAll('.studio-search-match').length>0);
    byId('studioSearch').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(byId('studioSearch').value,'');assert.equal(byId('studio-section-style').hidden,false);assert.equal(byId('studio-section-cursor-toggle').getAttribute('aria-expanded'),'false');
    byId('studioSearch').value='no-such-setting';byId('studioSearch').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(document.querySelector('.studio-empty').hidden,false);document.querySelector('.studio-empty button').click();assert.equal(byId('studioSearch').value,'');
    document.querySelector('[data-category="profile"]').click();byId('studio-section-identity-toggle').click();assert.equal(byId('studio-section-identity-body').inert,true);byId('studio-section-identity-toggle').click();assert.equal(byId('studio-section-identity-body').inert,false);
    byId('studioStatusButton').click();assert.equal(byId('studioStatusPanel').hidden,false);document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(byId('studioStatusPanel').hidden,true);assert.equal(document.activeElement,byId('studioStatusButton'));
    byId('studioStatusButton').click();document.body.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true}));assert.equal(byId('studioStatusPanel').hidden,true);assert.equal(byId('previewVideo'),savedVideoBefore);assert.equal(byId('previewCard').querySelector('.avatar'),savedAvatarBefore);assert.equal(sessionStorage.getItem('ascendo-editor-draft'),savedDraftBefore);assert.equal(saveCalls,0);assert.equal(byId('saveChanges').disabled,true);
    document.querySelector('[data-category="effects"]').click();byId('displayName').dispatchEvent(new window.Event('invalid',{bubbles:false}));assert.equal(byId('studio-section-identity').hidden,false);assert.equal(byId('studio-section-identity-toggle').getAttribute('aria-expanded'),'true');
    await edit('colorTheme','custom');assert.equal(byId('accent').disabled,false);await edit('accent','#20ccaa');assert.equal(byId('themePrimary').value,'#20ccaa');assert.equal(byId('previewCard').style.getPropertyValue('--profile-accent'),'#20ccaa');await edit('colorTheme','monochrome');assert.equal(byId('accent').disabled,false);await edit('accent','#ee8844');assert.equal(byId('colorTheme').value,'custom');assert.equal(byId('themePrimary').value,'#ee8844');
    await edit('bioColorAuto',false);await edit('bioColor','#ffcc66');await edit('socialLabelColorAuto',false);await edit('socialLabelColor','#66ddff');assert.equal(byId('previewCard').style.getPropertyValue('--bio-text-color'),'#ffcc66');assert.equal(byId('previewCard').style.getPropertyValue('--social-label-color'),'#66ddff');assert.equal(saveCalls,0);await edit('colorTheme','original');
    const beforeAvatar=byId('previewCard').querySelector('.avatar');await edit('cursorEnabled',true);await edit('cursorStyle','ring');await edit('cursorTrail',true);await edit('cursorTrailLength',12);await edit('cardEnabled',true);await edit('cardIntensity',78);await edit('entranceEnabled',true);await edit('entranceStyle','slide');await edit('entranceDirection','left');
    assert.equal(byId('studio-section-cursor-toggle').getAttribute('aria-expanded'),'true');assert.equal(byId('previewCard').querySelector('.avatar'),beforeAvatar);assert.equal(byId('entranceDirection').disabled,false);assert.equal(byId('entranceZoom').disabled,true);assert.equal(byId('cursorTrailLength').disabled,false);assert.equal(byId('previewCard').closest('.profile-effects-boundary').hasAttribute('data-card-effects-active'),true);
    await edit('cursorEnabled',false);assert.equal(byId('studio-section-cursor-toggle').getAttribute('aria-expanded'),'false');assert.equal(byId('cursorTrailLength').value,'12');assert.equal(byId('cardIntensity').value,'78');assert.equal(byId('entranceEnabled').checked,true);assert.equal(saveCalls,0);
    assert.equal(JSON.parse(sessionStorage.getItem('ascendo-editor-draft')).config.cursorEffects.trailLength,12);
    byId('displayName').value='Studio QA';byId('displayName').dispatchEvent(new window.Event('input',{bubbles:true}));await flush();assert.equal(byId('previewCard').querySelector('h1').textContent,'Studio QA');assert.equal(saveCalls,0);assert.equal(stored.name,'InternalCheats');
    assert.equal(JSON.parse(sessionStorage.getItem('ascendo-editor-draft')).config.name,'Studio QA');
    const currentDraft=sessionStorage.getItem('ascendo-editor-draft');document.querySelector('[data-category=media]').click();byId('studioSearch').value='glitch';byId('studioSearch').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(sessionStorage.getItem('ascendo-editor-draft'),currentDraft);assert.equal(saveCalls,0);byId('studioSearch').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.deepEqual([...byId('effect').options].map(option=>option.value),EFFECTS);
    byId('effectSpeed').value='150';byId('effectSpeed').dispatchEvent(new window.Event('input',{bubbles:true}));await flush();assert.equal(byId('effectSpeedValue').textContent,'1.5×');
    byId('effect').value='glitch';byId('effect').dispatchEvent(new window.Event('change',{bubbles:true}));await flush();assert.equal(byId('previewCard').dataset.effect,'glitch');
    for(const group of EXPRESSION_GROUPS)await edit(group+'Enabled',true);
    await edit('socialStyleLayout','icons');await edit('holographicFinish','brushed');await edit('musicReactiveStyle','equalizer');await edit('richBioAlign','left');await edit('signatureMode','text');await edit('signatureText','Studio QA');await edit('detailColorsNameAuto',false);await edit('detailColorsName','#66aaff');
    byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saveCalls,1);assert.equal(stored.name,'Studio QA');assert.equal(stored.effectSpeed,150);assert.deepEqual(stored.textColors,{bio:'#ffcc66',socialLabel:'#66ddff'});assert.equal(byId('saveState').textContent,'All changes saved');assert.equal(sessionStorage.getItem('ascendo-editor-draft'),null);assert.equal(stored.cursorEffects.enabled,false);assert.equal(stored.cursorEffects.trailLength,12);assert.equal(stored.cardEffects.intensity,78);assert.equal(stored.entranceEffects.direction,'left');for(const group of EXPRESSION_GROUPS)assert.equal(stored[group].enabled,true);assert.equal(stored.socialStyle.layout,'icons');assert.equal(stored.signature.text,'Studio QA');assert.equal(stored.detailColors.name,'#66aaff');
    byId('displayName').value='Unpublished draft';byId('displayName').dispatchEvent(new window.Event('input',{bubbles:true}));await flush();failSave=true;byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(stored.name,'Studio QA');assert.equal(byId('displayName').value,'Unpublished draft');assert.equal(byId('reloadLatest').hidden,false);assert.equal(byId('saveChanges').disabled,false);
    assert.equal(byId('studioStatusPanel').hidden,false);document.body.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true}));assert.equal(byId('studioStatusPanel').hidden,true);byId('displayName').dispatchEvent(new window.Event('input',{bubbles:true}));await flush();assert.equal(byId('studioStatusPanel').hidden,true);
    byId('reloadLatest').click();await flush();assert.equal(byId('displayName').value,'Studio QA');assert.equal(sessionStorage.getItem('ascendo-editor-draft'),null);
    byId('restorePrevious').click();await flush();assert.equal(byId('displayName').value,'InternalCheats');assert.equal(stored.name,'Studio QA');assert.equal(byId('cardEnabled').checked,false);for(const group of EXPRESSION_GROUPS)assert.equal(byId(group+'Enabled').checked,false);
    byId('discardChanges').click();await flush();assert.equal(byId('displayName').value,'Studio QA');assert.equal(sessionStorage.getItem('ascendo-editor-draft'),null);assert.equal(byId('cardEnabled').checked,true);assert.equal(byId('entranceDirection').value,'left');
    byId('previewTab').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(byId('editTab').getAttribute('aria-selected'),'true');
    window.matchMedia('(max-width: 820px)').matches=true;byId('editTab').click();assert.equal(byId('previewVideo').paused,true);byId('previewTab').click();assert.equal(byId('previewVideo').paused,false);byId('editTab').click();assert.equal(byId('previewVideo').paused,true);
    assert.equal(document.querySelectorAll('video').length,1);
    for(const heading of ['Fonts','Text Sizes','Card Layout','Electric Border','Overlays'])assert.ok([...document.querySelectorAll('h2')].some(node=>(node.querySelector('.studio-section-title')?.textContent===heading||node.textContent===heading)));
    assert.equal(byId('electricEnabled').checked,false);assert.equal(byId('overlaysEnabled').checked,false);assert.equal(byId('layout-classic').checked,true);
    await edit('displayFont','outfit');await edit('bodyFont','sora');await edit('sizeAuto-name',false);await edit('size-name',72);await edit('layout-bento',true);await edit('electricEnabled',true);await edit('overlaysEnabled',true);document.querySelector('[data-overlay-preset=rain]').click();await flush();
    assert.equal(byId('previewCard').dataset.layout,'bento');assert.equal(byId('previewCard').style.getPropertyValue('--size-name'),'72px');assert.equal(document.querySelectorAll('#overlayLayers [data-preset]').length,2);
    const draft=JSON.parse(sessionStorage.getItem('ascendo-editor-draft'));assert.equal(draft.config.cardLayout,'bento');assert.equal(draft.config.electricBorder.enabled,true);assert.equal(draft.config.overlays.layers.length,2);assert.equal(stored.cardLayout,'classic');
    const privateVideo=byId('previewVideo');byId('expandPreview').click();await flush();assert.equal(byId('previewDialog').open,true);assert.equal(byId('previewVideo'),privateVideo);assert.equal(document.querySelectorAll('#previewVideo').length,1);byId('closeExpandedPreview').click();await flush();assert.equal(byId('previewDialog').open,false);assert.equal(byId('previewVideo'),privateVideo);
    byId('discardChanges').click();await flush();assert.equal(byId('layout-classic').checked,true);assert.equal(byId('electricEnabled').checked,false);assert.equal(byId('overlaysEnabled').checked,false);
    await edit('soundtrackEnabled',true);await edit('enterEnabled',true);await edit('enterSubtitle','A private second line');await edit('titleEnabled',true);await edit('titleLines','First line\nSecond line');await edit('titleEffect','time');await edit('gameWidgetEnabled',true);await edit('gameWidgetRows-0-value','0.35 / 800 DPI');await edit('hardwareWidgetEnabled',true);await edit('hardwareWidgetRows-0-value','My mouse');await edit('aboutWidgetEnabled',true);await edit('widgetAboutText','About this fixture');await edit('layout-magazine',true);await edit('displayFont','unifrakturcook');
    await edit('colorTheme','custom');await edit('themePrimary','#00aaff');await edit('themeSecondary','#ff0066');assert.equal(document.body.dataset.studioTheme,'custom');assert.equal(document.body.style.getPropertyValue('--studio-primary'),'#00aaff');assert.equal(byId('previewCard').style.getPropertyValue('--profile-secondary'),'#ff0066');assert.equal(stored.colorTheme,'original');
    const featureDraft=JSON.parse(sessionStorage.getItem('ascendo-editor-draft')).config;assert.deepEqual(featureDraft.themeColors,{primary:'#00aaff',secondary:'#ff0066'});assert.equal(featureDraft.enterScreen.subtitle,'A private second line');assert.equal(stored.enterScreen.enabled,false);assert.equal(stored.widgets.game.enabled,false);assert.equal(featureDraft.widgets.hardware.rows[0].value,'My mouse');
    failSave=false;const savesBefore=saveCalls;byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saveCalls,savesBefore+1);assert.equal(stored.enterScreen.enabled,true);assert.equal(stored.colorTheme,'custom');assert.deepEqual(stored.themeColors,{primary:'#00aaff',secondary:'#ff0066'});assert.equal(stored.soundtrackCard.enabled,true);assert.equal(stored.widgets.game.rows[0].value,'0.35 / 800 DPI');assert.equal(stored.typography.display,'unifrakturcook');assert.equal(stored.cardLayout,'magazine');assert.deepEqual(stored.pageTitle.lines,['First line','Second line']);
    byId('restorePrevious').click();await flush();assert.equal(byId('enterEnabled').checked,false);assert.equal(byId('soundtrackEnabled').checked,false);assert.equal(stored.enterScreen.enabled,true);byId('discardChanges').click();await flush();assert.equal(byId('enterEnabled').checked,true);assert.equal(byId('hardwareWidgetRows-0-value').value,'My mouse');assert.equal(byId('themePrimary').value,'#00aaff');assert.equal(document.body.dataset.studioTheme,'custom');
    const paletteSaves=saveCalls;const hex=byId('themePrimary').closest('.studio-color').querySelector('.studio-color__hex');hex.focus();hex.value='zzzzzz';hex.dispatchEvent(new window.Event('input',{bubbles:true}));await flush();byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saveCalls,paletteSaves);assert.equal(hex.getAttribute('aria-invalid'),'true');byId('discardChanges').click();await flush();assert.equal(hex.value,'#00AAFF');assert.equal(hex.getAttribute('aria-invalid'),'false');
    await edit('colorTheme','monochrome');assert.equal(document.body.style.getPropertyValue('--studio-primary'),'#f2f2f2');assert.equal(byId('themePrimary').disabled,true);assert.equal(byId('themePrimary').value,'#00aaff');byId('discardChanges').click();await flush();assert.equal(document.body.dataset.studioTheme,'custom');
    byId('videoUrl').value='';await edit('backgroundKind','video');assert.equal(byId('videoUrl').closest('.full-width').hidden,false);await edit('backgroundKind','image');assert.equal(byId('imageUrl').closest('.full-width').hidden,false);
    await edit('backgroundKind','preset:beams');await edit('musicSource','mp3');assert.equal(byId('musicUploadFields').hidden,false);const beforeMissingMusic=saveCalls;byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saveCalls,beforeMissingMusic);assert.match(byId('editorStatus').textContent,/Upload an MP3/);await edit('musicUrl','https://example.com/isolated-audio.mp3');await edit('musicVolume',39);assert.equal(stored.music.source,'video');assert.equal(byId('previewVideo').getAttribute('src'),null);assert.equal(document.querySelector('[data-profile-music]').getAttribute('src'),'https://example.com/isolated-audio.mp3');
    const musicDraft=JSON.parse(sessionStorage.getItem('ascendo-editor-draft')).config;assert.equal(musicDraft.background.preset,'beams');assert.equal(musicDraft.music.volume,39);byId('profileForm').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(stored.background.preset,'beams');assert.equal(stored.music.volume,39);byId('restorePrevious').click();await flush();assert.equal(byId('backgroundKind').value,'video');assert.equal(byId('musicSource').value,'video');byId('discardChanges').click();await flush();assert.equal(byId('backgroundKind').value,'preset:beams');assert.equal(byId('musicVolume').value,'39');

  });
  await check('regular editor shows the exact inline badge error, blocks submission and allows legitimate badges',async()=>{
    const window=environment('customize/index.html');
    for(const key of ['document','sessionStorage','localStorage','location','HTMLVideoElement','Image','File','Event'])Object.defineProperty(globalThis,key,{value:window[key],configurable:true,writable:true});
    globalThis.window=window;globalThis.matchMedia=window.matchMedia;globalThis.requestAnimationFrame=window.requestAnimationFrame;globalThis.cancelAnimationFrame=clearTimeout;globalThis.confirm=()=>true;
    window.sessionStorage.setItem('ascendo-editor-session',JSON.stringify({access_token:'fixture-only',refresh_token:'fixture-only',expires_at:Date.now()/1000+3600}));
    let saves=0,lastSavedConfig;
    globalThis.fetch=async(url,options={})=>{const route=String(url).split('/profile-api')[1];let data;if(route==='/preferences')data={language:'en'};else if(route==='/uploads')data=[];else if(options.method==='PUT'){lastSavedConfig=JSON.parse(options.body).config;saves++;data={config:JSON.parse(options.body).config,revision:2};}else data={slug:'bal4zs',config:seeds.bal4zs,defaults:seeds.bal4zs,previous:null,revision:1,capabilities:{canUseReservedBadges:false}};return new Response(JSON.stringify(data));};
    await import(pathToFileURL(path.join(root,'editor.mjs')).href+'?unit=regular');await flush();
    const badge=document.getElementById('badge'),form=document.getElementById('profileForm');
    for(const word of ['Founder','V1P','H o p e','Fоundеr']){badge.value=word;badge.dispatchEvent(new window.Event('input',{bubbles:true}));await flush();assert.equal(document.getElementById('badgeError').textContent,RESERVED_BADGE_ERROR);assert.equal(badge.getAttribute('aria-invalid'),'true');assert.equal(document.getElementById('saveChanges').disabled,true);form.dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saves,0);}
    badge.value='Moonlight 💜';badge.dispatchEvent(new window.Event('input',{bubbles:true}));await flush();assert.equal(document.getElementById('badgeError').textContent,'');assert.equal(document.getElementById('saveChanges').disabled,false);form.dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saves,1);const background=document.getElementById('backgroundKind');background.value='preset';background.dispatchEvent(new window.Event('change',{bubbles:true}));await flush();assert.equal(document.querySelector('.preview-stage .profile-background-preset').hidden,false);assert.equal(JSON.parse(sessionStorage.getItem('ascendo-editor-draft')).config.background.preset,'flux-lines');form.dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();assert.equal(saves,2);assert.equal(lastSavedConfig.background.preset,'flux-lines');
  });
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{
  for(const window of windows)await window.happyDOM.close();
}




