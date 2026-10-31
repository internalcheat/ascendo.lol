import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {createChessHandler} from '../supabase/functions/chess-api/service.mjs';

if(process.env.GITHUB_ACTIONS!=='true')throw Error('Chess browser checks run only on GitHub Actions.');
const games=new Map(),errors=[],reports=[];const root=process.cwd();fs.mkdirSync('test-results/chess',{recursive:true});
async function repository(operation,payload){
 if(operation==='rate')return true;
 if(operation==='get')return structuredClone(games.get(payload.id)||null);
 if(operation==='create'){if(!games.has(payload.id))games.set(payload.id,{...structuredClone(payload),revision:1,expires_at:'2099-01-01'});return structuredClone(games.get(payload.id));}
 if(operation==='commit'){const game=games.get(payload.id);if(game.revision!==payload.revision)return null;if(payload.swap)[game.white_token,game.black_token]=[game.black_token,game.white_token];if(payload.join_token){if(!game.white_token)game.white_token=payload.join_token;else game.black_token=payload.join_token;}game.state=structuredClone(payload.state);game.revision++;return structuredClone(game);}
 throw Error(operation);
}
const handler=createChessHandler({repository}),browser=await launchCaptureBrowser();
const contexts=[];let page,friend;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const selector=s=>`#board [data-square="${s}"]`;
async function createPage(){
 const context=await browser.createBrowserContext();contexts.push(context);const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));await p.setRequestInterception(true);
 p.on('request',request=>{void(async()=>{
   const url=new URL(request.url());
   if(url.pathname.startsWith('/functions/v1/chess-api/')){
     const response=await handler(new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()}));
     return request.respond({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   }
   if(url.hostname!=='ascendo.lol')return request.abort();
   if(url.pathname==='/chess/vendor/realtime.mjs')return request.respond({status:200,contentType:'text/javascript',body:'export class RealtimeClient { channel(){return {on(){return this},subscribe(){return this},async unsubscribe(){}}} disconnect(){} }'});
   if(url.pathname==='/chess/')return request.respond({status:200,contentType:'text/html',body:fs.readFileSync('chess/index.html')});
   const asset=publicAsset(root,url.pathname);if(asset)return request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)});return request.abort();
 })().catch(error=>{errors.push(error.message);void request.abort().catch(()=>{});});});return p;
}
async function waitPiece(p,square,name){await p.waitForFunction((sel,text)=>document.querySelector(sel)?.getAttribute('aria-label').includes(text),{},selector(square),name);}
async function clickMove(p,from,to){await p.click(selector(from));assert.equal(await p.$eval(selector(to),n=>n.classList.contains('legal')),true,`${from}-${to} legal highlight`);await p.click(selector(to));}
async function layout(p,width){
 await p.setViewport({width,height:960,isMobile:width<700,hasTouch:width<700});await pause(220);
 const report=await p.evaluate(()=>{
   const board=document.getElementById('board'),r=board.getBoundingClientRect();return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,boardWidth:r.width,boardHeight:r.height,squares:board.querySelectorAll('.square').length,hasFocusTarget:board.querySelectorAll('[tabindex="0"]').length,clipped:[...document.querySelectorAll('.game-sidebar button,.player-info strong,.clock')].some(n=>n.scrollWidth>n.clientWidth+2)};
 });assert.equal(report.overflow,false,JSON.stringify(report));assert.equal(report.clipped,false,JSON.stringify(report));assert.equal(report.squares,64);assert.equal(report.hasFocusTarget,1);assert.ok(Math.abs(report.boardWidth-report.boardHeight)<2);reports.push(report);
 await p.screenshot({path:`test-results/chess/game-${width}.png`,fullPage:true});
}
try{
 page=await createPage();friend=await createPage();await page.setViewport({width:1440,height:1000});
 await page.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.getElementById('startButton').disabled);
 await page.screenshot({path:'test-results/chess/lobby-desktop.png',fullPage:true});
 await page.type('#nickname','A very friendly nickname');await page.click('input[name=time][value=untimed]');await page.click('input[name=color][value=w]');await page.click('#startButton');
 await page.waitForSelector('#game:not([hidden])');assert.equal(await page.$eval('#boardNotice',n=>n.hidden),false);assert.equal(await page.$eval(selector('a1'),n=>n.classList.contains('dark')),true);assert.equal(await page.$eval(selector('h1'),n=>n.classList.contains('dark')),false);
 const invite=await page.$eval('#inviteUrl',n=>n.value);assert.match(invite,/^https:\/\/ascendo\.lol\/chess\/\?room=[a-f0-9]{32}$/);
 await friend.setViewport({width:1280,height:900});await friend.goto(invite,{waitUntil:'networkidle0'});await friend.type('#nickname','Szikra Ádám');await friend.click('#startButton');await friend.waitForSelector('#game:not([hidden])');
 await page.waitForFunction(()=>document.getElementById('boardNotice').hidden);assert.equal(await friend.$eval('#selfColor',n=>n.textContent),'Black pieces · You');
 await clickMove(page,'e2','e4');await waitPiece(friend,'e4','white pawn');await clickMove(friend,'e7','e5');await waitPiece(page,'e5','black pawn');
 // Actual mouse drag; move destinations stay on the same board grid.
 const from=await page.$eval(selector('g1'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}),to=await page.$eval(selector('f3'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();await waitPiece(friend,'f3','white knight');assert.equal(await page.$$eval('.drag-piece',n=>n.length),0);
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('#game:not([hidden])');assert.equal(await page.$eval('#selfColor',n=>n.textContent),'White pieces · You');assert.equal(await page.$eval('#moveList',n=>n.textContent.includes('Nf3')),true);
 await page.focus(selector('e2'));await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.dataset.square),'e3');
 for(const width of [1440,1024,768,390,320])await layout(page,width);
 await friend.click('#offerDraw');await page.waitForFunction(()=>!document.getElementById('drawPanel').hidden);await page.click('#declineDraw');await friend.waitForFunction(()=>!document.getElementById('offerDraw').disabled);
 await page.click('#resign');await page.waitForFunction(()=>document.getElementById('confirmResign').open);await page.keyboard.press('Escape');assert.equal(await page.$eval('#confirmResign',n=>n.open),false);
 await page.click('#resign');await page.click('#confirmResignButton');await friend.waitForFunction(()=>!document.getElementById('finishedActions').hidden);await page.click('#rematch');await friend.click('#rematch');await page.waitForFunction(()=>document.getElementById('selfColor').textContent.startsWith('Black'));assert.equal(await page.$eval('#moveList',n=>n.children.length),0);
 // Reduced motion, touch tap-to-move and a second match ending in checkmate.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await friend.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await clickMove(friend,'f2','f3');await waitPiece(page,'f3','white pawn');await clickMove(page,'e7','e5');await waitPiece(friend,'e5','black pawn');await clickMove(friend,'g2','g4');await waitPiece(page,'g4','white pawn');await clickMove(page,'d8','h4');await friend.waitForFunction(()=>document.getElementById('gameStatus').textContent.includes('Checkmate'));
 assert.equal(await page.$eval('#game',n=>getComputedStyle(n).animationName),'none');
 await page.setJavaScriptEnabled(false);await page.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});assert.match(await page.$eval('noscript',n=>n.textContent),/JavaScript is needed/);await page.setJavaScriptEnabled(true);
 const missing=await createPage();await missing.goto('https://ascendo.lol/chess/?room=bad',{waitUntil:'networkidle0'});assert.equal(await missing.$eval('#startButton',n=>n.disabled),true);assert.match(await missing.$eval('#message',n=>n.textContent),/not valid/);
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/chess/results.json',JSON.stringify({reports,checks:['two independent browser contexts','private invitation','live fallback synchronization','legal moves','mouse drag','refresh resume','keyboard navigation','draw decline','resign confirmation','color-swapping rematch','touch-sized play','checkmate','reduced motion','no JavaScript notice','invalid invite'],errors},null,2));
 console.log('Chess browser checks passed',JSON.stringify(reports));
}catch(error){if(page)await page.screenshot({path:'test-results/chess/failure.png',fullPage:true});fs.writeFileSync('test-results/chess/failure.json',JSON.stringify({message:error.message,stack:error.stack,errors},null,2));throw error;}
finally{await browser.close();}
