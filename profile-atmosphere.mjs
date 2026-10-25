import { createOverlayParticles } from './overlay-particles.mjs?v=20261025-15';
import { createChromaKey } from './chroma-key.mjs?v=20261025-6';
import {isTiledLayout} from './visual-schema.mjs?v=20261025-15';
import {themePalette} from './profile-palette.mjs?v=20261025-14';

function contour(width,height,radius) {
  const points=[], arc=Math.PI*radius/2;
  const lengths=[width-2*radius,arc,height-2*radius,arc,width-2*radius,arc,height-2*radius,arc];
  const perimeter=lengths.reduce((sum,value)=>sum+value,0), count=Math.min(128,Math.max(40,Math.ceil(perimeter/12)));
  for(let index=0;index<count;index++){
    let distance=index/count*perimeter,part=0;
    while(part<7&&distance>lengths[part])distance-=lengths[part++];
    const ratio=lengths[part]?distance/lengths[part]:0;
    let positionX,positionY,nx,ny;
    if(part===0){positionX=radius+distance;positionY=0;nx=0;ny=-1;}
    else if(part===2){positionX=width;positionY=radius+distance;nx=1;ny=0;}
    else if(part===4){positionX=width-radius-distance;positionY=height;nx=0;ny=1;}
    else if(part===6){positionX=0;positionY=height-radius-distance;nx=-1;ny=0;}
    else{const quadrant=(part-1)/2,angle=(-1+quadrant)*Math.PI/2+ratio*Math.PI/2;nx=Math.cos(angle);ny=Math.sin(angle);positionX=(quadrant===0||quadrant===1?width-radius:radius)+nx*radius;positionY=(quadrant===0||quadrant===3?radius:height-radius)+ny*radius;}
    points.push({positionX:positionX+5,positionY:positionY+5,nx,ny});
  }
  return points;
}

export function createProfileAtmosphere(panel,scope,{clock,preview=false}) {
  const doc=panel.ownerDocument,win=doc.defaultView;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),mobile=win.matchMedia('(max-width: 820px), (pointer: coarse)');
  const root=doc.createElement('div');root.className='profile-atmosphere';root.setAttribute('aria-hidden','true');root.hidden=true;scope.append(root);
  const canvas=doc.createElement('canvas');canvas.className='profile-overlay-presets';root.append(canvas);
  const borders=new Map();
  let config,active=true,frame=0,lastDraw=0,quality=1,slow=0,particles,particlesFailed=false,sourceKey='',mediaElement,mediaAbort,keyCanvas,keyer,mediaReady=false,mediaFailed=false,videoCallback=0,sourceDirty=false,previewUrls;
  let width=1,height=1,maxLayers=3;
  const notify=message=>scope.dispatchEvent(new win.CustomEvent('ascendo:visual-status',{bubbles:true,detail:{message}}));
  const resolve=value=>previewUrls?.get(value)||value;
  const activeLayers=()=>config?.overlays.layers.filter(layer=>layer.enabled&&layer.opacity>0&&layer.density>0).slice(0,maxLayers)||[];
  const wantedMedia=()=>!!config?.overlays.enabled&&config.overlays.media.enabled&&config.overlays.media.opacity>0&&!!config.overlays.media.url&&(!(reduced.matches||win.navigator.connection?.saveData)||config.overlays.media.kind==='image');
  const wantedParticles=()=>!!config?.overlays.enabled&&!particlesFailed&&!reduced.matches&&activeLayers().length>0;
  const electricAnimated=()=>!!config?.electricBorder.enabled&&config.electricBorder.intensity>0&&!reduced.matches;
  function staticParticles(){if(!reduced.matches||!active||doc.hidden||!config?.overlays.enabled||particlesFailed||!activeLayers().length)return;try{particles ||= createOverlayParticles(canvas);particles.draw(activeLayers(),0,themePalette(config).primary,mobile.matches?128:384);}catch(error){particlesFailed=true;notify(error.message);}}
  const needsFrames=()=>wantedParticles()||electricAnimated()||(keyer&&mediaReady&&!mediaFailed&&(sourceDirty||mediaElement?.tagName==='VIDEO'&&!mediaElement.requestVideoFrameCallback));
  function schedule(){if(!frame&&active&&!doc.hidden&&needsFrames())frame=clock.request(draw);}
  function cancelVideoCallback(){if(videoCallback&&mediaElement?.cancelVideoFrameCallback)mediaElement.cancelVideoFrameCallback(videoCallback);videoCallback=0;}
  function videoFrames(){
    if(!mediaElement?.requestVideoFrameCallback||!active||!mediaReady||mediaFailed||!wantedMedia())return;
    videoCallback=mediaElement.requestVideoFrameCallback(()=>{videoCallback=0;sourceDirty=true;schedule();videoFrames();});
  }
  function releaseMedia(){
    mediaAbort?.abort();mediaAbort=undefined;
    cancelVideoCallback();
    if(mediaElement?.tagName==='VIDEO'){mediaElement.pause();mediaElement.removeAttribute('src');mediaElement.load();}
    mediaElement?.remove();keyer?.destroy();keyCanvas?.remove();mediaElement=keyCanvas=keyer=undefined;mediaReady=false;mediaFailed=false;
  }
  function failMedia(message){if(mediaFailed)return;mediaFailed=true;mediaElement?.pause?.();cancelVideoCallback();if(mediaElement){mediaElement.hidden=true;if(mediaElement.tagName==='VIDEO'){mediaElement.removeAttribute('src');mediaElement.load();}}if(keyCanvas)keyCanvas.hidden=true;notify(message);}
  function configureMedia(){
    if(!config)return;
    const media=config.overlays.media;
    const still=reduced.matches&&media.kind==='image';
    const source=resolve(still?(media.poster||(/\.(jpg|png)$/.test(media.url)?media.url:'')):media.url);
    const key=JSON.stringify([wantedMedia(),media.kind,source,media.key.enabled]);
    if(key!==sourceKey){
      sourceKey=key;releaseMedia();notify('');
      if(wantedMedia()&&source){
        mediaAbort=new AbortController();const events={signal:mediaAbort.signal};
        mediaElement=doc.createElement(media.kind==='video'?'video':'img');mediaElement.className='profile-overlay-media';mediaElement.setAttribute('aria-hidden','true');mediaElement.crossOrigin='anonymous';mediaElement.hidden=true;
        if(media.kind==='video'){mediaElement.muted=true;mediaElement.volume=0;mediaElement.loop=true;mediaElement.playsInline=true;mediaElement.preload='none';}
        else mediaElement.alt='';
        if(media.key.enabled){keyCanvas=doc.createElement('canvas');keyCanvas.className='profile-keyed-media';keyCanvas.hidden=true;root.insertBefore(keyCanvas,canvas);try{keyer=createChromaKey(keyCanvas);}catch(error){failMedia(error.message);}}
        root.insertBefore(mediaElement,canvas);
        mediaElement.addEventListener(media.kind==='video'?'loadeddata':'load',()=>{if(mediaFailed)return;mediaReady=true;sourceDirty=true;syncMedia();schedule();},events);
        mediaElement.addEventListener('error',()=>failMedia('The custom overlay could not be played or loaded. Your background is unchanged.'),events);
        if(keyCanvas)keyCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failMedia('Green-screen removal is unavailable after a graphics reset. Reload to try again.');},events);
        if(!mediaFailed)mediaElement.src=source;
      }
    }
    if(mediaElement){mediaElement.style.objectFit=media.fit;mediaElement.style.opacity=String(media.opacity/100);}
    if(keyCanvas)keyCanvas.style.opacity=String(media.opacity/100);
    sourceDirty=true;syncMedia();
  }
  function syncMedia(){
    if(!mediaElement||mediaFailed)return;
    const visible=active&&!doc.hidden&&wantedMedia();
    mediaElement.hidden=!visible||!mediaReady||!!keyer;
    if(keyCanvas)keyCanvas.hidden=!visible||!mediaReady;
    if(mediaElement.tagName==='VIDEO'){
      if(visible&&!reduced.matches){if(mediaElement.paused){const current=mediaElement;current.play().catch(()=>{if(mediaElement===current)failMedia('The browser blocked the custom overlay video. Your profile is still usable.');});}if(mediaReady&&!videoCallback)videoFrames();}
      else{mediaElement.pause();cancelVideoCallback();}
    }
  }
  function syncBorders(){
    const settings=config.electricBorder;
    const targets=settings.enabled?[...(settings.card?[isTiledLayout(config.cardLayout)?panel.querySelector('.profile-identity'):panel]:[]),...(settings.panels?[...panel.querySelectorAll('.social-link,.now-playing,.profile-widget')]:[]),...(settings.avatar?[panel.querySelector('.avatar')]:[])].filter(Boolean):[];
    for(const [target,record]of borders)if(!targets.includes(target)||!target.contains(record.svg)){record.svg.remove();borders.delete(target);}
    for(const target of targets)if(!borders.has(target)){
      const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('profile-electric');svg.setAttribute('aria-hidden','true');
      const glow=doc.createElementNS(svg.namespaceURI,'path'),core=doc.createElementNS(svg.namespaceURI,'path');glow.setAttribute('stroke-width','4');glow.setAttribute('opacity','.14');core.setAttribute('stroke-width','1.3');core.setAttribute('opacity','.85');svg.append(glow,core);target.append(svg);borders.set(target,{svg,glow,core,points:[]});
    }
    for(const record of borders.values()){record.glow.setAttribute('stroke',settings.color);record.core.setAttribute('stroke',settings.color);record.svg.toggleAttribute('hidden',!active);}
  }
  function geometry(){
    width=preview?scope.clientWidth:win.innerWidth;height=preview?scope.clientHeight:win.innerHeight;
    width=Math.max(1,width||1);height=Math.max(1,height||1);
    const ratio=Math.min(mobile.matches?1:1.5,win.devicePixelRatio||1)*quality;
    const maximum=mobile.matches?960:1920,scale=Math.min(ratio,maximum/Math.max(width,height));
    const nextWidth=Math.max(1,Math.round(width*scale)),nextHeight=Math.max(1,Math.round(height*scale));
    if(canvas.width!==nextWidth||canvas.height!==nextHeight){canvas.width=nextWidth;canvas.height=nextHeight;}
    if(keyCanvas){const keyScale=Math.min(1,(mobile.matches?640:1280)*quality/Math.max(width,height));const keyWidth=Math.max(1,Math.round(width*keyScale)),keyHeight=Math.max(1,Math.round(height*keyScale));if(keyCanvas.width!==keyWidth||keyCanvas.height!==keyHeight){keyCanvas.width=keyWidth;keyCanvas.height=keyHeight;sourceDirty=true;}}
    for(const [target,record]of borders){
      const targetWidth=target.offsetWidth,targetHeight=target.offsetHeight;if(!targetWidth||!targetHeight)continue;
      const style=win.getComputedStyle(target),radiusText=style.borderTopLeftRadius;
      const radius=Math.min(Math.min(targetWidth,targetHeight)/2,radiusText.includes('%')?parseFloat(radiusText)/100*Math.min(targetWidth,targetHeight):parseFloat(radiusText)||0);
      record.svg.setAttribute('viewBox',`0 0 ${targetWidth+10} ${targetHeight+10}`);record.points=contour(targetWidth,targetHeight,radius);
    }
    if(config){drawBorders(win.performance.now());staticParticles();sourceDirty=true;schedule();}
  }
  function drawBorders(time){
    if(!config?.electricBorder.enabled)return;
    const settings=config.electricBorder;
    for(const record of borders.values()){
      const path=record.points.map((point,index)=>{
        const offset=reduced.matches?0:(Math.sin(index*1.9+time*.009*settings.speed)+Math.sin(index*.73-time*.013*settings.speed))*.5*(mobile.matches?1.5:3)*settings.intensity/100;
        return `${index?'L':'M'}${(point.positionX+point.nx*offset).toFixed(2)},${(point.positionY+point.ny*offset).toFixed(2)}`;
      }).join('')+'Z';record.core.setAttribute('d',path);record.glow.setAttribute('d',path);
    }
  }
  function draw(time){
    frame=0;if(!active||doc.hidden||!config)return;
    const interval=quality<=.25?1000/15:mobile.matches||quality<1?1000/30:1000/60;
    if(time-lastDraw>=interval-1){
      const started=win.performance.now();lastDraw=time;
      drawBorders(time);
      if(wantedParticles()){
        try{particles ||= createOverlayParticles(canvas);particles.draw(activeLayers(),time,themePalette(config).primary,Math.floor((mobile.matches?128:384)*quality));}catch(error){particlesFailed=true;notify(error.message);}
      }else particles?.clear();
      if(keyer&&mediaReady&&!mediaFailed&&(sourceDirty||!mediaElement.requestVideoFrameCallback)){
        try{keyer.draw(mediaElement,config.overlays.media.key,config.overlays.media.fit);sourceDirty=false;}catch{failMedia('Green-screen removal could not read this upload. The overlay has been hidden.');}
      }
      slow=win.performance.now()-started>8?slow+1:Math.max(0,slow-1);
      if(slow>=12){slow=0;if(quality>.25){quality*=.5;geometry();notify('Preview quality was reduced to keep this device responsive. Saved settings are unchanged.');}else if(keyer&&!mediaFailed)failMedia('The green-screen layer was stopped to protect responsiveness.');else if(maxLayers>1){maxLayers--;notify('A decorative layer was suspended to keep this device responsive. Saved settings are unchanged.');}}
    }
    if(wantedParticles()||electricAnimated()||(keyer&&mediaElement?.tagName==='VIDEO'&&mediaReady&&!mediaFailed&&!mediaElement.requestVideoFrameCallback))schedule();
    else if(sourceDirty&&keyer&&mediaReady&&!mediaFailed)schedule();
  }
  function update(next,options={}){
    if(particlesFailed&&next.overlays.enabled&&(!config?.overlays.enabled||JSON.stringify(config?.overlays.layers)!==JSON.stringify(next.overlays.layers))){particles?.destroy();particles=undefined;particlesFailed=false;}
    config=next;previewUrls=options.previewUrls;
    root.hidden=!config.overlays.enabled;
    syncBorders();configureMedia();geometry();drawBorders(win.performance.now());
    if(!wantedParticles()&&!(reduced.matches&&config.overlays.enabled&&activeLayers().length))particles?.clear();if(frame&&!needsFrames()){clock.cancel(frame);frame=0;}schedule();
  }
  function setActive(value){
    active=value;
    if(!active){if(frame)clock.cancel(frame);frame=0;lastDraw=0;}
    for(const record of borders.values())record.svg.toggleAttribute('hidden',!active);
    if(config){configureMedia();syncMedia();if(active){staticParticles();schedule();}}
  }
  function destroy(){if(frame)clock.cancel(frame);releaseMedia();particles?.destroy();for(const record of borders.values())record.svg.remove();borders.clear();root.remove();}
  return {update,geometry,setActive,destroy};
}
