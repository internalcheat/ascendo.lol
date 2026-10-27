import {electricContour} from './electric-contour.mjs?v=20261027-1';
const outline=points=>points.map((p,i)=>(i?'L':'M')+p.positionX.toFixed(2)+','+p.positionY.toFixed(2)).join('')+'Z';
export function createAvatarFrames(panel,{reduced,onResize=()=>{}}){
 const doc=panel.ownerDocument,win=doc.defaultView;let config,record,active=true;
 const resize=win.ResizeObserver?new win.ResizeObserver(()=>{geometry();onResize();}):null;
 function release(){if(!record)return;resize?.unobserve(record.target);record.target.classList.remove('profile-avatar-frame-target');record.svg.remove();record=undefined;}
 function update(next,visible=true){
  config=next.avatarFrame;active=visible;const target=config.enabled?panel.querySelector('.avatar'):null;
  if(record?.target!==target)release();if(!target)return;
  if(!record){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('profile-avatar-frame');svg.setAttribute('aria-hidden','true');const paths=Array.from({length:3},()=>doc.createElementNS(svg.namespaceURI,'path'));svg.append(...paths);target.classList.add('profile-avatar-frame-target');target.append(svg);record={target,svg,paths};resize?.observe(target);}
  record.svg.hidden=!active;record.svg.style.display=active?'':'none';geometry();
 }
 function geometry(){
  if(!record)return;const {target,svg,paths}=record,w=target.offsetWidth,h=target.offsetHeight;if(!w||!h)return;
  const style=win.getComputedStyle(target),gap=config.gap,radii=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(key=>{const s=style[key];return (s.includes('%')?parseFloat(s)/100*Math.min(w,h):parseFloat(s)||0)+gap;});
  svg.style.width=w+2*gap+10+'px';svg.style.height=h+2*gap+10+'px';svg.style.left=-5-gap-(parseFloat(style.borderLeftWidth)||0)+'px';svg.style.top=-5-gap-(parseFloat(style.borderTopWidth)||0)+'px';svg.setAttribute('viewBox',`0 0 ${w+2*gap+10} ${h+2*gap+10}`);
  const d=outline(electricContour(w+gap*2,h+gap*2,radii));paths[0].setAttribute('d',d);paths[1].setAttribute('d',d);
  paths[2].setAttribute('d',outline(electricContour(w+gap*2-5,h+gap*2-5,radii.map(v=>Math.max(0,v-2.5)))));paths[2].setAttribute('transform','translate(2.5 2.5)');
  for(const path of paths){path.setAttribute('stroke',config.color);path.setAttribute('stroke-width',String(config.width));path.setAttribute('opacity','1');}
  paths[0].setAttribute('stroke-width',String(config.width+5+config.glow/20));paths[0].setAttribute('opacity',String(config.glow/500));
  paths[1].setAttribute('stroke-dasharray',config.style==='dashed'?'8 12':'');
  paths[2].setAttribute('stroke',config.secondary);paths[2].setAttribute('opacity',config.style==='double'?'1':'0');draw(0);
 }
 function draw(time){if(record)record.paths[1].setAttribute('stroke-dashoffset',String(config.style==='dashed'&&!reduced.matches?-time*.025*config.speed:0));}
 function setActive(value){active=value;if(record)record.svg.style.display=value?'':'none';}
 function destroy(){release();resize?.disconnect();}
 return {update,geometry,draw,setActive,destroy,get animated(){return !!config?.enabled&&config.style==='dashed'&&!reduced.matches;}};
}
