import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,joinGame,transition,clockAt,settleTimeout,nickname,Chess,gameMessage} from '../chess/game.mjs';
import {createChessHandler,hash} from '../supabase/functions/chess-api/service.mjs';

let checks=0;
async function test(label,run){await run();checks++;console.log(`✓ ${label}`);}
let now=100000;
function active(time='untimed'){return joinGame(newGame('White',{time}),'Black',now);}
function play(state,moves){for(const san of moves){const engine=new Chess(state.fen),move=engine.move(san);state=transition(state,state.turn,'move',{from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})},now+=10);}return state;}

await test('nickname validation preserves Unicode; rejects controls, markup, missing and oversized names',()=>{
  assert.equal(nickname('  Szikra  Ádám  '),'Szikra Ádám');assert.equal(nickname('♟️ Balázs'),'♟️ Balázs');
  for(const value of ['',null,'<script>',`a\u202eb`,'x'.repeat(25)])assert.throws(()=>nickname(value));
});
await test('waiting seats, color and time controls normalize and require a second player',()=>{
  const s=newGame('Black',{time:'3+2',side:'b'});assert.equal(s.status,'waiting');assert.equal(s.players.w,null);assert.equal(s.clock.b,180000);
  assert.throws(()=>transition(s,'b','move',{from:'e7',to:'e5'},now));assert.equal(joinGame(s,'White',now).players.w,'White');
  assert.throws(()=>newGame('A',{time:'__proto__'}));assert.throws(()=>newGame('A',{side:'red'}));
});
await test('server enforces legal moves, turn order and promotion choices',()=>{
  const s=active();assert.throws(()=>transition(s,'b','move',{from:'e7',to:'e5'},now));assert.throws(()=>transition(s,'w','move',{from:'e2',to:'e5'},now));
  assert.throws(()=>transition(s,'w','move',{from:'e2',to:'e4',promotion:'king'},now));const n=play(s,['e4']);assert.equal(n.turn,'b');assert.equal(s.moves.length,0);
});
await test('castling, en passant and underpromotion retain a replayable history',()=>{
  const castle=play(active(),['e4','e5','Nf3','Nc6','Bc4','Nf6','O-O']);assert.equal(new Chess(castle.fen).get('g1').type,'k');assert.equal(new Chess(castle.fen).get('f1').type,'r');
  const ep=play(active(),['e4','a6','e5','d5','exd6']);assert.equal(new Chess(ep.fen).get('d5'),undefined);assert.equal(new Chess(ep.fen).get('d6').color,'w');
  const promo=play(active(),['a4','h5','a5','h4','a6','h3','axb7','hxg2','bxa8=N']);assert.equal(new Chess(promo.fen).get('a8').type,'n');assert.ok(promo.moves.at(-1).includes('=N'));
});
await test('checkmate and repeated positions finish games; ended games reject moves',()=>{
  const mate=play(active(),['f3','e5','g4','Qh4#']);assert.deepEqual(mate.result,{winner:'b',reason:'checkmate'});assert.ok(gameMessage(mate,'w').includes('Checkmate'));assert.throws(()=>transition(mate,'w','move',{from:'a2',to:'a3'},now));
  const repeated=play(active(),['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']);assert.equal(repeated.result.reason,'repetition');
});
await test('server clocks include elapsed time and increments; offers do not reset remaining time',()=>{
  const s=active('3+2'),at=s.clock.at;const n=transition(s,'w','move',{from:'e2',to:'e4'},at+5000);assert.equal(n.clock.w,177000);assert.equal(n.clock.b,180000);
  const offer=transition(n,'w','offer-draw',{},at+8000);assert.equal(offer.clock.b,177000);assert.equal(clockAt(offer,at+10000).b,175000);
  const expired=settleTimeout(s,at+180001);assert.equal(expired.result.winner,'b');assert.equal(expired.result.reason,'timeout');assert.equal(settleTimeout(active(),now+1e8),null);
});
await test('draw offers, decline, agreement, resignation and consensual color-swapping rematches',()=>{
  let s=transition(active(),'w','offer-draw',{},now);assert.throws(()=>transition(s,'w','accept-draw',{},now));s=transition(s,'b','decline-draw',{},now);assert.equal(s.drawOffer,null);
  s=transition(s,'b','offer-draw',{},now);s=transition(s,'w','accept-draw',{},now);assert.equal(s.result.reason,'agreement');
  s=transition(s,'w','rematch',{},now);assert.equal(s.status,'finished');assert.equal(transition(s,'w','rematch',{},now),null);s=transition(s,'b','rematch',{},now);
  assert.equal(s.round,2);assert.equal(s.players.w,'Black');assert.equal(s.status,'active');assert.equal(s.moves.length,0);assert.equal(transition(s,'b','resign',{},now).result.winner,'w');
});

const games=new Map(),rates=new Map();let commits=0;
async function repository(operation,payload){
  if(operation==='rate'){const count=(rates.get(payload.key)||0)+1;rates.set(payload.key,count);return count<=payload.limit;}
  if(operation==='get')return structuredClone(games.get(payload.id)||null);
  if(operation==='create'){if(!games.has(payload.id))games.set(payload.id,{...structuredClone(payload),revision:1,expires_at:'2099-01-01'});return structuredClone(games.get(payload.id));}
  if(operation==='commit'){
    const row=games.get(payload.id);if(row.revision!==payload.revision)return null;commits++;
    if(payload.swap)[row.white_token,row.black_token]=[row.black_token,row.white_token];
    if(payload.join_token){if(!row.white_token)row.white_token=payload.join_token;else if(!row.black_token)row.black_token=payload.join_token;}
    row.state=structuredClone(payload.state);row.revision++;return structuredClone(row);
  }throw Error(operation);
}
const handler=createChessHandler({repository,now:()=>now,randomSide:()=> 'w'}),tokens=['1','2','3'].map(c=>c.repeat(64)),room='a'.repeat(32);
async function call(path='',{method='GET',body,token=tokens[0],origin='https://ascendo.lol',headers={}}={}){
  const response=await handler(new Request(`https://fixture.supabase.co/functions/v1/chess-api/${path}`,{method,headers:{authorization:`Bearer ${token}`,...(origin?{origin}:{}),...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined}));return {status:response.status,data:await response.json()};
}
await test('guest API creates idempotently without exposing hashes; only the invitation holder can join',async()=>{
  const input={room,nickname:'Host',time:'10+0',color:'w'};let r=await call('games',{method:'POST',body:input});assert.equal(r.status,201);assert.equal(r.data.side,'w');assert.ok(!JSON.stringify(r.data).includes('white_token'));
  assert.equal((await call('games',{method:'POST',body:input})).status,200);assert.equal(games.size,1);
  assert.equal((await call(`games/${room}`,{token:tokens[2]})).status,403);
  r=await call(`games/${room}/join`,{method:'POST',token:tokens[1],body:{nickname:'Friend'}});assert.equal(r.status,200);assert.equal(r.data.side,'b');assert.equal(r.data.state.status,'active');
  assert.equal((await call(`games/${room}/join`,{method:'POST',token:tokens[1],body:{nickname:'Friend'}})).status,200);
  assert.equal((await call(`games/${room}/join`,{method:'POST',token:tokens[2],body:{nickname:'Third'}})).status,409);
});
await test('backend rejects forged owners, state, revisions, FEN and illegal moves',async()=>{
  const revision=games.get(room).revision;
  for(const body of [{revision,from:'e2',to:'e4',side:'b'},{revision,from:'e2',to:'e4',fen:'fake'},{revision,config:{}},{revision,owner:'internalcheats'},{revision,capabilities:{admin:true}}])assert.equal((await call(`games/${room}/move`,{method:'POST',body})).status,400);
  assert.equal((await call(`games/${room}/move`,{method:'POST',body:{revision,from:'e2',to:'e5'}})).status,400);
  assert.equal((await call(`games/${room}/move`,{method:'POST',token:tokens[1],body:{revision,from:'e7',to:'e5'}})).status,409);
  assert.equal((await call(`games/${room}/move`,{method:'POST',body:{revision:revision-1,from:'e2',to:'e4'}})).status,409);
});
await test('concurrent moves use revision compare-and-swap and cannot double-move',async()=>{
  const revision=games.get(room).revision,initial=commits;
  const results=await Promise.all(['e4','e3'].map(to=>call(`games/${room}/move`,{method:'POST',body:{revision,from:'e2',to}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(commits,initial+1);assert.equal(games.get(room).state.moves.length,1);
});
await test('resume is authenticated; timeout is persisted and token ownership switches with rematches',async()=>{
  let row=games.get(room);assert.equal((await call(`games/${room}`)).data.side,'w');
  let r=await call(`games/${room}/resign`,{method:'POST',body:{revision:row.revision}});assert.equal(r.status,200);
  r=await call(`games/${room}/rematch`,{method:'POST',body:{revision:r.data.revision}});
  r=await call(`games/${room}/rematch`,{method:'POST',token:tokens[1],body:{revision:r.data.revision}});assert.equal(r.data.side,'w');assert.equal((await call(`games/${room}`)).data.side,'b');
  now+=600001;r=await call(`games/${room}`);assert.equal(r.data.state.result.reason,'timeout');assert.equal(games.get(room).state.status,'finished');
});
await test('origin, token, body size, content type and rate limits are enforced',async()=>{
  assert.equal((await call(`games/${room}`,{origin:'https://evil.example'})).status,403);assert.equal((await call(`games/${room}`,{token:'bad'})).status,401);
  assert.equal((await call(`games/${room}/join`,{method:'POST',body:{nickname:'x'.repeat(3000)}})).status,413);
  assert.equal((await call('games',{method:'POST',body:{nickname:'A'},headers:{'content-type':'text/plain'}})).status,415);
  assert.equal((await call('games/'+'f'.repeat(32))).status,404);
  rates.set(await hash(`${await hash('unknown')}:requests`),180);assert.equal((await call(`games/${room}`)).status,429);rates.clear();
});
await test('migration isolates all chess data, reserves the route, and touches no profile records',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261031231302_private_chess.sql','utf8');assert.match(sql,/security invoker set search_path=''/);assert.match(sql,/revoke all on function public.chess_command\(text,jsonb\) from public,anon,authenticated/);assert.match(sql,/enable row level security/g);assert.match(sql,/'plugins','chess','customize'/);assert.doesNotMatch(sql,/(?:update|delete from|insert into) private\.(?:profiles|credentials|uploads|profile_presets)\b/i);
});
console.log(`${checks} chess checks passed.`);
