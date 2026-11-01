import {Chess} from './game.mjs?v=20261101-1';

export function moveSound(previous,next){
  if(!previous||previous.room!==next.room||previous.side!==next.side||previous.state.round!==next.state.round)return null;
  const before=previous.state,after=next.state;
  if(before.status!=='active'||after.moves.length!==before.moves.length+1||!before.moves.every((m,i)=>m===after.moves[i]))return null;
  try{
    const engine=new Chess(before.fen),move=engine.move(after.moves.at(-1));
    if(engine.fen()!==after.fen)return null;
    return engine.inCheck()?'check':move.captured?'capture':'move';
  }catch{return null;}
}

export function noiseBuffer(context){
  const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.24),context.sampleRate),data=buffer.getChannelData(0);let seed=731;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  return buffer;
}

// Original, short cues generated locally. No audio files, fetches or timers.
export function createCue(context,kind,buffer,done=()=>{}){
  if(!['move','capture','check'].includes(kind))return null;
  const at=context.currentTime+.002,duration=kind==='check'?.22:kind==='capture'?.12:.075;
  const nodes=[],sources=[];let stopped=false;
  const gain=(peak,end)=>{
    const g=context.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+.003);g.gain.exponentialRampToValueAtTime(.0001,at+end-.004);g.gain.setValueAtTime(0,at+end);g.connect(context.destination);nodes.push(g);return g;
  };
  const tap=context.createBufferSource(),filter=context.createBiquadFilter();tap.buffer=buffer;filter.type='bandpass';filter.frequency.value=kind==='capture'?1450:2300;filter.Q.value=.65;tap.connect(filter);filter.connect(gain(kind==='check'?.035:kind==='capture'?.14:.095,Math.min(duration,.065)));nodes.push(tap,filter);sources.push(tap);
  const tone=(frequency,endFrequency,peak,type='sine')=>{
    const o=context.createOscillator();o.type=type;o.frequency.setValueAtTime(frequency,at);o.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);o.connect(gain(peak,duration));nodes.push(o);sources.push(o);
  };
  if(kind==='check'){tone(660,655,.065);tone(990,985,.025);}else tone(kind==='capture'?180:510,kind==='capture'?75:220,kind==='capture'?.095:.055);
  const clean=()=>{if(stopped)return;stopped=true;for(const n of nodes)n.disconnect();done();};
  tap.onended=clean;for(const source of sources){source.start(at);source.stop(at+duration);}
  return {stop(){if(stopped)return;for(const source of sources)try{source.stop();}catch{}clean();}};
}

export class ChessSounds {
  constructor({contextFactory=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C({latencyHint:'interactive'}):null;},visible=()=>!globalThis.document?.hidden,now=()=>performance.now()}={}){
    Object.assign(this,{contextFactory,visible,now});this.context=null;this.buffer=null;this.voices=new Set();this.resuming=null;this.epoch=0;this.closed=false;
  }
  unlock(){
    if(this.closed||!this.visible())return;
    try{if(!this.context||this.context.state==='closed'){this.context=this.contextFactory();this.buffer=this.context?noiseBuffer(this.context):null;}this.resume();}catch{try{void this.context?.close().catch(()=>{});}catch{}this.context=null;this.buffer=null;}
  }
  resume(){
    if(this.closed||!this.context||!this.visible()||this.context.state==='running'||this.resuming)return;
    try{const context=this.context,task=Promise.resolve(context.resume()).then(()=>{if((this.closed||!this.visible())&&context.state==='running')return context.suspend();}).catch(()=>{});this.resuming=task;void task.finally(()=>{if(this.resuming===task)this.resuming=null;});}catch{}
  }
  play(kind){
    if(this.closed||!this.context||!this.visible()||!['move','capture','check'].includes(kind))return;
    const epoch=this.epoch,requested=this.now();
    const render=()=>{
      if(this.closed||epoch!==this.epoch||!this.visible()||this.context?.state!=='running'||this.now()-requested>200)return;
      try{
        if(this.voices.size>=2)this.voices.values().next().value.stop();
        let voice;voice=createCue(this.context,kind,this.buffer,()=>this.voices.delete(voice));if(voice)this.voices.add(voice);
      }catch{}
    };
    if(this.context.state==='running')render();else if(this.resuming)void this.resuming.then(render);
  }
  suspend(){this.epoch++;for(const voice of [...this.voices])voice.stop();if(this.context?.state==='running')try{void this.context.suspend().catch(()=>{});}catch{}}
  dispose(){this.closed=true;this.suspend();try{void this.context?.close().catch(()=>{});}catch{}this.context=null;this.buffer=null;}
}
