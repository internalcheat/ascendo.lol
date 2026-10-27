import fs from 'node:fs';import assert from 'node:assert/strict';import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {normalizeProfile} from '../profile-schema.mjs';import {appearanceProfile} from '../tests/fixtures/appearance-profile.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Appearance browser checks run only on GitHub Actions.');
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats,base=normalizeProfile({...seed,name:'Saved profile',badge:'',background:{kind:'black'},music:{source:'video',volume:31}});
const origin='https://fstdttaxflayhtwhnbih.supabase.co',prefix=origin+'/storage/v1/object/public/profile-media/',owner='11111111-1111-4111-8111-111111111111';
const files=new Map(),assets=(suffix)=>{
 const id=kind=>`22222222-2222-4222-8222-2222222222${suffix}${kind}`;
 const put=(kind,extension,file,mime)=>{const path=owner+'/'+id(kind)+'.'+extension,url=prefix+path;files.set(path,{url,path,id:id(kind),kind:kind==='1'?'avatar':kind==='2'?'video':'poster',bytes:fs.statSync(file).size,body:fs.readFileSync(file),mime});return url;};
 return {avatar:{url:put('1','png',suffix==='a'?'assets/k3rlsen-avatar.png':'assets/ascendo-icon-32.png','image/png'),poster:'',x:35,y:65},background:{kind:'video',url:put('2','mp4','assets/mypfp.mp4','video/mp4'),poster:put('3','jpg','assets/mypfp-poster.jpg','image/jpeg'),mobile:''}};
};
const a=appearanceProfile(seed,{...assets('a'),name:'Preset A'}),b=appearanceProfile(seed,{...assets('b'),name:'Preset B',cardLayout:'portrait',electricBorder:{...a.electricBorder,style:'plasma'}});
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
const items=[{id:ids[0],name:'First complete profile',config:a,version:1},{id:ids[1],name:'Second complete profile',config:b,version:1}],calls=[],results=[],errors=[];let lease=0,post=0;
fs.mkdirSync('test-results/capture',{recursive:true});const browser=await launchCaptureBrowser();
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{if(d.type()==='beforeunload')return d.accept();errors.push('Unexpected native confirmation');d.dismiss();});
 await page.evaluateOnNewDocument(()=>{sessionStorage.setItem('ascendo-editor-session',JSON.stringify({access_token:'isolated-ci-fixture',refresh_token:'isolated-ci-fixture',expires_at:Date.now()/1000+3600}));});
 await page.setRequestInterception(true);page.on('request',request=>{(async()=>{
  const u=new URL(request.url()),headers={'Access-Control-Allow-Origin':'https://ascendo.lol','Cache-Control':'no-store'};
  if(u.hostname===new URL(origin).hostname&&u.pathname.startsWith('/functions/v1/profile-api')){
   const route=u.pathname.slice('/functions/v1/profile-api'.length),method=request.method();calls.push({route,method});let data;
   if(method==='OPTIONS')return request.respond({status:204,headers:{...headers,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS'}});
   if(route==='/me'&&method==='GET')data={slug:'internalcheats',revision:11,config:base,defaults:base,usage:0,capabilities:{canUseReservedBadges:true}};
   else if(route==='/preferences')data={language:'en'};
   else if(route==='/uploads'){lease++;data=[...files.values()].map(f=>({id:f.id,url:f.url,state:'ready',kind:f.kind,bytes:f.bytes,preview:origin+'/storage/v1/object/sign/profile-drafts/'+f.path+'?token=fixture-'+lease}));}
   else if(route==='/presets'&&method==='POST'){const body=JSON.parse(request.postData());post++;const item={id:'cccccccc-cccc-4ccc-8ccc-'+String(post).padStart(12,'0'),name:body.name,config:body.config,version:1};items.push(item);data={id:item.id,name:item.name,version:1};}
   else if(route==='/presets')data=items.map(({id,name,version})=>({id,name,version}));
   else if(route.startsWith('/presets/')&&['PATCH','PUT'].includes(method)){const body=JSON.parse(request.postData()),item=items.find(x=>x.id===route.slice(9));assert.equal(body.version,item.version);if(method==='PATCH')item.name=body.name;else item.config=body.config;item.version++;data=item;}
   else if(route.startsWith('/presets/'))data=items.find(x=>x.id===route.slice(9));
   else return request.respond({status:400,contentType:'application/json',headers,body:JSON.stringify({error:'Unexpected fixture request'})});
   return request.respond({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
  }
  if(u.hostname===new URL(origin).hostname&&u.pathname.startsWith('/storage/')){
   const path=u.pathname.split(/profile-(?:media|drafts)\//)[1],file=files.get(path);if(!file)return request.abort();
   // Old private leases are deliberately invalidated when the library refreshes.
   if(u.searchParams.has('token')&&u.searchParams.get('token')!=='fixture-'+lease)return request.respond({status:403,headers,body:'Expired fixture lease'});
   return request.respond({status:200,contentType:file.mime,headers,body:file.body});
  }
  if(u.hostname!=='ascendo.lol')return request.abort();
  if(request.isNavigationRequest())return request.respond({status:200,contentType:'text/html',body:fs.readFileSync('customize/index.html','utf8')});
  const asset=publicAsset(process.cwd(),u.pathname);return asset?request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)}):request.abort();
 })().catch(error=>{errors.push(error.message);request.abort().catch(()=>{});});});
 async function load(index){
  await page.click('#profilePresets');await page.waitForSelector('.studio-presets__row');await page.waitForFunction(()=>document.querySelector('.studio-presets').getAttribute('aria-busy')==='false');
  await page.evaluate(i=>document.querySelectorAll('.studio-presets__row')[i].querySelector('.studio-presets__body .studio-presets__actions button').click(),index);
  await page.click('.studio-presets__confirm button:last-child');await page.waitForFunction(()=>!document.querySelector('.studio-presets').open);
  const expected=items[index].config;
  await page.waitForFunction(name=>document.getElementById('displayName').value===name,{},expected.name);
  await page.waitForFunction(()=>{const v=document.getElementById('previewVideo'),img=document.querySelector('#previewCard .avatar img');return v.readyState>=2&&v.videoWidth>0&&img?.complete&&img.naturalWidth>0;});
  const state=await page.evaluate(()=>({video:document.getElementById('previewVideo').getAttribute('src'),avatar:document.querySelector('#previewCard .avatar img').src,volume:document.getElementById('previewVideo').volume,videoSaved:document.getElementById('videoUrl').value,avatarSaved:document.getElementById('avatarUrl').value}));
  assert.ok(state.video.endsWith('token=fixture-'+lease));assert.ok(state.avatar.endsWith('token=fixture-'+lease));assert.equal(state.videoSaved,expected.background.url);assert.equal(state.avatarSaved,expected.avatar.url);assert.equal(state.volume,.31);return state;
 }
 for(const width of [1280,390,320]){
  await page.setViewport({width,height:900,isMobile:width<500,hasTouch:width<500});await page.goto('https://ascendo.lol/customize/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.getElementById('editorContent').hidden);
  await page.evaluate(()=>{window.navigationFixture={video:document.getElementById('previewVideo'),draft:sessionStorage.getItem('ascendo-editor-draft')};});
  const navigationVisible=await page.$$eval('.studio-nav-button',nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));assert.ok(navigationVisible,'All six categories fit without horizontal scrolling');
  await page.click('.studio-jump .studio-select');await page.keyboard.type('Fonts');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>{const section=document.getElementById('studio-section-fonts'),box=section.getBoundingClientRect(),nav=document.querySelector('.studio-navigation').getBoundingClientRect();return !section.hidden&&section.dataset.expanded==='true'&&box.top>=nav.bottom+8&&box.top<innerHeight;});
  assert.equal(await page.$eval('#studioSectionJump',node=>node.form===null),true);
  await page.screenshot({path:`test-results/capture/studio-navigation-${width}.png`,fullPage:true});
  await page.click('#studioSearch');await page.type('#studioSearch','cursor');await page.waitForFunction(()=>!document.getElementById('studio-section-cursor').hidden);await page.click('#studioClearSearch');assert.equal(await page.$eval('#studioSearch',node=>node.value),'');
  await page.evaluate(()=>{for(const category of ['effects','backgrounds','widgets','profile','appearance'])document.querySelector(`[data-category="${category}"]`).click();});
  await page.waitForFunction(()=>document.querySelectorAll('.studio-section').length>0&&[...document.querySelectorAll('.studio-section')].every(node=>node.getAnimations().length===0));
  if(width<500){await page.click('#previewTab');assert.equal(await page.$eval('#studioGrid',node=>node.dataset.tab),'preview');await page.click('#editTab');}
  assert.equal(await page.evaluate(()=>window.navigationFixture.video===document.getElementById('previewVideo')&&window.navigationFixture.draft===sessionStorage.getItem('ascendo-editor-draft')),true);
  await page.click('#profilePresets');await page.waitForFunction(()=>document.querySelector('.studio-presets').getAttribute('aria-busy')==='false');const focusBefore=await page.evaluate(()=>document.activeElement===document.querySelector('.studio-presets input'));await page.keyboard.down('Control');await page.keyboard.press('k');await page.keyboard.up('Control');assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.studio-presets input')),focusBefore);await page.keyboard.press('Escape');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.click('[data-category=effects]');assert.equal(await page.$$eval('.studio-section',nodes=>nodes.every(node=>node.getAnimations().length===0)),true);await page.emulateMediaFeatures([]);
  const first=await load(0),second=await load(1),restored=await load(0);assert.notEqual(first.video,second.video);assert.notEqual(second.avatar,restored.avatar);
  const beforeStyle=await page.$eval('#previewVideo',v=>v.getAttribute('src'));
  await page.evaluate(()=>{const change=(id,value)=>{const c=document.getElementById(id);c.value=value;c.dispatchEvent(new Event(c.tagName==='SELECT'?'change':'input',{bubbles:true}));};change('backgroundAppearanceBlur','14');change('glassBlur','18');change('electricBorderStyle','circuit');change('avatarFrameStyle','dashed');});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('previewStage')).filter.includes('blur(14px)'));
  assert.equal(await page.$eval('#previewVideo',v=>v.getAttribute('src')),beforeStyle);
  assert.equal(await page.$eval('#previewCard .avatar img',v=>getComputedStyle(v).filter),'none');
  assert.equal(await page.$eval('#previewCard .profile-avatar-frame',n=>n.dataset.frameStyle),'dashed');
  await load(0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.click('#profilePresets');await page.waitForFunction(()=>document.querySelector('.studio-presets').getAttribute('aria-busy')==='false');await page.type('.studio-presets input','Complete snapshot '+width);const before=post;await page.click('.studio-presets button[type=submit]');await page.waitForFunction(()=>document.querySelector('.studio-presets .studio-status').textContent.includes('Preset saved.'));
  assert.equal(post,before+1);assert.deepEqual(normalizeProfile(items.at(-1).config),a);assert.equal(calls.filter(c=>c.method==='PUT'&&c.route==='/me').length,0);
  await page.waitForFunction(()=>document.querySelector('.preset-thumbnail .profile__name'));await page.screenshot({path:`test-results/capture/preset-full-${width}.png`,fullPage:true});await page.click('.studio-presets__heading button');
  const updated=items.at(-1),selector=`[data-preset-id="${updated.id}"]`;
  await page.evaluate(value=>{const field=document.getElementById('bio');field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));},'New unpublished bio '+width);
  await page.click('#profilePresets');await page.waitForFunction(()=>document.querySelector('.studio-presets').getAttribute('aria-busy')==='false');
  await page.click(selector+' [data-preset-menu]');await page.keyboard.press('Escape');assert.equal(await page.$eval(selector+' [data-preset-menu]',n=>n.getAttribute('aria-expanded')),'false');assert.equal(await page.$eval('.studio-presets',n=>n.open),true);
  await page.click(selector+' [data-preset-menu]');await page.click(selector+' [data-preset-action=rename]');await page.$eval('#presetRenameName',(n,value)=>{n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));},'Renamed snapshot '+width);await page.waitForFunction(()=>{const box=document.querySelector('.studio-presets__confirm').getBoundingClientRect(),dialog=document.querySelector('.studio-presets').getBoundingClientRect();return box.top>=dialog.top&&box.bottom<=dialog.bottom;});await page.screenshot({path:`test-results/capture/preset-rename-${width}.png`,fullPage:true});await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.studio-presets .studio-status').textContent.includes('Preset renamed.'));
  assert.equal(updated.version,2);assert.equal(updated.name,'Renamed snapshot '+width);assert.deepEqual(normalizeProfile(updated.config),a);
  await page.click(selector+' [data-preset-menu]');await page.click(selector+' [data-preset-action=update]');await page.click('.studio-presets__confirm button:last-child');await page.waitForFunction(()=>document.querySelector('.studio-presets .studio-status').textContent.includes('Preset updated.'));
  assert.equal(updated.version,3);assert.equal(updated.name,'Renamed snapshot '+width);assert.deepEqual(normalizeProfile(updated.config),normalizeProfile({...a,bio:'New unpublished bio '+width}));assert.equal(calls.filter(c=>c.method==='PUT'&&c.route==='/me').length,0);
  await page.click(selector+' [data-preset-menu]');await page.waitForFunction(()=>{const node=document.querySelector('.studio-presets__menu:not([hidden])');return node&&Number(getComputedStyle(node).opacity)===1;});await page.screenshot({path:`test-results/capture/preset-actions-${width}.png`,fullPage:true});assert.equal(await page.$eval('.studio-presets',n=>n.scrollWidth>n.clientWidth+1),false);await page.keyboard.press('Escape');await page.click('.studio-presets__heading button');
  await page.screenshot({path:`test-results/capture/appearance-${width}.png`,fullPage:true});results.push({width,navigation:true,reducedMotion:true,restoredVideo:true,restoredAvatar:true,completeSnapshot:true,rename:true,update:true,privateOnly:true});
 }
 assert.deepEqual(errors,[]);await page.close();
}catch(error){for(const p of await browser.pages())if(!p.isClosed())await p.screenshot({path:'test-results/capture/appearance-failure.png',fullPage:true}).catch(()=>{});console.error(JSON.stringify({errors,calls:calls.slice(-12)}));for(const p of await browser.pages())if(!p.isClosed())console.error(JSON.stringify(await p.evaluate(()=>({presetStatus:document.querySelector('.studio-presets .studio-status')?.textContent,name:document.querySelector('.studio-presets input')?.value,busy:document.querySelector('.studio-presets')?.getAttribute('aria-busy')})).catch(()=>({}))));throw error;}finally{await browser.close();}
fs.writeFileSync('test-results/capture/appearance-results.json',JSON.stringify(results));console.log(JSON.stringify({appearanceAndPresetBrowserChecks:results}));
