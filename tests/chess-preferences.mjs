import assert from 'node:assert/strict';
import {Chess} from '../chess/game.mjs';
import {PremoveQueue,premoveTargets} from '../chess/premoves.mjs';
import {normalizePreferences,readPreferences,savePreferences,PREFERENCES_KEY,BOARD_THEMES,PIECE_THEMES} from '../chess/preferences.mjs';
import {pieceMarkup} from '../chess/pieces.mjs';
let checks=0;
function test(label,run){run();checks++;console.log(`✓ ${label}`);}
function game(fen=new Chess().fen(),side='b',moves=[]){const e=new Chess(fen);return {room:'fixture',side,state:{status:'active',round:1,fen:e.fen(),turn:e.turn(),moves}};}
function advance(g,move){const e=new Chess(g.state.fen),m=e.move(move);return {...g,state:{...g.state,fen:e.fen(),turn:e.turn(),moves:[...g.state.moves,m.san]}};}

test('all themes normalize safely and persist independently of games',()=>{
  assert.deepEqual(normalizePreferences(),{board:'ascendo',pieces:'classic',premoves:true});
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  for(const board of BOARD_THEMES)for(const pieces of PIECE_THEMES){const p={board,pieces,premoves:false};assert.equal(savePreferences(p,storage),true);assert.deepEqual(readPreferences(storage),p);}
  assert.equal(values.size,1);assert.ok(values.has(PREFERENCES_KEY));
  assert.deepEqual(normalizePreferences({board:'__proto__',pieces:'<svg>',premoves:'true'}),normalizePreferences());
  assert.deepEqual(readPreferences({getItem:()=>'{bad'}),normalizePreferences());
  assert.equal(savePreferences({}, {setItem:()=>{throw Error('blocked');}}),false);
});
test('local piece sets contain every piece and reject unknown style identifiers',()=>{
  for(const style of PIECE_THEMES)for(const type of ['p','r','n','b','q','k'])for(const color of ['w','b']){
    const svg=pieceMarkup({type,color},style);assert.match(svg,/viewBox="0 0 48 48"/);assert.ok(svg.includes(`set-${style}`));assert.doesNotMatch(svg,/undefined|https?:|<script|onload/);
  }
  assert.equal(pieceMarkup({type:'k',color:'w'},'bad'),pieceMarkup({type:'k',color:'w'}));
});
test('one queued move survives no-move updates and validates exactly one opponent move',()=>{
  const q=new PremoveQueue(),g=game();assert.equal(q.set(g,{from:'e7',to:'e5'}),true);assert.equal(q.check(g).status,'waiting');
  assert.equal(q.check({...g,revision:4}).status,'waiting');assert.deepEqual(q.check(advance(g,'e4')),{status:'ready',move:{from:'e7',to:'e5'}});
  assert.equal(q.set(g,{from:'g8',to:'f6'}),true);assert.equal(q.value.from,'g8');q.clear();assert.equal(q.check(g).status,'empty');
});
test('never queues on your turn, through blockers, onto own pieces or with arbitrary inputs',()=>{
  const q=new PremoveQueue();assert.equal(q.set(game(new Chess().fen(),'w'),{from:'e2',to:'e4'}),false);
  for(const m of [{from:'a8',to:'a5'},{from:'e7',to:'e8'},{from:'b8',to:'b5'},{from:'bad',to:'e5'},{from:'e7',to:'e5',promotion:'q'}])assert.equal(q.set(game(),m),false);
  assert.deepEqual(premoveTargets(new Chess().fen(),'b','bad'),[]);
});
test('discard stale history, changed side/round/room, ended games and skipped positions',()=>{
  const g=game(),q=new PremoveQueue();q.set(g,{from:'e7',to:'e5'});
  for(const other of [{...g,room:'other'},{...g,side:'w'},{...g,state:{...g.state,round:2}},{...g,state:{...g.state,status:'finished'}},advance(advance(g,'e4'),'e5')])assert.equal(q.check(other).status,'invalid');
  const a=advance(game(new Chess().fen(),'w'),'e4');q.set(a,{from:'g1',to:'f3'});assert.equal(q.check({...a,state:{...a.state,moves:['d4']}}).status,'invalid');
});
test('discard captured pieces and moves that leave the king in check',()=>{
  const q=new PremoveQueue();let g=game('4k3/8/8/8/1b6/2N5/8/4K3 b - - 0 1','w');q.set(g,{from:'c3',to:'b5'});assert.equal(q.check(advance(g,'Bxc3+')).status,'invalid');
  g=game('4r1k1/8/8/8/8/8/4N3/4K3 b - - 0 1','w');assert.equal(q.set(g,{from:'e2',to:'c3'}),true);assert.equal(q.check(advance(g,'Kh8')).status,'invalid');
});
test('conditional pawn captures and en passant are checked against the actual reply',()=>{
  const q=new PremoveQueue(),g=game('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1','w');
  assert.equal(q.set(g,{from:'e5',to:'d6'}),true);assert.equal(q.check(advance(g,'d5')).status,'ready');assert.equal(q.check(advance(g,'Kf7')).status,'invalid');
});
test('castling and promotion preserve explicit legal choices',()=>{
  const q=new PremoveQueue();let g=game('4k3/8/8/8/8/8/8/4K2R b K - 0 1','w');assert.equal(q.set(g,{from:'e1',to:'g1'}),true);assert.equal(q.check(advance(g,'Kd7')).status,'ready');
  g=game('7k/P7/8/8/8/8/8/4K3 b - - 0 1','w');assert.equal(q.set(g,{from:'a7',to:'a8'}),false);assert.equal(q.set(g,{from:'a7',to:'a8',promotion:'n'}),true);assert.deepEqual(q.check(advance(g,'Kg8')).move,{from:'a7',to:'a8',promotion:'n'});
});
console.log(`${checks} chess theme and premove groups passed.`);
