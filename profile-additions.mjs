import {createEntryAudio} from './profile-entry-audio.mjs?v=20261025-11';
import {suspendWidgetPlayers,resumeWidgetPlayers} from './profile-widgets.mjs?v=20261026-6';

export function createProfileAdditions(scope,panel,{preview=false}={}){
  const doc=scope.ownerDocument,win=doc.defaultView,reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),audio=createEntryAudio(win),abort=new win.AbortController();
  const make=(tag,className,text)=>{const node=doc.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const gate=make('div','profile-enter-screen');gate.hidden=true;gate.setAttribute('role',preview?'region':'dialog');gate.setAttribute('aria-label','Enter profile');if(!preview)gate.setAttribute('aria-modal','true');
  const enterButton=make('button','profile-enter-button'),copy=make('span','profile-enter-copy'),first=make('span','profile-enter-title'),second=make('span','profile-enter-subtitle');enterButton.type='button';copy.append(first,second);enterButton.append(copy);gate.append(enterButton);scope.append(gate);
  const chip=preview?make('div','profile-title-preview'):null;if(chip){chip.hidden=true;chip.setAttribute('aria-label','Browser title preview');scope.before(chip);}
  const video=preview?doc.getElementById('previewVideo'):doc.getElementById('musicBackground');
  const savedInert=new Map();let config,entered=true,entryKey='',titleKey='',titleTimer=0,gateTimer=0,line=0,position=0,suspended=false,destroyed=false;
  const visitStart=win.performance.now();
  const defaultTitle=()=>`${config?.name||'Ascendo'} | Ascendo`;
  const gated=()=>!!config?.enterScreen.enabled&&!entered;
  function stopTitle(){if(titleTimer)win.clearTimeout(titleTimer);titleTimer=0;}
  function writeTitle(value){if(preview)chip.textContent=value;else doc.title=value;}
  function updateTitle(){
    stopTitle();if(!config)return;
    if(chip)chip.hidden=!config.pageTitle.enabled;
    if(!config.pageTitle.enabled){if(!preview)doc.title=defaultTitle();return;}
    const settings=config.pageTitle,lines=settings.lines.length?settings.lines:[defaultTitle()];
    if(suspended||doc.hidden||gated()&&!preview)return;
    const text=lines[line%lines.length],letters=Array.from(text);let delay=settings.speed;
    if(reduced.matches){writeTitle(lines[0]);return;}
    if(settings.effect==='time'){const elapsed=Math.max(0,Math.floor((win.performance.now()-visitStart)/1000));line=Math.floor(elapsed*1000/settings.interval)%lines.length;writeTitle(`${lines[line]} · ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`);delay=1000;}
    else if(settings.effect==='scroll'){const cycle=[...letters,' ',' ',' ',' '],offset=position%cycle.length;writeTitle([...cycle.slice(offset),...cycle.slice(0,offset)].join(''));position++;if(position>=cycle.length){position=0;line++;}delay=settings.speed*1.8;}
    else{position=Math.min(letters.length,position+1);writeTitle(letters.slice(0,position).join('')+(position<letters.length?'▏':''));if(position>=letters.length){delay=settings.interval;line++;position=0;}}
    titleTimer=win.setTimeout(updateTitle,delay);
  }
  function releaseInert(){for(const [node,value]of savedInert){node.inert=value.inert;if(value.aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',value.aria);}savedInert.clear();}
  function showEntry(){
    if(!config?.enterScreen.enabled)return;
    if(gateTimer)win.clearTimeout(gateTimer);gateTimer=0;entered=false;gate.hidden=false;gate.dataset.entered='false';scope.classList.add('profile-entry-active');
    const targets=preview?[panel.closest('.profile-effects-boundary')||panel]:[...doc.querySelectorAll('.page--profile > .profile,.page--profile > .back-link,.page--profile > .media-controls')];
    for(const node of targets){if(!savedInert.has(node))savedInert.set(node,{inert:!!node.inert,aria:node.getAttribute('aria-hidden')});node.inert=true;node.setAttribute('aria-hidden','true');}
    if(video){video.dataset.entryBlocked='true';video.pause();video.dispatchEvent(new win.Event('ascendo:background'));}suspendWidgetPlayers(panel);stopTitle();if(!preview)enterButton.focus({preventScroll:true});
  }
  function enter({quiet=false}={}){
    if(!gated())return;entered=true;gate.dataset.entered='true';scope.classList.remove('profile-entry-active');releaseInert();resumeWidgetPlayers(panel);
    if(video){video.dataset.entryBlocked='false';if(!quiet)video.muted=video.volume===0;video.dispatchEvent(new win.Event('ascendo:background'));if(video.profileMusicPlayer)video.profileMusicPlayer.start(!quiet);else if(preview&&video.getAttribute('src'))video.play().catch(()=>{});}
    panel.dispatchEvent(new win.CustomEvent('ascendo:enter-profile',{bubbles:true}));
    if(!quiet&&config.enterScreen.soundEnabled)audio.play(config.enterScreen.sound,config.enterScreen.volume);
    if(!preview){const heading=panel.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
    gateTimer=win.setTimeout(()=>{gate.hidden=true;gateTimer=0;},reduced.matches?0:320);updateTitle();
  }
  enterButton.addEventListener('click',()=>enter(),{signal:abort.signal});
  gate.addEventListener('keydown',event=>{if(event.key==='Escape'&&!preview){event.preventDefault();enter({quiet:true});}if(event.key==='Tab'&&!preview){event.preventDefault();enterButton.focus();}},{signal:abort.signal});
  function update(next){
    if(doc.documentElement.dataset.profileCapture==='true')next={...next,enterScreen:{...next.enterScreen,enabled:false},pageTitle:{...next.pageTitle,enabled:false}};
    const previous=config;config=next;const key=JSON.stringify(next.enterScreen);
    first.textContent=next.enterScreen.title||'Click to enter';second.textContent=next.enterScreen.subtitle;second.hidden=!next.enterScreen.subtitle;gate.style.setProperty('--entry-display-font',panel.style.getPropertyValue('--display-font'));gate.style.setProperty('--entry-body-font',panel.style.getPropertyValue('--body-font'));
    if(!next.enterScreen.enabled){const wasGated=!entered;entered=true;gate.hidden=true;scope.classList.remove('profile-entry-active');releaseInert();if(wasGated){audio.stop();resumeWidgetPlayers(panel);}if(video){video.dataset.entryBlocked='false';if(wasGated&&!preview)video.dispatchEvent(new win.Event('ascendo:background'));}}
    else if(!previous?.enterScreen.enabled||preview&&key!==entryKey)showEntry();entryKey=key;
    if(gated())suspendWidgetPlayers(panel);
    const nextTitle=JSON.stringify([next.name,next.pageTitle]);if(nextTitle!==titleKey){line=position=0;titleKey=nextTitle;updateTitle();}
  }
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){stopTitle();audio.stop();}else updateTitle();},{signal:abort.signal});
  reduced.addEventListener('change',updateTitle,{signal:abort.signal});
  win.addEventListener('pagehide',event=>{suspended=true;stopTitle();audio.stop();suspendWidgetPlayers(panel);if(!event.persisted)destroy();},{signal:abort.signal});
  win.addEventListener('pageshow',()=>{if(suspended){suspended=false;if(!gated())resumeWidgetPlayers(panel);updateTitle();}},{signal:abort.signal});
  function destroy(){if(destroyed)return;destroyed=true;abort.abort();stopTitle();if(gateTimer)win.clearTimeout(gateTimer);audio.destroy();releaseInert();scope.classList.remove('profile-entry-active');if(video)video.dataset.entryBlocked='false';gate.remove();chip?.remove();if(!preview&&config)doc.title=defaultTitle();}
  return {update,isGated:gated,enter,replayEntry:showEntry,replayTitle(){line=position=0;updateTitle();},previewSound(sound,volume){return audio.play(sound,volume);},destroy};
}
