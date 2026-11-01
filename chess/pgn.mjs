import {Chess} from './game.mjs?v=20261101-1';

export function gamePgn(game){
  const {state}=game,engine=new Chess();for(const move of state.moves)engine.move(move);
  const result=state.result?(state.result.winner===null?'1/2-1/2':state.result.winner==='w'?'1-0':'0-1'):'*';
  const headers={Event:game.mode==='bot'?'Ascendo bot practice':'Ascendo friendly game',Site:'https://ascendo.lol/chess/',Round:String(state.round),White:state.players.w||'?',Black:state.players.b||'?',Result:result};
  // PGN strings escape both quotes and backslashes. The engine serializes
  // headers verbatim, so encode each value before assigning it separately.
  for(const [key,value] of Object.entries(headers))engine.setHeader(key,value.replaceAll('\\','\\\\').replaceAll('"','\\"'));
  return engine.pgn();
}
