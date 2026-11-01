import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {createChessHandler} from '../supabase/functions/chess-api/service.mjs';
import {Chess,transition} from '../chess/game.mjs';

if(process.env.GITHUB_ACTIONS!=='true')throw Error('Chess browser checks run only on GitHub Actions.');
const games=new Map(),errors=[],reports=[],pages=[];const root=process.cwd();fs.mkdirSync('test-results/chess',{recursive:true});
async function repository(operation,payload){
 if(operation==='rate')return true;
 if(operation==='get')return structuredClone(games.get(payload.id)||null);
 if(operation==='create'){if(!games.has(payload.id))games.set(payload.id,{...structuredClone(payload),revision:1,expires_at:'2099-01-01'});return structuredClone(games.get(payload.id));}
 if(operation==='commit'){const game=games.get(payload.id);if(game.revision!==payload.revision)return null;if(payload.swap)[game.white_token,game.black_token]=[game.black_token,game.white_token];if(payload.join_token){if(!game.white_token)game.white_token=payload.join_token;else game.black_token=payload.join_token;}game.state=structuredClone(payload.state);game.revision++;for(const page of pages)void page.evaluate(revision=>{if(window.__chessHintsLive)window.__chessHint?.({payload:{revision}});},game.revision).catch(()=>{});return structuredClone(game);}
 throw Error(operation);
}
const handler=createChessHandler({repository}),browser=await launchCaptureBrowser();
const contexts=[];let page,friend;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const selector=s=>`#board [data-square="${s}"]`;
async function createPage(){
 const context=await browser.createBrowserContext();contexts.push(context);const p=await context.newPage();pages.push(p);p.on('pageerror',error=>errors.push(error.message));await p.setRequestInterception(true);
 await p.evaluateOnNewDocument(()=>{const Native=window.AudioContext;window.__audio={created:0,started:0,contexts:[]};window.AudioContext=class extends Native{constructor(options){super(options);window.__audio.created++;window.__audio.contexts.push(this);}createBufferSource(){const node=super.createBufferSource(),start=node.start.bind(node);node.start=(...args)=>{window.__audio.started++;return start(...args);};return node;}};});
 p.on('request',request=>{void(async()=>{
   const url=new URL(request.url());
   if(url.pathname.startsWith('/functions/v1/chess-api/')){
     const response=await handler(new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()}));
     return request.respond({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   }
   if(url.hostname!=='ascendo.lol')return request.abort();
   if(url.pathname==='/chess/vendor/realtime.mjs')return request.respond({status:200,contentType:'text/javascript',body:'export class RealtimeClient { channel(){return {on(event,filter,callback){window.__chessHint=callback;return this},subscribe(callback){window.__chessSubscribe=callback;if(sessionStorage.getItem("fixture-live")){window.__chessHintsLive=true;queueMicrotask(()=>callback("SUBSCRIBED"))}return this},async unsubscribe(){delete window.__chessHint}}} disconnect(){} }'});
   if(url.pathname==='/chess/')return request.respond({status:200,contentType:'text/html',body:fs.readFileSync('chess/index.html')});
   const asset=publicAsset(root,url.pathname);if(asset)return request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)});return request.abort();
 })().catch(error=>{errors.push(error.message);void request.abort().catch(()=>{});});});return p;
}
async function waitPiece(p,square,name){await p.waitForFunction((sel,text)=>document.querySelector(sel)?.getAttribute('aria-label').includes(text),{timeout:5000},selector(square),name);}
async function clickMove(p,from,to){await p.waitForSelector(selector(from)+'.can-select');const press=sel=>p.viewport().hasTouch?p.tap(sel):p.click(sel);await press(selector(from));assert.equal(await p.$eval(selector(to),n=>n.classList.contains('legal')),true,`${from}-${to} legal highlight`);await press(selector(to));}
async function layout(p,width){
 await p.setViewport({width,height:960,isMobile:width<700,hasTouch:width<700});await pause(220);
 const report=await p.evaluate(()=>{
   const board=document.getElementById('board'),r=board.getBoundingClientRect();return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,boardWidth:r.width,boardHeight:r.height,squares:board.querySelectorAll('.square').length,hasFocusTarget:board.querySelectorAll('[tabindex="0"]').length,clipped:[...document.querySelectorAll('.game-sidebar button,.player-info strong,.clock')].some(n=>n.scrollWidth>n.clientWidth+2)};
 });assert.equal(report.overflow,false,JSON.stringify(report));assert.equal(report.clipped,false,JSON.stringify(report));assert.equal(report.squares,64);assert.equal(report.hasFocusTarget,1);assert.ok(Math.abs(report.boardWidth-report.boardHeight)<2);reports.push(report);
 await p.screenshot({path:`test-results/chess/game-${width}.png`,fullPage:true});
}
try{
 page=await createPage();friend=await createPage();await friend.evaluateOnNewDocument(()=>{document.startViewTransition=undefined;});await page.setViewport({width:1440,height:1000});
 await page.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.getElementById('startButton').disabled);
 assert.equal(await page.evaluate(()=>window.__audio.created),0,'No audio context before interaction');
 await page.screenshot({path:'test-results/chess/lobby-desktop.png',fullPage:true});
 await page.setViewport({width:320,height:850,isMobile:true,hasTouch:true});await page.waitForFunction(()=>getComputedStyle(document.getElementById('setup')).opacity==='1');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'test-results/chess/lobby-mobile.png',fullPage:true});await page.setViewport({width:1440,height:1000});
 await page.type('#nickname','A very friendly nickname');await page.click('input[name=time][value="3+2"]');
 for(const mode of ['bot','friend','bot','friend']){await page.click(`input[name=mode][value=${mode}]`);await pause(45);}
 await page.waitForFunction(()=>!document.getElementById('gameOptions').hasAttribute('data-animating'));
 assert.deepEqual(await page.evaluate(()=>({name:document.getElementById('nickname').value,time:document.getElementById('setup').elements.time.value,clock:document.getElementById('clockOptions').hidden,bot:document.getElementById('botOptions').hidden})),{name:'A very friendly nickname',time:'3+2',clock:false,bot:true});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.__audio.contexts.every(c=>c.state!=='running'));assert.equal(await page.evaluate(()=>window.__audio.started),0);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.__audio.contexts[0]?.state==='running');assert.equal(await page.evaluate(()=>window.__audio.created),1,'One reused context across gestures and visibility changes');
 await page.click('input[name=time][value=untimed]');await page.click('input[name=color][value=w]');await page.click('#startButton');
 await page.waitForSelector('#game:not([hidden])');assert.equal(await page.$eval('#boardNotice',n=>n.hidden),false);assert.equal(await page.$eval(selector('a1'),n=>n.classList.contains('dark')),true);assert.equal(await page.$eval(selector('h1'),n=>n.classList.contains('dark')),false);
 const invite=await page.$eval('#inviteUrl',n=>n.value);assert.match(invite,/^https:\/\/ascendo\.lol\/chess\/\?room=[a-f0-9]{32}$/);
 await friend.setViewport({width:1280,height:900});await friend.goto(invite,{waitUntil:'networkidle0'});await friend.type('#nickname','Szikra Ádám');await friend.click('#startButton');await friend.waitForSelector('#game:not([hidden])');
 await page.waitForFunction(()=>document.getElementById('boardNotice').hidden);assert.equal(await friend.$eval('#selfColor',n=>n.textContent),'Black pieces · You');
 // Themes are instant, local, persistent, and do not alter either game seat.
 await page.click('#openSettings');await page.click('[name=boardTheme][value=forest]');await page.click('[name=pieceTheme][value=modern]');
 assert.equal(await page.$eval('html',n=>n.dataset.boardTheme),'forest');assert.equal(await page.$$eval('#board .set-modern',n=>n.length),32);assert.equal(await friend.$eval('html',n=>n.dataset.boardTheme),'ascendo');
 await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:'test-results/chess/settings-desktop.png',fullPage:true});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'openSettings');
 // A queued move is local only. Replacing, Escape and right-click never send it.
 await clickMove(friend,'g8','f6');assert.equal(await friend.$eval('#premoveStatus',n=>n.hidden),false);await friend.focus('#cancelPremove');await friend.keyboard.press('Escape');assert.equal(await friend.$eval('#premoveStatus',n=>n.hidden),true);assert.ok(await friend.evaluate(()=>Boolean(document.activeElement.dataset.square)));
 await clickMove(friend,'d7','d5');await clickMove(friend,'e7','e5');assert.match(await friend.$eval('#premoveText',n=>n.textContent),/e7 → e5/);await friend.click(selector('e5'),{button:'right'});assert.equal(await friend.$eval('#premoveStatus',n=>n.hidden),true);
 const dragFrom=await friend.$eval(selector('e7'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}),dragTo=await friend.$eval(selector('e5'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await friend.mouse.move(dragFrom.x,dragFrom.y);await friend.mouse.down();await friend.mouse.move(dragTo.x,dragTo.y,{steps:10});await friend.mouse.up();assert.equal(await friend.$eval('#premoveStatus',n=>n.hidden),false);assert.equal(games.get(new URL(invite).searchParams.get('room')).state.moves.length,0);await friend.screenshot({path:'test-results/chess/premove-desktop.png',fullPage:true});
 for(const p of [page,friend])assert.equal(await p.evaluate(()=>window.__audio.started),0,'Selection and premoves are silent until confirmed');
 await clickMove(page,'e2','e4');await waitPiece(friend,'e4','white pawn');await waitPiece(page,'e5','black pawn');assert.equal(await friend.$eval('#premoveStatus',n=>n.hidden),true);
 for(const p of [page,friend])await p.waitForFunction(()=>window.__audio.started===2);
 // Actual mouse drag; move destinations stay on the same board grid.
 const from=await page.$eval(selector('g1'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}),to=await page.$eval(selector('f3'),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();await waitPiece(friend,'f3','white knight');assert.equal(await page.$$eval('.drag-piece',n=>n.length),0);
 // Conditional capture is canceled if no piece arrives on that square.
 await clickMove(page,'e4','f5');await clickMove(friend,'b8','c6');await waitPiece(page,'c6','black knight');await page.waitForFunction(()=>document.getElementById('premoveStatus').hidden);assert.match(await page.$eval('#message',n=>n.textContent),/no longer legal/);assert.equal(games.get(new URL(invite).searchParams.get('room')).state.moves.length,4);
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('#game:not([hidden])');assert.equal(await page.$eval('#selfColor',n=>n.textContent),'White pieces · You');assert.equal(await page.$eval('#moveList',n=>n.textContent.includes('Nf3')),true);
 assert.equal(await page.evaluate(()=>window.__audio.started),0,'Restoring a match does not replay audio');
 assert.equal(await page.$eval('html',n=>n.dataset.boardTheme),'forest');assert.equal(await page.$$eval('#board .set-modern',n=>n.length),32);
 const audioReport=await page.evaluate(async()=>{const {createCue,noiseBuffer}=await import('/chess/sounds.mjs?v=20261101-6'),report=[];for(const kind of ['move','capture','check']){const c=new OfflineAudioContext(1,19200,48000);createCue(c,kind,noiseBuffer(c));const b=await c.startRendering(),data=b.getChannelData(0);let peak=0,energy=0,tail=0;for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i>data.length-2400)tail+=Math.abs(data[i]);}report.push({kind,peak,energy,tail});}return report;});for(const r of audioReport){assert.ok(r.peak>.01&&r.peak<.5,JSON.stringify(r));assert.ok(r.tail<.0001,JSON.stringify(r));}assert.equal(new Set(audioReport.map(r=>r.energy.toFixed(4))).size,3);fs.writeFileSync('test-results/chess/audio.json',JSON.stringify(audioReport,null,2));
 for(const p of [page,friend]){await p.waitForFunction(()=>typeof window.__chessSubscribe==='function');await p.evaluate(()=>{sessionStorage.setItem('fixture-live','1');window.__chessHintsLive=true;window.__chessSubscribe('SUBSCRIBED');});}
 await page.focus(selector('e2'));await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.dataset.square),'e3');
 for(const width of [1440,1024,768,390,320])await layout(page,width);
 await page.click('#openSettings');await page.click('[name=boardTheme][value=slate]');await page.click('[name=pieceTheme][value=outline]');assert.equal(await page.$eval('html',n=>n.dataset.boardTheme),'slate');assert.ok(await page.$$eval('#board .set-outline',n=>n.length)>0);await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:'test-results/chess/settings-mobile.png',fullPage:true});assert.equal(await page.$eval('#settingsDialog',n=>n.scrollWidth>n.clientWidth+1),false);await page.click('#closeSettings');
 await friend.click('#offerDraw');await page.waitForFunction(()=>!document.getElementById('drawPanel').hidden);await page.click('#declineDraw');await friend.waitForFunction(()=>!document.getElementById('offerDraw').disabled);
 await page.click('#resign');await page.waitForFunction(()=>document.getElementById('confirmResign').open);await page.keyboard.press('Escape');assert.equal(await page.$eval('#confirmResign',n=>n.open),false);
 await page.click('#resign');await page.click('#confirmResignButton');await friend.waitForFunction(()=>!document.getElementById('finishedActions').hidden);await page.click('#rematch');await friend.click('#rematch');await page.waitForFunction(()=>document.getElementById('selfColor').textContent.startsWith('Black'));assert.equal(await page.$eval('#moveList',n=>n.children.length),0);
 // Reduced motion, touch tap-to-move and a second match ending in checkmate.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await friend.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await clickMove(page,'e7','e5');await clickMove(friend,'f2','f3');await waitPiece(page,'f3','white pawn');await waitPiece(friend,'e5','black pawn');await clickMove(friend,'g2','g4');await waitPiece(page,'g4','white pawn');await clickMove(page,'d8','h4');await friend.waitForFunction(()=>document.getElementById('gameStatus').textContent.includes('Checkmate'));
 assert.equal(await page.$eval('#game',n=>getComputedStyle(n).animationName),'none');
 // Advance only the isolated server fixture to a legal promotion position.
 const room=new URL(invite).searchParams.get('room'),fixture=games.get(room);fixture.state={...fixture.state,status:'active',result:null,moves:[],lastMove:null,drawOffer:null,rematch:[],turn:'w',fen:new Chess().fen()};
 for(const san of ['a4','h5','a5','h4','a6','h3','axb7','hxg2']){const engine=new Chess(fixture.state.fen),move=engine.move(san);fixture.state=transition(fixture.state,fixture.state.turn,'move',{from:move.from,to:move.to},Date.now());}fixture.revision++;
 await friend.reload({waitUntil:'networkidle0'});await friend.waitForSelector('#game:not([hidden])');await clickMove(friend,'b7','a8');await friend.waitForFunction(()=>document.getElementById('promotion').open);await friend.tap('[aria-label="Promote to knight"]');await waitPiece(friend,'a8','white knight');assert.equal(await friend.$eval('#promotion',n=>n.open),false);
 await page.setJavaScriptEnabled(false);await page.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});assert.match(await page.$eval('noscript',n=>n.textContent),/JavaScript is needed/);await page.setJavaScriptEnabled(true);await page.reload({waitUntil:'networkidle0'});await page.click('input[name=mode][value=bot]');assert.equal(await page.$eval('#gameOptions',n=>n.getAnimations({subtree:true}).length),0,'Reduced motion removes mode-switch animation');
 const missing=await createPage();await missing.goto('https://ascendo.lol/chess/?room=bad',{waitUntil:'networkidle0'});assert.equal(await missing.$eval('#startButton',n=>n.disabled),true);assert.match(await missing.$eval('#message',n=>n.textContent),/not valid/);
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/chess/results.json',JSON.stringify({reports,checks:['two independent browser contexts','private invitation','local persistent themes','settings keyboard focus and mobile dialog','premove replacement and cancellation','legal premove sent once','illegal conditional capture discarded','live fallback synchronization','legal moves','mouse drag','refresh resume','keyboard navigation','draw decline','resign confirmation','color-swapping rematch','native touch taps','checkmate','promotion picker and underpromotion','reduced motion','no JavaScript notice','invalid invite'],errors},null,2));
 console.log('Chess browser checks passed',JSON.stringify(reports));
}catch(error){if(page)await page.screenshot({path:'test-results/chess/failure.png',fullPage:true});fs.writeFileSync('test-results/chess/failure.json',JSON.stringify({message:error.message,stack:error.stack,errors},null,2));throw error;}
finally{await browser.close();}
