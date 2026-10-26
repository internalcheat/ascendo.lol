const valid=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
export const channels=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
export function themePalette(profile){
  if(profile.colorTheme==='monochrome')return {primary:'#f2f2f2',secondary:'#bdbdbd'};
  const accent=valid(profile.accent)?profile.accent:'#c19aff';
  return profile.colorTheme==='custom'?{primary:valid(profile.themeColors?.primary)?profile.themeColors.primary:accent,secondary:valid(profile.themeColors?.secondary)?profile.themeColors.secondary:'#8b5cf6'}:{primary:accent,secondary:'#8b5cf6'};
}
function luminance(color){const rgb=channels(color).map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
export function readableAccent(color){const base=luminance('#100d16'),rgb=channels(color);let result=color;for(let step=0;step<=20;step++){result='#'+rgb.map(value=>Math.round(value+(255-value)*step/20).toString(16).padStart(2,'0')).join('');if((luminance(result)+.05)/(base+.05)>=4.5)break;}return result;}
export function applyStudioPalette(root,profile){
  const palette=themePalette(profile);root.dataset.studioTheme=profile.colorTheme||'original';
  const primary=palette.primary,secondary=palette.secondary;
  root.style.setProperty('--studio-primary',primary);root.style.setProperty('--studio-secondary',secondary);root.style.setProperty('--studio-primary-rgb',channels(primary).join(','));root.style.setProperty('--studio-secondary-rgb',channels(secondary).join(','));root.style.setProperty('--studio-focus',readableAccent(primary));
}
