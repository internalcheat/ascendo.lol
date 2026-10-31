import {Chess} from './vendor/chess.mjs';
export {Chess};

export const TIME_CONTROLS = Object.freeze({
  '3+2': {base:180000,increment:2000,label:'3 + 2'},
  '5+0': {base:300000,increment:0,label:'5 minutes'},
  '10+0': {base:600000,increment:0,label:'10 minutes'},
  untimed: {base:0,increment:0,label:'Untimed'}
});
export class GameError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export const opposite = side => side === 'w' ? 'b' : 'w';
export function nickname(value){
  if(typeof value!=='string')throw new GameError(400,'Choose a nickname.');
  const name=value.normalize('NFKC').trim().replace(/\s+/gu,' ');
  if(!name||[...name].length>24||/[\p{Cc}\p{Cf}<>]/u.test(name))throw new GameError(400,'Use a nickname of 1–24 characters, without control characters.');
  return name;
}
export function newGame(name,{time='10+0',side='w'}={}){
  if(!Object.hasOwn(TIME_CONTROLS,time)||!['w','b'].includes(side))throw new GameError(400,'Choose a valid clock and color.');
  const control=TIME_CONTROLS[time];
  return {players:{w:side==='w'?nickname(name):null,b:side==='b'?nickname(name):null},host:side,time,
    status:'waiting',round:1,moves:[],fen:new Chess().fen(),turn:'w',lastMove:null,
    clock:{w:control.base,b:control.base,at:0},result:null,drawOffer:null,rematch:[]};
}
export function engineFor(state){
  const engine=new Chess();
  for(const move of state.moves)engine.move(move);
  return engine;
}
export function clockAt(state,now){
  const remaining={w:state.clock.w,b:state.clock.b};
  if(state.status==='active'&&TIME_CONTROLS[state.time].base&&state.clock.at)
    remaining[state.turn]=Math.max(0,remaining[state.turn]-Math.max(0,now-state.clock.at));
  return remaining;
}
function finish(state,winner,reason){
  state.status='finished';state.result={winner,reason};state.drawOffer=null;state.rematch=[];
}
export function settleTimeout(state,now){
  const next=structuredClone(state),remaining=clockAt(next,now);
  if(next.status!=='active'||!TIME_CONTROLS[next.time].base||remaining[next.turn]>0)return null;
  next.clock={...remaining,at:now};
  // A bare king cannot deliver mate. Other timeout positions use casual chess rules.
  const winner=opposite(next.turn),canMate=engineFor(next).board().flat().some(p=>p?.color===winner&&p.type!=='k');
  finish(next,canMate?winner:null,canMate?'timeout':'timeout-material');
  return next;
}
export function joinGame(state,name,now){
  if(state.status!=='waiting')throw new GameError(409,'This game already has two players.');
  const next=structuredClone(state);next.players[opposite(next.host)]=nickname(name);
  next.status='active';next.clock.at=now;return next;
}
export function transition(state,side,action,input,now){
  if(!['w','b'].includes(side)||!state.players[side])throw new GameError(403,'Your seat could not be verified.');
  const timedOut=settleTimeout(state,now);if(timedOut)return timedOut;
  const next=structuredClone(state);
  if(action==='rematch'){
    if(next.status!=='finished')throw new GameError(409,'Finish this game before requesting a rematch.');
    if(next.rematch.includes(side))return null;
    next.rematch.push(side);
    if(next.rematch.length===2){
      const fresh=newGame(next.players.b,{time:next.time,side:'w'});
      fresh.players.b=next.players.w;fresh.host=opposite(next.host);fresh.round=next.round+1;
      fresh.status='active';fresh.clock.at=now;return fresh;
    }
    return next;
  }
  if(next.status!=='active')throw new GameError(409,next.status==='waiting'?'Invite a friend to start playing.':'This game has finished.');
  next.clock={...clockAt(next,now),at:now};
  if(action==='resign'){finish(next,opposite(side),'resignation');return next;}
  if(action==='offer-draw'){
    if(next.drawOffer)throw new GameError(409,'There is already a draw offer.');
    next.drawOffer=side;return next;
  }
  if(action==='accept-draw'||action==='decline-draw'){
    if(next.drawOffer!==opposite(side))throw new GameError(409,'There is no draw offer to answer.');
    if(action==='accept-draw')finish(next,null,'agreement');else next.drawOffer=null;
    return next;
  }
  if(action!=='move')throw new GameError(400,'Unknown game action.');
  if(next.turn!==side)throw new GameError(409,'It is not your turn.');
  if(!/^[a-h][1-8]$/.test(input.from||'')||!/^[a-h][1-8]$/.test(input.to||'')||
    (input.promotion!==undefined&&!['q','r','b','n'].includes(input.promotion)))throw new GameError(400,'Choose a legal move.');
  const engine=engineFor(next);let move;
  try{move=engine.move({from:input.from,to:input.to,...(input.promotion?{promotion:input.promotion}:{})});}
  catch{throw new GameError(400,'That move is not legal.');}
  next.moves.push(move.san);next.fen=engine.fen();next.turn=engine.turn();
  next.lastMove={from:move.from,to:move.to};next.drawOffer=null;
  if(TIME_CONTROLS[next.time].base)next.clock[side]+=TIME_CONTROLS[next.time].increment;
  if(engine.isCheckmate())finish(next,side,'checkmate');
  else if(engine.isStalemate())finish(next,null,'stalemate');
  else if(engine.isInsufficientMaterial())finish(next,null,'insufficient-material');
  else if(engine.isThreefoldRepetition())finish(next,null,'repetition');
  else if(engine.isDrawByFiftyMoves())finish(next,null,'fifty-move');
  else if(next.moves.length>=1000)finish(next,null,'move-limit');
  return next;
}
export function gameMessage(state,side){
  if(state.status==='waiting')return 'Waiting for your friend';
  if(state.status==='finished'){
    const reasons={checkmate:'Checkmate',resignation:'Resignation',timeout:'Time is up',agreement:'Draw agreed',stalemate:'Stalemate','insufficient-material':'Insufficient material',repetition:'Threefold repetition','fifty-move':'Fifty-move rule','move-limit':'Move limit reached','timeout-material':'Draw on time'};
    return `${state.result.winner?`${state.players[state.result.winner]} wins`:'Draw'} · ${reasons[state.result.reason]||'Game finished'}`;
  }
  const check=new Chess(state.fen).inCheck()?' · Check':'';
  return `${state.turn===side?'Your move':`${state.players[state.turn]}’s move`}${check}`;
}
