import {CURSOR_PACKS} from './cursor-packs.mjs?v=20261027-5';
const images=new Map(),pairs=new Map();
const key=config=>config.style+':'+Math.round(config.size);
export const preparedCursorPair=config=>pairs.get(key(config));
function bounded(map,id,value,max){map.delete(id);map.set(id,value);while(map.size>max)map.delete(map.keys().next().value);return value;}
function load(pack,doc){
 if(images.has(pack))return images.get(pack);
 const promise=Promise.all(['cursor','pointer'].map(kind=>new Promise((resolve,reject)=>{const image=new doc.defaultView.Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Cursor artwork unavailable.'));image.src=CURSOR_PACKS[pack][kind].path;})));
 bounded(images,pack,promise,4);promise.catch(()=>{if(images.get(pack)===promise)images.delete(pack);});return promise;
}
export async function prepareNativeCursor(config,doc){
 if(!Object.hasOwn(CURSOR_PACKS,config.style))return false;
 if(!Number.isFinite(config.size)||config.size<12||config.size>40)throw Error('Invalid native cursor.');
 const id=key(config);if(pairs.has(id))return true;
 const source=CURSOR_PACKS[config.style],loaded=await load(config.style,doc),size=Math.round(config.size),result={};
 for(const [index,kind]of ['cursor','pointer'].entries()){
  const image=loaded[index],scale=size/Math.max(image.naturalWidth,image.naturalHeight),canvas=doc.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Cursor artwork unavailable.');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);
  const [x,y]=source[kind].hotspot,hotX=Math.max(0,Math.min(canvas.width-1,Math.round(x*scale))),hotY=Math.max(0,Math.min(canvas.height-1,Math.round(y*scale)));
  result[kind]=`url("${canvas.toDataURL('image/png')}") ${hotX} ${hotY}, ${kind==='pointer'?'pointer':'auto'}`;
 }
 bounded(pairs,id,result,12);return true;
}
