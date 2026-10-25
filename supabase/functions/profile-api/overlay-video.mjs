function boxes(bytes,start=0,end=bytes.length) {
  const result=[],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let offset=start;offset+8<=end;){
    let size=view.getUint32(offset),header=8;
    if(size===1){if(offset+16>end)return [];size=view.getUint32(offset+8)*4294967296+view.getUint32(offset+12);header=16;}
    if(size===0)size=end-offset;
    if(!Number.isSafeInteger(size)||size<header||offset+size>end)return [];
    const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));result.push({type,start:offset+header,end:offset+size});offset+=size;
  }
  return result;
}

export function hasH264Track(bytes) {
  const moov=boxes(bytes).find(box=>box.type==='moov');if(!moov)return false;
  let count=0;
  for(const track of boxes(bytes,moov.start,moov.end).filter(box=>box.type==='trak')){
    const media=boxes(bytes,track.start,track.end).find(box=>box.type==='mdia');if(!media)continue;
    const children=boxes(bytes,media.start,media.end),handler=children.find(box=>box.type==='hdlr');
    if(!handler||handler.end-handler.start<12||String.fromCharCode(...bytes.subarray(handler.start+8,handler.start+12))!=='vide')continue;
    const information=children.find(box=>box.type==='minf');if(!information)return false;
    const table=boxes(bytes,information.start,information.end).find(box=>box.type==='stbl');if(!table)return false;
    const descriptions=boxes(bytes,table.start,table.end).find(box=>box.type==='stsd');if(!descriptions||descriptions.end-descriptions.start<8)return false;
    const codecs=boxes(bytes,descriptions.start+8,descriptions.end);if(!codecs.length||codecs.some(box=>!['avc1','avc3'].includes(box.type)))return false;count++;
  }
  return count>0;
}

export async function verifyOverlayVideo(url,total) {
  async function read(offset,length){
    const response=await fetch(url,{headers:{Range:`bytes=${offset}-${Math.min(total-1,offset+length-1)}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok||response.status!==206&&offset!==0)throw new Error('Cannot inspect this MP4.');
    const reader=response.body.getReader(),chunks=[];let used=0;
    try{while(used<length){const part=await reader.read();if(part.done)break;const bytes=part.value.subarray(0,length-used);chunks.push(bytes);used+=bytes.length;}}finally{await reader.cancel();}
    const result=new Uint8Array(used);let target=0;for(const chunk of chunks){result.set(chunk,target);target+=chunk.length;}return result;
  }
  let offset=0;
  for(let index=0;index<48&&offset+8<=total;index++){
    const header=await read(offset,16);if(header.length<8)return false;const view=new DataView(header.buffer,header.byteOffset,header.byteLength);let size=view.getUint32(0),headerSize=8;
    if(size===1){if(header.length<16)return false;size=view.getUint32(8)*4294967296+view.getUint32(12);headerSize=16;}
    if(size===0)size=total-offset;
    if(!Number.isSafeInteger(size)||size<headerSize||offset+size>total)return false;
    if(String.fromCharCode(...header.subarray(4,8))==='moov'){if(size>2_000_000)return false;return hasH264Track(await read(offset,size));}
    offset+=size;
  }
  return false;
}
