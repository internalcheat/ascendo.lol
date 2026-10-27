export function applyAppearanceStyles(panel,config){
 const value=config.glass;panel.dataset.glass=String(value.enabled);
 for(const [name,number,unit]of [['blur',value.blur,'px'],['radius',value.radius,'px'],['shadow',value.shadow/100,''],['edge',value.edge/100,'']])panel.style.setProperty('--card-'+name,number+unit);
}
export function applyBackgroundAppearance(stage,config){
 if(!stage)return;const value=config.backgroundAppearance;
 stage.dataset.backgroundLook=String(value.enabled);
 const vars={blur:value.blur+'px',brightness:String(1-value.darkness/100),saturation:String(value.saturation/100),tint:String(value.tint/100),color:value.tintColor,vignette:String(value.vignette/100),position:value.x+'% '+value.y+'%'};
 for(const [name,text]of Object.entries(vars))stage.style.setProperty('--background-'+name,text);
 if(value.enabled)stage.style.backgroundPosition=vars.position;
 else stage.style.backgroundPosition='center';
 let tint=stage.querySelector('.background-look-tint');if(value.enabled&&!tint){tint=stage.ownerDocument.createElement('div');tint.className='background-look-tint';tint.setAttribute('aria-hidden','true');stage.append(tint);}
 if(tint)tint.hidden=!value.enabled;
}
