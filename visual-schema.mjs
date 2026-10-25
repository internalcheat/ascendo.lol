import {FONTS} from './font-catalog.mjs?v=20261025-11';
import {normalizeFeatureSettings,FEATURE_GROUPS} from './feature-schema.mjs?v=20261025-11';
export {FONTS};
export const TEXT_SIZES = Object.freeze({ name:[24,72,50,'Display name'], badge:[10,20,10,'Cosmetic badge'], bio:[12,24,14,'Bio and its links'], socialLabel:[10,20,12,'Social platform label'], socialHandle:[12,26,15,'Social handle / link text'], songTitle:[12,24,12,'Soundtrack title'], songArtist:[10,20,10,'Soundtrack artist'], songMeta:[9,16,9,'Soundtrack labels and timing'] });
export const LAYOUTS = ['classic','crest','portrait','bento','magazine','deck','stack','wall','spine','collage','flow','numbers'];
export const TILED_LAYOUTS=['bento','magazine','stack','wall','spine','collage','flow','numbers'];
export const isTiledLayout=layout=>TILED_LAYOUTS.includes(layout);
export const layoutWidth=layout=>({portrait:720,bento:960,magazine:1040,deck:760,stack:560,wall:1120,spine:920,collage:1040,flow:760,numbers:900}[layout]||460);
export const OVERLAY_PRESETS = ['snow','rain','petals','embers','stars','fireflies','dust','bubbles','confetti','sparkles','meteors','matrix','aurora','ripples','fireworks'];
export const VISUAL_GROUPS = ['colorTheme','themeColors','typography','cardLayout','electricBorder','overlays',...FEATURE_GROUPS];
export const MEDIA_ORIGIN = 'https://fstdttaxflayhtwhnbih.supabase.co/storage/v1/object/public/profile-media/';

function object(value, keys, label) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key=>!keys.includes(key))) throw new Error(`Check ${label}.`);
  return value;
}
function numeric(value, fallback, minimum, maximum, label) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`Check ${label}.`);
  return value;
}
function flag(value, fallback, label) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`Check ${label}.`);
  return value;
}
function select(value, fallback, choices, label) {
  if (value === undefined) return fallback;
  if (!choices.includes(value)) throw new Error(`Choose a supported ${label}.`);
  return value;
}
function color(value, fallback, label) {
  if (value === undefined) return fallback.toLowerCase();
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Choose a valid ${label} color.`);
  return value.toLowerCase();
}
function uploaded(value) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !value.startsWith(MEDIA_ORIGIN) || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4)$/.test(value.slice(MEDIA_ORIGIN.length))) throw new Error('Custom overlays must use your uploaded media.');
  return value;
}

export function normalizeVisual(input, accent) {
  const themeColors=object(input.themeColors,['primary','secondary'],'theme colors');
  const typography = object(input.typography,['display','body','sizes'],'typography');
  const sizes = object(typography.sizes,Object.keys(TEXT_SIZES),'text sizes');
  const electric = object(input.electricBorder,['enabled','color','intensity','speed','card','panels','avatar'],'electric border');
  const overlays = object(input.overlays,['enabled','layers','media'],'overlays');
  const media = object(overlays.media,['enabled','kind','url','poster','fit','opacity','key'],'overlay media');
  const key = object(media.key,['enabled','color','tolerance','softness'],'green-screen removal');
  const layers = overlays.layers === undefined ? [] : overlays.layers;
  if (!Array.isArray(layers) || layers.length > 3) throw new Error('Use up to three built-in overlay layers.');
  const ids = new Set();
  const selectedLayers=layers.length===0&&overlays.enabled===true&&media.enabled!==true?[{preset:'snow'}]:layers;
  const normalizedLayers = selectedLayers.map(layer=>{
    const item = object(layer,['preset','enabled','opacity','density','speed','colorMode','color'],'overlay layer');
    const preset = select(item.preset,'',OVERLAY_PRESETS,'overlay preset');
    if (!preset || ids.has(preset)) throw new Error('Choose distinct overlay presets.');
    ids.add(preset);
    return { preset, enabled:flag(item.enabled,true,'overlay layer'), opacity:numeric(item.opacity,35,0,100,'overlay opacity'), density:numeric(item.density,35,0,100,'overlay density'), speed:numeric(item.speed,1,.25,2,'overlay speed'), colorMode:select(item.colorMode,'original',['original','accent','custom'],'overlay color mode'), color:color(item.color,accent,'overlay') };
  });
  const url = uploaded(media.url), poster = uploaded(media.poster);
  const kind = select(media.kind,'image',['image','video'],'overlay media type');
  if (url && (kind === 'video') !== url.endsWith('.mp4')) throw new Error('Overlay media type does not match the file.');
  if (poster.endsWith('.mp4')) throw new Error('Choose an image for the overlay still fallback.');
  return {
    ...normalizeFeatureSettings(input),
    colorTheme:select(input.colorTheme,'original',['original','monochrome','custom'],'profile color theme'),
    themeColors:{primary:color(themeColors.primary,accent,'main theme'),secondary:color(themeColors.secondary,'#8b5cf6','secondary theme')},
    typography:{ display:select(typography.display,'dm-sans',Object.keys(FONTS),'display font'), body:select(typography.body,'dm-sans',Object.keys(FONTS),'body font'), sizes:Object.fromEntries(Object.entries(TEXT_SIZES).map(([id,[minimum,maximum]])=>[id,sizes[id] === null || sizes[id] === undefined ? null : numeric(sizes[id],null,minimum,maximum,'text size')])) },
    cardLayout:select(input.cardLayout,'classic',LAYOUTS,'card layout'),
    electricBorder:{enabled:flag(electric.enabled,false,'electric border'), color:color(electric.color,accent,'electric border'), intensity:numeric(electric.intensity,35,0,100,'electric intensity'), speed:numeric(electric.speed,1,.5,2,'electric speed'), card:flag(electric.card,true,'main card border'), panels:flag(electric.panels,true,'panel borders'), avatar:flag(electric.avatar,true,'avatar border')},
    overlays:{enabled:flag(overlays.enabled,false,'overlays'), layers:normalizedLayers, media:{ enabled:flag(media.enabled,false,'custom overlay'), kind,url,poster,fit:select(media.fit,'contain',['contain','cover'],'overlay fit'),opacity:numeric(media.opacity,35,0,100,'media opacity'), key:{enabled:flag(key.enabled,false,'green-screen removal'),color:color(key.color,'#00ff00','key'),tolerance:numeric(key.tolerance,25,0,100,'key tolerance'),softness:numeric(key.softness,10,1,50,'key softness')} }}
  };
}

export function preserveVisualGroups(submitted, current) {
  const result = { ...submitted };
  for (const group of [...VISUAL_GROUPS,'cursorEffects','cardEffects','entranceEffects']) if (!Object.hasOwn(result,group) && Object.hasOwn(current,group)) result[group] = current[group];
  return result;
}
