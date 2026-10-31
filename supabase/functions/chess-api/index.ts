import {createChessHandler,hash} from './service.mjs';

const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const repository=async(operation:string,payload:unknown)=>{
  const response=await fetch(`${url}/rest/v1/rpc/chess_command`,{
    method:'POST',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
    body:JSON.stringify({operation,payload}),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('Chess database unavailable');
  const data=await response.json();
  if(operation==='commit'&&data){
    // REST reaches subscribed clients even while database replication is warming up.
    // A failed notification cannot roll back an already committed move.
    const delivery=fetch(`${url}/realtime/v1/api/broadcast`,{
      method:'POST',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
      body:JSON.stringify({messages:[{topic:`chess:${data.channel}`,event:'changed',payload:{revision:data.revision},private:false}]}),signal:AbortSignal.timeout(2000)
    }).then(response=>response.body?.cancel()).catch(()=>{});
    if(typeof EdgeRuntime!=='undefined')EdgeRuntime.waitUntil(delivery);else await delivery;
  }
  return data;
};
// Guest seats are authenticated by high-entropy bearer capabilities inside the handler.
// Profile sessions and profile credentials are never accepted or modified here.
Deno.serve(createChessHandler({repository,ipDigest:ip=>hash(`${secret}:chess-ip:${ip}`)}));
