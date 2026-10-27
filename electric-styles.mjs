const path=points=>points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2)).join('');
export function electricPaths(points,settings,time,{reduced=false,mobile=false}={}){
 const speed=time*.001*settings.speed,amount=reduced?0:(mobile?1.5:3)*settings.intensity/100;
 const primary=points.map((p,i)=>{
  const wave=settings.style==='plasma'?(Math.sin(i*.2+speed*2.2)+Math.sin(i*.41-speed*1.7))*.55:settings.style==='lightning'||settings.style==='dual'?(Math.sin(i*1.9+speed*9)+Math.sin(i*.73-speed*13))*.5:0;
  return [p.positionX+p.nx*wave*amount,p.positionY+p.ny*wave*amount];
 });
 let secondary='';
 if(settings.style==='lightning'&&!reduced&&amount>0)secondary=points.map((p,i)=>{if(i%17)return '';const origin=primary[i],length=amount*(1.1+.35*Math.sin(speed*4+i)),tip=[origin[0]+p.nx*length,origin[1]+p.ny*length];return path([origin,[tip[0]+p.ny,tip[1]-p.nx],tip]);}).join('');
 if(settings.style==='dual')secondary=path(points.map((p,i)=>{const wave=reduced?1:Math.sin(i*.37-speed*3)*amount+1;return [p.positionX+p.nx*wave,p.positionY+p.ny*wave];}))+'Z';
 if(settings.style==='orbit'&&!reduced&&primary.length){const start=Math.floor(speed*18)%primary.length;secondary=path(Array.from({length:Math.min(9,primary.length)},(_,i)=>primary[(start+i)%primary.length]));}
 return {primary:path(primary)+(primary.length?'Z':''),secondary,dash:settings.style==='circuit'?'18 8 4 8':'',offset:settings.style==='circuit'&&!reduced?-speed*22:0};
}
