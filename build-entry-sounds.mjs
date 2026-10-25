import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const rate=44100,tau=Math.PI*2;
const sounds={chime:.8,glass:.72,pulse:.56,spark:.38,sweep:.8,click:.16};
const records=[];await fs.mkdir('assets/entry-sounds',{recursive:true});
for(const [name,duration]of Object.entries(sounds)){
  let seed=917341,filtered=0;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1;};
  const samples=new Float64Array(Math.ceil(rate*duration));
  for(let index=0;index<samples.length;index++){
    const time=index/rate,attack=1-Math.exp(-time/.004),release=Math.min(1,(duration-time)/.025);let value;
    if(name==='chime')value=Math.sin(tau*659*time)*Math.exp(-time*5)+.5*Math.sin(tau*988*time)*Math.exp(-time*7)+.25*Math.sin(tau*1318*time)*Math.exp(-time*9);
    else if(name==='glass')value=Math.sin(tau*1046*time)*Math.exp(-time*7)+.45*Math.sin(tau*1673*time)*Math.exp(-time*10)+.22*Math.sin(tau*2461*time)*Math.exp(-time*14);
    else if(name==='pulse')value=Math.sin(tau*(120*time+24*(1-Math.exp(-time*10))/10))*Math.exp(-time*7)+.12*Math.sin(tau*360*time)*Math.exp(-time*13);
    else if(name==='spark')value=(Math.sin(tau*(880*time+2200*time*time))+.3*Math.sin(tau*2800*time))*Math.exp(-time*12);
    else if(name==='sweep'){filtered+=(.015+time*.12)*(noise()-filtered);value=(filtered*3+.18*Math.sin(tau*(260*time+200*time*time)))*Math.sin(Math.PI*time/duration)*Math.exp(-time*2);}
    else value=(.65*Math.sin(tau*1600*time)+noise()*.2)*Math.exp(-time*45);
    samples[index]=value*attack*Math.max(0,release);
  }
  const peak=samples.reduce((max,value)=>Math.max(max,Math.abs(value)),.001),buffer=Buffer.alloc(44+samples.length*2);buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
  samples.forEach((value,index)=>buffer.writeInt16LE(Math.round(value/peak*.62*32767),44+index*2));
  const file=name+'.wav';await fs.writeFile('assets/entry-sounds/'+file,buffer);records.push({file,duration,rate,channels:1,peak:.62,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')});
}
await fs.writeFile('assets/entry-sounds/SOURCES.json',JSON.stringify({author:'Ascendo',method:'Original deterministic oscillator and filtered-noise synthesis; no sampled recordings.',files:records},null,2)+'\n');
console.log('Generated six original entry sounds.');
