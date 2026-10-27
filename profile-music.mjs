export function createProfilePlayer(video,{preview=false,onState=()=>{}}={}){
  if(video.profileMusicPlayer)return video.profileMusicPlayer;
  const doc=video.ownerDocument,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal;
  const audio=doc.createElement('audio');audio.loop=true;audio.preload='none';audio.hidden=true;audio.dataset.profileMusic='';video.after(audio);
  let config={source:'video',url:'',volume:65},settingsKey='',desiredSource='',destroyed=false,started=false,active=true,attempt=0,recovery=0,recoveryCount=0;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),small=win.matchMedia('(max-width: 820px), (pointer: coarse)');
  const current=()=>config.source==='mp3'?audio:video;
  const notify=()=>{onState(current());video.dispatchEvent(new win.Event('ascendo:music-state'));};
  const blocked=()=>doc.documentElement.dataset.profileCapture==='true'||!active||doc.hidden||video.dataset.entryBlocked==='true';
  const pause=media=>{if(!media.paused)media.pause();};
  function assign(media,source,force=false){if(!force&&(media.getAttribute('src')||'')===source)return;media.pause();try{const origin=new URL(source,win.location.href).origin;if([win.location.origin,'https://ascendo.lol','https://fstdttaxflayhtwhnbih.supabase.co'].includes(origin))media.crossOrigin='anonymous';else media.removeAttribute('crossorigin');}catch{}if(source)media.src=source;else media.removeAttribute('src');media.load();}
  async function play(media,explicit,generation){
    if(!media.getAttribute('src')||blocked()||!media.paused&&!media.ended)return;
    try{await media.play();}catch(error){if(generation!==attempt||destroyed||blocked()||error?.name==='AbortError')return;if(media===video&&error?.name==='NotAllowedError'){media.muted=true;try{await media.play();}catch{}}}finally{if(generation===attempt){if(blocked())pause(media);notify();}}
  }
  async function start(explicit=false){
    if(destroyed)return;const generation=++attempt;if(blocked()){pause(video);pause(audio);return;}
    if(explicit){started=true;current().muted=current().volume===0;}
    const quiet=!!(reduced.matches||win.navigator.connection?.saveData);
    assign(video,quiet&&!started&&!preview?'':desiredSource);
    doc.body.classList.toggle('media-poster-only',!preview&&quiet&&!started);
    const playing=[];
    if(video.getAttribute('src')&&(!quiet||started||preview&&!reduced.matches)){
      if(config.source==='mp3'||preview&&!started)video.muted=true;
      playing.push(play(video,explicit,generation));
    }else video.pause();
    if(config.source==='mp3'&&(!preview||explicit||started))playing.push(play(audio,explicit,generation));
    else if(config.source!=='mp3')audio.pause();
    await Promise.all(playing);notify();
  }
  function update(music,{source,resolve=value=>value,visible=true}={}){
    active=visible;
    config={source:music?.source==='mp3'?'mp3':'video',url:music?.url||'',volume:Math.max(0,Math.min(70,music?.volume??65))};
    const key=JSON.stringify(config);if(key!==settingsKey){const previous=settingsKey?JSON.parse(settingsKey):null;if(!previous||previous.source!==config.source||previous.url!==config.url)started=false;settingsKey=key;video.volume=audio.volume=config.volume/100;audio.muted=config.volume===0||preview&&!started;video.muted=config.volume===0||preview&&!started||config.source==='mp3';}
    assign(audio,config.source==='mp3'?resolve(config.url):'');
    if(source!==undefined){desiredSource=source;if(!source)assign(video,'');}
    if(config.source==='mp3')video.muted=true;else audio.pause();
    start();
  }
  function fromDataset(){const kind=video.dataset.backgroundKind||'video',source=kind==='video'?(small.matches&&video.dataset.mobileSrc?video.dataset.mobileSrc:video.dataset.backgroundSrc||'../assets/music-background.mp4'):'';update({source:video.dataset.musicSource,url:video.dataset.musicSrc,volume:Number(video.dataset.musicVolume??65)},{source});}
  function volume(value){const media=current();media.volume=Math.max(0,Math.min(70,value))/100;media.muted=media.volume===0;if(config.source==='mp3')video.muted=true;notify();start(true);}
  function recover(){if(recovery||recoveryCount>=2||destroyed||blocked())return;recovery=win.setTimeout(()=>{recovery=0;if(destroyed||blocked())return;recoveryCount++;start();},800);}
  for(const media of [audio,video])for(const name of ['timeupdate','durationchange','loadedmetadata','loadeddata','canplay','playing','pause','volumechange','waiting','stalled','error','emptied'])media.addEventListener(name,()=>{if(blocked()){pause(audio);pause(video);}if(name==='playing'){recoveryCount=0;win.clearTimeout(recovery);recovery=0;}else if(['pause','stalled','canplay'].includes(name))recover();if(!preview){if(video.error||!video.getAttribute('src'))doc.body.classList.remove('has-video');else if(video.readyState>=2)doc.body.classList.add('has-video');}notify();},{signal});
  video.addEventListener('ascendo:background',()=>preview?start():fromDataset(),{signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){attempt++;win.clearTimeout(recovery);recovery=0;video.pause();audio.pause();}else{recoveryCount=0;start();}},{signal});
  win.addEventListener('focus',()=>{if(!blocked()){recoveryCount=0;start();}},{signal});
  reduced.addEventListener('change',()=>start(),{signal});small.addEventListener('change',()=>{if(!preview)fromDataset();},{signal});
  win.addEventListener('pagehide',event=>{attempt++;video.pause();audio.pause();if(!event.persisted)destroy();},{signal});win.addEventListener('pageshow',()=>start(),{signal});
  function destroy(){if(destroyed)return;destroyed=true;attempt++;win.clearTimeout(recovery);abort.abort();audio.pause();audio.removeAttribute('src');audio.load();audio.remove();delete video.profileMusicPlayer;}
  function reload(){attempt++;recoveryCount=0;win.clearTimeout(recovery);recovery=0;assign(video,desiredSource,true);assign(audio,config.source==='mp3'?(audio.getAttribute('src')||''):'',true);return start();}
  const api={update,current,volume,start,reload,fromDataset,destroy,setActive(value){active=value;start();}};video.profileMusicPlayer=api;return api;
}
