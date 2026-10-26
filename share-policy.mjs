export const SHARE_RENDERER='desktop-github-1';
export const SHARE_BUCKET='profile-shares';
export const SHARE_MAX_BYTES=20*1024*1024;
export const SHARE_MAX_HEIGHT=16000;
export const SHARE_WIDTH=1920;
const identities=new Set(['internalcheats','k3rlsen','bal4zs','szikraaaa']);
const reserved=new Set(['404','index','assets','downloads','plugins','customize','login','welcome','invite','invitations','api','auth','profile','profiles','vendor','tests','supabase','fonts','admin','administrator','owner','staff','support','security','system','root','www','ascendo','internal','internalcheat','nagyorru']);
export function profileSlug(path){const match=String(path).match(/^\/([a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9])\/?$/i);if(!match)return '';const slug=match[1].toLowerCase();return identities.has(slug)||!reserved.has(slug)?slug:'';}
export function publicProfilePath(slug){if(!profileSlug('/'+slug))throw Error('Invalid profile address.');return `/${slug==='szikraaaa'?'Szikraaaa':slug.toLowerCase()}/`;}
export const publicProfileUrl=slug=>'https://ascendo.lol'+publicProfilePath(slug);
export const displayProfileUrl=slug=>publicProfileUrl(slug).replace(/^https:\/\//,'').replace(/\/$/,'');
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const jsonForHtml=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
export function plainBio(value){const text=String(value??'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,'').replace(/[*`~]/g,'').replace(/\s+/g,' ').trim();const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(item=>item.segment):Array.from(text);return chars.length>280?chars.slice(0,279).join('').trimEnd()+'…':text;}
export function profileMetadata(slug,config){
  const name=String(config.name||slug).slice(0,100),description=plainBio(config.bio)||`View ${name}'s profile on Ascendo.`,fallback='https://ascendo.lol/assets/ascendo-icon-180.png';let image=config.avatar?.poster||config.avatar?.url||fallback;
  try{const url=new URL(image);if(url.protocol!=='https:'||url.username||url.password||/\.svg(?:[?#]|$)/i.test(url.href))image=fallback;}catch{image=fallback;}
  return {name,title:`${name} | Ascendo`,description,image,url:publicProfileUrl(slug),imageAlt:`${name}'s profile picture`,robots:identities.has(slug)&&['internalcheats','k3rlsen'].includes(slug)?'index, follow':'noindex, nofollow'};
}
export function metadataHtml(slug,config){const data=profileMetadata(slug,config),tag=(key,value,property=false)=>`<meta ${property?'property':'name'}="${key}" content="${escapeHtml(value)}">`;return `<title>${escapeHtml(data.title)}</title><link rel="canonical" href="${escapeHtml(data.url)}">`+[['description',data.description],['robots',data.robots],['og:title',data.title],['og:description',data.description],['og:image',data.image],['og:image:alt',data.imageAlt],['og:url',data.url],['og:type','profile'],['og:site_name','ASCENDO.LOL'],['twitter:card','summary'],['twitter:title',data.title],['twitter:description',data.description],['twitter:image',data.image]].map(([key,value])=>tag(key,value,key.startsWith('og:'))).join('');}
export function captureRequest(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='revision')||!Number.isSafeInteger(input.revision)||input.revision<1)throw Error('Choose the saved profile version.');return {revision:input.revision};}
export function pngDimensions(bytes){if(!(bytes instanceof Uint8Array)||bytes.length<33||bytes.length>SHARE_MAX_BYTES||[137,80,78,71,13,10,26,10].some((value,index)=>bytes[index]!==value)||new TextDecoder().decode(bytes.slice(12,16))!=='IHDR')throw Error('The generated card is not a valid PNG.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),width=view.getUint32(16),height=view.getUint32(20);if(width!==SHARE_WIDTH||height<1||height>SHARE_MAX_HEIGHT)throw Error('This profile is too tall for one image.');return {width,height};}
