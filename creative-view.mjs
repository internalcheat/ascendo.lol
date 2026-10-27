const NS='http://www.w3.org/2000/svg';
const make=(doc,tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function creativeImage(doc,url,poster,resolve=value=>value){
 const image=make(doc,'img');image.src=resolve(url);image.alt='';image.decoding='async';
 if(!poster)return image;
 const picture=make(doc,'picture'),still=make(doc,'source');still.media='(prefers-reduced-motion: reduce)';still.srcset=resolve(poster);picture.append(still,image);
 image.addEventListener('error',()=>{still.remove();image.src=resolve(poster);},{once:true});return picture;
}
export function constellationPoints(count,spread=90){
 return Array.from({length:count},(_,i)=>{const inner=count>8&&i<6,index=count>8&&!inner?i-6:i,total=count>8?(inner?6:count-6):count;const angle=(index/Math.max(1,total)*Math.PI*2)-Math.PI/2+(inner?Math.PI/6:0),radius=inner?105+(spread-65)*.18:145+(spread-65)*23/35;return{x:50+Math.cos(angle)*radius/4,y:50+Math.sin(angle)*radius/4};});
}
export function applyCreativeView(panel,{identity,summary,avatar,socials,config,resolve=value=>value}){
 const doc=panel.ownerDocument,stars=config.constellation,enabled=stars.enabled&&config.socials.length>0;
 panel.dataset.constellation=String(enabled);
 let sky=identity.querySelector('.profile-constellation');
 if(enabled){
  for(const child of [...socials.children])if(child.classList.contains('profile-tile-boundary')){const link=child.querySelector('.social-link');if(link)child.replaceWith(link);}
  if(!sky){sky=make(doc,'div','profile-constellation');identity.prepend(sky);}
  const key=JSON.stringify([config.name,config.socials,stars]);
  if(sky.dataset.key!==key){
   sky.dataset.key=key;sky.querySelector('svg')?.remove();const svg=doc.createElementNS(NS,'svg');svg.classList.add('constellation-lines');svg.setAttribute('viewBox','0 0 400 400');svg.setAttribute('aria-hidden','true');
   const points=constellationPoints(config.socials.length,stars.spread);
   points.forEach((point,i)=>{const line=doc.createElementNS(NS,'path');line.setAttribute('d',`M200 200 L${point.x*4} ${point.y*4}`);svg.append(line);const link=socials.children[i];if(!link)return;link.style.setProperty('--star-x',point.x+'%');link.style.setProperty('--star-y',point.y+'%');link.dataset.starMotion=String(stars.motion);});sky.prepend(svg);
  }
  sky.style.setProperty('--star-line-opacity',String(stars.lineOpacity/100));sky.style.setProperty('--star-size',stars.nodeSize+'px');
  if(avatar.parentElement!==sky)sky.append(avatar);if(socials.parentElement!==sky)sky.append(socials);
  if(summary.parentElement!==identity)identity.append(summary);
 }else{
  if(sky){sky.before(avatar);sky.remove();}
  for(const link of socials.children){link.style.removeProperty('--star-x');link.style.removeProperty('--star-y');delete link.dataset.starMotion;}
 }
 let layer=panel.querySelector(':scope > .profile-stickers');const stickerKey=JSON.stringify([config.stickers,...config.stickers.items.flatMap(item=>[resolve(item.url),resolve(item.poster)])]);
 if(!config.stickers.enabled||!config.stickers.items.length){layer?.remove();panel.removeAttribute('data-stickers');return;}
 panel.dataset.stickers='true';
 if(layer?.dataset.key===stickerKey)return;
 const next=make(doc,'div','profile-stickers');next.setAttribute('aria-hidden','true');next.dataset.key=stickerKey;
 for(const item of config.stickers.items){
  const sticker=make(doc,'div','profile-sticker'),art=make(doc,'span','profile-sticker__art');sticker.dataset.kind=item.kind;sticker.dataset.edge=item.edge;sticker.dataset.motion=String(item.motion);
  for(const [key,value]of Object.entries({position:item.position+'%',offset:item.offset+'px',size:item.size+'px',rotation:item.rotation+'deg',opacity:item.opacity/100,color:item.color||'var(--profile-accent)'}))sticker.style.setProperty('--sticker-'+key,String(value));
  if(item.kind==='image'){if(item.url)art.append(creativeImage(doc,item.url,item.poster,resolve));}else art.textContent=item.text;
  sticker.append(art);next.append(sticker);
 }
 if(layer)layer.replaceWith(next);else panel.append(next);
}
