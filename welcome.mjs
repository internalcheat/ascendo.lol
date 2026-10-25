import {request,session,storeSession} from './editor-api.mjs';
import {normalizeHandle} from './handle-policy.mjs?v=20261025-13';

const byId=id=>document.getElementById(id),form=byId('reserveHandle'),input=byId('inviteHandle'),button=byId('reserveButton'),status=byId('invitationStatus');
let ready=false,busy=false,timer=0,generation=0,destroyed=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function message(value,state=''){status.textContent=value;status.dataset.state=state;input.setAttribute('aria-invalid',String(state==='error'));}
function candidate(){try{return normalizeHandle(input.value);}catch{return '';}}
function controls(){input.disabled=!ready||busy;button.disabled=!ready||busy||!candidate();byId('invitationLogout').disabled=busy;}
function finish(){ready=false;controls();document.body.classList.add('welcome-complete');setTimeout(()=>location.replace('/customize/'),reduced.matches?0:220);}
async function initialize(){
  if(!session()){location.replace('/login/');return;}
  try{const state=await request('/invitation');if(destroyed)return;if(!state.needsHandle){location.replace('/customize/');return;}ready=true;byId('invitationCard').hidden=false;byId('invitationLogout').hidden=false;controls();message('');input.focus({preventScroll:true});}
  catch(error){message(error.message,'error');if(error.status===401){storeSession(null);location.replace('/login/');}}
}
input.addEventListener('input',()=>{
  clearTimeout(timer);generation++;message('');controls();if(!candidate())return;
  const current=generation,handle=candidate();
  timer=setTimeout(async()=>{try{const state=await request('/invitation/check',{method:'POST',body:{handle}});if(destroyed||busy||current!==generation)return;if(state.claimed){finish();return;}message(state.available?'Available':'This handle is already taken.',state.available?'available':'error');}catch(error){if(!destroyed&&!busy&&current===generation)message(error.message,'error');}},450);
});
input.addEventListener('blur',()=>{input.value=input.value.trim().toLowerCase();if(input.value)try{normalizeHandle(input.value);}catch(error){message(error.message,'error');}});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready||busy)return;let handle;try{handle=normalizeHandle(input.value);}catch(error){message(error.message,'error');input.focus();return;}
  busy=true;generation++;clearTimeout(timer);controls();document.body.classList.add('is-reserving');byId('reserveLabel').textContent='Reserving';message('');
  try{const result=await request('/invitation/claim',{method:'POST',body:{handle}});if(result.claimed&&!destroyed)finish();else throw Error('Could not reserve your handle. Please try again.');}
  catch(error){if(!destroyed)message(error.message,'error');}
  finally{busy=false;document.body.classList.remove('is-reserving');byId('reserveLabel').textContent='Reserve';controls();if(ready)input.focus({preventScroll:true});}
});
byId('invitationLogout').addEventListener('click',async()=>{if(busy)return;busy=true;controls();try{await request('/session',{method:'DELETE'});storeSession(null);location.replace('/login/');}catch(error){message(error.message,'error');busy=false;controls();}});
window.addEventListener('pagehide',()=>{destroyed=true;clearTimeout(timer);generation++;});
window.addEventListener('pageshow',event=>{if(event.persisted){destroyed=false;initialize();}});
initialize();
