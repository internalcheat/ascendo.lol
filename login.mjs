import { TURNSTILE_SITE_KEY } from './customizer-config.mjs';
import { request, storeSession } from './editor-api.mjs';

const form = document.getElementById('loginForm');
const status = document.getElementById('loginStatus');
const code = document.getElementById('accessCode');
const submit = form.querySelector('button[type=submit]');
let challenge = '';
let widget;
function message(value) { status.textContent=value; }
async function initialize() {
  try {
    const state = await request('/status',{},false);
    if (!state.ready) { message('Private login is being activated. Your public profiles remain available.'); return; }
    if (!TURNSTILE_SITE_KEY) { message('The login security check has not been configured yet.'); return; }
    const script = document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.addEventListener('load',()=>{
      widget=window.turnstile.render('#securityCheck',{sitekey:TURNSTILE_SITE_KEY,action:'profile-login',theme:'dark',size:matchMedia('(max-width: 420px)').matches?'compact':'normal',callback:token=>{challenge=token;submit.disabled=false;message('');},'expired-callback':()=>{challenge='';submit.disabled=true;message('Please complete the security check again.');},'error-callback':()=>{challenge='';submit.disabled=true;message('The security check could not load. Please retry.');}});
      code.disabled=false;
      message('Enter your private access code.');
    },{once:true});
    script.addEventListener('error',()=>message('The security check could not load. Check your connection and reload.'),{once:true});
    document.head.append(script);
  } catch(error) { message(error.message); }
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if (!challenge || submit.disabled) return;
  submit.disabled=true;
  form.setAttribute('aria-busy','true');
  message('Checking your access…');
  const entered=code.value;
  code.value='';
  try {
    const result=await request('/session',{method:'POST',body:{code:entered,challenge}},false);
    storeSession(result);
    location.replace('/customize/');
  } catch(error) {
    message(error.message);
    challenge='';
    if (widget!==undefined) window.turnstile.reset(widget);
    code.focus();
  } finally { form.removeAttribute('aria-busy'); }
});
initialize();
