import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {renderProfileDocument} from '../profile-document.mjs';
import {normalizeProfile} from '../profile-schema.mjs';
import {LAYOUTS} from '../visual-schema.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Layout browser checks run only on GitHub Actions.');
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats;
const settings=(layout,style)=>normalizeProfile({...seed,name:'Layout check',background:{kind:'black'},cardLayout:layout,socialStyle:{enabled:style!=='default',layout:style==='default'?'rows':style,iconSize:24,radius:18},electricBorder:{enabled:true,color:'#8ddeff'},cardEffects:{enabled:true},music:{source:'mp3',url:'https://ascendo.lol/assets/entry-sounds/pulse.wav',volume:0},soundtrackCard:{enabled:true},widgets:{about:{enabled:true,text:'A separate widget beside the social links.'}}});
const html=renderProfileDocument(fs.readFileSync('profile-shell.html','utf8'),'share-fixture',{revision:1,config:settings('classic','rows')}).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const browser=await launchCaptureBrowser(),reports=[],errors=[];
fs.mkdirSync('test-results/capture',{recursive:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());if(url.hostname!=='ascendo.lol')return request.abort().catch(()=>{});
  if(request.isNavigationRequest())return request.respond({status:200,contentType:'text/html',body:html});
  const asset=publicAsset(process.cwd(),url.pathname);if(asset)return request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)});
  return request.abort().catch(()=>{});
 });
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto('https://ascendo.lol/share-fixture/',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  const {renderProfile}=await import('/profile-view.mjs?v=20261026-9');
  const {createProfileEffects}=await import('/profile-effects.mjs?v=20261026-9');
  const panel=document.querySelector('.profile__panel'),scope=panel.closest('.profile'),effects=createProfileEffects(panel,{scope});
  window.layoutFixture={panel,effects,apply(config){renderProfile(panel,config);effects.update(config);}};
 });
 for(const width of [1280,768,320]){
  await page.setViewport({width,height:900});
  for(const layout of LAYOUTS)for(const style of ['default','rows','pills','icons']){
   const config=settings(layout,style);
   await page.evaluate(config=>window.layoutFixture.apply(config),config);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>{
    const panel=window.layoutFixture.panel,links=[...panel.querySelectorAll('.social-link')],rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right};};
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,links:links.map(n=>({...rect(n),radius:getComputedStyle(n).borderTopLeftRadius,wrapperWidth:n.closest('.profile-tile-boundary')?.getBoundingClientRect().width,position:getComputedStyle(n).position,padding:getComputedStyle(n).paddingLeft})),borders:[...panel.querySelectorAll('.profile-electric')].map(svg=>{const t=svg.parentElement,v=svg.viewBox.baseVal;return {target:t.className,width:t.offsetWidth,height:t.offsetHeight,viewWidth:v.width,viewHeight:v.height,svg:rect(svg),box:rect(t),visible:getComputedStyle(t).overflow,path:svg.lastElementChild.getAttribute('d')};}),nested:panel.querySelectorAll('.profile-tile-boundary .profile-tile-boundary').length};
   });
   const context=JSON.stringify({width,layout,style,result});
   assert.equal(result.overflow,false,context);assert.equal(result.nested,0,context);assert.equal(result.borders.length,7,context);
   for(const b of result.borders){assert.equal(b.viewWidth,b.width+10,context);assert.equal(b.viewHeight,b.height+10,context);assert.ok(b.path?.length>100,context);assert.ok(Math.abs(b.svg.width-b.box.width-10)<2,context);assert.ok(Math.abs(b.svg.height-b.box.height-10)<2,context);assert.ok(Math.abs(b.svg.left-b.box.left+5)<2,context);}
   for(const link of result.links){assert.ok(link.width>40&&link.right<=width+1,context);if(style==='icons'){assert.ok(Math.abs(link.width-60)<1,context);assert.ok(Math.abs(link.height-60)<1,context);if(link.wrapperWidth)assert.ok(Math.abs(link.wrapperWidth-60)<1,context);}if(style==='rows'||style==='icons')assert.equal(link.radius,'18px',context);}
   reports.push({width,layout,style,passed:true});
   if(width===1280&&['bento','magazine','collage','numbers','portrait'].includes(layout)&&style==='icons'||width===320&&layout==='spine'&&style==='pills')await page.screenshot({path:'test-results/capture/layout-'+layout+'-'+width+'-'+style+'.png',fullPage:true});
  }
 }
 // Switch back and forth in the same DOM; no duplicates, stale contours or clipping.
 await page.evaluate(config=>window.layoutFixture.apply(config),settings('portrait','pills'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 const before=await page.$eval('.profile-electric path',n=>n.getAttribute('d'));
 await page.waitForFunction(before=>document.querySelector('.profile-electric path').getAttribute('d')!==before,{},before);
 await page.evaluate(config=>window.layoutFixture.apply({...config,electricBorder:{...config.electricBorder,enabled:false}}),settings('classic','rows'));
 assert.equal(await page.$$eval('.profile-electric,.profile-electric-target',nodes=>nodes.length),0);
 assert.deepEqual(errors,[]);await page.close();
}finally{await browser.close();}
fs.writeFileSync('test-results/capture/layout-social-borders.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({layoutSocialBorderCombinations:reports.length,passed:true}));
