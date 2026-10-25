import {build} from 'esbuild';
import fs from 'node:fs/promises';
const entries=['antigravity','ballpit','beams','dither','crt-warp','grid-distortion','grid-scan','lightfall','line-waves','plasma-wave','topography'];
const result=await build({entryPoints:Object.fromEntries(entries.map(id=>[id,`background-islands/${id}.jsx`])),bundle:true,splitting:true,minify:true,format:'esm',target:'es2022',jsx:'automatic',outdir:'vendor/backgrounds',outExtension:{'.js':'.mjs'},chunkNames:'shared-[hash]',define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked',metafile:true});
await fs.writeFile('vendor/backgrounds/BUILD.json',JSON.stringify({entries,outputs:Object.keys(result.metafile.outputs)},null,2)+'\n');
const outputs=new Set(Object.keys(result.metafile.outputs));
for(const name of await fs.readdir('vendor/backgrounds'))if(/^shared-[A-Z0-9]+\.mjs(?:\.LEGAL\.txt)?$/.test(name)&&!outputs.has(`vendor/backgrounds/${name}`))await fs.unlink(`vendor/backgrounds/${name}`);
