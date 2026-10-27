import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {renderProfileDocument} from '../profile-document.mjs';
import {normalizeProfile} from '../profile-schema.mjs';
import {themePalette,channels} from '../profile-palette.mjs';

if(process.env.GITHUB_ACTIONS!=='true')throw Error('Native volume checks run only on GitHub Actions.');
const root=process.cwd(),seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats;
const template=fs.readFileSync('profile-shell.html','utf8').replace(/<script type="module" src="\/profile-client[^<]+<\/script>/,'');
const browser=await launchCaptureBrowser(),reports=[],errors=[];
fs.mkdirSync('test-results/volume',{recursive:true});
try{
 for(const [width,theme]of [[1280,'original'],[768,'custom'],[390,'original'],[320,'monochrome']]){
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height:800});
  const config=normalizeProfile({...seed,colorTheme:theme,background:{kind:'video',url:'https://ascendo.lol/assets/mypfp.mp4'},music:{source:'mp3',url:'https://ascendo.lol/assets/entry-sounds/pulse.wav',volume:37}});
  const html=renderProfileDocument(template,'volume-fixture',{revision:1,config});
  await page.setRequestInterception(true);page.on('request',request=>{
   const u=new URL(request.url());if(u.hostname!=='ascendo.lol')return request.abort();
   if(request.isNavigationRequest())return request.respond({status:200,contentType:'text/html',body:html});
   if(['/assets/mypfp.mp4','/assets/entry-sounds/pulse.wav'].includes(u.pathname))return request.respond({status:200,contentType:u.pathname.endsWith('.mp4')?'video/mp4':'audio/wav',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync('.'+u.pathname)});
   const asset=publicAsset(root,u.pathname);return asset?request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)}):request.abort();
  });
  await page.goto('https://ascendo.lol/volume-fixture/',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.getElementById('musicBackground').profileMusicPlayer&&!document.getElementById('mediaControls').hidden);
  await page.evaluate(({theme,palette,rgb,secondary})=>{document.body.dataset.profileTheme=theme;for(const [key,value]of Object.entries({'--profile-accent':palette.primary,'--profile-secondary':palette.secondary,'--accent-rgb':rgb,'--secondary-rgb':secondary}))document.body.style.setProperty(key,value);},{theme,palette:themePalette(config),rgb:channels(themePalette(config).primary).join(','),secondary:channels(themePalette(config).secondary).join(',')});
  const frames=await page.evaluate(()=>new Promise(resolve=>{
   const control=document.getElementById('mediaControls'),input=document.getElementById('volumeControl'),values=[];let start;
   control.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));
   function tick(time){start??=time;const r=input.getBoundingClientRect();values.push({time:time-start,left:r.left,width:r.width,control:control.getBoundingClientRect().width});if(time-start<400)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);
  }));
  const spread=key=>Math.max(...frames.map(f=>f[key]))-Math.min(...frames.map(f=>f[key]));
  assert.ok(frames.length>5);assert.ok(spread('width')<.1,'Track width must stay stable during opening');assert.ok(spread('left')<.1,'Thumb boundary must not slide during opening');
  assert.ok(frames.at(-1).control>=212);assert.ok(frames.some(f=>f.control>50&&f.control<200),'Disclosure should interpolate');
  // Reverse opening/closing from its current position, with no one-frame jump.
  const reversals=await page.evaluate(()=>new Promise(resolve=>{
   const control=document.getElementById('mediaControls'),samples=[];let start,stage=0;
   control.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));
   function tick(time){start??=time;const elapsed=time-start;if(elapsed>70&&stage===0){stage=1;control.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));}if(elapsed>140&&stage===1){stage=2;control.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));}samples.push({time,width:control.getBoundingClientRect().width});if(elapsed<550)requestAnimationFrame(tick);else resolve(samples);}requestAnimationFrame(tick);
  }));
  for(let i=1;i<reversals.length;i++)if(reversals[i].time-reversals[i-1].time<35)assert.ok(Math.abs(reversals[i].width-reversals[i-1].width)<100,'Rapid reversal must not snap');
  await page.click('#volumeButton');await page.waitForFunction(()=>document.getElementById('mediaControls').getBoundingClientRect().width>=211);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,350)));
  await page.evaluate(()=>{
   window.volumeSamples=[];const input=document.getElementById('volumeControl'),video=document.getElementById('musicBackground');
   window.volumeMedia={src:video.src,audio:video.profileMusicPlayer.current(),loads:0};video.addEventListener('emptied',()=>window.volumeMedia.loads++);
   input.addEventListener('input',()=>{const media=video.profileMusicPlayer.current();window.volumeSamples.push({value:input.valueAsNumber,actual:media.volume*100,fill:parseFloat(input.style.getPropertyValue('--volume'))*70/100,muted:media.muted});});
   input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const box=await page.$eval('#volumeControl',n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
  await page.mouse.move(box.x+7,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width-7,box.y+box.height/2,{steps:28});await page.mouse.up();
  const samples=await page.evaluate(()=>window.volumeSamples);
  assert.ok(samples.length>15);assert.ok(samples.some(s=>Math.abs(s.value-Math.round(s.value))>.01),'Pointer travel should retain fractional precision');
  for(const s of samples){assert.ok(s.actual<=70);assert.ok(Math.abs(s.actual-s.value)<.0001,'Actual audio volume updates immediately');assert.ok(Math.abs(s.fill-s.value)<.0001,'Fill and thumb stay synchronized');}
  await page.focus('#volumeControl');
  for(const [key,expected]of [['Home',0],['End',70],['PageDown',60],['ArrowLeft',59],['ArrowUp',60]]){
   await page.keyboard.press(key);const state=await page.evaluate(()=>{const input=document.getElementById('volumeControl'),m=document.getElementById('musicBackground').profileMusicPlayer.current();return{value:input.valueAsNumber,volume:m.volume*100,muted:m.muted,label:input.getAttribute('aria-valuetext')};});
   assert.equal(state.value,expected);assert.ok(Math.abs(state.volume-expected)<.00001);assert.equal(state.muted,expected===0);assert.equal(state.label,expected===0?'Muted':`${expected} percent`);
  }
  await page.keyboard.press('Escape');assert.equal(await page.$eval('#volumeButton',n=>n.getAttribute('aria-expanded')),'false');assert.equal(await page.evaluate(()=>document.activeElement.id),'volumeButton');
  assert.equal(await page.$eval('#volumePanel',n=>n.inert&&n.getAttribute('aria-hidden')==='true'),true);
  const continuity=await page.evaluate(()=>{const v=document.getElementById('musicBackground');return{sameSource:v.src===window.volumeMedia.src,sameAudio:v.profileMusicPlayer.current()===window.volumeMedia.audio,loads:window.volumeMedia.loads,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.deepEqual(continuity,{sameSource:true,sameAudio:true,loads:0,overflow:false});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.click('#volumeButton');assert.equal(await page.$eval('#mediaControls',n=>getComputedStyle(n).transitionDuration),'0s');
  await page.screenshot({path:`test-results/volume/volume-${width}.png`});
  // Touch toggles and outside dismissal use the same disclosure state.
  await page.keyboard.press('Escape');await page.mouse.move(0,0);await page.setViewport({width:390,height:800,isMobile:true,hasTouch:true});
  await page.tap('#volumeButton');assert.equal(await page.$eval('#volumeButton',n=>n.getAttribute('aria-expanded')),'true');
  await page.touchscreen.tap(10,300);assert.equal(await page.$eval('#volumeButton',n=>n.getAttribute('aria-expanded')),'false');
  reports.push({width,theme,frames:frames.length,trackWidthVariation:spread('width'),trackPositionVariation:spread('left'),inputEvents:samples.length,continuity,touch:true,reducedMotion:true});
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
fs.writeFileSync('test-results/volume/results.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({volumeChecks:reports.length,passed:true,reports}));
