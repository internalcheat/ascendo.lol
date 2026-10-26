import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {launchCaptureBrowser,publicAsset,captureProfile} from './profile-capture.mjs';
import {renderProfileDocument} from '../profile-document.mjs';
import {normalizeProfile} from '../profile-schema.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Native expression checks run only on GitHub Actions.');
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats;
const template=fs.readFileSync('profile-shell.html','utf8'),root=process.cwd(),browser=await launchCaptureBrowser(),reports=[];
fs.mkdirSync('test-results/capture',{recursive:true});
const settings=(finish='foil',layout='classic',buttons='rows')=>normalizeProfile({...seed,name:'InternalCheats',effect:'none',background:{kind:'black'},bio:'**Your profile.** *Your way.*\n> A little personality.\n[Ascendo](https://ascendo.lol/)',socialStyle:{enabled:true,layout:buttons,surface:'glass'},detailColors:{enabled:true,name:'#f2cb8f',handle:'#d9e2ff',icons:'#b5d6ff',bioLink:'#91ddc9',border:'#44506e'},richBio:{enabled:true,align:'center'},cardLayout:layout,holographic:{enabled:true,finish,intensity:30},musicReactive:{enabled:true,style:'waveform'},signature:{enabled:true,mode:'draw',color:'#f2cb8f',paths:[[[65,170],[90,90],[115,45],[100,170],[180,115],[200,150],[260,95],[260,160],[320,105],[340,150],[420,100],[480,155],[590,120],[710,155],[900,100]]]}});
try{
 for(const [finish,layout,buttons]of [['foil','classic','rows'],['pearl','bento','icons'],['brushed','portrait','pills']]){
  const config=settings(finish,layout,buttons),image=await captureProfile(browser,{slug:'share-fixture',revision:1,config});fs.writeFileSync('test-results/capture/expression-'+finish+'.png',image);
 }
 const context=await browser.createBrowserContext(),page=await context.newPage();let config=settings(),html=renderProfileDocument(template,'share-fixture',{revision:1,config});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.hostname!=='ascendo.lol')return request.abort().catch(()=>{});
  if(request.isNavigationRequest()&&request.frame()===page.mainFrame())return request.respond({status:200,contentType:'text/html',body:html});
  if(url.pathname==='/assets/entry-sounds/pulse.wav')return request.respond({status:200,contentType:'audio/wav',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync('assets/entry-sounds/pulse.wav')});
  const asset=publicAsset(root,url.pathname);if(asset)return request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)});
  return request.abort().catch(()=>{});
 });
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 for(const width of [1280,768,390,320]){
  for(const buttons of ['rows','pills','icons']){
   config=settings('foil','classic',buttons);html=renderProfileDocument(template,'share-fixture',{revision:1,config});await page.setViewport({width,height:860});await page.goto('https://ascendo.lol/share-fixture/',{waitUntil:'networkidle0',timeout:20000});await page.waitForFunction(()=>document.body.dataset.profileRevision==='1');
   const state=await page.evaluate(()=>{const p=document.querySelector('.profile__panel'),bio=p.querySelector('.profile__bio'),links=[...p.querySelectorAll('.social-link')];return {overflow:document.documentElement.scrollWidth>innerWidth+1,color:getComputedStyle(p.querySelector('h1')).color,buttons:links.length,rich:!!bio.querySelector('strong'),signature:!!p.querySelector('.profile-signature'),outOfCard:links.some(n=>n.getBoundingClientRect().right>innerWidth+1)};});
   assert.equal(state.overflow,false,JSON.stringify({width,buttons,state}));assert.equal(state.outOfCard,false);assert.equal(state.color,'rgb(242, 203, 143)');assert.equal(state.buttons,3);assert.equal(state.rich,true);assert.equal(state.signature,true);reports.push({width,buttons,...state});
   if(width===320&&buttons==='icons')await page.screenshot({path:'test-results/capture/expression-mobile.png',fullPage:true});
  }
 }
 // Real decoded sound, actual pointer activation, and a real Web Audio analyser.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await page.setViewport({width:1280,height:800});
 config=normalizeProfile({...settings(),music:{source:'mp3',url:'https://ascendo.lol/assets/entry-sounds/pulse.wav',volume:65}});
 html=renderProfileDocument(template,'share-fixture',{revision:1,config});await page.goto('https://ascendo.lol/share-fixture/',{waitUntil:'networkidle0',timeout:20000});await page.waitForFunction(()=>document.body.dataset.profileRevision==='1');
 await page.click('#volumeButton');await page.focus('#volumeControl');await page.keyboard.press('ArrowLeft');
 await page.waitForFunction(()=>document.querySelector('.profile-music-visual')?.dataset.reactiveState==='live',{timeout:10000});
 const audio=await page.evaluate(()=>{const m=document.querySelector('[data-profile-music]'),c=document.querySelector('.profile-music-visual'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let colored=0;for(let i=3;i<data.length;i+=4)if(data[i])colored++;return {paused:m.paused,volume:m.volume,ready:m.readyState,state:c.dataset.reactiveState,colored};});
 assert.equal(audio.paused,false);assert.ok(audio.volume>0&&audio.volume<=.7);assert.equal(audio.state,'live');assert.ok(audio.colored>0);assert.deepEqual(errors,[]);
 reports.push({realAudio:audio});await context.close();
}finally{await browser.close();}
fs.writeFileSync('test-results/capture/expression-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({expressionChecks:reports.length,passed:true}));
