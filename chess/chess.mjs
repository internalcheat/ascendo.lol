import {Chess,TIME_CONTROLS,clockAt,gameMessage,nickname,opposite} from './game.mjs?v=20261101-1';
import {pieceMarkup,pieceNames} from './pieces.mjs?v=20261101-4';
import {PremoveQueue,premoveTargets} from './premoves.mjs?v=20261101-4';
import {readPreferences,savePreferences} from './preferences.mjs?v=20261101-4';
import {gamePgn} from './pgn.mjs?v=20261101-5';
import {BACKEND_URL,PUBLISHABLE_KEY} from '../customizer-config.mjs';

const $=id=>document.getElementById(id),api=`${BACKEND_URL}/functions/v1/chess-api`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),storageKey='ascendo-chess-seats-v1';
const roomPattern=/^[a-f0-9]{32}$/,tokenPattern=/^[a-f0-9]{64}$/;
const random=bytes=>[...crypto.getRandomValues(new Uint8Array(bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
let seats={},game=null,seat=null,pending=false,selected=null,legal=[],orientation='w',poll=null,clockTimer=null,creationRoom=null;
let syncInFlight=null,syncAgain=false,realtime=null,channel=null,subscribed=false,connecting=false,syncAfter=0,hintTimer=null,timeoutSyncAt=0,anchor=null,drag=null,promotionMove=null,lastFocus='e2',destroyed=false;
let bot=null,hintMove=null;
let optionMotion=null,fieldMotion=null,sceneMotion=null,lastMode=null;
let preferences=readPreferences();
const premove=new PremoveQueue(),pieceArt=piece=>pieceMarkup(piece,preferences.pieces);
document.documentElement.dataset.boardTheme=preferences.board;
const isBot=()=>game?.mode==='bot';
const botMode=()=>!roomFromUrl()&&$('setup').elements.mode.value==='bot';
try{const strength=Number(localStorage.getItem('ascendo-chess-bot-skill-v1'));if(Number.isInteger(strength)&&strength>=1&&strength<=20)$('botStrength').value=String(strength);}catch{}
try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');for(const [room,value] of Object.entries(parsed))if(roomPattern.test(room)&&tokenPattern.test(value?.token||''))seats[room]={token:value.token,at:Number(value.at)||0};}catch{}
function saveSeat(room,token){
  seats[room]={token,at:Date.now()};seats=Object.fromEntries(Object.entries(seats).sort((a,b)=>b[1].at-a[1].at).slice(0,8));
  try{localStorage.setItem(storageKey,JSON.stringify(seats));return true;}catch{return false;}
}
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function connection(text,state){$('connection').textContent=text;$('connection').dataset.state=state;}
function roomFromUrl(){return new URL(location.href).searchParams.get('room');}
async function request(path,{method='GET',body,token=seat?.token}={}){
  const started=performance.now();
  const response=await fetch(`${api}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,apikey:PUBLISHABLE_KEY,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok){const error=Error(data.error||'Could not connect. Please try again.');error.status=response.status;error.game=data.game;throw error;}
  return {data,elapsed:performance.now()-started};
}
function activeRoom(){return game?.room||roomFromUrl();}
function inviteUrl(room){return `${location.origin}/chess/?room=${room}`;}
function paintGame(previous){
  if(destroyed)return;
  const entering=!$('lobby').hidden;
  $('lobby').hidden=true;$('game').hidden=false;if($('message').parentNode!==$('gameFeedback'))$('gameFeedback').append($('message'));
  render(previous);updateActions();updateClocks();
  if(entering){window.scrollTo({top:0,behavior:'instant'});$('gameStatus').focus({preventScroll:true});}
}
function snapshot({data,elapsed=0}){
  if(destroyed||!data?.state||data.room!==activeRoom()&&game)return;
  if(game&&data.room===game.room&&data.revision<game.revision)return;
  const changed=!game||game.revision!==data.revision||game.room!==data.room,previous=game;
  if(!game||game.side!==data.side)orientation=data.side;
  game=data;anchor={at:performance.now(),remaining:clockAt(data.state,data.serverNow+elapsed/2)};
  document.title=`${data.state.status==='finished'?'Game over':data.state.turn===data.side?'Your move':'Chess'} | Ascendo`;
  if(changed){
    hintMove=null;selected=null;legal=[];cancelDrag();closePromotion();
    const entering=!$('lobby').hidden;
    paintGame(previous);
    if(entering&&!reduced.matches&&!document.hidden)sceneMotion=$('game').animate([{opacity:0},{opacity:1}],{duration:220,easing:'cubic-bezier(.22,.7,.25,1)'});
  }
  updateActions();updateClocks();startClock();schedulePoll();
  queueMicrotask(flushPremove);
  void connectRealtime();
}
function render(previous){
  const state=game.state,self=game.side,enemy=opposite(self);
  document.body.classList.toggle('bot-game',isBot());
  $('selfName').textContent=state.players[self]||'You';$('opponentName').textContent=state.players[enemy]||'Your friend';
  $('selfColor').textContent=`${self==='w'?'White':'Black'} pieces · You`;$('opponentColor').textContent=`${enemy==='w'?'White':'Black'} pieces`;
  for(const [id,color] of [['selfBar',self],['opponentBar',enemy]])$(id).querySelector('.player-avatar').textContent=color==='w'?'♙':'♟';
  const turn=state.turn===self?'Your turn':isBot()?'Bot’s turn':`${state.players[state.turn]}’s turn`;
  $('gameStatus').textContent=state.status==='waiting'?'Waiting for player':state.status==='active'?`${turn}${new Chess(state.fen).inCheck()?' · Check':''}`:gameMessage(state,self);
  $('roundLabel').hidden=state.round<=1;$('roundLabel').textContent=`Round ${state.round}`;
  $('invitePanel').hidden=state.status!=='waiting';$('inviteUrl').value=inviteUrl(game.room);$('boardNotice').hidden=state.status!=='waiting';
  if(isBot()){$('invitePanel').hidden=true;$('boardNotice').hidden=true;}
  $('board').setAttribute('aria-disabled',String(state.status!=='active'));
  $('clockLabel').textContent=TIME_CONTROLS[state.time].label;
  $('newInvitation').href=isBot()?'?mode=bot&setup=1':'./';$('engineCredit').hidden=!isBot();
  renderBoard(previous);renderMoves();
}
function renderBoard(previous){
  const engine=new Chess(game.state.fen),board=$('board'),files=orientation==='w'?'abcdefgh':'hgfedcba',ranks=orientation==='w'?'87654321':'12345678';
  const focused=board.contains(document.activeElement)?document.activeElement?.dataset.square:null;
  const oldRects=new Map([...board.querySelectorAll('.square')].map(n=>[n.dataset.square,n.getBoundingClientRect()]));
  board.replaceChildren();
  for(const rank of ranks){const row=document.createElement('div');row.className='board-row';row.setAttribute('role','row');
    for(const file of files){const square=file+rank,piece=engine.get(square),cell=document.createElement('button');
      cell.type='button';cell.className=`square${('abcdefgh'.indexOf(file)+Number(rank))%2===1?' dark':''}`;cell.dataset.square=square;cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`${square}${piece?`, ${piece.color==='w'?'white':'black'} ${pieceNames[piece.type]}`:', empty'}`);cell.tabIndex=square===(focused||lastFocus)?0:-1;
      if(piece){cell.insertAdjacentHTML('afterbegin',pieceArt(piece));cell.classList.add('occupied');}
      if(file===files[0]){const label=document.createElement('span');label.className='coordinate rank';label.textContent=rank;label.setAttribute('aria-hidden','true');cell.append(label);}
      if(rank===ranks[7]){const label=document.createElement('span');label.className='coordinate file';label.textContent=file;label.setAttribute('aria-hidden','true');cell.append(label);}
      if(game.state.lastMove&&(game.state.lastMove.from===square||game.state.lastMove.to===square))cell.classList.add('last');
      if(piece?.type==='k'&&piece.color===game.state.turn&&engine.inCheck())cell.classList.add('check');
      row.append(cell);
    }board.append(row);
  }
  updateSelection();if(focused)board.querySelector(`[data-square=${focused}]`)?.focus({preventScroll:true});
  if(previous&&previous.state.round===game.state.round&&previous.state.moves.length+1===game.state.moves.length&&!reduced.matches){
    const move=game.state.lastMove,to=board.querySelector(`[data-square=${move.to}]`),fromRect=oldRects.get(move.from),toRect=to?.getBoundingClientRect();
    if(fromRect&&toRect)to.querySelector('.piece')?.animate([{transform:`translate(${fromRect.left-toRect.left}px,${fromRect.top-toRect.top}px)`},{transform:'translate(0,0)'}],{duration:210,easing:'cubic-bezier(.22,.7,.25,1)'});
  }
}
function renderMoves(){
  const list=$('moveList'),nearBottom=$('moveScroll').scrollHeight-$('moveScroll').scrollTop-$('moveScroll').clientHeight<40;list.replaceChildren();
  for(let i=0;i<game.state.moves.length;i+=2){const row=document.createElement('li');for(const move of game.state.moves.slice(i,i+2)){const span=document.createElement('span');span.textContent=move;row.append(span);}list.append(row);}
  $('movesEmpty').hidden=game.state.moves.length>0;$('downloadPgn').disabled=game.state.moves.length===0;
  if(nearBottom)$('moveScroll').scrollTop=$('moveScroll').scrollHeight;
}
function canMove(){return (isBot()?bot?.canPlay:game?.state.status==='active'&&game.state.turn===game.side)&&!pending;}
function canQueue(){return preferences.premoves&&!pending&&!destroyed&&!document.hidden&&game?.state.status==='active'&&game.state.turn!==game.side;}
function destinations(square){return canQueue()?premoveTargets(game.state.fen,game.side,square):new Chess(game.state.fen).moves({square,verbose:true});}
function cancelPremove(announce=false){
  const had=Boolean(premove.value);premove.clear();selected=null;legal=[];updateSelection();
  if(had&&announce)message('Premove canceled.');
}
function flushPremove(){
  if(!game||!premove.value)return;
  const result=premove.check(game);
  if(result.status==='invalid'){cancelPremove();message('Premove canceled: no longer legal.');return;}
  if(result.status!=='ready'||!canMove()||destroyed||document.hidden)return;
  const move=result.move;premove.clear();selected=null;legal=[];updateSelection();void act('move',move);
}
function updateSelection(){
  const engine=game?new Chess(game.state.fen):null;
  for(const cell of $('board').querySelectorAll('.square')){
    const square=cell.dataset.square;cell.classList.toggle('selected',square===selected);cell.setAttribute('aria-selected',String(square===selected));
    cell.classList.toggle('legal',legal.some(move=>move.to===square));cell.classList.toggle('can-select',(canMove()||canQueue())&&engine.get(square)?.color===game.side);
    cell.classList.toggle('premove-from',premove.value?.from===square);cell.classList.toggle('premove-to',premove.value?.to===square);
    cell.classList.toggle('premove-candidate',canQueue()&&legal.some(move=>move.to===square));
    cell.classList.toggle('hint-from',hintMove?.from===square);cell.classList.toggle('hint-to',hintMove?.to===square);
  }
  $('premoveStatus').hidden=!premove.value;
  if(premove.value)$('premoveText').textContent=`Premove: ${premove.value.from} → ${premove.value.to}${premove.value.promotion?' = '+premove.value.promotion.toUpperCase():''}`;
}
function updateActions(){
  if(!game)return;const state=game.state,active=state.status==='active';
  $('gameActions').hidden=!active;$('finishedActions').hidden=state.status!=='finished';
  $('offerDraw').hidden=isBot();$('offerDraw').disabled=pending||Boolean(state.drawOffer);$('offerDraw').textContent=state.drawOffer===game.side?'Draw offered':'Offer draw';$('resign').disabled=pending;
  $('drawPanel').hidden=state.drawOffer!==opposite(game.side)||!active;
  $('drawText').textContent=`${state.players[opposite(game.side)]} offered a draw.`;
  for(const id of ['acceptDraw','declineDraw'])$(id).disabled=pending;
  $('rematch').disabled=pending||(!isBot()&&state.rematch.includes(game.side));$('rematch').textContent=isBot()?'Play again':state.rematch.includes(game.side)?'Waiting…':state.rematch.length?'Accept rematch':'Play again';
  $('practiceTools').hidden=!isBot();$('botHint').disabled=pending||!bot?.canHint;$('botHint').textContent=bot?.status==='hint'?'Finding…':'Hint';$('botUndo').disabled=pending||!bot?.canUndo;
  $('engineRetry').hidden=!isBot()||bot?.status!=='error';
  updateSelection();
}
function updateClocks(){
  if(!game||!anchor)return;const state=game.state,remaining={...anchor.remaining};
  if(state.status==='active'&&TIME_CONTROLS[state.time].base)remaining[state.turn]=Math.max(0,remaining[state.turn]-(performance.now()-anchor.at));
  if(state.status==='active'&&TIME_CONTROLS[state.time].base&&remaining[state.turn]===0&&performance.now()>timeoutSyncAt){timeoutSyncAt=performance.now()+1500;void sync();}
  for(const [id,side] of [['selfClock',game.side],['opponentClock',opposite(game.side)]]){
    const n=$(id),seconds=Math.ceil(remaining[side]/1000);n.hidden=!TIME_CONTROLS[state.time].base;n.textContent=TIME_CONTROLS[state.time].base?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'∞';
    n.classList.toggle('running',state.status==='active'&&state.turn===side);n.classList.toggle('low',TIME_CONTROLS[state.time].base>0&&seconds<30);
  }
}
function startClock(){clearInterval(clockTimer);if(game?.state.status==='active'&&TIME_CONTROLS[game.state.time].base&&!document.hidden)clockTimer=setInterval(updateClocks,200);}
function schedulePoll(){
  clearTimeout(poll);if(!game||isBot()||document.hidden||destroyed)return;
  poll=setTimeout(()=>void sync(),subscribed?15000:2500);
}
async function sync(){
  if(isBot()||!seat||!activeRoom()||document.hidden||destroyed)return;
  if(syncInFlight){syncAgain=true;return syncInFlight;}
  syncInFlight=(async()=>{
    try{snapshot(await request(`games/${activeRoom()}`));connection(subscribed?'Live':'Connected',subscribed?'live':'connected');}
    catch(error){connection(navigator.onLine?'Reconnecting':'Offline','offline');if(error.status===404||error.status===403)message(error.message,true);}
    finally{syncInFlight=null;schedulePoll();if(syncAgain){syncAgain=false;queueHint();}}
  })();return syncInFlight;
}
async function connectRealtime(){
  if(!game||isBot()||document.hidden||connecting||channel||destroyed)return;connecting=true;
  try{
    const {RealtimeClient}=await import('./vendor/realtime.mjs?v=20261101-1');
    if(document.hidden||destroyed)return;
    realtime=new RealtimeClient(`${BACKEND_URL.replace('https:','wss:')}/realtime/v1`,{params:{apikey:PUBLISHABLE_KEY}});
    channel=realtime.channel(`chess:${game.channel}`,{config:{broadcast:{self:false}}});
    channel.on('broadcast',{event:'changed'},event=>{
      // Hints never supply state. Ignore old/duplicate messages; coalesce new hints
      // with a trailing fetch so fast replies are not lost inside a throttle window.
      const revision=event?.payload?.revision;
      if(!Number.isSafeInteger(revision)||revision<=game.revision)return;queueHint();
    }).subscribe(status=>{subscribed=status==='SUBSCRIBED';connection(subscribed?'Live':'Connected',subscribed?'live':'connected');schedulePoll();if(subscribed)void sync();});
  }catch{connection('Connected','connected');}finally{connecting=false;}
}
function queueHint(){
  if(hintTimer!==null||document.hidden||destroyed)return;
  hintTimer=setTimeout(()=>{hintTimer=null;syncAfter=performance.now()+1000;void sync();},Math.max(0,syncAfter-performance.now()));
}
function disconnectRealtime(){clearTimeout(hintTimer);hintTimer=null;syncAgain=false;subscribed=false;if(channel)void channel.unsubscribe();channel=null;realtime?.disconnect();realtime=null;}
async function onlineAct(action,fields={}){
  if(pending||!game)return;pending=true;updateActions();message('');
  try{
    const round=game.state.round;
    try{snapshot(await request(`games/${game.room}/${action}`,{method:'POST',body:{revision:game.revision,...fields}}));}
    catch(error){
      // Simultaneous rematch requests may race. Retry only this same finished round,
      // never a move, resignation, draw acceptance or a different game.
      if(action!=='rematch'||error.status!==409||error.game?.state.round!==round||error.game?.state.status!=='finished'||error.game.state.rematch.includes(error.game.side))throw error;
      snapshot({data:error.game});snapshot(await request(`games/${game.room}/rematch`,{method:'POST',body:{revision:game.revision}}));
    }
  }
  catch(error){if(error.game)snapshot({data:error.game});message(error.message||'Connection interrupted. Reconnecting before your next move.',true);await sync();}
  finally{pending=false;selected=null;legal=[];updateActions();queueMicrotask(flushPremove);}
}
const friendController={act:onlineAct,suspend:disconnectRealtime,resume:()=>{void sync();void connectRealtime();}};
async function act(action,fields={}){
  if(!isBot())return friendController.act(action,fields);
  if(pending||!bot)return;message('');
  try{if(action==='move')bot.play(fields);else if(action==='resign')bot.resign();else if(action==='rematch')bot.restart();}
  catch(error){message(error.message,true);}finally{selected=null;legal=[];updateActions();}
}
function botStatus(status,error){
  const labels={loading:'Loading bot',thinking:'Thinking',hint:'Finding a hint',ready:'Ready',error:'Bot unavailable',paused:'Paused'};
  connection(labels[status]||'Ready',status==='ready'?'live':status==='thinking'||status==='hint'?'thinking':status);
  if(error)message(error,true);updateActions();
}
async function openBot({restore=false,name,side,strength}={}){
  const {BotGame}=await import('./bot-game.mjs?v=20261101-5');
  bot?.dispose();bot=new BotGame({onChange:data=>snapshot({data}),onStatus:botStatus,onWarning:text=>message(text,true),onHint:move=>{
    hintMove=move;updateSelection();if(move)message(`Hint: ${move.san} (${move.from} → ${move.to}${move.promotion?' · promote to '+pieceNames[move.promotion]:''}).`);
  }});
  if(restore){if(!bot.restore())return false;}else bot.start(name,{side,strength});
  history.replaceState(null,'','?mode=bot');if(document.hidden)bot.suspend();return true;
}
function choose(square){
  if(!canMove()&&!canQueue())return;const engine=new Chess(game.state.fen),piece=engine.get(square),destination=legal.filter(move=>move.to===square);
  if(selected&&destination.length){void moveTo(selected,square,destination);return;}
  if(piece?.color===game.side){const repeated=selected===square;premove.clear();selected=repeated?null:square;legal=selected?destinations(selected):[];updateSelection();}
  else cancelPremove();
}
async function moveTo(from,to,options){
  const queuing=canQueue();if(!queuing&&!canMove())return;
  const submit=move=>{
    if(queuing){if(canQueue()&&premove.set(game,move)){selected=null;legal=[];message('');updateSelection();}}
    else void act('move',move);
  };
  if(options.some(move=>move.promotion)){
    promotionMove={from,to,revision:game.revision};$('promotionChoices').replaceChildren();
    for(const type of ['q','r','b','n']){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Promote to ${pieceNames[type]}`);button.innerHTML=pieceArt({type,color:game.side});button.addEventListener('click',()=>{const move=promotionMove;closePromotion();if(move?.revision===game.revision)submit({from:move.from,to:move.to,promotion:type});});$('promotionChoices').append(button);}
    $('promotion').showModal();return;
  }
  submit({from,to});
}
function closePromotion(){if($('promotion').open)$('promotion').close();promotionMove=null;}
function cancelDrag(){if(!drag)return;drag.ghost?.remove();drag.cell.classList.remove('drag-source');$('board').querySelector('.drop-target')?.classList.remove('drop-target');drag=null;}
function pointerDown(event){
  if(event.isPrimary===false||drag)return;
  // Only suppress the click synthesized by the completed drag. A fresh press
  // is a new intention and must not inherit that drag's short suppression.
  ignoreClickUntil=0;
  const cell=event.target.closest('.square');if(!cell||event.button!==0||(!canMove()&&!canQueue()))return;
  const engine=new Chess(game.state.fen),piece=engine.get(cell.dataset.square);if(piece?.color!==game.side)return;
  drag={cell,square:cell.dataset.square,x:event.clientX,y:event.clientY,piece,id:event.pointerId,ghost:null,moved:false,wasSelected:selected===cell.dataset.square};
  cell.setPointerCapture?.(event.pointerId);
}
function pointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
  if(!drag.moved){drag.moved=true;premove.clear();selected=drag.square;legal=destinations(selected);updateSelection();drag.cell.classList.add('drag-source');drag.ghost=document.createElement('div');drag.ghost.className='drag-piece';drag.ghost.innerHTML=pieceArt(drag.piece);drag.ghost.setAttribute('aria-hidden','true');const size=drag.cell.getBoundingClientRect().width;drag.ghost.style.width=drag.ghost.style.height=`${size}px`;document.body.append(drag.ghost);}
  event.preventDefault();drag.ghost.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0) translate(-50%,-50%)`;
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.square');$('board').querySelector('.drop-target')?.classList.remove('drop-target');
  if(target&&legal.some(move=>move.to===target.dataset.square))target.classList.add('drop-target');
}
let ignoreClickUntil=0;
function pointerUp(event){
  if(!drag||event.pointerId!==drag.id)return;const current=drag;
  if(current.moved){ignoreClickUntil=performance.now()+300;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.square'),options=legal.filter(move=>move.to===target?.dataset.square);cancelDrag();if(options.length)void moveTo(current.square,target.dataset.square,options);}
  else cancelDrag();
}
function keyboard(event){
  const cell=event.target.closest('.square');if(!cell)return;const cells=[...$('board').querySelectorAll('.square')],index=cells.indexOf(cell),delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:8,ArrowUp:-8}[event.key];
  if(delta){event.preventDefault();let next=index+delta;if((event.key==='ArrowLeft'&&index%8===0)||(event.key==='ArrowRight'&&index%8===7)||next<0||next>63)return;cells.forEach(n=>n.tabIndex=-1);cells[next].tabIndex=0;lastFocus=cells[next].dataset.square;cells[next].focus();}
  else if(event.key==='Escape'){event.preventDefault();cancelDrag();cancelPremove(true);}
}
function showLobby(){
  const room=roomFromUrl();if(room&&!roomPattern.test(room)){message('This invitation is not valid. Ask your friend for a fresh link.',true);$('startButton').disabled=true;return;}
  if(room){$('modePicker').hidden=true;$('gameOptions').hidden=true;$('setupTitle').textContent='Join game';$('startButton').firstElementChild.textContent='Join game';}
  else {const last=Object.keys(seats)[0];if(last){$('resumeButton').hidden=false;$('resumeButton').onclick=()=>location.assign(`?room=${last}`);}}
  if(!room)updateMode();$('startButton').disabled=false;
}
function updateMode(){
  const chosen=botMode(),options=$('gameOptions'),from=options.getBoundingClientRect().height,animate=lastMode!==null&&lastMode!==chosen&&!reduced.matches&&!document.hidden;
  optionMotion?.cancel();fieldMotion?.cancel();
  $('botOptions').hidden=!chosen;$('clockOptions').hidden=chosen;$('resumeButton').hidden=chosen||Object.keys(seats).length===0;
  $('setupTitle').textContent='New game';$('startButton').firstElementChild.textContent=chosen?'Play':'Create game';
  let saved=false;try{saved=Boolean(localStorage.getItem('ascendo-chess-bot-v1'));}catch{}$('resumeBot').hidden=!chosen||!saved;
  if(animate){
    const to=options.getBoundingClientRect().height;options.dataset.animating='true';
    const motion=options.animate([{height:`${from}px`},{height:`${to}px`}],{duration:240,easing:'cubic-bezier(.22,.7,.25,1)'});optionMotion=motion;
    motion.finished.catch(()=>{}).then(()=>{if(optionMotion===motion){delete options.dataset.animating;optionMotion=null;}});
    fieldMotion=$(chosen?'botOptions':'clockOptions').animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});
  }
  lastMode=chosen;
}
function stopMotion(){optionMotion?.cancel();fieldMotion?.cancel();sceneMotion?.cancel();delete $('gameOptions').dataset.animating;}
for(const radio of $('setup').elements.mode)radio.addEventListener('change',updateMode);
$('botStrength').addEventListener('input',()=>{const value=Number($('botStrength').value);$('strengthValue').textContent=`${value} / 20`;$('botStrength').setAttribute('aria-valuetext',`Level ${value} of 20`);$('botStrength').style.setProperty('--strength-fill',`${(value-1)/19*100}%`);try{localStorage.setItem('ascendo-chess-bot-skill-v1',String(value));}catch{}});
$('botStrength').dispatchEvent(new Event('input'));
$('resumeBot').onclick=async()=>{try{await openBot({restore:true});}catch(error){message('Your saved bot game could not be restored. Start a new game.',true);}};
$('setup').addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;let name;
  try{name=nickname($('nickname').value);}catch(error){message(error.message,true);$('nickname').focus();return;}
  if(botMode()){
    pending=true;$('startButton').disabled=true;message('');
    try{const choice=$('setup').elements.color.value,side=choice==='random'?(crypto.getRandomValues(new Uint8Array(1))[0]%2?'w':'b'):choice;await openBot({name,side,strength:Number($('botStrength').value)});}
    catch(error){message(error.message||'The bot could not start. Try again.',true);}finally{pending=false;$('startButton').disabled=false;updateActions();}return;
  }
  let room=roomFromUrl(),joining=Boolean(room);room||=(creationRoom??=random(16));seat=seats[room]||{token:random(32)};const seatSaved=saveSeat(room,seat.token);
  pending=true;$('startButton').disabled=true;message('');
  try{
    const result=await request(joining?`games/${room}/join`:'games',{method:'POST',body:joining?{nickname:name}:{room,nickname:name,time:$('setup').elements.time.value,color:$('setup').elements.color.value}});
    history.replaceState(null,'',`?room=${room}`);snapshot(result);connection('Connected','connected');
    if(!seatSaved)message('Browser storage is unavailable. Keep this tab open to keep your seat.',true);
  }catch(error){message(error.message||'Could not connect. Try again; your invitation is kept safe.',true);}
  finally{pending=false;$('startButton').disabled=false;updateActions();}
});
$('board').addEventListener('click',event=>{if(event.detail!==0&&performance.now()<ignoreClickUntil)return;const cell=event.target.closest('.square');if(cell){lastFocus=cell.dataset.square;choose(cell.dataset.square);}});
$('board').addEventListener('keydown',keyboard);$('board').addEventListener('pointerdown',pointerDown);$('board').addEventListener('pointermove',pointerMove);$('board').addEventListener('pointerup',pointerUp);$('board').addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId)cancelDrag();});
$('board').addEventListener('contextmenu',event=>{event.preventDefault();cancelDrag();cancelPremove(true);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')&&(premove.value||selected)){event.preventDefault();const restore=document.activeElement===$('cancelPremove');cancelDrag();cancelPremove(true);if(restore)$('board').querySelector('[tabindex="0"]')?.focus({preventScroll:true});}});
$('cancelPremove').onclick=()=>{cancelPremove(true);$('board').querySelector('[tabindex="0"]')?.focus({preventScroll:true});};
$('rotateBoard').onclick=()=>{if(game){cancelDrag();orientation=opposite(orientation);renderBoard();}};
$('offerDraw').onclick=()=>void act('offer-draw');$('acceptDraw').onclick=()=>void act('accept-draw');$('declineDraw').onclick=()=>void act('decline-draw');$('rematch').onclick=()=>void act('rematch');
$('resign').onclick=()=>{cancelPremove();$('confirmResign').showModal();};$('cancelResign').onclick=()=>$('confirmResign').close();$('confirmResignButton').onclick=()=>{$('confirmResign').close();void act('resign');};$('cancelPromotion').onclick=closePromotion;
$('botHint').onclick=()=>{message('');selected=null;legal=[];updateSelection();void bot?.hint();};$('botUndo').onclick=()=>{message('');cancelPremove();bot?.undo();};$('engineRetry').onclick=()=>{message('');bot?.retry();};
$('promotion').addEventListener('cancel',()=>{promotionMove=null;});
$('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(inviteUrl(game.room));message('Link copied.');}catch{$('inviteUrl').select();message('Copy the link above.');}};
$('downloadPgn').onclick=()=>{
  if(!game)return;const blob=new Blob([gamePgn(game)],{type:'application/x-chess-pgn'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ascendo-chess.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
for(const n of document.querySelectorAll('[data-piece-theme]'))n.innerHTML=pieceMarkup({type:'n',color:'w'},n.dataset.pieceTheme)+pieceMarkup({type:'k',color:'b'},n.dataset.pieceTheme);
for(const n of document.querySelectorAll('[name=boardTheme]'))n.checked=n.value===preferences.board;
for(const n of document.querySelectorAll('[name=pieceTheme]'))n.checked=n.value===preferences.pieces;
$('enablePremoves').checked=preferences.premoves;
$('settingsDialog').addEventListener('change',()=>{
  preferences={board:document.querySelector('[name=boardTheme]:checked').value,pieces:document.querySelector('[name=pieceTheme]:checked').value,premoves:$('enablePremoves').checked};
  document.documentElement.dataset.boardTheme=preferences.board;
  if(!preferences.premoves)cancelPremove();cancelDrag();if(game)renderBoard();
  $('settingsMessage').textContent=savePreferences(preferences)?'':'Settings work for this visit. Browser storage is unavailable.';
});
$('openSettings').onclick=()=>{cancelDrag();$('settingsDialog').showModal();};
$('closeSettings').onclick=()=>$('settingsDialog').close();
$('settingsDialog').addEventListener('click',event=>{if(event.target!==$('settingsDialog'))return;const r=$('settingsDialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('settingsDialog').close();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMotion();cancelPremove();clearTimeout(poll);clearInterval(clockTimer);if(isBot())bot?.suspend();else friendController.suspend();cancelDrag();closePromotion();}else{if(isBot())bot?.resume();else{startClock();friendController.resume();}}});
window.addEventListener('offline',()=>{if(!isBot())connection('Offline','offline');});window.addEventListener('online',()=>{if(!isBot())friendController.resume();});
window.addEventListener('pagehide',()=>{destroyed=true;stopMotion();cancelPremove();clearTimeout(poll);clearInterval(clockTimer);if(isBot())bot?.suspend();else friendController.suspend();cancelDrag();closePromotion();});
window.addEventListener('pageshow',event=>{if(event.persisted){destroyed=false;if(game)paintGame();if(isBot())bot?.resume();else{friendController.resume();startClock();}}});
reduced.addEventListener('change',()=>{if(reduced.matches)stopMotion();});
if(!roomFromUrl()&&new URL(location.href).searchParams.get('mode')==='bot')$('setup').elements.mode.value='bot';
showLobby();
const initialRoom=roomFromUrl();
if(roomPattern.test(initialRoom||'')&&seats[initialRoom]){
  seat=seats[initialRoom];$('startButton').disabled=true;
  try{snapshot(await request(`games/${initialRoom}`));connection('Connected','connected');}
  catch(error){message(error.message||'Could not reconnect. Try again.',true);}
  finally{$('startButton').disabled=false;}
}
if(!initialRoom&&new URL(location.href).searchParams.get('mode')==='bot'&&!new URL(location.href).searchParams.has('setup')){
  $('startButton').disabled=true;try{await openBot({restore:true});}catch{message('Your saved bot game could not be restored. Start a new game.',true);}finally{$('startButton').disabled=false;}
}
