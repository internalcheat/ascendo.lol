import { API_URL, PUBLISHABLE_KEY } from './customizer-config.mjs';

const sessionKey = 'ascendo-editor-session';
let refreshPending;
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export function session() {
  try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; }
}
export function storeSession(value) {
  if (value) sessionStorage.setItem(sessionKey,JSON.stringify(value));
  else sessionStorage.removeItem(sessionKey);
}
async function refresh() {
  if (refreshPending) return refreshPending;
  const current = session();
  if (!current?.refresh_token) throw new ApiError('Please sign in again.',401);
  refreshPending = request('/session/refresh',{method:'POST',body:{refresh_token:current.refresh_token}},false,false)
    .then(value=>{storeSession(value);return value;})
    .catch(error=>{storeSession(null);throw error;})
    .finally(()=>{refreshPending=undefined;});
  return refreshPending;
}
export async function request(path, options = {}, authenticated = true, retry = true) {
  let current = authenticated ? session() : null;
  if (authenticated && !current?.access_token) throw new ApiError('Please sign in again.',401);
  if(authenticated && current.expires_at && current.expires_at < Date.now()/1000+60){await refresh();current=session();}
  let response;
  try {
    response = await fetch(API_URL+path,{
      method:options.method || 'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
      headers:{apikey:PUBLISHABLE_KEY,...(options.body?{'Content-Type':'application/json'}:{}),...(current?{Authorization:`Bearer ${current.access_token}`}:{})},
      body:options.body?JSON.stringify(options.body):undefined,signal:AbortSignal.timeout(30000)
    });
  } catch { throw new ApiError('Could not reach the profile service. Your draft is still here; nothing was published.',0); }
  if (response.status===401 && authenticated && retry) { await refresh(); return request(path,options,true,false); }
  const data = await response.json().catch(()=>({error:'The profile service returned an invalid response.'}));
  if (!response.ok) throw new ApiError(data.error || 'The request could not be completed.',response.status);
  return data;
}
export async function freshSession(){const current=session();if(current?.expires_at<Date.now()/1000+60)await refresh();return session();}
