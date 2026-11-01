import {Chess} from './game.mjs?v=20261101-1';

const squarePattern=/^[a-h][1-8]$/;
const input=move=>({from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})});

// These are candidate destinations, not legal moves. The next position must
// validate the queued move again, including check, castling and en passant.
export function premoveTargets(fen,side,from){
  if(!squarePattern.test(from)||!['w','b'].includes(side))return [];
  const engine=new Chess(fen),piece=engine.get(from),out=[];
  if(piece?.color!==side||engine.turn()===side)return out;
  const x=from.charCodeAt(0)-97,y=Number(from[1])-1;
  const add=(a,b)=>{
    if(a<0||a>7||b<0||b>7)return false;
    const to=String.fromCharCode(97+a)+(b+1),target=engine.get(to);
    if(target?.color===side||target?.type==='k')return false;
    if(piece.type==='p'&&(b===0||b===7))for(const promotion of ['q','r','b','n'])out.push({from,to,promotion});
    else out.push({from,to});
    return !target;
  };
  if(piece.type==='p'){
    const direction=side==='w'?1:-1;
    if(!engine.get(String.fromCharCode(97+x)+(y+direction+1))){
      add(x,y+direction);
      if(y===(side==='w'?1:6))add(x,y+direction*2);
    }
    // Empty diagonals allow a capture or en passant after the opponent moves.
    add(x-1,y+direction);add(x+1,y+direction);
  }else if(piece.type==='n'){
    for(const [a,b] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(x+a,y+b);
  }else if(piece.type==='k'){
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(a||b)add(x+a,y+b);
    const rank=side==='w'?'1':'8',rights=fen.split(' ')[2];
    if(from==='e'+rank)for(const [right,file,between] of [[side==='w'?'K':'k','g',['f','g']],[side==='w'?'Q':'q','c',['b','c','d']]]){
      if(rights.includes(right)&&between.every(f=>!engine.get(f+rank)))add(file.charCodeAt(0)-97,y);
    }
  }else{
    const directions=piece.type==='b'?[[1,1],[-1,1],[1,-1],[-1,-1]]:piece.type==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for(const [a,b] of directions)for(let step=1;step<8;step++)if(!add(x+a*step,y+b*step))break;
  }
  return out;
}

export class PremoveQueue {
  value=null;
  clear(){this.value=null;}
  set(game,move){
    const {state,side}=game;
    if(state.status!=='active'||state.turn===side||!premoveTargets(state.fen,side,move.from).some(m=>m.to===move.to&&m.promotion===move.promotion))return false;
    this.value={...input(move),room:game.room,side,round:state.round,history:[...state.moves],fen:state.fen};return true;
  }
  check(game){
    const q=this.value;if(!q)return {status:'empty'};
    const {state,side}=game;
    if(state.status!=='active'||q.room!==game.room||q.side!==side||q.round!==state.round||!q.history.every((m,i)=>m===state.moves[i]))return {status:'invalid'};
    const added=state.moves.length-q.history.length;
    if(added===0&&state.turn!==side&&state.fen===q.fen)return {status:'waiting'};
    if(added!==1||state.turn!==side)return {status:'invalid'};
    const legal=new Chess(state.fen).moves({square:q.from,verbose:true}).find(m=>m.to===q.to&&m.promotion===q.promotion);
    return legal?{status:'ready',move:input(legal)}:{status:'invalid'};
  }
}
