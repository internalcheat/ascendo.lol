import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {normalizeProfile} from '../profile-schema.mjs';
import {renderProfileDocument} from '../profile-document.mjs';
import {OVERLAY_PRESETS} from '../visual-schema.mjs';
import {Window} from 'happy-dom';

if(process.env.GITHUB_ACTIONS!=='true')throw Error('Interface checks require isolated GitHub Actions browsers.');
const root=process.cwd(),output='test-results/site-audit';fs.mkdirSync(output,{recursive:true});
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats;
const saved=normalizeProfile({...seed,badge:'',background:{kind:'black'},overlays:{enabled:false},enterScreen:{enabled:false}});
const template=fs.readFileSync('profile-shell.html','utf8'),errors=[],reports=[],writes=[];
const browser=await launchCaptureBrowser();let page;
async function fixture(editor=false){
 const context=await browser.createBrowserContext(),p=await context.newPage();
 p.on('pageerror',e=>errors.push({page:p.url(),message:e.message}));
 p.on('dialog',d=>d.accept());
 if(editor)await p.evaluateOnNewDocument(()=>sessionStorage.setItem('ascendo-editor-session',JSON.stringify({access_token:'isolated-audit-fixture',refresh_token:'isolated-audit-fixture',expires_at:Date.now()/1000+3600})));
 await p.setRequestInterception(true);
 p.on('request',request=>{(async()=>{
  const u=new URL(request.url()),method=request.method();
  if(u.hostname==='fstdttaxflayhtwhnbih.supabase.co'&&u.pathname.startsWith('/functions/v1/profile-api')){
   const route=u.pathname.split('/profile-api')[1],headers={'Access-Control-Allow-Origin':'https://ascendo.lol','Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,OPTIONS'};
   if(method==='OPTIONS')return request.respond({status:204,headers});
   let data;
   if(route.startsWith('/public/'))data={config:saved,revision:17};
   else if(!editor)return request.respond({status:401,contentType:'application/json',headers,body:'{"error":"Please sign in again."}'});
   else if(route==='/me'&&method==='GET')data={slug:'audit-fixture',config:saved,defaults:saved,previous:saved,revision:17,usage:0,capabilities:{canUseReservedBadges:false}};
   else if(route==='/uploads'||route==='/presets')data=[];
   else if(route==='/preferences'){data={language:method==='PUT'?JSON.parse(request.postData()).language:'en'};}
   else if(route==='/status')data={ready:true};
   else throw Error('Unexpected fixture API operation '+method+' '+route);
   if(method!=='GET')writes.push({route,method});
   return request.respond({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
  }
  if(u.hostname!=='ascendo.lol')return request.abort();
  if(request.isNavigationRequest()){
   const file=u.pathname==='/audit-profile/'?null:path.resolve(root,'.'+u.pathname, u.pathname.endsWith('/')?'index.html':'');
   const html=u.pathname==='/audit-profile/'?renderProfileDocument(template,'audit-profile',{config:saved,revision:17}):file.startsWith(root+path.sep)&&fs.existsSync(file)?fs.readFileSync(file,'utf8'):fs.readFileSync('404.html','utf8');
   return request.respond({status:200,contentType:'text/html',body:html});
  }
  const asset=publicAsset(root,u.pathname);return asset?request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)}):request.abort();
 })().catch(error=>{errors.push({request:request.url(),message:error.message});request.abort().catch(()=>{});});});
 return {page:p,context};
}
async function layout(p,label,width){
 await p.setViewport({width,height:900,isMobile:width<700,hasTouch:width<700});
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const result=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,duplicateIds:[...document.querySelectorAll('[id]')].map(n=>n.id).filter((id,i,ids)=>ids.indexOf(id)!==i),unsafeLinks:[...document.querySelectorAll('a[target="_blank"]')].filter(n=>!n.rel.split(/\s+/).includes('noopener')).map(n=>n.getAttribute('href')),unlabeledButtons:[...document.querySelectorAll('button')].filter(n=>n.getClientRects().length&&!n.disabled&&!n.textContent.trim()&&!n.getAttribute('aria-label')&&!n.getAttribute('aria-labelledby')&&!n.title).map(n=>n.id||n.className)}));
 reports.push({page:label,...result});
 if(result.overflow)await p.screenshot({path:output+'/'+label.replaceAll('/','-')+'-'+width+'-overflow.png',fullPage:true});
 assert.equal(result.overflow,false,JSON.stringify({page:label,...result}));assert.deepEqual(result.duplicateIds,[]);assert.deepEqual(result.unsafeLinks,[]);assert.deepEqual(result.unlabeledButtons,[]);
}
try{
 ({page}=await fixture());
 for(const route of ['/','/plugins/','/login/','/chess/','/404.html','/audit-profile/']){
  await page.setViewport({width:1440,height:900});await page.goto('https://ascendo.lol'+route,{waitUntil:'networkidle0'});
  for(const width of [1440,1024,768,390,320])await layout(page,route,width);
  if(route==='/plugins/'){
   const jars=await page.$$eval('a[download]',nodes=>nodes.map(n=>({href:n.href,download:n.getAttribute('download')})));assert.equal(jars.length,5);assert.ok(jars.every(n=>new URL(n.href).origin==='https://ascendo.lol'&&new URL(n.href).pathname.startsWith('/downloads/')&&new URL(n.href).pathname.endsWith('.jar')));
  }
  if(route==='/audit-profile/'){
   assert.equal(await page.$$eval('audio[data-profile-music]',nodes=>nodes.length),1);
   const before=await page.$eval('#musicBackground',n=>{window.auditVideo=n;return n.getAttribute('src');});
   await page.evaluate(()=>{dispatchEvent(new Event('focus'));dispatchEvent(new Event('pageshow'));});
   assert.equal(await page.$eval('#musicBackground',n=>n===window.auditVideo),true);assert.equal(await page.$eval('#musicBackground',n=>n.getAttribute('src')),before);
  }
 }
 const editor=await fixture(true);page=editor.page;await page.setViewport({width:1440,height:1000});await page.goto('https://ascendo.lol/customize/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.getElementById('editorContent').hidden);
 for(const width of [1440,1024,768,390,320]){
  for(const category of ['profile','appearance','backgrounds','widgets','effects','media']){
   await page.$eval('[data-category="'+category+'"]',n=>n.click());
   await page.evaluate(()=>{for(const n of document.querySelectorAll('.studio-section:not([hidden]) .studio-disclosure[aria-expanded=false]'))n.click();});
   await layout(page,'studio-'+category,width);
  }
 }
 await page.setViewport({width:1440,height:1000});await page.$eval('[data-category=effects]',n=>n.click());
 for(const preset of OVERLAY_PRESETS){
  await page.$eval('[data-overlay-preset="'+preset+'"]',n=>n.click());
  await page.waitForFunction(p=>document.querySelector('[data-preset="'+p+'"]'),{},preset);
  await page.$eval('[data-preset="'+preset+'"] [data-layer-field=opacity]',n=>{n.value=73;n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>{const n=document.querySelector('.preview-card .profile-overlay-presets');return n&&n.width>1&&!n.closest('.profile-atmosphere').hidden;});
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  const layer=await page.$eval('[data-preset="'+preset+'"]',n=>({enabled:n.querySelector('[data-layer-field=enabled]').checked,opacity:Number(n.querySelector('[data-layer-field=opacity]').value)}));assert.deepEqual(layer,{enabled:true,opacity:73});
  await page.$eval('[data-preset="'+preset+'"] [data-layer-field=enabled]',n=>n.click());assert.equal(await page.$eval('[data-preset="'+preset+'"] [data-layer-field=opacity]',n=>n.disabled),true);
  await page.$eval('[data-preset="'+preset+'"] [data-layer-action="0"]',n=>n.click());
 }
 assert.equal(writes.some(w=>w.route!=='/preferences'),false,'Preview must never publish');
 const name=await page.$eval('#displayName',n=>n.value);await page.click('#studioLanguage');await page.waitForFunction(()=>document.documentElement.lang==='hu');assert.equal(await page.$eval('#displayName',n=>n.value),name);await page.click('#studioLanguage');await page.waitForFunction(()=>document.documentElement.lang==='en');
 await page.click('#quickGuide');await page.waitForSelector('.studio-guide[open]');await page.keyboard.press('Escape');assert.equal(await page.$eval('.studio-guide',n=>n.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'quickGuide');assert.equal(await page.$eval('#displayName',n=>n.value),name);
 await page.$eval('#expandPreview',n=>n.click());await page.waitForSelector('#previewDialog[open]');await page.keyboard.press('Escape');assert.equal(await page.$eval('#previewDialog',n=>n.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'expandPreview');
 // Untrusted text is never interpreted as markup, including saved HTML bootstrap.
 const hostile={...saved,name:'<img src=x onerror=alert(1)>',bio:'</script><img src=x onerror=alert(1)>\n[unsafe](javascript:alert(1))',badge:'<svg onload=alert(1)>',socials:[{icon:'website',label:'<img src=x>',handle:'<svg onload=alert(1)>',action:'link',value:'https://example.com/'}]};
 const rendered=renderProfileDocument(template,'audit-fixture',{config:hostile,revision:17}),win=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});win.document.write(rendered);assert.equal(win.document.querySelectorAll('[onload],[onerror],img[src="x"],a[href^="javascript:"]').length,0);assert.equal(JSON.parse(win.document.getElementById('profileBootstrap').textContent).config.bio,hostile.bio);win.happyDOM.close();
 await page.screenshot({path:output+'/studio-desktop.png',fullPage:true});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await layout(page,'studio-reduced-motion',320);await page.screenshot({path:output+'/studio-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(output+'/interface.json',JSON.stringify({reports,overlays:OVERLAY_PRESETS,writes,errors},null,2));console.log(JSON.stringify({layouts:reports.length,overlays:OVERLAY_PRESETS.length,privatePreview:true,errors}));
}catch(error){if(page)await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync(output+'/failure.json',JSON.stringify({message:error.message,stack:error.stack,reports,errors},null,2));throw error;}
finally{await browser.close();}
