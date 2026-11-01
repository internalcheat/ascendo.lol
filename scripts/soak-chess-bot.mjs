import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {replayBotRecord,BOT_SAVE_KEY} from '../chess/bot-game.mjs';
import {Chess} from '../chess/game.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Soak checks run only on GitHub Actions.');
const minutes=Number(process.env.CHESS_SOAK_MINUTES||1);if(!Number.isFinite(minutes)||minutes<.2||minutes>15)throw Error('Invalid duration');
const out='test-results/chess-soak',root=process.cwd(),errors=[],apiRequests=[],stats={turns:0,hints:0,undos:0,hidden:0,reloads:0,rematches:0,themes:0};fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),a=u.pathname==='/chess/'?{target:path.join(root,'chess/index.html'),mime:'text/html'}:publicAsset(root,u.pathname);if(!a){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':a.mime});res.end(fs.readFileSync(a.target));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await launchCaptureBrowser(),context=await browser.createBrowserContext(),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/functions\/v1\/|\/realtime\/v1\//.test(r.url()))apiRequests.push(r.url());});
const square=s=>`#board [data-square="${s}"]`,pause=ms=>new Promise(r=>setTimeout(r,ms));let seed=81723;
const pick=list=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return list[seed%list.length];};
const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),BOT_SAVE_KEY);
const ready=()=>page.waitForFunction(()=>document.getElementById('connection').textContent==='Ready',{timeout:25000});
async function play(move){await page.waitForSelector(square(move.from)+'.can-select');await page.click(square(move.from));await page.waitForSelector(square(move.to)+'.legal');await page.click(square(move.to));if(move.promotion){const names={q:'queen',r:'rook',b:'bishop',n:'knight'};await page.click(`[aria-label="Promote to ${names[move.promotion]}"]`);}}
const started=Date.now(),deadline=started+minutes*60000;let lastProgress=0;
try{
 await page.setViewport({width:1280,height:1000});await page.goto(origin+'/chess/?mode=bot&setup=1',{waitUntil:'networkidle0'});await page.type('#nickname','Long audit');await page.click('[name=color][value=w]');await page.click('#startButton');await ready();
 while(Date.now()<deadline){
   await ready();const before=await saved(),{state}=replayBotRecord(before);assert.equal(await page.$$eval('.square',ns=>ns.length),64);assert.equal(await page.$$eval('.drag-piece',ns=>ns.length),0);
   if(state.status==='finished'){await page.click('#rematch');stats.rematches++;continue;}
   assert.equal(state.turn,before.side);const legal=new Chess(state.fen).moves({verbose:true});assert.ok(legal.length);
   if(stats.turns%19===7){await page.click('#botHint');await page.waitForSelector('.hint-to',{timeout:15000});const hint=await page.$eval('.hint-to',n=>n.dataset.square),from=await page.$eval('.hint-from',n=>n.dataset.square);assert.ok(legal.some(m=>m.from===from&&m.to===hint));assert.deepEqual((await saved()).moves,before.moves);stats.hints++;}
   if(stats.turns%7===3){const width=pick([1280,768,390,320]);await page.setViewport({width,height:1000,isMobile:width<700,hasTouch:width<700});await page.click('#openSettings');await page.click(`[name=boardTheme][value=${pick(['ascendo','walnut','forest','slate'])}]`);await page.click(`[name=pieceTheme][value=${pick(['classic','modern','outline'])}]`);await page.click('#closeSettings');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);stats.themes++;}
   await play(pick(legal));
   if(stats.turns%23===4){await page.click('#botUndo');await ready();assert.deepEqual((await saved()).moves,before.moves);stats.undos++;}
   else if(stats.turns%29===9){await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await pause(100);assert.equal((await saved()).moves.length,before.moves.length+1);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await ready();stats.hidden++;}
   else if(stats.turns%31===11){await page.reload({waitUntil:'networkidle0'});await ready();stats.reloads++;}
   else await ready();
   const after=await saved(),replayed=replayBotRecord(after);assert.ok(replayed.state.status==='finished'||replayed.state.turn===after.side);assert.deepEqual(errors,[]);stats.turns++;
   if(Date.now()-lastProgress>30000){console.log(JSON.stringify({elapsedSeconds:Math.round((Date.now()-started)/1000),...stats}));lastProgress=Date.now();fs.writeFileSync(out+'/progress.json',JSON.stringify({started,elapsedMs:Date.now()-started,stats,errors,apiRequests},null,2));}
 }
 assert.deepEqual(apiRequests,[]);assert.deepEqual(errors,[]);await page.screenshot({path:out+'/final.png',fullPage:true});fs.writeFileSync(out+'/results.json',JSON.stringify({started,finished:Date.now(),elapsedMs:Date.now()-started,stats,errors,apiRequests},null,2));console.log('SOAK PASSED',JSON.stringify(stats));
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});fs.writeFileSync(out+'/failure.json',JSON.stringify({message:e.message,stack:e.stack,stats,errors,apiRequests},null,2));throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
