import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { normalizeProfile, profileMedia, MAX_IMAGE, MAX_VIDEO, OWNER_QUOTA } from '../../../profile-schema.mjs';
import { badgeError } from '../../../badge-policy.mjs';
import { badgeCapabilities } from './badge-authority.mjs';
import { preserveVisualGroups } from '../../../visual-schema.mjs';
import { verifyOverlayVideo } from './overlay-video.mjs';
import { normalizeHandle, createInvitedProfile } from '../../../invitation-policy.mjs';
import {verifyMp3} from './audio-file.mjs';
import {createShareService} from './share-service.mjs';
import {verifyShareRunner} from './share-runner-auth.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const site = 'https://ascendo.lol';
const encoder = new TextEncoder();
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
let runtimePromise: Promise<any> | undefined;
let shareService: any;
function shares(){return shareService??=createShareService({admin,command,body});}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function command(operation: string, payload: any = {}) {
  const { data, error } = await admin.rpc('editor_command', { operation, payload });
  if(error)console.error('profile_rpc_error',operation,error.code);
  if (error) throw new HttpError(error.message.includes('quota') ? 413 : error.message.includes('Profile unavailable') ? 403 : 503, error.message.includes('quota') ? 'Your storage allowance is full. Remove unused media first.' : error.message.includes('Profile unavailable') ? 'No editable profile is assigned to this account.' : 'The profile service is temporarily unavailable.');
  return data;
}

async function runtime() {
  if (!runtimePromise) runtimePromise = command('runtime').catch(error => { runtimePromise = undefined; throw error; });
  return runtimePromise;
}

async function invitationCommand(operation: string,payload: any = {}) {
  const {data,error}=await admin.rpc('profile_invitation_command',{operation,payload});
  if(error)throw new HttpError(error.message.includes('Invalid handle')?400:error.message.includes('Invitation unavailable')?403:503,error.message.includes('Invalid handle')?'This handle is unavailable.':error.message.includes('Invitation unavailable')?'This invitation is unavailable.':'Could not reserve your handle. Please try again.');
  return data;
}

async function activateInvitation(invitation: any,code: string) {
  if(invitation.owner)return invitation;
  const password=await hmac(`password:${code}`);
  let result=await admin.auth.admin.getUserById(invitation.id);
  if(!result.data?.user){
    result=await admin.auth.admin.createUser({id:invitation.id,email:invitation.email,password,email_confirm:true});
    if(result.error)result=await admin.auth.admin.getUserById(invitation.id);
  }
  if(!result.data?.user||result.data.user.id!==invitation.id||result.data.user.email!==invitation.email)throw new HttpError(503,'Your invitation could not open. Please try again.');
  await invitationCommand('activate',{invitation:invitation.id,owner:result.data.user.id});
  return {...invitation,owner:result.data.user.id};
}

async function hmac(value: string) {
  const { pepper } = await runtime();
  const key = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
function equal(left: string, right: string) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 80_000) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}

async function owner(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || token.length > 8192) throw new HttpError(401, 'Please sign in again.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Please sign in again.');
  let claims;
  try { claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { throw new HttpError(401, 'Please sign in again.'); }
  if (typeof claims.session_id !== 'string' || !/^[a-f0-9-]{36}$/.test(claims.session_id) || !await command('session', { owner: data.user.id, session: claims.session_id })) throw new HttpError(401, 'Your editing session has ended. Please sign in again.');
  return { id: data.user.id, token };
}

async function signedDraft(path: string) {
  const { data, error } = await admin.storage.from('profile-drafts').createSignedUrl(path, 3600);
  if (error) throw new HttpError(503, 'Could not preview that upload.');
  return data.signedUrl;
}

function publicUrl(path: string) { return admin.storage.from('profile-media').getPublicUrl(path).data.publicUrl; }
function referenced(profile: any, path: string) { return profile && profileMedia(profile).includes(publicUrl(path)); }

async function cleanup(ownerId: string) {
  const profile = await command('mine', { owner: ownerId });
  const uploads = await command('uploads', { owner: ownerId });
  for (const upload of uploads) {
    if(upload.state==='published')await admin.storage.from('profile-drafts').remove([upload.path]);
    if (referenced(profile.config, upload.path) || referenced(profile.previous, upload.path) || profile.presetMedia?.includes(publicUrl(upload.path)) || Date.now() - Date.parse(upload.created_at) < 86400000) continue;
    const draft = await admin.storage.from('profile-drafts').remove([upload.path]);
    const published = await admin.storage.from('profile-media').remove([upload.path]);
    if (!draft.error && !published.error) await command('forget', { owner: ownerId, id: upload.id });
  }
  return profile;
}

async function publishFiles(ownerId: string, config: any) {
  const owned = await command('uploads', { owner: ownerId });
  const mediaPrefix = `${url}/storage/v1/object/public/profile-media/`;
  const selected = [];
  for (const source of profileMedia(config)) {
    if (!source.startsWith(mediaPrefix)) continue;
    const upload = owned.find((item: any) => publicUrl(item.path) === source);
    if (!upload || !['ready', 'published'].includes(upload.state)) throw new HttpError(400, 'That upload is not ready or does not belong to your profile.');
    selected.push(upload);
  }
  const overlay = selected.find(upload => publicUrl(upload.path) === config.overlays?.media?.url);
  const music=selected.find(upload=>publicUrl(upload.path)===config.music?.url);
  if(config.music?.url&&(!config.music.url.startsWith(mediaPrefix)||!music||music.kind!=='audio'||music.mime!=='audio/mpeg'))throw new HttpError(400,'Choose your own uploaded MP3.');
  if(overlay && config.overlays.media.kind === 'video' && overlay.kind !== 'overlayVideo') {
    const source = overlay.state === 'published' ? publicUrl(overlay.path) : await signedDraft(overlay.path);
    if(!await verifyOverlayVideo(source,overlay.bytes).catch(()=>false))throw new HttpError(400,'Use an H.264 MP4 for your overlay. Re-export the video with H.264 encoding.');
  }
  for (const upload of selected) {
    if (upload.state === 'published') continue;
    const { error } = await admin.storage.from('profile-drafts').copy(upload.path, upload.path, { destinationBucket: 'profile-media' });
    if(error){const existing=await admin.storage.from('profile-media').info(upload.path);if(existing.error||existing.data.size!==upload.bytes||existing.data.contentType!==upload.mime)throw new HttpError(503,'The upload could not be published. Your existing profile is unchanged.');}
    await command('published', { owner: ownerId, id: upload.id });
    await admin.storage.from('profile-drafts').remove([upload.path]);
  }
}

function validMagic(bytes: Uint8Array, mime: string) {
  const ascii = (start: number, length: number) => new TextDecoder().decode(bytes.slice(start, start + length));
  if (mime === 'video/mp4') return ascii(4, 4) === 'ftyp';
  if (mime === 'image/png') return bytes[0] === 137 && ascii(1, 3) === 'PNG';
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
  return false;
}

async function route(request: Request, path: string) {
  if (request.method === 'POST' && path === '/cleanup') {
    const proof=request.headers.get('x-cleanup-proof')||'';
    if(!equal(proof,await hmac('cleanup')))throw new HttpError(403,'Forbidden.');
    const {data,error}=await admin.rpc('editor_cleanup_owners');
    if(error)throw new HttpError(503,'Cleanup unavailable.');
    for(const ownerId of data)await cleanup(ownerId);
    await shares().cleanup();
    return {cleaned:true};
  }
  if (request.method === 'GET' && path === '/status') {
    const setup = await command('setup');
    return { ready: !!Deno.env.get('TURNSTILE_SECRET_KEY') && setup?.consumed === true };
  }
  if (request.method === 'GET' && /^\/public\/[a-z0-9-]{1,40}$/.test(path)) {
    const profile = await command('public', { slug: path.split('/')[2] });
    if (!profile) throw new HttpError(404, 'Profile not found.');
    return profile;
  }
  if (request.method === 'POST' && path === '/bootstrap') {
    const setup = await command('setup');
    const proof = request.headers.get('x-setup-proof') || '';
    if (!setup || setup.consumed || !setup.proof_hash || Date.parse(setup.expires_at) < Date.now() || !equal(await digest(proof), setup.proof_hash)) throw new HttpError(403, 'Setup is closed.');
    const input = await body(request);
    if (!Array.isArray(input.accounts) || input.accounts.length !== 3) throw new HttpError(400, 'Invalid setup.');
    for (const account of input.accounts) {
      if (!['internalcheats','k3rlsen','bal4zs'].includes(account.slug) || !/^[a-f0-9]{64}$/.test(account.lookup) || !/^[a-f0-9]{64}$/.test(account.password)) throw new HttpError(400, 'Invalid setup.');
    }
    if (new Set(input.accounts.map((account: any) => account.slug)).size !== 3) throw new HttpError(400, 'Invalid setup.');
    for (const account of input.accounts) {
      const existing=await command('lookup',{digest:account.lookup});
      if(existing?.slug===account.slug)continue;
      const email = `${crypto.randomUUID()}@profiles.ascendo.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: account.password, email_confirm: true });
      if (error || !data.user) throw new HttpError(503, 'Account setup failed; do not reopen setup publicly.');
      await command('bind', { slug: account.slug, owner: data.user.id, email, digest: account.lookup });
    }
    await command('seal');
    return { configured: true };
  }
  if (request.method === 'POST' && path === '/session') {
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secret) throw new HttpError(503, 'Login is not activated yet. Your public profile is still available.');
    const input = await body(request);
    if (typeof input.code !== 'string' || !/^\d{6,32}$/.test(input.code) || typeof input.challenge !== 'string' || input.challenge.length > 2048) throw new HttpError(401, 'Check your code and try again.');
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: input.challenge }), signal: AbortSignal.timeout(10000) }).then(response => response.json()).catch(() => null);
    if (!verification?.success || verification.hostname !== 'ascendo.lol' || verification.action !== 'profile-login') throw new HttpError(401, 'Complete the security check and try again.');
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
    if (!await command('rate', { ip: await hmac(`ip:${ip}`) })) throw new HttpError(429, 'Too many attempts. Please wait 15 minutes.');
    const lookup=await hmac(`lookup:${input.code}`);
    let credential = await command('lookup', { digest: lookup });
    if(!credential){const invitation=await invitationCommand('lookup',{digest:lookup});if(invitation)credential=await activateInvitation(invitation,input.code);}
    if (!credential) throw new HttpError(401, 'Check your code and try again.');
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: credential.email, password: await hmac(`password:${input.code}`) });
    if (error || !data.session) throw new HttpError(401, 'Check your code and try again.');
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, onboarding:!credential.slug };
  }
  if (request.method === 'POST' && path === '/session/refresh') {
    const input = await body(request);
    if (typeof input.refresh_token !== 'string' || input.refresh_token.length > 4096) throw new HttpError(401, 'Please sign in again.');
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.refreshSession({ refresh_token: input.refresh_token });
    if (error || !data.session) throw new HttpError(401, 'Please sign in again.');
    await owner(new Request(request.url, { headers: { Authorization: `Bearer ${data.session.access_token}` } }));
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at };
  }
  if(request.method==='POST'&&/^\/share\/runner\/(health|check|upload|fail)$/.test(path)){
    const action=path.split('/').pop();
    try{const identity=await verifyShareRunner(request,{health:action==='health'});return await shares().runner(request,identity,action);}
    catch(error){throw new HttpError(error.status||503,error.status?error.message:'Could not process the profile export.');}
  }
  const user = await owner(request);
  if(path==='/share/card'){
    try{const result=await shares().route(request,user);return new Response(JSON.stringify(result),{status:request.method==='POST'&&result.state==='pending'?202:200,headers});}
    catch(error){throw new HttpError(error.status||503,error.status?error.message:'Could not prepare your profile card.');}
  }
  if (request.method === 'DELETE' && path === '/session') {
    const {error}=await admin.auth.admin.signOut(user.token, 'local');
    if(error)throw new HttpError(503,'Could not securely end the session. Please retry.');
    return { signedOut: true };
  }
  if (request.method === 'GET' && path === '/invitation') return await invitationCommand('status',{owner:user.id});
  if (['GET','PUT'].includes(request.method) && path === '/preferences') {
    const input=request.method==='PUT'?await body(request):{};
    if(request.method==='PUT'&&(!input||Object.keys(input).some(key=>key!=='language')||!['en','hu'].includes(input.language)))throw new HttpError(400,'Choose English or Hungarian.');
    const {data,error}=await admin.rpc('profile_editor_language',{profile_owner:user.id,selected_language:input.language??null});
    if(error)throw new HttpError(503,'Could not save your language preference.');
    return {language:data};
  }
  if (request.method === 'POST' && ['/invitation/check','/invitation/claim'].includes(path)) {
    const input=await body(request);
    if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(400,'Choose a handle.');
    let handle;try{handle=normalizeHandle(input.handle);}catch(error){throw new HttpError(400,error.message);}
    const state=await invitationCommand(path.endsWith('/claim')?'claim':'available',{owner:user.id,handle,...(path.endsWith('/claim')?{config:createInvitedProfile(handle)}:{})});
    if(state.conflict)throw new HttpError(409,'This handle is already taken.');
    return state;
  }
  if (request.method === 'GET' && path === '/me') {
    const {data:pending,error:pendingError}=await admin.rpc('profile_invitation_command',{operation:'status',payload:{owner:user.id}});
    if(pending?.needsHandle)return {onboarding:true,capabilities:{canUseReservedBadges:false}};
    if(pendingError)throw new HttpError(403,'No editable profile is assigned to this account.');
    await cleanup(user.id);
    const current = await command('mine', { owner: user.id });
    return { ...current, uploadQuota:current.slug==='internalcheats'?500_000_000:OWNER_QUOTA, capabilities: badgeCapabilities(current) };
  }
  const presetMatch=path.match(/^\/presets(?:\/([a-f0-9-]{36}))?$/);
  if(presetMatch){
    const id=presetMatch[1];let operation=request.method==='GET'?(id?'get':'list'):request.method==='POST'&&!id?'create':request.method==='DELETE'&&id?'delete':'';
    if(!operation)throw new HttpError(404,'Not found.');
    let payload:any={owner:user.id,...(id?{id}:{})};
    if(operation==='create'){
      const input=await body(request);
      if(!input||Object.keys(input).some(key=>!['name','config'].includes(key))||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>40)throw new HttpError(400,'Give your preset a name (up to 40 characters).');
      const current=await command('mine',{owner:user.id});
      let config;try{config=normalizeProfile(preserveVisualGroups(input.config,current.config));}catch(error){throw new HttpError(400,error.message);}
      const error=badgeError(config.badge,badgeCapabilities(current).canUseReservedBadges);
      if(error)throw new HttpError(400,error);
      const owned=await command('uploads',{owner:user.id}),prefix=url+'/storage/v1/object/public/profile-media/';
      for(const source of profileMedia(config))if(source.startsWith(prefix)&&!owned.some(item=>publicUrl(item.path)===source&&['ready','published'].includes(item.state)))throw new HttpError(400,'That upload is not ready or does not belong to your profile.');
      payload={...payload,name:input.name.trim(),config,media:profileMedia(config)};
    }
    const {data,error}=await admin.rpc('profile_presets_command',{operation,payload});
    if(error)throw new HttpError(error.code==='23505'?409:503,error.code==='23505'?'A preset with this name already exists.':'Could not update your presets.');
    if(data?.limit)throw new HttpError(400,'You can save up to 10 presets. Delete one to make room.');
    if(data===null)throw new HttpError(404,'Preset not found.');
    return data;
  }
  if (request.method === 'GET' && path === '/uploads') {
    const uploads=await command('uploads',{owner:user.id});
    return Promise.all(uploads.map(async(upload:any)=>({id:upload.id,kind:upload.kind,bytes:upload.bytes,state:upload.state,url:publicUrl(upload.path),preview:upload.state==='ready'?await signedDraft(upload.path):''})));
  }
  if (request.method === 'PUT' && path === '/me') {
    const input = await body(request);
    let config;
    const current = await command('mine', { owner: user.id });
    if (!input.config || typeof input.config !== 'object' || Array.isArray(input.config)) throw new HttpError(400, 'Invalid profile.');
    try { config = normalizeProfile(preserveVisualGroups(input.config,current.config)); } catch (error) { throw new HttpError(400, error.message); }
    if(config.music.source==='mp3'&&!config.music.url)throw new HttpError(400,'Upload an MP3 before saving this music source.');
    if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new HttpError(400, 'Invalid profile revision.');
    const reservedError = badgeError(config.badge, badgeCapabilities(current).canUseReservedBadges);
    if (reservedError) throw new HttpError(400, reservedError);
    if (current.revision !== input.revision) throw new HttpError(409, 'This profile changed in another tab. Keep your draft, then reload the latest saved version.');
    await publishFiles(user.id, config);
    const saved = await command('save', { owner: user.id, revision: input.revision, config });
    if (saved.conflict) throw new HttpError(409, 'This profile changed in another tab. Reload before saving again.');
    return saved;
  }
  if (request.method === 'POST' && path === '/uploads') {
    const input = await body(request);
    const types: Record<string,string> = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','audio/mpeg':'mp3' };
    const isVideo = ['video','overlayVideo'].includes(input.kind);
    const isAudio=input.kind==='audio';
    if (!['avatar','poster','backgroundImage','video','overlayImage','overlayVideo','audio'].includes(input.kind) || !types[input.mime] || isVideo !== (input.mime === 'video/mp4') || isAudio !== (input.mime==='audio/mpeg') || !Number.isSafeInteger(input.bytes) || input.bytes <= 0 || input.bytes > (isVideo||isAudio ? MAX_VIDEO : MAX_IMAGE)) throw new HttpError(400, 'Choose an image up to 5 MB, or an MP4 / MP3 up to 50 MB.');
    const ownedProfile=await cleanup(user.id);
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${types[input.mime]}`;
    await command('reserve', { owner: user.id, id, path, bytes: input.bytes, mime: input.mime, kind: input.kind });
    const { data, error } = await admin.storage.from('profile-drafts').createSignedUploadUrl(path);
    if (error) { await command('forget', { owner: user.id, id }); throw new HttpError(503, 'Could not start the upload.'); }
    return { id, path, token: data.token, endpoint: `${url.replace('.supabase.co','.storage.supabase.co')}/storage/v1/upload/resumable`, quota: ownedProfile.slug==='internalcheats'?500_000_000:OWNER_QUOTA };
  }
  const uploadMatch = path.match(/^\/uploads\/([a-f0-9-]{36})(\/complete)?$/);
  if (uploadMatch && ['POST','DELETE'].includes(request.method)) {
    const upload = await command('upload', { owner: user.id, id: uploadMatch[1] });
    if (!upload?.id) throw new HttpError(404, 'Upload not found.');
    if (request.method === 'DELETE') {
      const profile = await command('mine', { owner: user.id });
      if (referenced(profile.config, upload.path) || referenced(profile.previous, upload.path) || profile.presetMedia?.includes(publicUrl(upload.path))) throw new HttpError(409, 'This file is used by a saved profile or preset. Remove that reference first.');
      const draft = await admin.storage.from('profile-drafts').remove([upload.path]);
      const published = await admin.storage.from('profile-media').remove([upload.path]);
      if (draft.error || published.error) throw new HttpError(503, 'Could not remove that file.');
      await command('forget', { owner: user.id, id: upload.id });
      return { removed: true };
    }
    if (!uploadMatch[2]) throw new HttpError(404,'Not found.');
    if(upload.state==='ready'||upload.state==='published')return {id:upload.id,url:publicUrl(upload.path),preview:upload.state==='ready'?await signedDraft(upload.path):publicUrl(upload.path)};
    const preview = await signedDraft(upload.path);
    const metadata = await admin.storage.from('profile-drafts').info(upload.path);
    if (metadata.error || metadata.data.size !== upload.bytes || metadata.data.contentType !== upload.mime) throw new HttpError(400, 'Upload size or format did not match.');
    if(upload.kind==='audio'){
      if(!await verifyMp3(preview,upload.bytes).catch(()=>false))throw new HttpError(400,'This is not a valid MP3 audio file.');
    }else{
      const response = await fetch(preview, { headers: { Range: 'bytes=0-31' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok || !validMagic(new Uint8Array(await response.arrayBuffer()), upload.mime)) throw new HttpError(400, 'This is not a supported image or MP4 file.');
    }
    if(upload.kind==='overlayVideo'&&!await verifyOverlayVideo(preview,upload.bytes).catch(()=>false))throw new HttpError(400,'Use an H.264 MP4 for your overlay. Re-export the video with H.264 encoding.');
    await command('ready', { owner: user.id, id: upload.id });
    return { id: upload.id, url: publicUrl(upload.path), preview };
  }
  throw new HttpError(404, 'Not found.');
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  const cors = origin === site ? { 'Access-Control-Allow-Origin': site, 'Vary':'Origin' } : {};
  if (origin && origin !== site) return new Response(JSON.stringify({ error: 'Origin not allowed.' }), { status: 403, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers':'authorization,content-type,apikey', 'Access-Control-Max-Age':'600' } });
  try {
    const path = new URL(request.url).pathname.replace(/^\/profile-api/, '') || '/';
    const data = await route(request, path);
    if(data instanceof Response)return new Response(data.body,{status:data.status,headers:{...headers,...Object.fromEntries(data.headers),...cors}});
    return new Response(JSON.stringify(data), { status: 200, headers: { ...headers, ...cors } });
  } catch (error) {
    if(!(error instanceof HttpError))console.error('profile_unexpected_error',error?.name||'Unknown');
    const status = error instanceof HttpError ? error.status : 503;
    return new Response(JSON.stringify({ error: error instanceof HttpError ? error.message : 'The profile service is temporarily unavailable. Your draft has not been published.' }), { status, headers: { ...headers, ...cors, ...(status === 429 ? { 'Retry-After':'900' } : {}) } });
  }
});
