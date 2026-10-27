const contexts=new WeakMap();
export function createProfileExpression(panel,{scope=panel,video,onStatus=()=>{}}={}){
 if(contexts.has(panel))return contexts.get(panel);
 const doc=panel.ownerDocument,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal;
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),fine=win.matchMedia('(hover: hover) and (pointer: fine)');
 const listen=(node,type,fn,extra={})=>node?.addEventListener(type,fn,{...extra,signal});
 let config,frame=0,visible=true,destroyed=false,dirty=true,gesture=false,lastDraw=0,lastFrame=0,slow=0,limited=false,signatureKey='',signatureAnimation=[];
 let paintColor='#c19aff';
 let audioContext,analyser,stream,source,selected,selectedSource='',pendingAudio=false,unsupportedSource='',frequency,wave,audioGeneration=0,canvas,ctx,size={width:300,height:44},lastStatus='';
 const surfaces=new Map(),active=()=>!destroyed&&!doc.hidden&&visible;
 const capture=()=>doc.documentElement.dataset.profileCapture==='true';
 const notify=value=>{if(value!==lastStatus){lastStatus=value;onStatus(value);}};
 function stop(){if(frame)win.cancelAnimationFrame(frame);frame=0;lastFrame=0;}
 function cleanupAudio(){
  audioGeneration++;pendingAudio=false;source?.disconnect();source=null;analyser=null;selected=null;
  for(const track of stream?.getTracks()||[])track.stop();stream=null;
  audioContext?.close?.().catch(()=>{});audioContext=null;
 }
 function current(){return video?.profileMusicPlayer?.current()||video;}
 const needsAudio=()=>config?.musicReactive.enabled||config?.electricBorder.enabled&&config.electricBorder.reactive;
 function canDraw(){const media=current();return needsAudio()&&active()&&!reduced.matches&&!capture()&&!win.navigator.connection?.saveData&&media&&media.readyState>=2&&!media.paused&&!media.muted&&media.volume>0;}
 async function analysis(){
  const media=current();if(!canDraw()||!gesture)return;
  const mediaSource=media.currentSrc||media.getAttribute('src')||'';if(unsupportedSource===mediaSource&&mediaSource)return;
  if(selected===media&&selectedSource===mediaSource&&pendingAudio)return;
  if(selected===media&&selectedSource===mediaSource&&analyser){if(audioContext?.state==='suspended')await audioContext.resume().catch(()=>{});return;}
  cleanupAudio();selected=media;selectedSource=mediaSource;pendingAudio=true;const generation=audioGeneration;
  // Stream capture observes sound without rerouting the existing media element.
  // Unsupported or CORS-tainted media never loses normal playback.
  const captureStream=media.captureStream||media.mozCaptureStream,Audio=win.AudioContext||win.webkitAudioContext;
  if(!captureStream||!Audio){unsupportedSource=mediaSource;pendingAudio=false;notify('Music visuals are unavailable for this browser or media. Your sound is unchanged.');return;}
  try{
   stream=captureStream.call(media);
   if(!stream.getAudioTracks().length){unsupportedSource=mediaSource;pendingAudio=false;notify('Music visuals are waiting for an audio track.');return;}
   audioContext=new Audio();await audioContext.resume();
   if(generation!==audioGeneration||destroyed){return;}
   source=audioContext.createMediaStreamSource(new win.MediaStream(stream.getAudioTracks()));
   analyser=audioContext.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=config.musicReactive.smoothing/100;
   frequency=new Uint8Array(analyser.frequencyBinCount);wave=new Uint8Array(analyser.fftSize);source.connect(analyser);pendingAudio=false;notify('');wake();
  }catch{unsupportedSource=mediaSource;cleanupAudio();notify('Music visuals are unavailable for this browser or media. Your sound is unchanged.');}
 }
 function geometry(){
  dirty=false;
  for(const [node,r]of surfaces){const boundary=node.closest('.profile-tile-boundary,.profile-effects-boundary')||node;r.bounds=boundary.getBoundingClientRect();}
  if(canvas){const r=canvas.getBoundingClientRect();size={width:Math.max(1,r.width||300),height:Math.max(1,r.height||44)};const dpr=Math.min(win.devicePixelRatio||1,1.5);canvas.width=Math.round(size.width*dpr);canvas.height=Math.round(size.height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);}
 }
 function draw(live=false){
  if(!ctx||!config)return;
  const state=live&&analyser?'live':'still';if(canvas.dataset.reactiveState!==state)canvas.dataset.reactiveState=state;
  const {width:w,height:h}=size,options=config.musicReactive;ctx.clearRect(0,0,w,h);ctx.strokeStyle=ctx.fillStyle=paintColor;ctx.lineWidth=1.5;
  const amount=live&&analyser?options.intensity/100*(current()?.volume||0)/.7:0;
  if(amount){analyser.getByteFrequencyData(frequency);analyser.getByteTimeDomainData(wave);}
  ctx.globalAlpha=amount ? .85 : .22;
  if(options.style==='equalizer'){
   const bars=w<250||limited?24:40,gap=3,bw=(w-(bars-1)*gap)/bars;
   for(let i=0;i<bars;i++){const energy=amount?frequency[Math.floor(i*frequency.length*.65/bars)]/255:0,bh=2+energy*(h-4)*amount;ctx.fillRect(i*(bw+gap),(h-bh)/2,bw,bh);}
  }else if(options.style==='halo'){
   const radius=Math.max(1,Math.min(w,h)/2-8);ctx.beginPath();
   for(let i=0;i<=80;i++){const angle=i/80*Math.PI*2,energy=amount?frequency[i%frequency.length]/255*8*amount:0,x=w/2+Math.cos(angle)*(radius+energy),y=h/2+Math.sin(angle)*(radius+energy);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();
  }else{
   ctx.beginPath();for(let i=0;i<=80;i++){const amplitude=amount?(wave[Math.floor(i*(wave.length-1)/80)]-128)/128*(h/2-2)*amount:0;i?ctx.lineTo(i*w/80,h/2+amplitude):ctx.moveTo(0,h/2+amplitude);}ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 function tick(time){
  frame=0;if(!active()||reduced.matches||capture())return;
  if(lastFrame&&time-lastFrame>38){if(++slow>45)limited=true;}else slow=Math.max(0,slow-1);lastFrame=time;
  if(dirty)geometry();let moving=false;
  for(const r of surfaces.values()){
   const step=1-Math.exp(-Math.min(50,time-(r.time||time-16))*.012*config.holographic.speed);r.time=time;
   const delta=Math.abs(r.tx-r.x)+Math.abs(r.ty-r.y);if(delta<.02)continue;
   r.x+=(r.tx-r.x)*step;r.y+=(r.ty-r.y)*step;
   r.layer.style.setProperty('--holo-x',r.x.toFixed(2)+'%');r.layer.style.setProperty('--holo-y',r.y.toFixed(2)+'%');
   moving||=Math.abs(r.tx-r.x)+Math.abs(r.ty-r.y)>.05;
  }
  const live=canDraw()&&analyser&&audioContext?.state==='running';
  if(live&&time-lastDraw>=(limited?66:33)){draw(true);if(config.electricBorder.reactive){analyser.getByteFrequencyData(frequency);let total=0;for(let i=0;i<frequency.length;i++)total+=frequency[i];panel.dispatchEvent(new win.CustomEvent('ascendo:music-energy',{detail:{energy:total/frequency.length/255}}));}lastDraw=time;}
  if(moving||live)frame=win.requestAnimationFrame(tick);
 }
 function wake(){if(!frame&&active()&&!reduced.matches&&!capture())frame=win.requestAnimationFrame(tick);}
 function syncSurfaces(){
  const targets=config.holographic.enabled?(panel.dataset.tiled==='true'?[panel.querySelector('.profile-identity'),...panel.querySelectorAll('.social-link,.now-playing,.profile-widget')].filter(Boolean):[panel]):[];
  for(const [node,r]of surfaces)if(!targets.includes(node)||!node.isConnected){r.layer.remove();node.classList.remove('holo-surface');surfaces.delete(node);}
  for(const node of targets){let r=surfaces.get(node);if(!r){const layer=doc.createElement('span');layer.className='holo-finish';layer.setAttribute('aria-hidden','true');node.append(layer);node.classList.add('holo-surface');r={layer,x:50,y:50,tx:50,ty:50};surfaces.set(node,r);}r.layer.dataset.finish=config.holographic.finish;r.layer.style.setProperty('--holo-intensity',String(config.holographic.intensity/100));}
 }
 function syncCanvas(){
  if(!config.musicReactive.enabled){canvas?.remove();canvas=null;ctx=null;if(!needsAudio())cleanupAudio();notify('');return;}
  if(!canvas){canvas=doc.createElement('canvas');canvas.className='profile-music-visual';canvas.setAttribute('aria-hidden','true');try{ctx=canvas.getContext('2d');}catch{}}
  canvas.dataset.style=config.musicReactive.style;
  const target=config.musicReactive.style==='halo'?panel.querySelector('.avatar'):panel.querySelector('.profile-summary');
  if(canvas.parentElement!==target)target?.append(canvas);
  if(analyser)analyser.smoothingTimeConstant=config.musicReactive.smoothing/100;
 }
 function replaySignature(){
  for(const a of signatureAnimation)a.cancel();signatureAnimation=[];
  const value=config?.signature,node=panel.querySelector('.profile-signature');if(!value?.enabled||!node||reduced.matches||capture()||!active())return;
  const paths=[...node.querySelectorAll('polyline')];
  if(paths.length)paths.forEach((path,index)=>{const a=path.animate?.([{strokeDasharray:1,strokeDashoffset:1},{strokeDasharray:1,strokeDashoffset:0}],{duration:value.duration/paths.length,delay:index*value.duration/paths.length,easing:'cubic-bezier(.22,.65,.3,1)',fill:'backwards'});if(a){a.finished?.catch(()=>{});signatureAnimation.push(a);}});
  else{const text=node.querySelector('.profile-signature__text');const a=text?.animate?.([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:value.duration,easing:'cubic-bezier(.22,.65,.3,1)'});if(a){a.finished?.catch(()=>{});signatureAnimation.push(a);}}
 }
 function sync(){
  if(!config)return;if(!active()){stop();audioContext?.suspend?.().catch(()=>{});return;}
  if(reduced.matches||capture()){stop();cleanupAudio();for(const r of surfaces.values()){r.tx=r.ty=r.x=r.y=50;r.layer.style.setProperty('--holo-x','50%');r.layer.style.setProperty('--holo-y','50%');}for(const a of signatureAnimation)a.finish?.();}
  if(dirty)geometry();if(!canDraw()||!analyser)draw(false);if(canDraw())analysis();else if(!needsAudio())cleanupAudio();if(!canDraw())panel.dispatchEvent(new win.CustomEvent('ascendo:music-energy',{detail:{energy:0}}));wake();
 }
 listen(scope,'pointermove',event=>{if(!config?.holographic.enabled||!fine.matches||reduced.matches||limited||event.pointerType==='touch')return;if(dirty)geometry();for(const r of surfaces.values()){const b=r.bounds;if(!b?.width)continue;const within=event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom;r.tx=within?Math.max(0,Math.min(100,(event.clientX-b.left)/b.width*100)):50;r.ty=within?Math.max(0,Math.min(100,(event.clientY-b.top)/b.height*100)):50;}wake();});
 listen(scope,'pointerleave',()=>{for(const r of surfaces.values())r.tx=r.ty=50;wake();});
 for(const name of ['pointerdown','keydown'])listen(doc,name,()=>{gesture=true;if(canDraw())analysis();},{capture:true});
 listen(video,'ascendo:music-state',sync);listen(doc,'visibilitychange',sync);listen(win,'pageshow',()=>{visible=true;sync();});listen(win,'pagehide',event=>{if(!event.persisted)destroy();else{visible=false;sync();}});
 listen(win,'resize',()=>{dirty=true;wake();});listen(scope,'scroll',()=>{dirty=true;},{passive:true,capture:true});listen(scope,'ascendo:preview-size',()=>{dirty=true;sync();});listen(reduced,'change',sync);
 const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}):null;observer?.observe(scope);
 const resize=win.ResizeObserver?new win.ResizeObserver(()=>{dirty=true;wake();}):null;resize?.observe(scope);
 function update(value){
  config=value;paintColor=value.musicReactive.color||win.getComputedStyle(panel).getPropertyValue('--profile-accent').trim()||'#c19aff';dirty=true;syncSurfaces();syncCanvas();const key=JSON.stringify(config.signature),replay=signatureKey!==key;signatureKey=key;sync();if(replay)replaySignature();
 }
 function destroy(){if(destroyed)return;destroyed=true;stop();cleanupAudio();for(const a of signatureAnimation)a.cancel();for(const [node,r]of surfaces){r.layer.remove();node.classList.remove('holo-surface');}surfaces.clear();canvas?.remove();observer?.disconnect();resize?.disconnect();abort.abort();contexts.delete(panel);}
 const api={update,replaySignature,destroy};contexts.set(panel,api);return api;
}
