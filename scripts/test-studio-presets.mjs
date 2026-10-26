import fs from 'node:fs';import assert from 'node:assert/strict';import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Preset UI checks run only on GitHub Actions.');
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats,browser=await launchCaptureBrowser(),results=[];
fs.mkdirSync('test-results/capture',{recursive:true});
try{
 const page=await browser.newPage();page.on('dialog',d=>d.accept());await page.setRequestInterception(true);
 page.on('request',r=>{const u=new URL(r.url());if(u.hostname!=='ascendo.lol')return r.abort();if(r.isNavigationRequest())return r.respond({status:200,contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/editor.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/studio-presets.css"></head><body class="page page--editor"><header class="studio-header"><div class="studio-header__actions"></div></header></body></html>'});const asset=publicAsset(process.cwd(),u.pathname);return asset?r.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)}):r.abort();});
 for(const width of [1280,390,320]){
  await page.setViewport({width,height:800});await page.goto('https://ascendo.lol/customize/',{waitUntil:'networkidle0'});
  await page.evaluate(async config=>{const {createStudioPresets}=await import('/studio-presets.mjs');const items=[];window.presetFixture={calls:[],loaded:null};createStudioPresets({getDraft:()=>({...config,bio:'Unpublished current draft'}),loadDraft:next=>{window.presetFixture.loaded=next;},request:async(path,options)=>{window.presetFixture.calls.push({path,method:options?.method||'GET'});if(options?.method==='POST'){items.push({id:'fixture',name:options.body.name,config:options.body.config});return items[0];}if(path.endsWith('/fixture'))return items[0];return items;}});},seed);
  await page.click('#profilePresets');await page.type('dialog input','My saved profile');await page.click('dialog button[type=submit]');await page.waitForFunction(()=>document.querySelector('.studio-presets__row'));
  const overflow=await page.evaluate(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth+1);assert.equal(overflow,false);
  await page.screenshot({path:'test-results/capture/presets-'+width+'.png',fullPage:true});
  await page.click('.studio-presets__actions button:first-child');await page.waitForFunction(()=>!document.querySelector('dialog').open);
  const state=await page.evaluate(()=>({loaded:window.presetFixture.loaded.bio,privateOnly:window.presetFixture.calls.every(c=>c.path.startsWith('/presets')),focus:document.activeElement.id}));
  assert.equal(state.loaded,'Unpublished current draft');assert.equal(state.privateOnly,true);assert.equal(state.focus,'profilePresets');results.push({width,...state});
  await page.click('#profilePresets');await page.keyboard.press('Escape');assert.equal(await page.$eval('dialog',d=>d.open),false);
 }
 await page.close();
}finally{await browser.close();}
console.log(JSON.stringify({presetBrowserChecks:results}));
