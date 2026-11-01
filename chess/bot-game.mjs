import {Chess,newGame,joinGame,transition,opposite,nickname} from './game.mjs?v=20261101-1';
import {StockfishEngine} from './stockfish-engine.mjs?v=20261101-2';
export const BOT_SAVE_KEY='ascendo-chess-bot-v1';
export const BOT_SKILL_KEY='ascendo-chess-bot-skill-v1';
const botName=level=>`Ascendo Bot · Level ${level}`;
const level=value=>{if(!Number.isInteger(value)||value<1||value>20)throw Error('Choose a strength from 1 to 20.');return value;};
export function createBotRecord(name,side,strength=8,round=1){
  nickname(name);level(strength);if(!['w','b'].includes(side))throw Error('Choose white or black.');
  return {version:1,name,side,strength,round,revision:1,moves:[],resigned:false};
}
export function replayBotRecord(input){
  if(!input||input.version!==1||!Number.isSafeInteger(input.revision)||input.revision<1||!Number.isInteger(input.round)||input.round<1||input.round>10000||!Array.isArray(input.moves)||input.moves.length>1000||typeof input.resigned!=='boolean')throw Error('Your saved bot game could not be restored. Start a new game.');
  const record=createBotRecord(input.name,input.side,input.strength,input.round);
  let state=joinGame(newGame(record.name,{time:'untimed',side:record.side}),botName(record.strength),1);
  state.round=record.round;
  for(const san of input.moves){if(typeof san!=='string'||san.length>12)throw Error('Invalid saved move.');const engine=new Chess(state.fen),move=engine.move(san);state=transition(state,state.turn,'move',{from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})},1);}
  if(input.resigned)state=transition(state,record.side,'resign',{},1);
  return {record:{...record,revision:input.revision,moves:[...input.moves],resigned:input.resigned},state};
}
export function uciHistory(moves){const engine=new Chess();return moves.map(san=>{const move=engine.move(san);return move.from+move.to+(move.promotion||'');});}
function moveInput(uci){if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))throw Error('The bot returned an illegal move. Retry to continue.');return {from:uci.slice(0,2),to:uci.slice(2,4),...(uci[4]?{promotion:uci[4]}:{})};}
function browserStorage(){try{return globalThis.localStorage??null;}catch{return null;}}
export class BotGame {
  constructor({onChange=()=>{},onStatus=()=>{},onHint=()=>{},onWarning=()=>{},storage=browserStorage(),engineFactory=()=>new StockfishEngine()}={}){
    Object.assign(this,{onChange,onStatus,onHint,onWarning,storage,engineFactory});this.record=null;this.state=null;this.engine=null;this.epoch=0;this.status='loading';this.closed=false;this.hidden=false;
  }
  get canUndo(){return Boolean(this.state?.moves.some((_,i)=>i%2===(this.record.side==='w'?0:1)));}
  get canPlay(){return !this.closed&&!this.hidden&&['ready','hint'].includes(this.status)&&this.state?.status==='active'&&this.state.turn===this.record.side;}
  get canHint(){return this.canPlay&&this.status!=='hint';}
  setStatus(status,error=''){this.status=status;this.onStatus(status,error);}
  snapshot(){return {mode:'bot',room:'bot',revision:this.record.revision,side:this.record.side,strength:this.record.strength,state:structuredClone(this.state),serverNow:Date.now()};}
  emit(){this.onChange(this.snapshot());}
  save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(BOT_SAVE_KEY,JSON.stringify(this.record));}catch{this.onWarning('This browser could not save the bot game. Keep this tab open.');}}
  invalidate(){this.epoch++;this.engine?.cancel();this.onHint(null);}
  start(name,{side='w',strength=8}={}){
    this.invalidate();this.engine?.destroy();this.engine=null;
    const {record,state}=replayBotRecord(createBotRecord(nickname(name),side,strength));this.record=record;this.state=state;this.setStatus('loading');this.save();this.emit();void this.maybePlay();
  }
  restore(){
    const raw=this.storage?.getItem(BOT_SAVE_KEY);if(!raw)return false;if(raw.length>30000)throw Error('Your saved bot game could not be restored. Start a new game.');
    const {record,state}=replayBotRecord(JSON.parse(raw));this.record=record;this.state=state;this.setStatus('loading');this.emit();void this.maybePlay();return true;
  }
  async maybePlay(){
    if(this.closed||this.hidden||!this.state)return;
    const epoch=this.epoch;
    if(this.state.status==='finished'){this.setStatus('ready');return;}
    try{
      if(!this.engine){this.engine=this.engineFactory();this.setStatus('loading');}
      await this.engine.init();if(this.closed||this.hidden||epoch!==this.epoch)return;
      if(this.state.turn===this.record.side){this.setStatus('ready');return;}
      this.setStatus('thinking');const uci=await this.engine.search(uciHistory(this.state.moves),{skill:this.record.strength,milliseconds:750});
      if(this.closed||this.hidden||epoch!==this.epoch)return;
      this.state=transition(this.state,opposite(this.record.side),'move',moveInput(uci),1);this.record.moves=[...this.state.moves];this.record.revision++;this.save();this.setStatus('ready');this.emit();
    }catch(error){if(epoch===this.epoch&&!this.closed&&!this.hidden&&error.name!=='AbortError')this.setStatus('error',error.message);}
  }
  play(input){
    if(!this.canPlay)throw Error('Wait for the bot to finish its turn.');
    const next=transition(this.state,this.record.side,'move',input,1);this.invalidate();this.state=next;this.record.moves=[...next.moves];this.record.revision++;this.save();this.emit();void this.maybePlay();
  }
  async hint(){
    if(!this.canHint)return;const epoch=this.epoch;this.onHint(null);this.setStatus('hint');
    try{
      const uci=await this.engine.search(uciHistory(this.state.moves),{skill:20,milliseconds:1000});if(this.closed||this.hidden||epoch!==this.epoch)return;
      const input=moveInput(uci),engine=new Chess(this.state.fen),move=engine.move(input);this.onHint({...input,san:move.san});this.setStatus('ready');
    }catch(error){if(epoch===this.epoch&&!this.closed&&!this.hidden&&error.name!=='AbortError')this.setStatus('error',error.message);}
  }
  undo(){
    if(!this.canUndo)return;let index=this.state.moves.length-1;while(index%2!==(this.record.side==='w'?0:1))index--;
    const {record,state}=replayBotRecord({...this.record,moves:this.state.moves.slice(0,index),resigned:false,revision:this.record.revision+1});
    this.invalidate();this.record=record;this.state=state;this.save();this.emit();if(this.status!=='error')void this.maybePlay();
  }
  resign(){
    if(this.state.status!=='active')return;this.invalidate();this.state=transition(this.state,this.record.side,'resign',{},1);this.record.resigned=true;this.record.revision++;this.save();this.setStatus('ready');this.emit();
  }
  restart(){
    const {name,side,strength,round,revision}=this.record;this.invalidate();this.engine?.destroy();this.engine=null;
    const fresh=createBotRecord(name,opposite(side),strength,round+1);fresh.revision=revision+1;
    const replay=replayBotRecord(fresh);this.record=replay.record;this.state=replay.state;this.setStatus('loading');this.save();this.emit();void this.maybePlay();
  }
  retry(){this.invalidate();this.engine?.destroy();this.engine=null;void this.maybePlay();}
  suspend(){this.hidden=true;this.invalidate();this.engine?.destroy();this.engine=null;this.setStatus('paused');}
  resume(){if(this.closed||!this.hidden)return;this.hidden=false;void this.maybePlay();}
  dispose(){this.closed=true;this.invalidate();this.engine?.destroy();this.engine=null;}
}
