import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto,createHmac} from 'node:crypto';
import {transform,build} from 'esbuild';
import {Window} from 'happy-dom';
import {normalizeHandle,createInvitedProfile,RESERVED_HANDLES} from '../invitation-policy.mjs';
import {normalizeProfile,profileMedia,MAX_IMAGE,MAX_VIDEO,OWNER_QUOTA} from '../profile-schema.mjs';
import {badgeError} from '../badge-policy.mjs';
import {badgeCapabilities} from '../supabase/functions/profile-api/badge-authority.mjs';
import {preserveVisualGroups} from '../visual-schema.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),checks=[],windows=[];
const check=async(name,run)=>{await run();checks.push(name);};
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',existing='10000000-0000-4000-8000-000000000003';
const hmac=value=>createHmac('sha256','isolated-fixture-pepper').update(value).digest('hex');
const token=id=>`${id}.${Buffer.from(JSON.stringify({session_id:'20000000-0000-4000-8000-000000000001'})).toString('base64url')}.fixture`;

try{
await check('handles normalize case and reject impersonation, reserved routes, unsafe characters and invalid bounds',()=>{
  assert.equal(normalizeHandle('  My-Handle1  '),'my-handle1');assert.equal(normalizeHandle('a'.repeat(24)),'a'.repeat(24));
  for(const handle of [...RESERVED_HANDLES,'aa','a'.repeat(25),'-handle','handle-','a_b','hello.world','Fоunder','my handle','/profile','<script>','😀😀😀'])assert.throws(()=>normalizeHandle(handle));
  const profile=createInvitedProfile('new-person');assert.equal(profile.name,'new-person');assert.equal(profile.badge,'');assert.equal(profile.background.kind,'black');assert.equal(profile.socials.length,0);for(const key of ['cursorEffects','cardEffects','entranceEffects','electricBorder','overlays','soundtrackCard','enterScreen','pageTitle'])assert.equal(profile[key].enabled,false);
});
await check('migration uses deny-all private storage, server-only invoker RPCs and unique atomic reservations',()=>{
  const sql=read('supabase/migrations/20261025193004_profile_invitations.sql');assert.match(sql,/enable row level security/);assert.match(sql,/security invoker/);assert.doesNotMatch(sql,/security definer/);assert.match(sql,/revoke all on function public\.profile_invitation_command[\s\S]+from public, anon, authenticated/);assert.match(sql,/for update/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/exception when unique_violation/);for(const term of RESERVED_HANDLES)assert.ok(sql.includes(`'${term}'`),term);assert.match(sql,/insert into private.credentials/);assert.doesNotMatch(sql,/password|lookup:\d/);
});

let handler,created=0,published=0,challengeValid=true,rateAllowed=true;
const invitations=new Map([[hmac('lookup:600001'),{id:owner,email:`${owner}@invites.ascendo.invalid`,owner:null,slug:null}],[hmac('lookup:600002'),{id:other,email:`${other}@invites.ascendo.invalid`,owner:null,slug:null}]]),users=new Map(),profiles=new Map([[existing,{slug:'existing-person',config:createInvitedProfile('existing-person'),revision:1}]]),credentials=new Map();
const fakeClient={auth:{getUser:async value=>({data:{user:{id:value.split('.')[0]}}}),admin:{getUserById:async id=>({data:{user:users.get(id)||null},error:users.has(id)?null:{code:'not_found'}}),createUser:async value=>{created++;assert.equal(value.email_confirm,true);assert.notEqual(value.password,'600001');users.set(value.id,{id:value.id,email:value.email,password:value.password});return {data:{user:users.get(value.id)},error:null};},signOut:async()=>({error:null})},signInWithPassword:async({email,password})=>{const user=[...users.values()].find(item=>item.email===email&&item.password===password);return user?{data:{session:{access_token:token(user.id),refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600}},error:null}:{data:{session:null},error:{code:'bad_login'}};}},rpc:async(name,{operation,payload})=>{
  if(name==='profile_invitation_command'){
    if(operation==='lookup')return {data:invitations.get(payload.digest)||null};
    const invitation=[...invitations.values()].find(item=>item.id===payload.owner||item.id===payload.invitation);
    if(operation==='status'&&profiles.has(payload.owner))return {data:{needsHandle:false,slug:profiles.get(payload.owner).slug}};
    if(!invitation||payload.owner!==invitation.id)return {error:{message:'Invitation unavailable'}};
    if(operation==='activate'){invitation.owner=payload.owner;return {data:true};}
    if(operation==='status')return {data:{needsHandle:!invitation.slug,slug:invitation.slug}};
    if(invitation.slug)return {data:{claimed:true,slug:invitation.slug,needsHandle:false}};
    if(operation==='available')return {data:{handle:payload.handle,available:![...profiles.values()].some(x=>x.slug===payload.handle)}};
    if(operation==='claim'){if([...profiles.values()].some(x=>x.slug===payload.handle))return {data:{conflict:true}};profiles.set(payload.owner,{slug:payload.handle,config:payload.config,defaults:payload.config,revision:1});invitation.slug=payload.handle;credentials.set(hmac('lookup:'+ (payload.owner===owner?'600001':'600002')),{slug:payload.handle,email:invitation.email});return {data:{claimed:true,needsHandle:false,slug:payload.handle}};}
  }
  if(operation==='runtime')return {data:{pepper:'isolated-fixture-pepper'}};
  if(operation==='rate')return {data:rateAllowed};
  if(operation==='lookup')return {data:credentials.get(payload.digest)||null};
  if(operation==='session')return {data:true};
  if(operation==='mine'){if(!profiles.has(payload.owner))return {error:{message:'Profile unavailable'}};return {data:profiles.get(payload.owner)};}
  if(operation==='uploads')return {data:[]};
  if(operation==='reserve')return {error:{message:'Profile unavailable'}};
  if(operation==='public')return {data:[...profiles.values()].find(x=>x.slug===payload.slug)||null};
  throw Error(`Unexpected fixture operation ${operation}`);
},storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:`https://test.supabase.co/storage/v1/object/public/profile-media/${path}`}}),copy:async()=>{published++;return {error:null};}})}};
let source=read('supabase/functions/profile-api/index.ts').replace(/^import .*;\r?\n/gm,'');source=(await transform(source,{loader:'ts',format:'esm'})).code;
vm.runInNewContext(source,{Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://test.supabase.co':'fixture-only'},serve:fn=>handler=fn},createClient:()=>fakeClient,normalizeProfile,profileMedia,MAX_IMAGE,MAX_VIDEO,OWNER_QUOTA,normalizeHandle,createInvitedProfile,badgeError,badgeCapabilities,preserveVisualGroups,crypto:webcrypto,TextEncoder,TextDecoder,Request,Response,URL,URLSearchParams,Uint8Array,AbortSignal,console,atob,fetch:async()=>new Response(JSON.stringify({success:challengeValid,hostname:'ascendo.lol',action:'profile-login'}))});
const call=(path,method='GET',body,id)=>handler(new Request('https://test.supabase.co/profile-api'+path,{method,headers:{'Content-Type':'application/json',...(id?{Authorization:`Bearer ${token(id)}`}:{})},body:body?JSON.stringify(body):undefined}));
await check('valid invitation requires human verification and existing rate limits before creating native Auth',async()=>{
  challengeValid=false;assert.equal((await call('/session','POST',{code:'600001',challenge:'fixture'})).status,401);assert.equal(created,0);challengeValid=true;rateAllowed=false;assert.equal((await call('/session','POST',{code:'600001',challenge:'fixture'})).status,429);assert.equal(created,0);rateAllowed=true;
  assert.equal((await call('/session','POST',{code:'600099',challenge:'fixture'})).status,401);assert.equal(created,0);
  const result=await call('/session','POST',{code:'600001',challenge:'fixture'});assert.equal(result.status,200);const session=await result.json();assert.equal(session.onboarding,true);assert.ok(session.access_token);assert.equal(created,1);assert.equal(profiles.has(owner),false);assert.equal(JSON.stringify(session).includes('600001'),false);
  await call('/session','POST',{code:'600001',challenge:'fixture'});assert.equal(created,1);
});
await check('pending accounts cannot edit or upload a profile and have no reserved-badge authority',async()=>{
  assert.equal((await call('/invitation')).status,401);const me=await (await call('/me','GET',null,owner)).json();assert.equal(me.onboarding,true);assert.equal(me.capabilities.canUseReservedBadges,false);
  const update=await call('/me','PUT',{revision:1,config:{...createInvitedProfile('new-person'),badge:'Founder'}},owner);assert.equal(update.status,403);assert.equal(published,0);
  assert.equal((await call('/uploads','POST',{kind:'avatar',mime:'image/png',bytes:64},owner)).status,403);
});
await check('reservation ignores forged owner/config/capability and becomes immutable for that account',async()=>{
  assert.equal((await call('/invitation/claim','POST',{handle:'internalcheats'},owner)).status,400);
  const initial=JSON.stringify(profiles.get(existing));const result=await call('/invitation/claim','POST',{handle:'My-Handle',owner:existing,config:{badge:'Founder'},capabilities:{canUseReservedBadges:true}},owner);assert.equal(result.status,200);assert.equal((await result.json()).slug,'my-handle');assert.equal(profiles.get(owner).config.badge,'');assert.equal(profiles.get(owner).config.soundtrackCard.enabled,false);assert.equal(JSON.stringify(profiles.get(existing)),initial);
  const again=await (await call('/invitation/claim','POST',{handle:'another-name'},owner)).json();assert.equal(again.slug,'my-handle');assert.equal(profiles.get(owner).slug,'my-handle');assert.equal((await (await call('/session','POST',{code:'600001',challenge:'fixture'})).json()).onboarding,false);
});
await check('taken handles cannot be claimed by a second invitation; existing accounts bypass onboarding',async()=>{
  await call('/session','POST',{code:'600002',challenge:'fixture'});assert.equal((await (await call('/invitation/check','POST',{handle:'my-handle'},other)).json()).available,false);assert.equal((await call('/invitation/claim','POST',{handle:'my-handle'},other)).status,409);assert.equal(profiles.has(other),false);assert.equal((await (await call('/invitation','GET',null,existing)).json()).needsHandle,false);assert.equal((await call('/invitation/claim','POST',{handle:'random-person'},existing)).status,403);
});
await check('minimal welcome validates privately and submits only the handle without exposing access codes',async()=>{
  const win=new Window({url:'https://ascendo.lol/welcome/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});windows.push(win);win.document.write(read('welcome/index.html'));win.document.close();win.matchMedia=()=>({matches:true});
  for(const key of ['window','document','sessionStorage','location'])Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true,writable:true});globalThis.matchMedia=win.matchMedia;sessionStorage.setItem('ascendo-editor-session',JSON.stringify({access_token:'isolated-token',expires_at:Date.now()/1000+3600}));let claims=0;
  globalThis.fetch=async(url,options={})=>{let result;const path=String(url).split('/profile-api')[1];if(path==='/invitation')result={needsHandle:true};else if(path==='/invitation/check')result={available:true};else if(path==='/invitation/claim'){const body=JSON.parse(options.body);assert.deepEqual(body,{handle:'new-fixture'});claims++;result={claimed:true,slug:'new-fixture'};}else throw Error(path);return new Response(JSON.stringify(result));};
  await import('../welcome.mjs?fixture=private');await tick();const input=document.getElementById('inviteHandle'),button=document.getElementById('reserveButton');assert.equal(document.getElementById('invitationCard').hidden,false);assert.equal(button.disabled,true);input.value='new-fixture';input.dispatchEvent(new win.Event('input',{bubbles:true}));assert.equal(button.disabled,false);assert.equal(claims,0);document.getElementById('reserveHandle').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(claims,1);assert.equal(document.body.classList.contains('welcome-complete'),true);assert.equal(document.querySelector('[type=password]'),null);
});
await check('Pages fallback mounts only existing handles and initializes the normal player once',async()=>{
  const win=new Window({url:'https://ascendo.lol/new-fixture/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(win);win.document.write(read('404.html'));win.document.close();win.document.body.className='page';
  for(const key of ['window','document','sessionStorage','localStorage','location','history','Event','CustomEvent','Image','HTMLVideoElement'])Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true,writable:true});globalThis.matchMedia=win.matchMedia.bind(win);globalThis.requestAnimationFrame=win.requestAnimationFrame.bind(win);globalThis.cancelAnimationFrame=win.cancelAnimationFrame.bind(win);win.HTMLMediaElement.prototype.load=function(){};win.HTMLMediaElement.prototype.pause=function(){};
  const {routeHandle,resolveProfileRoute}=await import('../route-profile.mjs?fixture=router');assert.equal(routeHandle('/new-person/'),'new-person');for(const path of ['/nested/new-person/','/assets/','/login','/bad_handle','/whatever.js'])assert.equal(routeHandle(path),'');
  globalThis.fetch=async()=>new Response('{}',{status:404});assert.equal(await resolveProfileRoute(),false);assert.ok(document.querySelector('.nf-hero'));vm.runInContext((await build({entryPoints:['app.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text,win);
  globalThis.fetch=async()=>new Response(JSON.stringify({config:createInvitedProfile('new-fixture'),revision:1}));assert.equal(await resolveProfileRoute(),true);await tick();assert.equal(document.body.className,'page page--profile');assert.equal(document.body.dataset.person,'new-fixture');assert.equal(document.querySelector('.nf-hero'),null);assert.equal(document.querySelector('h1').textContent,'new-fixture');assert.equal(document.getElementById('musicBackground').dataset.playerReady,'true');assert.equal(document.getElementById('mediaControls').hidden,true);assert.equal(document.querySelector('link[rel=canonical]').href,'https://ascendo.lol/new-fixture/');document.dispatchEvent(new win.Event('ascendo:profile-ready'));assert.equal(document.querySelectorAll('#musicBackground').length,1);win.dispatchEvent(new win.Event('pagehide'));
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{for(const win of windows)await win.happyDOM.close();}
