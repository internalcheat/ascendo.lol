import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {replayBotRecord,BOT_SAVE_KEY} from '../chess/bot-game.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Bot browser checks run only on GitHub Actions.');
const root=process.cwd(),requests=[],apiRequests=[],errors=[],reports=[];let failWasm=false;
fs.mkdirSync('test-results/chess-bots',{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
 if(failWasm&&url.pathname.endsWith('.wasm')){res.writeHead(503);res.end();return;}
 let asset=url.pathname==='/chess/'?{target:path.join(root,'chess/index.html'),mime:'text/html'}:publicAsset(root,url.pathname);
 if(!asset&&url.pathname.startsWith('/chess/vendor/stockfish/')){
   const name=url.pathname.split('/').at(-1),allowed=new Set(['README.md','Copying.txt','manifest.json','nn-61e7af4bb97d.nnue','stockfish-19.0.1-source.tar.gz']);
   if(allowed.has(name))asset={target:path.join(root,'chess/vendor/stockfish',name),mime:name.endsWith('.gz')?'application/gzip':name.endsWith('.json')?'application/json':'text/plain'};
 }
 if(!asset){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':asset.mime,'Cache-Control':'no-store'});res.end(fs.readFileSync(asset.target));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,browser=await launchCaptureBrowser();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),square=name=>`#board [data-square="${name}"]`;let page;
async function newPage(){const context=await browser.createBrowserContext(),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/functions/v1/')||r.url().includes('/realtime/v1'))apiRequests.push(r.url());});return p;}
async function saved(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),BOT_SAVE_KEY);}
async function waitMoves(length){await page.waitForFunction((key,n)=>JSON.parse(localStorage.getItem(key)||'null')?.moves.length===n,{timeout:20000},BOT_SAVE_KEY,length);}
async function ready(){await page.waitForFunction(()=>document.getElementById('connection').textContent==='Ready',{timeout:25000});}
async function move(from,to){const press=s=>page.viewport()?.hasTouch?page.tap(s):page.click(s);await press(square(from));assert.equal(await page.$eval(square(to),n=>n.classList.contains('legal')),true);await press(square(to));}
async function setup({side='w',strength=8}={}){
 await page.goto(origin+'/chess/?mode=bot&setup=1',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.getElementById('startButton').disabled);
 await page.type('#nickname','Ascendo bot tester');await page.click(`input[name=color][value=${side}]`);await page.$eval('#botStrength',(n,v)=>{n.value=String(v);n.dispatchEvent(new Event('input',{bubbles:true}));},strength);await page.click('#startButton');await page.waitForSelector('#game:not([hidden])');await ready();
}
try{
 page=await newPage();await page.setViewport({width:1280,height:1000});await page.goto(origin+'/chess/',{waitUntil:'networkidle0'});assert.equal(await page.$eval('input[name=mode]:checked',n=>n.value),'friend');assert.equal(await page.$eval('#clockOptions',n=>n.hidden),false);assert.equal(requests.some(x=>x.includes('/stockfish/')),false,'Friend setup never loads the engine');
 const invite=await newPage();await invite.goto(origin+'/chess/?room='+'f'.repeat(32)+'&mode=bot',{waitUntil:'networkidle0'});assert.equal(await invite.$eval('#modePicker',n=>n.hidden),true);assert.equal(await invite.$eval('#startButton span',n=>n.textContent),'Join game');await invite.close();
 await setup();assert.equal(await page.$eval('#offerDraw',n=>n.hidden),true);assert.equal(await page.$eval('#invitePanel',n=>n.hidden),true);assert.equal(await page.$eval('#opponentName',n=>n.textContent),'Ascendo Bot · Level 8');assert.equal(await page.$eval('#botUndo',n=>n.disabled),true);
 await move('e2','e4');await waitMoves(2);await ready();const before=await saved();await page.click('#botHint');await page.waitForSelector('.hint-to',{timeout:20000});const hint=await page.$eval('.hint-to',n=>n.dataset.square),from=await page.$eval('.hint-from',n=>n.dataset.square);assert.equal((await saved()).moves.length,2);const {state}=replayBotRecord(before);assert.equal(new (await import('../chess/game.mjs')).Chess(state.fen).moves({square:from,verbose:true}).some(m=>m.to===hint),true);assert.match(await page.$eval('#message',n=>n.textContent),/Hint:/);
 await page.click('#botUndo');await waitMoves(0);await ready();assert.equal(await page.$$eval('.hint-to',n=>n.length),0);
 await move('e2','e4');await page.waitForFunction(()=>document.getElementById('connection').textContent==='Thinking');await page.click('#botUndo');await waitMoves(0);await pause(1200);assert.equal((await saved()).moves.length,0,'Cancelled reply must not return after undo');
 await move('d2','d4');await page.reload({waitUntil:'networkidle0'});await waitMoves(2);await ready();await pause(1000);assert.equal((await saved()).moves.length,2,'Refresh resumes exactly once');
 await page.click('#resign');await page.click('#confirmResignButton');await page.waitForSelector('#finishedActions:not([hidden])');await page.click('#botUndo');await waitMoves(0);await ready();
 await move('e2','e4');await page.waitForFunction(()=>document.getElementById('connection').textContent==='Thinking');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await pause(1100);assert.equal((await saved()).moves.length,1);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await waitMoves(2);await ready();
 await page.goto(origin+'/chess/?mode=bot&setup=1',{waitUntil:'networkidle0'});for(let value=1;value<=20;value++){await page.$eval('#botStrength',(n,v)=>{n.value=String(v);n.dispatchEvent(new Event('input',{bubbles:true}));},value);assert.equal(await page.$eval('#strengthValue',n=>n.textContent),`${value} / 20`);}
 await page.setViewport({width:390,height:1000,isMobile:true,hasTouch:true});await page.waitForFunction(()=>getComputedStyle(document.getElementById('setup')).opacity==='1');await page.screenshot({path:'test-results/chess-bots/setup-mobile.png',fullPage:true});
 await setup({side:'b',strength:20});await waitMoves(1);assert.equal(await page.$eval('#botUndo',n=>n.disabled),true);assert.equal((await saved()).strength,20);await move('e7','e5');await page.click('#botUndo');await waitMoves(1);await ready();await pause(1000);assert.equal((await saved()).moves.length,1);
 await page.click('#resign');await page.click('#confirmResignButton');await page.waitForSelector('#finishedActions:not([hidden])');await page.click('#rematch');await ready();await waitMoves(0);assert.equal((await saved()).side,'w');assert.equal((await saved()).strength,20);
 for(const width of [1280,768,390,320]){
   await page.setViewport({width,height:1000,isMobile:width<700,hasTouch:width<700});await ready();await pause(250);
   const report=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,squares:document.querySelectorAll('.square').length,tools:[...document.querySelectorAll('.practice-tools button')].map(n=>({width:n.clientWidth,clipped:n.scrollWidth>n.clientWidth+1}))}));assert.equal(report.overflow,false,JSON.stringify(report));assert.equal(report.squares,64);assert.equal(report.tools.some(t=>t.clipped),false);reports.push(report);await page.screenshot({path:`test-results/chess-bots/game-${width}.png`,fullPage:true});
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await page.$eval('#game',n=>getComputedStyle(n).animationName),'none');await page.focus(square('e2'));await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.dataset.square),'e3');
 // Test real WASM loading failure and retry in an isolated clean browser context.
 const other=await newPage();await other.setCacheEnabled(false);await page.close();page=other;failWasm=true;await page.goto(origin+'/chess/?mode=bot&setup=1',{waitUntil:'networkidle0'});await page.type('#nickname','Retry test');await page.click('input[name=color][value=w]');await page.click('#startButton');await page.waitForSelector('#engineRetry:not([hidden])',{timeout:25000});assert.equal((await saved()).moves.length,0);failWasm=false;await page.click('#engineRetry');await ready();assert.equal((await saved()).moves.length,0);
 assert.deepEqual(apiRequests,[],'Bot play must never use profile/chess APIs or realtime');assert.deepEqual(errors,[]);assert.ok(requests.includes('/chess/vendor/stockfish/stockfish-19-lite-single.wasm'));
 fs.writeFileSync('test-results/chess-bots/results.json',JSON.stringify({reports,checks:['real Stockfish WASM','friend/invitation isolation','both colors','all 20 slider values','hint is legal and does not play','takebacks during/after reply','resume once after refresh','hidden-tab termination and resume','resign/undo/rematch','native touch','keyboard','reduced motion','WASM failure and retry','zero backend requests'],errors},null,2));console.log('Bot browser checks passed',JSON.stringify(reports));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:'test-results/chess-bots/failure.png',fullPage:true});fs.writeFileSync('test-results/chess-bots/failure-dom.txt',await page.content());}fs.writeFileSync('test-results/chess-bots/failure.json',JSON.stringify({error:error.message,stack:error.stack,errors,apiRequests,requests:requests.slice(-35)},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
