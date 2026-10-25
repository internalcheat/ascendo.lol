import {ENTRY_SOUNDS} from './feature-schema.mjs?v=20261025-11';
export function createEntryAudio(win){
  let audio;
  function stop(){audio?.pause();if(audio)try{audio.currentTime=0;}catch{}}
  return {async play(sound,volume=50){if(!Object.hasOwn(ENTRY_SOUNDS,sound)||volume<=0)return false;stop();audio ||= new win.Audio();audio.preload='none';const source=`/assets/entry-sounds/${sound}.wav`;if(audio.getAttribute('src')!==source)audio.src=source;audio.volume=Math.min(1,Math.max(0,volume/100));try{await audio.play();return true;}catch{return false;}},stop,destroy(){stop();if(audio){audio.removeAttribute('src');audio.load();audio=undefined;}}};
}
