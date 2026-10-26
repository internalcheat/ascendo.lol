export const EXPRESSION_GROUPS=['socialStyle','detailColors','richBio','holographic','musicReactive','signature'];
export const DETAIL_COLORS={name:'Name text',handle:'Social handles',icons:'Social icons',badgeText:'Badge text',badgeBackground:'Badge background',border:'Card borders',card:'Card background',socialBackground:'Social backgrounds',bioLink:'Bio links'};
const obj=(value,keys)=>{if(value===undefined)return {};if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error('Check profile styling.');return value;};
const flag=(v,f=false)=>{if(v===undefined)return f;if(typeof v!=='boolean')throw Error('Check profile styling.');return v;};
const num=(v,f,a,b)=>{if(v===undefined)return f;if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw Error('Check style intensity or size.');return v;};
const one=(v,f,values)=>{if(v===undefined)return f;if(!values.includes(v))throw Error('Choose a supported profile style.');return v;};
const hex=v=>{if(v==null)return null;if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Choose a valid detail color.');return v.toLowerCase();};
export function normalizeExpression(input){
 const social=obj(input.socialStyle,['enabled','layout','surface','radius','gap','iconSize']);
 const colors=obj(input.detailColors,['enabled',...Object.keys(DETAIL_COLORS)]);
 const bio=obj(input.richBio,['enabled','align']);
 const holo=obj(input.holographic,['enabled','finish','intensity','speed']);
 const reactive=obj(input.musicReactive,['enabled','style','color','intensity','smoothing']);
 const signature=obj(input.signature,['enabled','mode','text','font','paths','color','width','stroke','duration']);
 const paths=signature.paths??[];let count=0;
 if(!Array.isArray(paths)||paths.length>12||paths.some(path=>!Array.isArray(path)||path.length<2||path.length>400||path.some(point=>!Array.isArray(point)||point.length!==2||point.some((v,i)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>(i?240:1000)))||(count+=path.length)>1200))throw Error('Keep your signature within twelve strokes and 1,200 points.');
 if(signature.text!==undefined&&(typeof signature.text!=='string'||signature.text.length>48))throw Error('Use up to 48 signature characters.');
 return {
  socialStyle:{enabled:flag(social.enabled),layout:one(social.layout,'rows',['rows','pills','icons']),surface:one(social.surface,'glass',['glass','outline','solid']),radius:num(social.radius,20,0,40),gap:num(social.gap,12,4,24),iconSize:num(social.iconSize,24,16,36)},
  detailColors:{enabled:flag(colors.enabled),...Object.fromEntries(Object.keys(DETAIL_COLORS).map(key=>[key,hex(colors[key])]))},
  richBio:{enabled:flag(bio.enabled),align:one(bio.align,'center',['left','center','right'])},
  holographic:{enabled:flag(holo.enabled),finish:one(holo.finish,'foil',['foil','pearl','brushed']),intensity:num(holo.intensity,35,0,100),speed:num(holo.speed,1,.5,2)},
  musicReactive:{enabled:flag(reactive.enabled),style:one(reactive.style,'waveform',['waveform','equalizer','halo']),color:hex(reactive.color),intensity:num(reactive.intensity,50,0,100),smoothing:num(reactive.smoothing,70,0,95)},
  signature:{enabled:flag(signature.enabled),mode:one(signature.mode,'draw',['draw','text']),text:(signature.text??'').trim(),font:one(signature.font,'elegant',['elegant','classic','modern']),paths:paths.map(path=>path.map(point=>point.map(v=>Math.round(v*10)/10))),color:hex(signature.color),width:num(signature.width,200,80,320),stroke:num(signature.stroke,2,1,6),duration:num(signature.duration,1200,300,2400)}
 };
}
