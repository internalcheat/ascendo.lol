import {GameError,newGame,joinGame,transition,settleTimeout,nickname,opposite} from '../../../chess/game.mjs';

const ROOM=/^[a-f0-9]{32}$/,TOKEN=/^[a-f0-9]{64}$/;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const actions=new Set(['move','resign','offer-draw','accept-draw','decline-draw','rematch']);
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const playerSide=(row,digest)=>row.white_token===digest?'w':row.black_token===digest?'b':null;
function only(input,keys){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))throw new GameError(400,'Unexpected game settings.');}
async function readBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new GameError(415,'Expected JSON.');
  const reader=request.body?.getReader();if(!reader)throw new GameError(400,'Missing request.');
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw new GameError(413,'Request too large.');}chunks.push(value);}
  const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new GameError(400,'Invalid JSON.');}
}
export function createChessHandler({repository,now=()=>Date.now(),ipDigest=ip=>hash(ip),randomSide=()=>crypto.getRandomValues(new Uint8Array(1))[0]%2?'b':'w'}){
  return async request=>{
    const origin=request.headers.get('origin');
    const cors=origin==='https://ascendo.lol'?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
    const respond=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...cors,...extra}});
    try{
      if(origin&&origin!=='https://ascendo.lol')throw new GameError(403,'This origin is not allowed.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Max-Age':'600'}});
      const url=new URL(request.url),path=url.pathname.replace(/^.*\/chess-api\/?/,'').replace(/\/$/,'');
      if(path==='health'&&request.method==='GET')return respond({ok:true,version:1});
      if(!['GET','POST'].includes(request.method))return respond({error:'Method not allowed.'},405,{'Allow':'GET, POST, OPTIONS'});
      const match=path.match(/^games\/([a-f0-9]{32})(?:\/(join|move|resign|offer-draw|accept-draw|decline-draw|rematch))?$/);
      if(path!=='games'&&!match)throw new GameError(404,'Game not found.');
      const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
      if(!TOKEN.test(token||''))throw new GameError(401,'Your seat could not be verified.');
      const digest=await hash(token),ip=await ipDigest(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown');
      async function rate(key,limit,seconds){if(!await repository('rate',{key:await hash(`${ip}:${key}`),limit,seconds}))throw new GameError(429,'Too many requests. Try again shortly.');}
      await rate('requests',180,60);
      const snapshot=row=>({room:row.id,revision:row.revision,side:playerSide(row,digest),channel:row.channel,state:row.state,serverNow:now(),expiresAt:row.expires_at});
      let row;
      if(path==='games'){
        if(request.method!=='POST')throw new GameError(405,'Use POST to create a game.');
        const input=await readBody(request);only(input,['room','nickname','time','color']);
        if(!ROOM.test(input.room||''))throw new GameError(400,'Invalid invitation.');
        nickname(input.nickname);
        if(!['random','w','b'].includes(input.color))throw new GameError(400,'Choose a color.');
        // Check an existing idempotent creation before charging creation limits.
        row=await repository('get',{id:input.room});
        if(row){if(!playerSide(row,digest))throw new GameError(409,'This invitation is unavailable.');return respond(snapshot(row));}
        await rate('create',10,900);
        if(!await repository('rate',{key:await hash('global-chess-create'),limit:200,seconds:86400}))throw new GameError(429,'The chess tables are busy. Please try again later.');
        const side=input.color==='random'?randomSide():input.color,state=newGame(input.nickname,{time:input.time,side});
        row=await repository('create',{id:input.room,state,white_token:side==='w'?digest:null,black_token:side==='b'?digest:null,channel:crypto.randomUUID().replaceAll('-','')});
        if(!row||!playerSide(row,digest))throw new GameError(409,'This invitation is unavailable.');
        return respond(snapshot(row),201);
      }
      row=await repository('get',{id:match[1]});
      if(!row)throw new GameError(404,'This invitation expired or does not exist.');
      let side=playerSide(row,digest);
      const action=match[2];
      if(action==='join'){
        if(request.method!=='POST')throw new GameError(405,'Use POST to join.');
        const input=await readBody(request);only(input,['nickname']);nickname(input.nickname);
        if(side)return respond(snapshot(row));
        await rate('join',20,600);
        const state=joinGame(row.state,input.nickname,now());
        const result=await repository('commit',{id:row.id,revision:row.revision,state,join_token:digest});
        if(!result)throw new GameError(409,'Someone already joined this game.');
        return respond(snapshot(result));
      }
      if(!side)throw new GameError(403,'This seat belongs to another player.');
      if(!action){
        if(request.method!=='GET')throw new GameError(405,'Use GET to reconnect.');
        const timeout=settleTimeout(row.state,now());
        if(timeout){const updated=await repository('commit',{id:row.id,revision:row.revision,state:timeout});row=updated||await repository('get',{id:row.id});}
        return respond(snapshot(row));
      }
      if(!actions.has(action)||request.method!=='POST')throw new GameError(405,'Use POST for game actions.');
      const input=await readBody(request);only(input,action==='move'?['revision','from','to','promotion']:['revision']);
      if(!Number.isSafeInteger(input.revision)||input.revision!==row.revision)return respond({error:'The board changed. Your game has been refreshed.',game:snapshot(row)},409);
      const state=transition(row.state,side,action,input,now());
      if(!state)return respond(snapshot(row));
      const result=await repository('commit',{id:row.id,revision:row.revision,state,swap:state.round!==row.state.round});
      if(!result){row=await repository('get',{id:row.id});return respond({error:'The board changed. Your game has been refreshed.',game:snapshot(row)},409);}
      return respond(snapshot(result));
    }catch(error){
      const status=error instanceof GameError?error.status:503;
      if(status===503)console.error('chess_service_unavailable');
      return respond({error:status===503?'Chess is temporarily unavailable. Your game is safe; try reconnecting.':error.message},status,status===429?{'Retry-After':'30'}:{});
    }
  };
}
