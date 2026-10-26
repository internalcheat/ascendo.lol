import {profileSlug} from '../share-policy.mjs';
import {captureOptions} from '../share-capture-policy.mjs';
async function equalSecret(left,right){if(!left||!right)return false;const hash=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));const [a,b]=await Promise.all([hash(left),hash(right)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
export default {async fetch(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/capture')return new Response('Not found',{status:404});
  if(!await equalSecret(request.headers.get('Authorization'),`Bearer ${env.SHARE_CAPTURE_KEY||''}`)||!env.SHARE_CAPTURE_KEY)return new Response('Unauthorized',{status:401});
  if(env.FREE_PLAN_CONFIRMED!=='true'||!env.BROWSER)return new Response('Capture unavailable',{status:503});
  try{const reader=request.body?.getReader();if(!reader)return new Response('Invalid request',{status:400});const chunks=[];let size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return new Response('Invalid request',{status:413});}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const value of chunks){bytes.set(value,offset);offset+=value.length;}const input=JSON.parse(new TextDecoder().decode(bytes));if(!input||Object.keys(input).some(key=>!['slug','revision'].includes(key))||typeof input.slug!=='string'||profileSlug('/'+input.slug)!==input.slug||!Number.isSafeInteger(input.revision)||input.revision<1)return new Response('Invalid request',{status:400});
    const response=await env.BROWSER.quickAction('snapshot',captureOptions(input.slug,input.revision,env.CAPTURE_ORIGIN||'https://ascendo.lol'));const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers});
  }catch(error){const message=String(error?.message||'');return new Response('Capture failed',{status:/quota|daily.*limit|allowance/i.test(message)?429:/timeout|timed out/i.test(message)?504:503});}
}};
