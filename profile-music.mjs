export function createProfilePlayer(video,{preview=false,onState=()=>{}}={}){
  if(video.profileMusicPlayer)return video.profileMusicPlayer;
  const doc=video.ownerDocument,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal;
  const audio=doc.createElement('audio');audio.loop=true;audio.preload='none';audio.hidden=true;audio.dataset.profileMusic='';video.after(audio);
  let config={source:'video',url:'',volume:65},settingsKey='',desiredSource='',destroyed=false,started=false,active=true,attempt=0;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),small=win.matchMedia('(max-width: 820px), (pointer: coarse)');
  const current=()=>config.source==='mp3'?audio:video;
  const notify=()=>{onState(current());video.dispatchEvent(new win.Event('ascendo:music-state'));};
  const blocked=()=>!active||doc.hidden||video.dataset.entryBlocked==='true';
  const pause=media=>{if(!media.paused)media.pause();};
  function assign(media,source){if((media.getAttribute('src')||'')===source)return;media.pause();if(source)media.src=source;else media.removeAttribute('src');media.load();}
  async function play(media,explicit,generation){
    if(!media.getAttribute('src')||blocked())return;
    try{await media.play();}catch{if(generation!==attempt||destroyed||blocked())return;if(media===video){media.muted=true;try{await media.play();}catch{}}}finally{if(generation===attempt)notify();}
  }
  async function start(explicit=false){
    const generation=++attempt;if(blocked()){pause(video);pause(audio);return;}
    if(explicit){started=true;current().muted=current().volume===0;}
    const quiet=reduced.matches||win.navigator.connection?.saveData;
    assign(video,quiet&&!started&&!preview?'':desiredSource);
    doc.body.classList.toggle('media-poster-only',!preview&&quiet);
    if(video.getAttribute('src')&&(!quiet||explicit||preview&&!reduced.matches)){
      if(config.source==='mp3'||preview&&!started)video.muted=true;
      await play(video,explicit,generation);
    }else video.pause();
    if(config.source==='mp3'&&(!preview||explicit||started))await play(audio,explicit,generation);
    else if(config.source!=='mp3')audio.pause();
    notify();
  }
  function update(music,{source,resolve=value=>value,visible=true}={}){
    active=visible;
    config={source:music?.source==='mp3'?'mp3':'video',url:music?.url||'',volume:Math.max(0,Math.min(70,music?.volume??65))};
    const key=JSON.stringify(config);if(key!==settingsKey){const previous=settingsKey?JSON.parse(settingsKey):null;if(!previous||previous.source!==config.source||previous.url!==config.url)started=false;settingsKey=key;video.volume=audio.volume=config.volume/100;audio.muted=config.volume===0||preview&&!started;video.muted=config.volume===0||preview&&!started||config.source==='mp3';}
    assign(audio,config.source==='mp3'?resolve(config.url):'');
    if(source!==undefined)desiredSource=source;
    if(config.source==='mp3')video.muted=true;else audio.pause();
    start();
  }
  function fromDataset(){const kind=video.dataset.backgroundKind||'video',source=kind==='video'?(small.matches&&video.dataset.mobileSrc?video.dataset.mobileSrc:video.dataset.backgroundSrc||'../assets/music-background.mp4'):'';update({source:video.dataset.musicSource,url:video.dataset.musicSrc,volume:Number(video.dataset.musicVolume??65)},{source});}
  function volume(value){const media=current();media.volume=Math.max(0,Math.min(70,value))/100;media.muted=media.volume===0;if(config.source==='mp3')video.muted=true;notify();start(true);}
  for(const media of [audio,video])for(const name of ['timeupdate','durationchange','loadedmetadata','playing','pause','volumechange','waiting','error','emptied'])media.addEventListener(name,()=>{if(blocked()){pause(audio);pause(video);}if(!preview)doc.body.classList.toggle('has-video',!video.paused&&!video.error);notify();},{signal});
  video.addEventListener('ascendo:background',()=>preview?start():fromDataset(),{signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){attempt++;video.pause();audio.pause();}else start();},{signal});
  reduced.addEventListener('change',()=>start(),{signal});small.addEventListener('change',()=>{if(!preview)fromDataset();},{signal});
  win.addEventListener('pagehide',event=>{attempt++;video.pause();audio.pause();if(!event.persisted)destroy();},{signal});win.addEventListener('pageshow',()=>start(),{signal});
  function destroy(){if(destroyed)return;destroyed=true;attempt++;abort.abort();audio.pause();audio.removeAttribute('src');audio.load();audio.remove();delete video.profileMusicPlayer;}
  const api={update,current,volume,start,fromDataset,destroy,setActive(value){active=value;start();}};video.profileMusicPlayer=api;return api;
}
