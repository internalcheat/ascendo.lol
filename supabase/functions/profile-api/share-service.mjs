import {SHARE_RENDERER,SHARE_BUCKET,SHARE_MAX_BYTES,captureRequest,pngDimensions} from '../../../share-policy.mjs';

const messages={timeout:'Card generation took too long. Please try again.',profile_changed:'Your saved profile changed. Generate a new card.',too_large:'This profile is too tall or too large for one image.',render_failed:'Card generation failed. Please try again.',unavailable:'Card generation is temporarily unavailable. Link and QR downloads are ready.'};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const failure=(status,message)=>Object.assign(Error(message),{status});

export function createShareService({admin,command,body,now=()=>Date.now()}){
  async function rpc(operation,payload={}){const {data,error}=await admin.rpc('profile_share_command',{operation,payload});if(error)throw failure(503,'Could not prepare your profile card.');return data;}
  async function runnerRpc(operation,payload){const {data,error}=await admin.rpc('profile_share_runner',{operation,payload});if(error)throw failure(503,'Could not prepare profile exports.');return data;}
  const storage=()=>admin.storage.from(SHARE_BUCKET);
  async function remove(paths){const safe=[...new Set(paths||[])];if(safe.some(path=>!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.png$/.test(path)))throw Error('Invalid export path');if(safe.length){const {error}=await storage().remove(safe);if(error)throw failure(503,'Export cleanup failed.');}}
  async function cleanup(){const result=await rpc('cleanup');await remove(result.paths);}
  async function status(owner){
    const value=await rpc('status',{owner,renderer:SHARE_RENDERER});
    const response={state:value.state,revision:value.revision,available:true};
    if(value.state==='pending')response.phase=value.started_at?'rendering':'queued';
    if(value.state==='ready'&&value.path){const {data,error}=await storage().createSignedUrl(value.path,300,{download:false});if(error)throw failure(503,'Could not download your profile card.');response.url=data.signedUrl;response.expiresAt=new Date(now()+300000).toISOString();response.width=value.width;response.height=value.height;}
    if(value.state==='failed')response.message=messages[value.error_code]||messages.render_failed;
    return response;
  }
  async function route(request,user){
    if(request.method==='GET'){await cleanup();return status(user.id);}
    if(request.method!=='POST')throw failure(404,'Not found.');
    let input;try{input=captureRequest(await body(request));}catch(error){throw failure(400,error.message);}
    await cleanup();const current=await command('mine',{owner:user.id});
    if(current.revision!==input.revision)throw failure(409,messages.profile_changed);
    const job=await rpc('begin',{owner:user.id,revision:input.revision,renderer:SHARE_RENDERER});
    if(job.state==='conflict')throw failure(409,messages.profile_changed);
    if(['rate','quota','busy'].includes(job.state))throw failure(429,job.state==='quota'?'The free card-generation allowance is used up. Try again tomorrow.':job.state==='busy'?'Card generation is busy. Try again in a moment.':'Wait a moment before generating another card.');
    await remove(job.purge);return status(user.id);
  }
  async function bytes(request){
    if(request.headers.get('content-type')!=='image/png')throw failure(415,'Expected a PNG export.');
    const reader=request.body?.getReader();if(!reader)throw failure(400,'Missing image.');const chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>SHARE_MAX_BYTES){await reader.cancel();throw failure(413,messages.too_large);}chunks.push(value);}
    const result=new Uint8Array(size);let offset=0;for(const part of chunks){result.set(part,offset);offset+=part.length;}return result;
  }
  async function runner(request,identity,action){
    if(request.method!=='POST')throw failure(404,'Not found.');
    if(action==='health')return {ok:true,ref:identity.ref};
    if(action==='check'){
      const input=await body(request);if(!input||Object.keys(input).length)throw failure(400,'No runner selection is accepted.');
      await cleanup();const result=await runnerRpc('check',{runner:identity.id});await remove(result.purge);return {profiles:result.profiles,jobs:result.jobs};
    }
    const job=request.headers.get('x-ascendo-job');if(!uuid(job))throw failure(400,'Invalid export job.');
    const selected=await runnerRpc('lookup',{runner:identity.id,job});if(!selected)throw failure(404,'This export job has expired.');
    if(action==='fail'){
      const input=await body(request);if(!input||Object.keys(input).some(key=>key!=='code')||!Object.hasOwn(messages,input.code))throw failure(400,'Invalid export failure.');
      await remove([selected.path]);await rpc('fail',{owner:selected.owner,job,code:input.code});return {accepted:true};
    }
    if(action!=='upload')throw failure(404,'Not found.');
    const current=await command('mine',{owner:selected.owner});if(current.revision!==selected.revision){await rpc('fail',{owner:selected.owner,job,code:'profile_changed'});throw failure(409,messages.profile_changed);}
    const image=await bytes(request);let dimensions;try{dimensions=pngDimensions(image);}catch{throw failure(413,messages.too_large);}
    try{
      const {error}=await storage().upload(selected.path,image,{contentType:'image/png',cacheControl:'0',upsert:false});if(error)throw failure(503,'Could not store your profile card.');
      const done=await rpc('finish',{owner:selected.owner,job,bytes:image.length,height:dimensions.height});if(!done.accepted)throw failure(409,messages.profile_changed);
      return {accepted:true};
    }catch(error){await remove([selected.path]).catch(()=>{});await rpc('fail',{owner:selected.owner,job,code:error.status===409?'profile_changed':'render_failed'}).catch(()=>{});throw error;}
  }
  return {route,runner,cleanup};
}
