import {DETAIL_COLORS} from './expression-schema.mjs?v=20261026-6';
const NS='http://www.w3.org/2000/svg';
export function applyExpressionStyles(panel,config){
 const style=config.socialStyle;panel.dataset.socialStyle=style.enabled?style.layout:'default';panel.dataset.socialSurface=style.surface;
 for(const [key,value]of Object.entries({radius:style.radius,gap:style.gap,iconSize:style.iconSize}))panel.style.setProperty('--social-'+key,value+'px');
 panel.dataset.detailColors=String(config.detailColors.enabled);
 for(const key of Object.keys(DETAIL_COLORS)){const value=config.detailColors.enabled&&config.detailColors[key];panel.toggleAttribute('data-color-'+key,!!value);if(value)panel.style.setProperty('--detail-'+key,value);else panel.style.removeProperty('--detail-'+key);if(key==='card'&&value)panel.style.setProperty('--detail-card-rgb',[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).join(','));}
 if(config.detailColors.enabled&&config.detailColors.name)panel.style.setProperty('--effect-color',config.detailColors.name);
 const socials=panel.querySelector('.social-list');
 for(const link of socials?.querySelectorAll('.social-link')||[])link.title=link.getAttribute('aria-label')||'';
 const summary=panel.querySelector('.profile-summary'),value=config.signature;
 let node=summary.querySelector('.profile-signature'),key=JSON.stringify(value);
 if(!value.enabled||value.mode==='draw'&&!value.paths.length||value.mode==='text'&&!value.text){node?.remove();return;}
 if(node?.dataset.signatureKey===key)return;
 const next=panel.ownerDocument.createElement('div');next.className='profile-signature';next.dataset.signatureKey=key;next.dataset.font=value.font;next.style.width='min(100%,'+value.width+'px)';next.style.color=value.color||'var(--profile-accent)';next.style.setProperty('--signature-duration',value.duration+'ms');
 if(value.mode==='text'){const text=panel.ownerDocument.createElement('span');text.className='profile-signature__text';text.textContent=value.text;next.append(text);}
 else{
  const svg=panel.ownerDocument.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 1000 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',value.text||'Hand-drawn signature');
  for(const points of value.paths){const path=panel.ownerDocument.createElementNS(NS,'polyline');for(const [key,v]of Object.entries({points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'currentColor','stroke-width':value.stroke*4,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1}))path.setAttribute(key,String(v));svg.append(path);}
  next.append(svg);
 }
 if(node)node.replaceWith(next);else summary.append(next);
}
