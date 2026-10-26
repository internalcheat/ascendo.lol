import {build} from 'esbuild';
await build({entryPoints:['qr-source.mjs'],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:'vendor/qr.mjs',legalComments:'linked'});
