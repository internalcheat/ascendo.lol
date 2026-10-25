export const RESERVED_HANDLES=Object.freeze(['404','index','assets','downloads','plugins','customize','login','welcome','invite','invitations','api','auth','profile','profiles','vendor','tests','supabase','fonts','admin','administrator','owner','staff','support','security','system','root','www','ascendo','internal','internalcheat','internalcheats','nagyorru','k3rlsen','bal4zs','szikraaaa']);
export function normalizeHandle(value){
  if(typeof value!=='string')throw Error('Choose a handle.');
  const handle=value.trim().toLowerCase();
  if(!/^[a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9]$/.test(handle))throw Error('Use 3–24 letters, numbers or hyphens.');
  if(RESERVED_HANDLES.includes(handle))throw Error('This handle is unavailable.');
  return handle;
}
