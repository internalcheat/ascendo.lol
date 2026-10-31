import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BotGame,createBotRecord,replayBotRecord,uciHistory,BOT_SAVE_KEY} from '../chess/bot-game.mjs';
import {StockfishEngine} from '../chess/stockfish-engine.mjs';
let count=0;const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function test(name,run){await run();console.log(`✓ ${name}`);count++;}
class MemoryStorage{data=new Map();getItem(k){return this.data.get(k)||null;}setItem(k,v){this.data.set(k,v);}}
class FakeEngine{
  requests=[];cancelled=0;destroyed=false;
  async init(){}
  search(moves,options){return new Promise((resolve,reject)=>this.requests.push({moves,options,resolve,reject}));}
  cancel(){this.cancelled++;}destroy(){this.destroyed=true;}
}
function fixture(){const engines=[],statuses=[],hints=[],changes=[],storage=new MemoryStorage();const game=new BotGame({storage,engineFactory:()=>{const e=new FakeEngine();engines.push(e);return e;},onStatus:(s,e)=>statuses.push([s,e]),onHint:h=>hints.push(h),onChange:s=>changes.push(s)});return {game,engines,statuses,hints,changes,storage};}
await test('all 20 strengths validate, remain untimed and do not need a room or account',async()=>{
 for(let strength=1;strength<=20;strength++){const f=fixture();f.game.start('Ádám',{strength,side:'w'});await tick();assert.equal(f.game.canPlay,true);assert.equal(f.game.snapshot().state.time,'untimed');assert.equal(f.game.snapshot().strength,strength);assert.equal(f.engines[0].requests.length,0);f.game.dispose();}
 for(const strength of [0,21,8.1,'8',NaN])assert.throws(()=>createBotRecord('A','w',strength));
});
await test('Black receives one automatic opening; full history and selected strength reach the engine',async()=>{
 const {game,engines}=fixture();game.start('Black',{side:'b',strength:17});await tick();assert.equal(game.canPlay,false);assert.equal(game.canUndo,false);
 const job=engines[0].requests[0];assert.deepEqual(job.moves,[]);assert.deepEqual(job.options,{skill:17,milliseconds:750});job.resolve('e2e4');await tick();assert.equal(game.canPlay,true);game.play({from:'e7',to:'e5'});await tick();assert.deepEqual(engines[0].requests[1].moves,['e2e4','e7e5']);game.dispose();
});
await test('hints use full strength without making a move and restore normal bot strength',async()=>{
 const {game,engines,hints}=fixture();game.start('White',{side:'w',strength:4});await tick();const hint=game.hint();await tick();assert.deepEqual(engines[0].requests[0].options,{skill:20,milliseconds:1000});engines[0].requests[0].resolve('g1f3');await hint;assert.equal(game.state.moves.length,0);assert.equal(hints.at(-1).san,'Nf3');game.play({from:'e2',to:'e4'});await tick();assert.equal(hints.at(-1),null);assert.equal(engines[0].requests[1].options.skill,4);game.dispose();
});
await test('takebacks during bot calculation cancel stale results and restore the human turn',async()=>{
 const {game,engines}=fixture();game.start('A');await tick();game.play({from:'e2',to:'e4'});await tick();const old=engines[0].requests[0];game.undo();await tick();assert.equal(game.canPlay,true);assert.deepEqual(game.state.moves,[]);old.resolve('e7e5');await tick();assert.deepEqual(game.state.moves,[]);assert.equal(game.canUndo,false);game.dispose();
});
await test('takebacks remove both moves after a reply and retain the bot opening for Black',async()=>{
 const a=fixture();a.game.start('White');await tick();a.game.play({from:'e2',to:'e4'});await tick();a.engines[0].requests[0].resolve('e7e5');await tick();a.game.undo();assert.deepEqual(a.game.state.moves,[]);a.game.dispose();
 const b=fixture();b.game.start('Black',{side:'b'});await tick();b.engines[0].requests[0].resolve('e2e4');await tick();b.game.play({from:'e7',to:'e5'});await tick();b.game.undo();assert.deepEqual(b.game.state.moves,['e4']);assert.equal(b.game.canUndo,false);b.game.dispose();
});
await test('moving during a hint invalidates its result without affecting the following bot reply',async()=>{
 const {game,engines,hints}=fixture();game.start('A');await tick();const hint=game.hint();await tick();game.play({from:'d2',to:'d4'});await tick();engines[0].requests[0].resolve('g1f3');await hint;assert.equal(hints.at(-1),null);engines[0].requests[1].resolve('d7d5');await tick();assert.deepEqual(game.state.moves,['d4','d5']);game.dispose();
});
await test('saved games replay exact legal history; malformed/tampered records cannot restore',async()=>{
 const f=fixture();f.game.start('A',{strength:11});await tick();f.game.play({from:'e2',to:'e4'});await tick();f.engines[0].requests[0].resolve('e7e5');await tick();const saved=JSON.parse(f.storage.getItem(BOT_SAVE_KEY)),copy=fixture();copy.storage.setItem(BOT_SAVE_KEY,JSON.stringify(saved));assert.equal(copy.game.restore(),true);await tick();assert.equal(copy.game.state.fen,f.game.state.fen);assert.equal(copy.game.record.strength,11);
 for(const change of [{side:'admin'},{moves:['e5']},{strength:100},{round:-1},{name:'<script>'},{version:99},{resigned:'yes'}])assert.throws(()=>replayBotRecord({...saved,...change}));
 f.game.dispose();copy.game.dispose();
});
await test('mate/resignation persist, takebacks reopen ended games, and rematches switch colors',async()=>{
 const f=fixture();f.game.start('A');await tick();f.game.play({from:'f2',to:'f3'});await tick();f.engines[0].requests[0].resolve('e7e5');await tick();f.game.play({from:'g2',to:'g4'});await tick();f.engines[0].requests[1].resolve('d8h4');await tick();assert.equal(f.game.state.result.reason,'checkmate');assert.equal(f.game.canHint,false);f.game.undo();await tick();assert.deepEqual(f.game.state.moves,['f3','e5']);assert.equal(f.game.state.status,'active');f.game.resign();assert.equal(replayBotRecord(f.game.record).state.result.reason,'resignation');f.game.undo();await tick();assert.equal(f.game.state.status,'active');
 const old=f.game.record.strength;f.game.restart();await tick();assert.equal(f.game.record.side,'b');assert.equal(f.game.record.strength,old);assert.equal(f.game.state.round,2);assert.equal(f.engines.at(-1).requests.length,1);f.game.dispose();
});
await test('hidden tabs terminate work and resume only one search from the saved position',async()=>{
 const f=fixture();f.game.start('A');await tick();f.game.play({from:'e2',to:'e4'});await tick();const old=f.engines[0];f.game.suspend();old.requests[0].resolve('e7e5');await tick();assert.equal(old.destroyed,true);assert.deepEqual(f.game.state.moves,['e4']);f.game.resume();await tick();assert.deepEqual(f.engines[1].requests[0].moves,['e2e4']);f.engines[1].requests[0].resolve('c7c5');await tick();assert.deepEqual(f.game.state.moves,['e4','c5']);f.game.dispose();
});
await test('illegal engine moves and engine failures retain the position and allow explicit retry',async()=>{
 const f=fixture();f.game.start('A');await tick();f.game.play({from:'e2',to:'e4'});await tick();f.engines[0].requests[0].resolve('e7e4');await tick();assert.equal(f.game.status,'error');assert.deepEqual(f.game.state.moves,['e4']);f.game.retry();await tick();assert.equal(f.engines.length,2);f.engines[1].requests[0].resolve('e7e5');await tick();assert.equal(f.game.status,'ready');assert.deepEqual(f.game.state.moves,['e4','e5']);f.game.dispose();
});
class FakeWorker{
  commands=[];terminated=false;
  postMessage(value){this.commands.push(value);if(value==='uci')queueMicrotask(()=>this.send('uciok'));if(value==='isready')queueMicrotask(()=>this.send('readyok'));if(value==='stop')queueMicrotask(()=>this.send('bestmove e7e5'));}
  send(data){this.onmessage?.({data});}terminate(){this.terminated=true;}
}
await test('worker bridge serializes UCI searches and drains a cancelled bestmove before reusing it',async()=>{
 const worker=new FakeWorker(),engine=new StockfishEngine({workerFactory:()=>worker});await engine.init();const first=engine.search(['e2e4']);const cancelled=assert.rejects(first,{name:'AbortError'});await tick();engine.cancel();const second=engine.search(['d2d4'],{skill:20,milliseconds:1000});await cancelled;await tick();assert.equal(worker.commands.filter(c=>c.startsWith('go ')).length,2);assert.ok(worker.commands.includes('position startpos moves d2d4'));worker.send('bestmove d7d5');assert.equal(await second,'d7d5');engine.destroy();assert.equal(worker.terminated,true);
});
await test('worker startup/search deadlines reject cleanly and release their timers/resources',async()=>{
 const worker=new FakeWorker(),engine=new StockfishEngine({workerFactory:()=>worker,searchTimeout:15});const pending=engine.search([]);await assert.rejects(pending,/too long/);assert.equal(worker.terminated,true);engine.destroy();
 const missing=new StockfishEngine({workerFactory:()=>{throw Error('Unsupported worker');}});await assert.rejects(missing.init(),/Unsupported worker/);missing.destroy();
});
await test('self-hosted engine, matching source and network have pinned integrity and valid formats',()=>{
 const root='chess/vendor/stockfish/',manifest=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));assert.equal(manifest.version,'19.0.1');
 for(const file of manifest.files){const b=fs.readFileSync(root+file.name);assert.equal(b.length,file.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),file.sha256);}
 assert.equal(fs.readFileSync(root+'stockfish-19-lite-single.wasm').subarray(0,4).toString('hex'),'0061736d');assert.match(fs.readFileSync(root+'Copying.txt','utf8'),/GNU GENERAL PUBLIC LICENSE/);
 assert.deepEqual(uciHistory(['e4','e5','Nf3']),['e2e4','e7e5','g1f3']);
});
console.log(`${count} bot checks passed.`);
