export const APPEARANCE_GROUPS=['backgroundAppearance','glass','avatarFrame'];
export const BORDER_STYLES={lightning:'Lightning',plasma:'Plasma',orbit:'Orbit',dual:'Dual-tone',circuit:'Circuit'};
export const FRAME_STYLES={dashed:'Rotating dashes',double:'Two-color ring',halo:'Soft halo'};
const object=(v,keys)=>{if(v===undefined)return {};if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Check appearance settings.');return v;};
const number=(v,f,min,max)=>{if(v===undefined)return f;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Check appearance intensity or size.');return v;};
const flag=v=>{if(v===undefined)return false;if(typeof v!=='boolean')throw Error('Check appearance settings.');return v;};
const color=(v,f)=>{if(v===undefined)return f.toLowerCase();if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Choose a valid appearance color.');return v.toLowerCase();};
const choice=(v,f,choices)=>{if(v===undefined)return f;if(!Object.hasOwn(choices,v))throw Error('Choose a supported appearance style.');return v;};
export function normalizeAppearance(input,accent){
 const bg=object(input.backgroundAppearance,['enabled','blur','darkness','saturation','tint','tintColor','vignette','x','y']);
 const glass=object(input.glass,['enabled','blur','radius','shadow','edge']);
 const frame=object(input.avatarFrame,['enabled','style','color','secondary','width','gap','glow','speed']);
 return {
  backgroundAppearance:{enabled:flag(bg.enabled),blur:number(bg.blur,7,0,24),darkness:number(bg.darkness,35,0,80),saturation:number(bg.saturation,85,0,150),tint:number(bg.tint,0,0,60),tintColor:color(bg.tintColor,accent),vignette:number(bg.vignette,45,0,100),x:number(bg.x,50,0,100),y:number(bg.y,50,0,100)},
  glass:{enabled:flag(glass.enabled),blur:number(glass.blur,20,0,36),radius:number(glass.radius,28,0,48),shadow:number(glass.shadow,40,0,100),edge:number(glass.edge,15,0,70)},
  avatarFrame:{enabled:flag(frame.enabled),style:choice(frame.style,'dashed',FRAME_STYLES),color:color(frame.color,accent),secondary:color(frame.secondary,'#8b5cf6'),width:number(frame.width,2,1,5),gap:number(frame.gap,5,2,10),glow:number(frame.glow,35,0,100),speed:number(frame.speed,1,.2,2)}
 };
}
export function normalizeBorderStyle(value,accent){
 return {style:choice(value.style,'lightning',BORDER_STYLES),secondary:color(value.secondary,'#8b5cf6'),width:number(value.width,1.3,.6,4),glow:number(value.glow,14,0,100),reactive:flag(value.reactive)};
}
