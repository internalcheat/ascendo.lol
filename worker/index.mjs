import {API_URL,PUBLISHABLE_KEY} from '../customizer-config.mjs';
import {profileSlug,publicProfilePath,metadataHtml,escapeHtml,jsonForHtml} from '../share-policy.mjs';
import {normalizeProfile} from '../profile-schema.mjs';
const inflight=new Map();
export function renderProfileDocument(template,slug,result){
  const config=normalizeProfile(result.config),avatar=config.avatar.poster||config.avatar.url;
  const identity=`<span class="avatar avatar--large"><img src="${escapeHtml(avatar)}" alt="" width="112" height="112" style="object-position:${config.avatar.x}% ${config.avatar.y}%"></span><h1 class="profile__name">${escapeHtml(config.name)}</h1>${config.bio?`<p class="profile__bio">${escapeHtml(config.bio).replace(/\n/g,'<br>')}</p>`:''}`;
  return template.replace('<!--PROFILE_METADATA-->',metadataHtml(slug,config)).replace('PROFILE_SLUG',escapeHtml(slug)).replace('<!--PROFILE_IDENTITY-->',identity).replace('<!--PROFILE_BOOTSTRAP-->',`<script id="profileBootstrap" type="application/json">${jsonForHtml({slug,revision:result.revision,config})}</script>`);
}
function originRequest(request,env,path){if(!env.ORIGIN_URL&&!path)return request;const base=env.ORIGIN_URL||new URL(request.url).origin;let target=path||new URL(request.url).pathname;if(env.ORIGIN_URL?.startsWith('https://raw.githubusercontent.com/internalcheat/ascendo.lol/')&&target.endsWith('/'))target+='index.html';const url=new URL(base.replace(/\/$/,'')+target+new URL(request.url).search);const headers=new Headers(request.headers);headers.delete('authorization');headers.delete('cookie');return new Request(url,{method:request.method==='HEAD'?'HEAD':'GET',headers,redirect:'manual'});}
export function createMetadataWorker({fetcher=fetch,cache=globalThis.caches?.default}={}){
  async function published(slug,capture){
    const key=new Request('https://ascendo.lol/__profile_metadata/'+slug);if(!capture&&cache){const hit=await cache.match(key);if(hit)return hit.json();}
    const read=async()=>{const response=await fetcher(`${API_URL}/public/${slug}`,{headers:{apikey:PUBLISHABLE_KEY},signal:AbortSignal.timeout(2500),cache:'no-store'});if(response.status===404)return null;if(!response.ok)throw Error('Profile service unavailable');const value=await response.json();if(!Number.isSafeInteger(value.revision)||value.revision<1)throw Error('Invalid revision');const result={revision:value.revision,config:normalizeProfile(value.config)};if(!capture&&cache)await cache.put(key,new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=30'}}));return result;};
    if(capture)return read();if(!inflight.has(slug))inflight.set(slug,read().finally(()=>inflight.delete(slug)));return inflight.get(slug);
  }
  return {async fetch(request,env={}){
    const url=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return fetcher(originRequest(request,env));
    if(/^\/nagyorru\/?$/i.test(url.pathname))return new Response(null,{status:308,headers:{Location:'https://ascendo.lol/internalcheats/'+url.search,'Cache-Control':'public,max-age=300'}});
    const slug=profileSlug(url.pathname);if(!slug){const response=await fetcher(originRequest(request,env));if(env.ORIGIN_URL?.startsWith('https://raw.githubusercontent.com/internalcheat/ascendo.lol/')){const types={mjs:'text/javascript',js:'text/javascript',css:'text/css',html:'text/html'};const type=types[url.pathname.split('.').at(-1)];if(type&&response.ok){const headers=new Headers(response.headers);headers.set('Content-Type',type+'; charset=utf-8');return new Response(response.body,{status:response.status,headers});}}return response;}
    try{const result=await published(slug,url.searchParams.get('__ascendo_capture')==='1');if(!result)return new Response(await (await fetcher(originRequest(request,env,'/404.html'))).text(),{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      const canonical=publicProfilePath(slug);if(url.pathname!==canonical)return new Response(null,{status:308,headers:{Location:canonical+url.search,'Cache-Control':'public,max-age=60'}});
      const response=await fetcher(originRequest(new Request(request.url,{headers:request.headers}),env,'/profile-shell.html'));if(!response.ok)throw Error('Template unavailable');const template=await response.text();if(!template.includes('<!--PROFILE_BOOTSTRAP-->'))throw Error('Invalid profile template');const html=renderProfileDocument(template,slug,result);
      return new Response(request.method==='HEAD'?null:html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':url.searchParams.has('__ascendo_capture')?'no-store':'public,max-age=0,s-maxage=30','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Ascendo-Profile-Revision':String(result.revision)}});
    }catch{return fetcher(originRequest(request,env));}
  }};
}
export default {fetch(request,env,context){return createMetadataWorker().fetch(request,env,context);}};
