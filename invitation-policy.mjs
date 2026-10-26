import {normalizeProfile} from './profile-schema.mjs?v=20261026-5';

import {normalizeHandle} from './handle-policy.mjs?v=20261025-13';
export {normalizeHandle,RESERVED_HANDLES} from './handle-policy.mjs?v=20261025-13';
export function createInvitedProfile(handle){
  const name=normalizeHandle(handle);
  return normalizeProfile({name,bio:'',badge:'',accent:'#c19aff',glow:65,opacity:53,effect:'glow',avatar:{url:'https://ascendo.lol/assets/ascendo-icon-180.png',poster:'',x:50,y:50},background:{kind:'black',url:'',poster:'',mobile:''},soundtrack:{title:'',artist:''},socials:[]});
}
