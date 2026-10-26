import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';import {transform} from 'esbuild';import {Window} from 'happy-dom';
import {normalizeProfile,profileMedia} from '../profile-schema.mjs';import {preserveVisualGroups} from '../visual-schema.mjs';import {badgeError} from '../badge-policy.mjs';import {badgeCapabilities} from '../supabase/functions/profile-api/badge-authority.mjs';import {createStudioPresets} from '../studio-presets.mjs';
const base=normalizeProfile(JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats),checks=[],check=async(name,fn)=>{await fn();checks.push(name);},tick=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));};
await check('preset API binds native ownership, validates snapshots and never publishes media or changes profile revisions',async()=>{
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',items=new Map();let handler,writes=0;
 const client={auth:{getUser:async token=>({data:{user:token.startsWith(a)?{id:a}:token.startsWith(b)?{id:b}:null}})},rpc:async(name,{operation,payload})=>{
  if(name==='profile_invitation_command')return {data:{}};
  if(name==='editor_command'){
   if(operation==='session')return {data:true};if(operation==='mine')return {data:{slug:payload.owner===a?'internalcheats':'regular-user',config:{...base,name:'InternalCheats'},revision:9}};if(operation==='uploads')return {data:[]};if(operation==='save'){writes++;return {data:{}};}throw Error(operation);
  }
  assert.equal(name,'profile_presets_command');
  if(operation==='create'){items.set(id,{id,owner:payload.owner,name:payload.name,config:payload.config});return {data:{id,name:payload.name}};}
  if(operation==='list')return {data:[...items.values()].filter(x=>x.owner===payload.owner).map(({id,name})=>({id,name}))};
  const item=items.get(payload.id);if(!item||item.owner!==payload.owner)return {data:null};
  if(operation==='delete'){items.delete(payload.id);return {data:{removed:true}};}return {data:item};
 },storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:'https://fixture.supabase.co/storage/v1/object/public/profile-media/'+path}}),remove:async()=>({})})}};
 const source=(await transform(fs.readFileSync('supabase/functions/profile-api/index.ts','utf8').replace(/^import .*;\r?\n/gm,''),{loader:'ts',format:'esm'})).code;
 vm.runInNewContext(source,{Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://fixture.supabase.co':'fixture-only'},serve:fn=>handler=fn},createClient:()=>client,normalizeProfile,profileMedia,preserveVisualGroups,badgeError,badgeCapabilities,crypto:webcrypto,MAX_IMAGE:5e6,MAX_VIDEO:5e7,OWNER_QUOTA:25e7,TextEncoder,TextDecoder,Request,Response,URL,Uint8Array,console,atob});
 const token=who=>who+'.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.fixture';
 const call=(who,path,method='GET',body)=>handler(new Request('https://fixture.invalid/profile-api'+path,{method,headers:{...(who?{Authorization:'Bearer '+token(who)}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}));
 assert.equal((await call(null,'/presets')).status,401);
 assert.equal((await call(b,'/presets','POST',{name:'Stolen authority',config:base,owner:a})).status,400);
 assert.equal((await call(b,'/presets','POST',{name:'Reserved badge',config:{...base,badge:'Founder'}})).status,400);
 assert.equal((await call(a,'/presets','POST',{name:'Foreign media',config:{...base,avatar:{...base.avatar,url:'https://fixture.supabase.co/storage/v1/object/public/profile-media/foreign/file.png'}}})).status,400);
 const config={...base,bio:'Unpublished snapshot',holographic:{enabled:true,finish:'pearl'}};
 assert.equal((await call(a,'/presets','POST',{name:'My profile',config})).status,200);assert.equal(writes,0);
 assert.equal((await (await call(a,'/presets')).json()).length,1);assert.equal((await (await call(b,'/presets')).json()).length,0);
 assert.equal((await call(b,'/presets/'+id)).status,404);assert.equal((await call(b,'/presets/'+id,'DELETE')).status,404);
 const restored=await (await call(a,'/presets/'+id)).json();assert.equal(restored.config.bio,'Unpublished snapshot');assert.equal(restored.config.holographic.finish,'pearl');
 assert.equal((await (await call(a,'/me')).json()).uploadQuota,500e6);assert.equal((await (await call(b,'/me')).json()).uploadQuota,250e6);
 await call(a,'/presets/'+id,'DELETE');assert.equal((await (await call(a,'/presets')).json()).length,0);assert.equal(writes,0);
});
await check('preset dialog saves the current draft privately, confirms replacement and loads without publishing',async()=>{
 const win=new Window({url:'https://ascendo.lol/customize/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});win.document.body.innerHTML='<div class="studio-header__actions"></div>';globalThis.document=win.document;
 const draft={...base,bio:'Keep my unpublished changes'},snapshot={...base,bio:'A saved snapshot'},calls=[];let loaded=0,allow=false;
 win.confirm=()=>allow;
 const controller=createStudioPresets({getDraft:()=>draft,loadDraft:config=>{loaded++;assert.equal(config.bio,snapshot.bio);},request:async(path,options)=>{calls.push([path,options]);if(options?.method==='POST')return {id:'preset'};if(path==='/presets/preset')return {config:snapshot};return [{id:'preset',name:'My preset'}];}});
 document.getElementById('profilePresets').focus();document.getElementById('profilePresets').click();await tick();const dialog=document.querySelector('dialog');assert.equal(dialog.open,true);
 const name=dialog.querySelector('input');name.value='My new preset';dialog.querySelector('form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await tick();
 const saved=calls.find(([,v])=>v?.method==='POST');assert.equal(saved[1].body.config.bio,draft.bio);assert.equal(saved[1].body.name,'My new preset');
 const load=[...dialog.querySelectorAll('button')].find(b=>b.textContent==='Load');load.click();await tick();assert.equal(loaded,0);allow=true;load.click();await tick();assert.equal(loaded,1);assert.equal(dialog.open,false);assert.equal(draft.bio,'Keep my unpublished changes');
 assert.ok(calls.every(([path])=>path.startsWith('/presets')));controller.close();await win.happyDOM.close();
});
console.log(JSON.stringify({passed:checks.length,checks}));
