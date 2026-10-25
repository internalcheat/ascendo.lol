import {BACKGROUNDS} from './background-presets.mjs?v=20261025-15';
export {BACKGROUNDS};
export const backgroundPoster=id=>id==='flux-lines'?'/assets/flux-lines-poster.webp':`/assets/background-presets/${id}.webp`;
export const backgroundStyle=id=>id==='flux-lines'?'/vendor/flux-lines.css?v=20261025-9':id==='ballpit'?'':`/vendor/backgrounds/${id}.css?v=20261025-15`;
export const loadBackground=id=>id==='flux-lines'?import('./vendor/flux-lines.mjs?v=20261025-9'):Object.hasOwn(BACKGROUNDS,id)?import(`./vendor/backgrounds/${id}.mjs?v=20261025-15`):Promise.reject(Error('Unsupported background'));
