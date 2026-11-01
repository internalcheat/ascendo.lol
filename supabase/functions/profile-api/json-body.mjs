// Keep malformed requests out of route handlers. All profile API JSON bodies
// are objects; arrays/primitives must not be mistaken for a service failure.
export async function readJsonObject(request,{limit=80_000,error=(status,message)=>Object.assign(new Error(message),{status})}={}){
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))throw error(415,'Expected JSON.');
 const reader=request.body?.getReader();if(!reader)throw error(400,'Missing request.');
 const chunks=[];let size=0;
 try{
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw error(413,'Request too large.');}chunks.push(part.value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw error(400,'Invalid JSON.');}
 if(!input||typeof input!=='object'||Array.isArray(input))throw error(400,'Expected a JSON object.');
 return input;
}
