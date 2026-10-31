import {createChessHandler,hash} from './service.mjs';

const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const repository=async(operation:string,payload:unknown)=>{
  const response=await fetch(`${url}/rest/v1/rpc/chess_command`,{
    method:'POST',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
    body:JSON.stringify({operation,payload}),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('Chess database unavailable');
  return response.json();
};
// Guest seats are authenticated by high-entropy bearer capabilities inside the handler.
// Profile sessions and profile credentials are never accepted or modified here.
Deno.serve(createChessHandler({repository,ipDigest:ip=>hash(`${secret}:chess-ip:${ip}`)}));
