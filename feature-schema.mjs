export const ENTRY_SOUNDS=Object.freeze({chime:'Soft Chime',glass:'Glass Bell',pulse:'Deep Pulse',spark:'Digital Spark',sweep:'Air Sweep',click:'Soft Click'});
export const FEATURE_GROUPS=['soundtrackCard','enterScreen','pageTitle','widgets'];
const object=(value,keys,label)=>{if(value===undefined)return {};if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error(`Check ${label}.`);return value;};
const flag=(value,fallback,label)=>{if(value===undefined)return fallback;if(typeof value!=='boolean')throw Error(`Check ${label}.`);return value;};
const numeric=(value,fallback,min,max,label)=>{if(value===undefined)return fallback;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`Check ${label}.`);return value;};
const text=(value,fallback,max,label)=>{if(value===undefined)return fallback;if(typeof value!=='string'||value.length>max)throw Error(`Check ${label} (${max} characters maximum).`);return value.trim();};
const choice=(value,fallback,values,label)=>{if(value===undefined)return fallback;if(!values.includes(value))throw Error(`Choose a supported ${label}.`);return value;};

export function parseEmbedUrl(value){
  if(!value)return null;
  if(typeof value!=='string'||value.length>2048)throw Error('Use a supported media link.');
  let url;try{url=new URL(value);}catch{throw Error('Paste a complete HTTPS media link.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Use an HTTPS media link without embedded credentials.');
  const host=url.hostname.toLowerCase().replace(/^www\./,''),path=url.pathname;
  let match;
  if(host==='open.spotify.com'&&(match=path.match(/^\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist)\/([a-zA-Z0-9]{22})\/?$/)))return {provider:'spotify',kind:match[1],id:match[2],url:`https://open.spotify.com/${match[1]}/${match[2]}`};
  if(['youtube.com','youtube-nocookie.com','youtu.be'].includes(host)){
    const video=host==='youtu.be'?path.slice(1):path.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1]||url.searchParams.get('v');
    if(video&&/^[A-Za-z0-9_-]{11}$/.test(video))return {provider:'youtube',kind:'video',id:video,url:`https://www.youtube.com/watch?v=${video}`};
    const playlist=url.searchParams.get('list');if(playlist&&/^[A-Za-z0-9_-]{10,80}$/.test(playlist))return {provider:'youtube',kind:'playlist',id:playlist,url:`https://www.youtube.com/playlist?list=${playlist}`};
  }
  if(['music.apple.com','embed.music.apple.com'].includes(host)&&(match=path.match(/^\/([a-z]{2})\/(album|playlist|song)\/([^/]+)\/([A-Za-z0-9.-]{1,128})\/?$/))){const track=url.searchParams.get('i');const suffix=track&&/^\d{1,20}$/.test(track)?`?i=${track}`:'';return {provider:'apple',kind:match[2],id:match[4],path:`/${match[1]}/${match[2]}/${match[3]}/${match[4]}${suffix}`,url:`https://music.apple.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}${suffix}`};}
  if(host==='twitch.tv'){
    if((match=path.match(/^\/videos\/(\d{1,20})\/?$/)))return {provider:'twitch',kind:'video',id:match[1],url:`https://www.twitch.tv/videos/${match[1]}`};
    if((match=path.match(/^\/([a-zA-Z0-9_]{3,25})\/?$/)))return {provider:'twitch',kind:'channel',id:match[1].toLowerCase(),url:`https://www.twitch.tv/${match[1].toLowerCase()}`};
  }
  throw Error('Use a Spotify track, album or playlist, Apple Music, YouTube, or Twitch channel/video link.');
}

export function embedSource(media,{showTracks=true,parent='ascendo.lol'}={}){
  if(!media)return '';
  if(media.provider==='spotify')return `https://open.spotify.com/embed/${media.kind}/${media.id}?theme=0`;
  if(media.provider==='apple')return `https://embed.music.apple.com${media.path}`;
  if(media.provider==='youtube')return media.kind==='playlist'?`https://www.youtube-nocookie.com/embed/videoseries?list=${media.id}&autoplay=0`:`https://www.youtube-nocookie.com/embed/${media.id}?autoplay=0&playsinline=1`;
  if(media.provider==='twitch'){const url=new URL('https://player.twitch.tv/');url.searchParams.set(media.kind==='video'?'video':'channel',media.kind==='video'?'v'+media.id:media.id);url.searchParams.set('parent',parent==='www.ascendo.lol'?'www.ascendo.lol':'ascendo.lol');url.searchParams.set('autoplay','false');return url.href;}
  return '';
}

function rows(value,fallback,label){
  if(value===undefined)return fallback;
  if(!Array.isArray(value)||value.length>12)throw Error(`Use up to twelve ${label} fields.`);
  return value.map(row=>{const item=object(row,['label','value','copy'],label);return {label:text(item.label,'',40,'field label'),value:text(item.value,'',240,'field value'),copy:flag(item.copy,false,'copy action')};});
}
export function normalizeFeatureSettings(input){
  const music=object(input.soundtrackCard,['enabled'],'soundtrack card');
  const entry=object(input.enterScreen,['enabled','title','subtitle','soundEnabled','sound','volume'],'enter screen');
  const title=object(input.pageTitle,['enabled','lines','effect','interval','speed'],'page title');
  const widgets=object(input.widgets,['game','hardware','about','embeds'],'widgets');
  const game=object(widgets.game,['enabled','title','game','rows'],'game settings widget'),hardware=object(widgets.hardware,['enabled','title','rows'],'hardware widget'),about=object(widgets.about,['enabled','title','text','rows'],'about me widget'),embeds=object(widgets.embeds,['enabled','items'],'embed widgets');
  const lines=title.lines===undefined?[]:title.lines;if(!Array.isArray(lines)||lines.length>8)throw Error('Use up to eight browser-title lines.');
  const items=embeds.items===undefined?[]:embeds.items;if(!Array.isArray(items)||items.length>6)throw Error('Use up to six embed widgets.');
  const ids=new Set();
  return {
    soundtrackCard:{enabled:flag(music.enabled,false,'soundtrack card')},
    enterScreen:{enabled:flag(entry.enabled,false,'enter screen'),title:text(entry.title,'Click to enter',100,'enter-screen text'),subtitle:text(entry.subtitle,'',180,'second enter-screen line'),soundEnabled:flag(entry.soundEnabled,false,'enter-screen sound'),sound:choice(entry.sound,'chime',Object.keys(ENTRY_SOUNDS),'enter sound'),volume:numeric(entry.volume,50,0,100,'enter-sound volume')},
    pageTitle:{enabled:flag(title.enabled,false,'animated page title'),lines:lines.map(line=>text(line,'',80,'page title')).filter(Boolean),effect:choice(title.effect,'typewriter',['typewriter','scroll','time'],'page-title effect'),interval:numeric(title.interval,3000,1500,10000,'title interval'),speed:numeric(title.speed,100,40,300,'title speed')},
    widgets:{
      game:{enabled:flag(game.enabled,false,'game settings widget'),title:text(game.title,'Game settings',60,'widget title'),game:text(game.game,'',60,'game'),rows:rows(game.rows,[{label:'Sensitivity',value:'',copy:false},{label:'Resolution',value:'',copy:false},{label:'Crosshair',value:'',copy:true}],'game settings')},
      hardware:{enabled:flag(hardware.enabled,false,'hardware widget'),title:text(hardware.title,'Hardware',60,'widget title'),rows:rows(hardware.rows,[{label:'Mouse',value:'',copy:false},{label:'Keyboard',value:'',copy:false},{label:'PC',value:'',copy:false}],'hardware')},
      about:{enabled:flag(about.enabled,false,'about me widget'),title:text(about.title,'About me',60,'widget title'),text:text(about.text,'',1200,'about me'),rows:rows(about.rows,[],'about me')},
      embeds:{enabled:flag(embeds.enabled,false,'embed widgets'),items:items.map(item=>{const value=object(item,['id','enabled','title','url','provider','showTracks'],'embed widget');const id=text(value.id,'',40,'embed identifier');if(!/^[a-z0-9-]{1,40}$/.test(id)||ids.has(id))throw Error('Use unique embed identifiers.');ids.add(id);const raw=text(value.url,'',2048,'embed URL'),media=parseEmbedUrl(raw);if(value.provider!==undefined&&(!['spotify','apple','youtube','twitch',''].includes(value.provider)||media&&value.provider!==media.provider))throw Error('The embed service does not match its link.');return {id,enabled:flag(value.enabled,true,'embed widget'),title:text(value.title,'',80,'embed title'),url:media?.url||'',provider:media?.provider||'',showTracks:flag(value.showTracks,true,'Spotify track list')};})}
    }
  };
}
