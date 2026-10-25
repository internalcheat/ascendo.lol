function frameLength(bytes,offset){
  const a=bytes[offset],b=bytes[offset+1],c=bytes[offset+2];if(a!==255||(b&224)!==224||(b&6)!==2)return 0;
  const version=(b>>3)&3,bitrateIndex=c>>4,rateIndex=(c>>2)&3;if(version===1||bitrateIndex===0||bitrateIndex===15||rateIndex===3)return 0;
  const rate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4),bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex]*1000;
  return Math.floor((version===3?144:72)*bitrate/rate)+((c>>1)&1);
}
export function mp3Frames(bytes){for(let offset=0;offset<Math.min(4096,bytes.length-4);offset++){const length=frameLength(bytes,offset);if(length&&offset+length+4<=bytes.length&&frameLength(bytes,offset+length))return true;}return false;}
async function range(source,start,end){const response=await fetch(source,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(10000)});if(response.status!==206)throw Error('Range unavailable');return new Uint8Array(await response.arrayBuffer());}
export async function verifyMp3(source,size){
  const header=await range(source,0,Math.min(size-1,15));let offset=0;
  if(header[0]===73&&header[1]===68&&header[2]===51){if(header.length<10||header.slice(6,10).some(value=>value>127))return false;offset=10+header.slice(6,10).reduce((sum,value)=>sum*128+value,0)+(header[5]&16?10:0);}
  if(offset+8>=size)return false;
  return mp3Frames(await range(source,offset,Math.min(size-1,offset+8191)));
}
