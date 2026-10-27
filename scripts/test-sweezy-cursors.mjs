import fs from 'node:fs';import assert from 'node:assert/strict';import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Native cursor checks run only on GitHub Actions.');
fs.mkdirSync('test-results/capture',{recursive:true});const browser=await launchCaptureBrowser(),requests=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1200,height:900});await page.setRequestInterception(true);
 page.on('request',request=>{const u=new URL(request.url());if(u.hostname!=='ascendo.lol')return request.abort();requests.push(u.pathname);if(request.isNavigationRequest())return request.respond({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts.css"><style>body{font:14px DM Sans,system-ui;background:#09080f;color:#eee;margin:30px}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pack{background:#19131f;border:1px solid #ffffff20;padding:18px;border-radius:16px;text-align:center;min-height:125px}img{width:48px;height:48px;object-fit:contain;margin:8px}h2{font-size:12px;line-height:1.5;font-weight:500}h1{font-size:24px}</style></head><body><h1>Sweezy · All-time top 30</h1><main></main></body></html>'});const file=publicAsset(process.cwd(),u.pathname);return file?request.respond({status:200,contentType:file.mime,body:fs.readFileSync(file.target)}):request.abort();});
 await page.goto('https://ascendo.lol/sweezy-fixture/',{waitUntil:'networkidle0'});
 const result=await page.evaluate(async()=>{
  const {CURSOR_PACKS}=await import('/cursor-packs.mjs?v=20261027-5'),{prepareNativeCursor,preparedCursorPair}=await import('/cursor-pack-runtime.mjs?v=20261027-5');const report=[];
  for(const [id,pack]of Object.entries(CURSOR_PACKS)){
   for(const size of [12,24,40]){const config={style:id,size};await prepareNativeCursor(config,document);const pair=preparedCursorPair(config);for(const [kind,value]of Object.entries(pair)){const match=value.match(/^url\("(data:image\/png;base64,[^"]+)"\) (\d+) (\d+), (auto|pointer)$/);if(!match)throw Error('Invalid native PNG cursor');const img=new Image();img.src=match[1];await img.decode();if(Math.max(img.naturalWidth,img.naturalHeight)!==size||+match[2]>=img.naturalWidth||+match[3]>=img.naturalHeight)throw Error('Invalid native cursor dimensions/hotspot');}report.push({id,size});}
   const card=document.createElement('section');card.className='pack';const title=document.createElement('h2');title.textContent=pack.rank+'. '+pack.name;for(const kind of ['cursor','pointer']){const img=document.createElement('img');img.src=pack[kind].path;img.alt=kind;card.append(img);}card.append(title);document.querySelector('main').append(card);
  }
  await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;return report;
 });
 assert.equal(result.length,90);assert.ok(requests.every(path=>!path.includes('sweezy-cursors.com')));await page.screenshot({path:'test-results/capture/sweezy-top30.png',fullPage:true});fs.writeFileSync('test-results/capture/sweezy-results.json',JSON.stringify(result));console.log(JSON.stringify({packs:30,decodedNativePairs:90,checkedSizes:[12,24,40],remoteRequests:0}));await page.close();
}finally{await browser.close();}
