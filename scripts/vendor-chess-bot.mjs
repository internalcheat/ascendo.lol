import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='chess/vendor/stockfish';
const files=[
 ['stockfish-19-lite-single.js','https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.js','ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a'],
 ['stockfish-19-lite-single.wasm','https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.wasm','ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de'],
 ['Copying.txt','https://unpkg.com/stockfish@19.0.1/Copying.txt','0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b'],
 ['stockfish-19.0.1-source.tar.gz','https://codeload.github.com/nmrugg/stockfish.js/tar.gz/0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6','e5289a920554bf0069a6601c228e81d957c00522bb31c4343588dc5d7d251879'],
 ['nn-61e7af4bb97d.nnue','https://data.stockfishchess.org/nn/nn-61e7af4bb97d.nnue','61e7af4bb97d51eeeb25d322916f86513b5cd3a827ce189c98c6e31946f99e5b']
];
fs.mkdirSync(root,{recursive:true});
const manifest=await Promise.all(files.map(async([name,url,sha256])=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Download failed: ${name}`);
 const data=Buffer.from(await response.arrayBuffer()),actual=createHash('sha256').update(data).digest('hex');
 if(actual!==sha256)throw Error(`Integrity mismatch: ${name} ${actual}`);
 fs.writeFileSync(`${root}/${name}`,data);return {name,url,sha256,bytes:data.length};
}));
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({package:'stockfish',version:'19.0.1',sourceCommit:'0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6',files:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest.map(({name,bytes})=>({name,bytes}))));
