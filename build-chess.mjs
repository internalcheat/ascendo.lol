import {build} from 'esbuild';
import fs from 'node:fs';
await Promise.all(['chess','realtime'].map(name=>build({entryPoints:[`chess/${name==='chess'?'engine':name}-source.mjs`],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:`chess/vendor/${name}.mjs`,legalComments:'linked'})));
const licenses=['chess.js','@supabase/realtime-js','@supabase/phoenix','tslib'].map(name=>{
 const base=`node_modules/${name}`,file=['LICENSE','LICENSE.txt','LICENSE.md'].find(n=>fs.existsSync(`${base}/${n}`));
 if(!file)throw Error(`Missing ${name} license`);
 return `${name} ${JSON.parse(fs.readFileSync(`${base}/package.json`,'utf8')).version}\n${fs.readFileSync(`${base}/${file}`,'utf8')}`;
});
fs.writeFileSync('chess/vendor/LICENSES.txt',licenses.join('\n\n---\n\n'));
