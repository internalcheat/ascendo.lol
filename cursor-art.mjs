// Arrow adapted from Lucide, ISC: see vendor/lucide-cursors/LICENSE.txt and SOURCE.json.
import {CURSOR_PACKS,CURSOR_IDS} from './cursor-packs.mjs?v=20261027-5';
import {preparedCursorPair} from './cursor-pack-runtime.mjs?v=20261027-5';
export const CURSOR_STYLES=Object.freeze(['arrow','dot','ring','crosshair']);
const arrow='<path transform="translate(-2 -2) scale(1.35)" d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>';
const hand='<path d="M11 15V5a2 2 0 0 1 4 0v7-1a2 2 0 0 1 4 0v2-1a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v5c0 5-3 9-8 9h-2c-2 0-3-1-4.5-2.5L6 19a2 2 0 0 1 3-2.6l3 3.1"/>';
const shapes=Object.freeze({arrow,dot:'<circle cx="16" cy="16" r="4.5"/>',ring:'<circle cx="16" cy="16" r="9.5" fill="none"/><circle cx="16" cy="16" r="1.35" stroke="none"/>',crosshair:'<path d="M16 5v6m0 10v6M5 16h6m10 0h6" fill="none"/><circle cx="16" cy="16" r="1.4" stroke="none"/>'});
function valid(config){if(!CURSOR_IDS.includes(config.style)||!/^#[0-9a-f]{6}$/i.test(config.color)||!Number.isFinite(config.size)||config.size<12||config.size>40)throw Error('Invalid native cursor.');}
export function cursorSvg(config,{pointer=false,size=Math.round(config.size)}={}){
 valid(config);const shape=pointer?hand:shapes[config.style]||arrow;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><g stroke-linecap="round" stroke-linejoin="round"><g fill="${config.color}" stroke="#090a10" stroke-width="3.8">${shape}</g><g fill="${config.color}" stroke="#f7f7ff" stroke-width="1.35">${shape}</g></g></svg>`;
}
export function nativeCursor(config,{pointer=false}={}){
 if(Object.hasOwn(CURSOR_PACKS,config.style)){valid(config);const pair=preparedCursorPair(config);if(pair)return pair[pointer?'pointer':'cursor'];return nativeCursor({...config,style:'arrow'},{pointer});}
 valid(config);const size=Math.round(config.size),[x,y]=pointer?[13,4]:config.style==='arrow'?[3.45,3.45]:[16,16];
 return `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(config,{pointer}))}") ${Math.round(x*size/32)} ${Math.round(y*size/32)}, ${pointer?'pointer':'auto'}`;
}
export const cursorImage=config=>CURSOR_PACKS[config.style]?.cursor.path||'data:image/svg+xml,'+encodeURIComponent(cursorSvg(config,{size:48}));
