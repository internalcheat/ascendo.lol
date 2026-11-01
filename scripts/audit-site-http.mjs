import fs from 'node:fs';
import path from 'node:path';
import {BACKEND_URL,PUBLISHABLE_KEY} from '../customizer-config.mjs';

// Read-only public checks, plus intentionally unauthenticated requests. Never signs
// in, guesses a code, uploads media, creates a room, or changes a saved profile.
const site='https://ascendo.lol',api=BACKEND_URL+'/functions/v1/profile-api';
const report={routes:[],assets:[],api:[],findings:[]};
async function fetchCheck(url,options={}){
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),...options});
 const text=options.method==='HEAD'?'':await response.text();return {response,text};
}
const routes=['/','/plugins/','/chess/','/login/','/customize/','/welcome/','/internalcheats/','/k3rlsen/','/bal4zs/','/Szikraaaa/','/nagyorru/','/audit-missing-page-20261101/','/audit-missing-page-20261101/nested/'];
const assets=new Map();
for(const route of routes){
 const {response,text}=await fetchCheck(site+route);const missing=route.includes('audit-missing');
 const expected=missing?404:200;
 report.routes.push({route,status:response.status,expected,title:text.match(/<title>([^<]*)/i)?.[1]||'',https:new URL(response.url).protocol==='https:',csp:!!text.match(/http-equiv=["']Content-Security-Policy/i),hsts:response.headers.has('strict-transport-security')});
 if(response.status!==expected)report.findings.push({kind:'route',route,status:response.status,expected});
 for(const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
  let u;try{u=new URL(match[1].replaceAll('&amp;','&'),response.url);}catch{continue;}
  if(u.origin!==site||!(/\.(?:css|mjs|js|woff2|png|webp|jpg|jpeg|svg|ico)(?:$|\?)/i.test(u.pathname+u.search)))continue;
  assets.set(u.pathname+u.search,u.href);
 }
}
const list=[...assets];let index=0;
await Promise.all(Array.from({length:4},async()=>{while(index<list.length){const [asset,url]=list[index++];try{const {response}=await fetchCheck(url,{method:'HEAD'});report.assets.push({path:asset,status:response.status,type:response.headers.get('content-type')});if(response.status!==200)report.findings.push({kind:'asset',path:asset,status:response.status});}catch(error){report.findings.push({kind:'asset',path:asset,error:error.name});}}}));
async function probe(name,url,expected,options={}){
 const {response,text}=await fetchCheck(url,{headers:{apikey:PUBLISHABLE_KEY,...options.headers},...options});
 let data;try{data=JSON.parse(text);}catch{}
 const item={name,status:response.status,expected,noStore:response.headers.get('cache-control')?.includes('no-store')===true,leaksStack:/"stack"\s*:|SUPABASE_SERVICE_ROLE_KEY|"refresh_token"\s*:|"pepper"\s*:/.test(text)};
 report.api.push(item);if(!expected.includes(response.status)||item.leaksStack)report.findings.push({kind:'api',...item});return data;
}
for(const route of ['/me','/uploads','/presets','/share/card','/invitation'])await probe('unauthenticated '+route,api+route,[401]);
await probe('forged session',api+'/me',[401],{headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer audit-invalid-session'}});
await probe('foreign origin',api+'/status',[403],{headers:{apikey:PUBLISHABLE_KEY,Origin:'https://audit.invalid'}});
await probe('closed bootstrap',api+'/bootstrap',[403],{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}'});
for(const route of ['/session','/session/refresh'])await probe('non-object JSON '+route,api+route,[400,401],{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'null'});
await probe('private RPC',BACKEND_URL+'/rest/v1/rpc/editor_command',[401,403,404],{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({operation:'runtime',payload:{}})});
await probe('chess requires a seat',BACKEND_URL+'/functions/v1/chess-api/games/'+'0'.repeat(32),[401]);
for(const slug of ['internalcheats','k3rlsen','bal4zs','szikraaaa']){
 const data=await probe('public '+slug,api+'/public/'+slug,[200]);
 if(data&&Object.keys(data).some(key=>!['config','revision','slug'].includes(key)))report.findings.push({kind:'public-profile-fields',slug,keys:Object.keys(data)});
}
for(const file of fs.readdirSync('downloads')){
 if(!file.endsWith('.jar'))continue;const url=site+'/downloads/'+encodeURIComponent(file),response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(20000)});
 const bytes=fs.statSync(path.join('downloads',file)).size;report.assets.push({path:'/downloads/'+file,status:response.status,bytes,sizeMatches:Number(response.headers.get('content-length'))===bytes});
 if(response.status!==200||Number(response.headers.get('content-length'))!==bytes)report.findings.push({kind:'download',file});
}
fs.mkdirSync('test-results/site-audit',{recursive:true});fs.writeFileSync('test-results/site-audit/http.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({routes:report.routes.length,assets:report.assets.length,api:report.api.length,findings:report.findings},null,2));
if(report.findings.length)process.exitCode=1;
