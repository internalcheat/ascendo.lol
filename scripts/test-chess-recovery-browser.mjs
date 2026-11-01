import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchCaptureBrowser,publicAsset} from './profile-capture.mjs';
import {createChessHandler} from '../supabase/functions/chess-api/service.mjs';
import {Chess,newGame,joinGame,transition} from '../chess/game.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Recovery checks run only on GitHub Actions.');
const root=process.cwd(),out='test-results/chess-recovery',games=new Map(),pages=[],errors=[],checks=[];
fs.mkdirSync(out,{recursive:true});let offset=0,dropMove=false,conflict=false,holdPage=null,releaseGet=null;
const now=()=>Date.now()+offset,pause=ms=>new Promise(r=>setTimeout(r,ms)),sel=s=>`#board [data-square="${s}"]`;
const repository=async(op,p)=>{
 if(op==='rate')return true;if(op==='get')return structuredClone(games.get(p.id)||null);
 if(op==='create'){if(!games.has(p.id))games.set(p.id,{...structuredClone(p),revision:1,expires_at:'2099-01-01'});return structuredClone(games.get(p.id));}
 if(op==='commit'){const g=games.get(p.id);if(g.revision!==p.revision)return null;if(p.swap)[g.white_token,g.black_token]=[g.black_token,g.white_token];if(p.join_token){if(!g.white_token)g.white_token=p.join_token;else g.black_token=p.join_token;}g.state=structuredClone(p.state);g.revision++;for(const page of pages)void page.evaluate(revision=>window.__hint?.({payload:{revision}}),g.revision).catch(()=>{});return structuredClone(g);}
 throw Error(op);
};
const handler=createChessHandler({repository,now}),browser=await launchCaptureBrowser();let current;
async function page({blocked=false,seed}={}){
 const context=await browser.createBrowserContext(),p=await context.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));
 await p.evaluateOnNewDocument(({blocked,seed})=>{if(blocked)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});else if(seed)for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);const original=URL.createObjectURL;URL.createObjectURL=blob=>{if(blob.type==='application/x-chess-pgn')void blob.text().then(t=>window.__pgn=t);return original(blob);};},{blocked,seed});
 await p.setRequestInterception(true);p.on('request',r=>{void(async()=>{
   const u=new URL(r.url());if(u.pathname.startsWith('/functions/v1/chess-api/')){
     const action=u.pathname.split('/').at(-1),id=u.pathname.split('/').at(-2);
     if(conflict&&action==='move'&&r.method()==='POST'){conflict=false;const g=games.get(id);g.state=transition(g.state,g.state.turn==='w'?'b':'w','offer-draw',{},now());g.revision++;}
     const res=await handler(new Request(r.url(),{method:r.method(),headers:r.headers(),body:r.postData()}));const body=await res.text();
     if(dropMove&&action==='move'&&r.method()==='POST'){dropMove=false;return r.abort('failed');}
     if(holdPage===p&&r.method()==='GET'){holdPage=null;await new Promise(resolve=>releaseGet=resolve);}
     return r.respond({status:res.status,headers:Object.fromEntries(res.headers),body});
   }
   if(u.hostname!=='ascendo.lol')return r.abort();
   if(u.pathname==='/chess/vendor/realtime.mjs')return r.respond({status:200,contentType:'text/javascript',body:'export class RealtimeClient{channel(){return{on(e,f,cb){window.__hint=cb;return this},subscribe(cb){queueMicrotask(()=>cb("SUBSCRIBED"));return this},async unsubscribe(){delete window.__hint}}}disconnect(){}}'});
   if(u.pathname==='/chess/')return r.respond({status:200,contentType:'text/html',body:fs.readFileSync('chess/index.html')});
   const a=publicAsset(root,u.pathname);if(a)return r.respond({status:200,contentType:a.mime,body:fs.readFileSync(a.target)});return r.abort();
 })().catch(e=>{errors.push(e.message);void r.abort().catch(()=>{});});});return p;
}
async function move(p,from,to){await p.waitForSelector(sel(from)+'.can-select');await p.click(sel(from));await p.waitForSelector(sel(to)+'.legal');await p.click(sel(to));}
async function piece(p,square,name){await p.waitForFunction((s,n)=>document.querySelector(s)?.getAttribute('aria-label').includes(n),{},sel(square),name);}
async function refresh(p){await p.reload({waitUntil:'networkidle0'});await p.waitForSelector('#game:not([hidden])');}
async function center(p,s){return p.$eval(sel(s),n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});}
try{
 const a=current=await page(),b=await page();await a.setViewport({width:1280,height:1000});await a.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});await a.type('#nickname','Clock tester');await a.click('[name=time][value="3+2"]');await a.click('[name=color][value=w]');await a.click('#startButton');await a.waitForSelector('#game:not([hidden])');
 const invite=await a.$eval('#inviteUrl',n=>n.value);await b.goto(invite,{waitUntil:'networkidle0'});await b.type('#nickname','Other player');await b.click('#startButton');await b.waitForSelector('#game:not([hidden])');await a.waitForSelector(sel('e2')+'.can-select');const id=new URL(invite).searchParams.get('room'),row=()=>games.get(id);
 offset+=5000;await move(a,'e2','e4');await piece(b,'e4','white pawn');assert.ok(row().state.clock.w>175000&&row().state.clock.w<=177100);assert.equal(row().state.clock.b,180000);checks.push('timed move charges elapsed time and grants the 2-second increment');
 offset+=7000;await b.click('#offerDraw');await a.waitForSelector('#drawPanel:not([hidden])');await a.click('#declineDraw');await b.waitForFunction(()=>!document.getElementById('offerDraw').disabled);assert.ok(row().state.clock.b<174000&&row().state.clock.b>170000);checks.push('draw actions charge the running clock without granting extra time');
 dropMove=true;await move(b,'b8','c6');await piece(a,'c6','black knight');await piece(b,'c6','black knight');assert.equal(row().state.moves.length,2);checks.push('lost response after commit reconnects without replaying the move');
 holdPage=a;await a.evaluate(()=>dispatchEvent(new Event('online')));for(let i=0;i<50&&!releaseGet;i++)await pause(20);assert.ok(releaseGet);await move(a,'g1','f3');await piece(b,'f3','white knight');releaseGet();releaseGet=null;await pause(150);await piece(a,'f3','white knight');assert.equal(row().state.moves.length,3);checks.push('late stale GET cannot roll back a newer board');
 conflict=true;await move(b,'g8','f6');await b.waitForFunction(()=>document.getElementById('message').textContent.includes('board changed'));assert.equal(row().state.moves.length,3);await move(b,'g8','f6');await piece(a,'f6','black knight');assert.equal(row().state.moves.length,4);checks.push('revision conflicts refresh safely without retrying a move');
 await a.click('#rotateBoard');assert.equal(await a.$eval('.square',n=>n.dataset.square),'h1');await a.focus(sel('h1'));await a.keyboard.press('ArrowRight');assert.equal(await a.evaluate(()=>document.activeElement.dataset.square),'g1');await a.click('#rotateBoard');assert.equal(await a.$eval('.square',n=>n.dataset.square),'a8');checks.push('board rotation keeps coordinates and keyboard navigation consistent');
 // All theme combinations on narrow and wide layouts, with actual radio input.
 for(const width of [1280,768,390,320]){await a.setViewport({width,height:1000,isMobile:width<700,hasTouch:width<700});await a.click('#openSettings');for(const board of ['ascendo','walnut','forest','slate'])for(const pieces of ['classic','modern','outline']){await a.click(`[name=boardTheme][value=${board}]`);await a.click(`[name=pieceTheme][value=${pieces}]`);assert.equal(await a.$eval('html',n=>n.dataset.boardTheme),board);assert.equal(await a.$$eval('#board .piece',ns=>ns.every(n=>n.classList.contains('set-'+document.querySelector('[name=pieceTheme]:checked').value))),true);}assert.equal(await a.$eval('#settingsDialog',n=>n.scrollWidth>n.clientWidth+1),false);await a.click('#closeSettings');assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 checks.push('all 12 theme combinations at 1280, 768, 390 and 320px');
 // Native multi-touch must not replace the active drag and orphan its ghost.
 await a.setViewport({width:390,height:1000,isMobile:true,hasTouch:true});const first=await center(a,'d2'),other=await center(a,'c2');const t1=await a.touchscreen.touchStart(first.x,first.y);await t1.move(first.x,first.y-25);await a.waitForSelector('.drag-piece');const t2=await a.touchscreen.touchStart(other.x,other.y);await t2.move(other.x,other.y-25);await t2.end();await t1.move(2,2);await t1.end();assert.equal(await a.$$eval('.drag-piece',ns=>ns.length),0);checks.push('two-finger gestures cannot leave an orphan drag ghost');
 await a.click('#resign');await a.waitForFunction(()=>document.getElementById('confirmResign').open);offset+=200000;await a.evaluate(()=>dispatchEvent(new Event('online')));await a.waitForFunction(()=>document.getElementById('gameStatus').textContent.includes('Time is up'));assert.equal(row().state.status,'finished');assert.equal(await a.$eval('#gameActions',n=>n.hidden),true);assert.equal(await a.$eval('#confirmResign',n=>n.open),false);checks.push('expired clocks finish the match, disable actions and close stale resignation prompts');
 // Every promotion and exported PGN are verified from a legal starting history.
 for(const promotion of ['queen','rook','bishop','knight']){
   let s=joinGame(newGame('Clock tester',{time:'untimed',side:'w'}),'Other player',now());for(const san of ['a4','h5','a5','h4','a6','h3','axb7','hxg2']){const e=new Chess(s.fen),m=e.move(san);s=transition(s,s.turn,'move',{from:m.from,to:m.to},now());}row().state=s;row().revision++;await refresh(a);await move(a,'b7','a8');await a.waitForFunction(()=>document.getElementById('promotion').open);await a.click(`[aria-label="Promote to ${promotion}"]`);await piece(a,'a8','white '+promotion);
 }
 await a.click('#downloadPgn');await a.waitForFunction(()=>Boolean(window.__pgn));const pgn=await a.evaluate(()=>window.__pgn),engine=new Chess();engine.loadPgn(pgn);assert.equal(engine.fen(),row().state.fen);assert.equal(engine.header().White,'Clock tester');checks.push('all four promotions and complete PGN export round-trip');
 await b.reload({waitUntil:'networkidle0'});await b.waitForSelector('#game:not([hidden])');await b.click('#offerDraw');await a.waitForSelector('#drawPanel:not([hidden])');await a.click('#acceptDraw');await b.waitForSelector('#finishedActions:not([hidden])');assert.equal(row().state.result.reason,'agreement');await a.click('#rematch');await b.click('#rematch');await a.waitForFunction(()=>document.getElementById('selfColor').textContent.startsWith('Black'));assert.equal(row().state.moves.length,0);checks.push('accepted draw and rematch reset the board and swap seats');
 // Sustained multiplayer interaction with independent browsers and fault recovery.
 const players={b:a,w:b};let chaosSeed=731,chaosPlies=0;
 for(let ply=0;ply<64&&row().state.status==='active';ply++){
   chaosSeed=(Math.imul(chaosSeed,1664525)+1013904223)>>>0;const e=new Chess(row().state.fen),moves=e.moves({verbose:true}),m=moves[chaosSeed%moves.length],actor=players[row().state.turn];current=actor;
   await actor.waitForFunction(n=>document.querySelectorAll('#moveList li span').length===n,{},ply);
   if(ply%13===5)await actor.click('#rotateBoard');
   if(ply%17===8)dropMove=true;
   await move(actor,m.from,m.to);if(m.promotion)await actor.click(`[aria-label="Promote to ${{q:'queen',r:'rook',b:'bishop',n:'knight'}[m.promotion]}"]`);
   for(const p of [a,b])await p.waitForFunction(n=>document.querySelectorAll('#moveList li span').length===n,{},ply+1);
   e.move({from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})});assert.equal(row().state.fen,e.fen());assert.equal(row().state.moves.length,ply+1);
   if(ply%19===11)await refresh(actor);assert.equal(await actor.$$eval('.drag-piece',ns=>ns.length),0);chaosPlies++;
 }
 checks.push(`${chaosPlies} synchronized multiplayer plies with rotations, refreshes and dropped responses`);
 // A restored expired seat must provide a useful visible error immediately.
 const missing=await page({seed:{'ascendo-chess-seats-v1':JSON.stringify({['f'.repeat(32)]:{token:'a'.repeat(64),at:Date.now()}})}});current=missing;await missing.goto('https://ascendo.lol/chess/?room='+'f'.repeat(32),{waitUntil:'networkidle0'});assert.match(await missing.$eval('#message',n=>n.textContent),/expired|does not exist/i);checks.push('expired saved invitations explain the failure before another submit');
 const blockedFriend=await page({blocked:true});current=blockedFriend;await blockedFriend.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});await blockedFriend.type('#nickname','Temporary seat');await blockedFriend.click('#startButton');await blockedFriend.waitForSelector('#game:not([hidden])');assert.match(await blockedFriend.$eval('#message',n=>n.textContent),/storage is unavailable.*keep this tab open/i);checks.push('friend seat storage warning survives successful game creation');
 // Run real WebAssembly without storage; no browser/profile credentials exist.
 const blocked=await page({blocked:true});current=blocked;await blocked.goto('https://ascendo.lol/chess/?mode=bot&setup=1',{waitUntil:'networkidle0'});await blocked.type('#nickname','Private mode');await blocked.click('[name=color][value=w]');await blocked.click('#startButton');await blocked.waitForFunction(()=>document.getElementById('connection').textContent==='Ready',{timeout:25000});assert.match(await blocked.$eval('#message',n=>n.textContent),/could not save/);await move(blocked,'e2','e4');await piece(blocked,'e4','white pawn');checks.push('blocked storage still permits real bot play and warns about saving');
 assert.deepEqual(errors,[]);await blocked.screenshot({path:out+'/blocked-storage.png',fullPage:true});fs.writeFileSync(out+'/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}catch(e){if(current&&!current.isClosed())await current.screenshot({path:out+'/failure.png',fullPage:true});fs.writeFileSync(out+'/failure.json',JSON.stringify({message:e.message,stack:e.stack,checks,errors},null,2));throw e;}finally{releaseGet?.();await browser.close();}
