export const CREATIVE_GROUPS=['flipCard','constellation','stickers'];
const object=(value,keys)=>{if(value===undefined)return {};if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error('Check creative profile settings.');return value;};
const flag=(value,fallback=false)=>{if(value===undefined)return fallback;if(typeof value!=='boolean')throw Error('Check creative profile settings.');return value;};
const number=(value,fallback,min,max)=>{if(value===undefined)return fallback;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Check creative effect size or speed.');return value;};
const text=(value,limit)=>{if(value===undefined)return '';if(typeof value!=='string'||value.length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Check creative profile text.');return value.trim();};
const choice=(value,fallback,list)=>{if(value===undefined)return fallback;if(!list.includes(value))throw Error('Choose a supported creative style.');return value;};
const color=value=>{if(value===undefined||value===null)return null;if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error('Choose a valid creative color.');return value.toLowerCase();};
export function normalizeCreative(input,{safeUrl,mediaUrl}){
 const flip=object(input.flipCard,['enabled','title','text','artwork','poster','color','links','duration']);
 const stars=object(input.constellation,['enabled','spread','lineOpacity','nodeSize','motion']);
 const stickers=object(input.stickers,['enabled','items']);
 const links=flip.links??[],items=stickers.items??[];
 if(!Array.isArray(links)||links.length>6)throw Error('Use up to six reverse-side links.');
 if(!Array.isArray(items)||items.length>8)throw Error('Use up to eight glass stickers.');
 const ids=new Set();
 const image=value=>{const url=mediaUrl(value??'','image');if(url&&/\.(?:mp4|webm|svg)(?:$|[?#])/i.test(url))throw Error('Choose a supported sticker or artwork image.');return url;};
 return {
  flipCard:{enabled:flag(flip.enabled),title:text(flip.title,80),text:text(flip.text,1200),artwork:image(flip.artwork),poster:image(flip.poster),color:color(flip.color),duration:number(flip.duration,650,300,1200),links:links.map(item=>{const v=object(item,['label','url']);return {label:text(v.label,60),url:safeUrl(v.url??'')};})},
  constellation:{enabled:flag(stars.enabled),spread:number(stars.spread,90,65,100),lineOpacity:number(stars.lineOpacity,35,0,100),nodeSize:number(stars.nodeSize,48,40,56),motion:flag(stars.motion,true)},
  stickers:{enabled:flag(stickers.enabled),items:items.map(item=>{
   const v=object(item,['id','kind','text','url','poster','edge','position','offset','size','rotation','opacity','motion','color']);
   if(typeof v.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(v.id)||ids.has(v.id))throw Error('Choose unique sticker identifiers.');ids.add(v.id);
   return {id:v.id,kind:choice(v.kind,'emoji',['emoji','note','image']),text:text(v.text,80),url:image(v.url),poster:image(v.poster),edge:choice(v.edge,'right',['top','right','bottom','left']),position:number(v.position,25,10,90),offset:number(v.offset,4,-12,24),size:number(v.size,64,32,120),rotation:number(v.rotation,-8,-30,30),opacity:number(v.opacity,85,20,100),motion:flag(v.motion,true),color:color(v.color)};
  })}
 };
}
