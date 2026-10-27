import { normalizeVisual } from './visual-schema.mjs?v=20261027-1';
import {BACKGROUNDS} from './background-presets.mjs?v=20261025-15';

export const EFFECTS = ['none', 'glow', 'glitch', 'shimmer', 'typewriter', 'pulse', 'aurora', 'wave', 'float'];
export const ICONS = ['instagram', 'discord', 'youtube', 'tiktok', 'github', 'minecraft', 'twitch', 'x', 'spotify', 'website'];
export const MAX_VIDEO = 50_000_000;
export const MAX_IMAGE = 5_000_000;
export const MAX_AUDIO = 50_000_000;
export const OWNER_QUOTA = 250_000_000;

function text(value, limit, label, optional = false) {
  if (typeof value !== 'string' || value.length > limit || (!optional && !value.trim())) throw new Error(`Check ${label} (${limit} characters maximum).`);
  return value.trim();
}

export function safeUrl(value, optional = true) {
  const input = text(value ?? '', 2048, 'URL', optional);
  if (!input && optional) return '';
  let parsed;
  try { parsed = new URL(input); } catch { throw new Error('Use a complete HTTPS URL.'); }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !host.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.includes(':') || /\.(local|internal|localhost)$/.test(host)) throw new Error('Use a public HTTPS address without embedded credentials.');
  return parsed.href;
}

export function mediaUrl(value, kind) {
  const url = safeUrl(value);
  if (!url) return '';
  const host = new URL(url).hostname;
  if (kind === 'video' && /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)$/.test(host)) throw new Error('Use a direct MP4 file URL, not a social-media webpage.');
  return url;
}

function number(value, minimum, maximum, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`Check ${label}.`);
  return value;
}

function group(value, label, keys) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`Check ${label}.`);
  return value;
}

function boolean(value, fallback, label) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`Check ${label}.`);
  return value;
}

function choice(value, values, fallback, label) {
  if (value === undefined) return fallback;
  if (!values.includes(value)) throw new Error(`Choose a supported ${label}.`);
  return value;
}

export function normalizeEffects(input, accent) {
  const cursor = group(input.cursorEffects, 'custom cursor', ['enabled','style','color','size','trail','trailLength','trailSmoothness','clickEffect']);
  const card = group(input.cardEffects, 'interactive card', ['enabled','tilt','parallax','glow','intensity','speed']);
  const entrance = group(input.entranceEffects, 'animated entrance', ['enabled','style','direction','duration','distance','zoom','stagger']);
  const color = cursor.color === undefined ? accent : cursor.color;
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a valid cursor color.');
  const trailLength = number(cursor.trailLength === undefined ? 8 : cursor.trailLength, 4, 12, 'trail length');
  if (!Number.isInteger(trailLength)) throw new Error('Check trail length.');
  return {
    cursorEffects: {
      enabled: boolean(cursor.enabled, false, 'custom cursor'),
      style: choice(cursor.style, ['arrow','dot','ring','crosshair'], 'arrow', 'cursor style'),
      color: color.toLowerCase(), size: number(cursor.size === undefined ? 24 : cursor.size, 12, 40, 'cursor size'),
      trail: boolean(cursor.trail, false, 'cursor trail'), trailLength,
      trailSmoothness: number(cursor.trailSmoothness === undefined ? 55 : cursor.trailSmoothness, 0, 100, 'trail smoothness'),
      clickEffect: choice(cursor.clickEffect, ['none','ripple','sparks'], 'none', 'click effect')
    },
    cardEffects: {
      enabled: boolean(card.enabled, false, 'interactive card'),
      tilt: boolean(card.tilt, true, 'card tilt'), parallax: boolean(card.parallax, true, 'card parallax'),
      glow: boolean(card.glow, true, 'card glow'), intensity: number(card.intensity === undefined ? 35 : card.intensity, 0, 100, 'card intensity'),
      speed: number(card.speed === undefined ? 1 : card.speed, .5, 2, 'card response speed')
    },
    entranceEffects: {
      enabled: boolean(entrance.enabled, false, 'animated entrance'),
      style: choice(entrance.style, ['fade','slide','zoom','stagger'], 'fade', 'entrance style'),
      direction: choice(entrance.direction, ['up','down','left','right'], 'up', 'slide direction'),
      duration: number(entrance.duration === undefined ? 600 : entrance.duration, 250, 1200, 'entrance duration'),
      distance: number(entrance.distance === undefined ? 16 : entrance.distance, 0, 32, 'entrance distance'),
      zoom: number(entrance.zoom === undefined ? 4 : entrance.zoom, 0, 8, 'entrance zoom'),
      stagger: number(entrance.stagger === undefined ? 60 : entrance.stagger, 0, 120, 'stagger gap')
    }
  };
}

export function normalizeProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid profile.');
  if (!EFFECTS.includes(input.effect)) throw new Error('Choose a supported name effect.');
  if (!/^#[0-9a-f]{6}$/i.test(input.accent)) throw new Error('Choose a valid accent color.');
  if (!['black', 'image', 'video', 'preset'].includes(input.background?.kind)) throw new Error('Choose a background type.');
  if (input.background.kind === 'preset' && !Object.hasOwn(BACKGROUNDS,input.background.preset)) throw new Error('Choose a supported background preset.');
  const music=group(input.music,'music',['source','url','volume']);
  const socials = input.socials;
  if (!Array.isArray(socials) || socials.length > 16) throw new Error('Use no more than 16 social rows.');
  const result = {
    name: text(input.name, 40, 'display name'),
    bio: text(input.bio ?? '', 1200, 'bio', true),
    badge: text(input.badge ?? '', 32, 'badge', true),
    accent: input.accent.toLowerCase(),
    glow: number(input.glow, 0, 100, 'glow'),
    opacity: number(input.opacity, 25, 95, 'card opacity'),
    effect: input.effect,
    effectSpeed: number(input.effectSpeed ?? 100, 50, 200, 'animation speed'),
    effectStrength: number(input.effectStrength ?? 65, 0, 100, 'effect strength'),
    ...normalizeEffects(input, input.accent),
    ...normalizeVisual(input, input.accent),
    avatar: { url: mediaUrl(input.avatar?.url, 'image'), poster: mediaUrl(input.avatar?.poster ?? '', 'image'), x: number(input.avatar?.x, 0, 100, 'avatar crop'), y: number(input.avatar?.y, 0, 100, 'avatar crop') },
    background: { kind: input.background.kind, ...(input.background.kind === 'preset' ? {preset:input.background.preset} : {}), url: mediaUrl(input.background.url, input.background.kind), mobile: mediaUrl(input.background.mobile ?? '', 'video'), poster: mediaUrl(input.background.poster ?? '', 'image') },
    music:{source:choice(music.source,['video','mp3'],'video','music source'),url:mediaUrl(music.url??'','audio'),volume:number(music.volume??65,0,70,'music volume')},
    soundtrack: { title: text(input.soundtrack?.title ?? '', 100, 'song title', true), artist: text(input.soundtrack?.artist ?? '', 140, 'artist', true) },
    socials: socials.map(row => {
      if (!row || !ICONS.includes(row.icon) || !['link', 'copy'].includes(row.action)) throw new Error('Choose a supported social action and icon.');
      return { icon: row.icon, label: text(row.label, 40, 'social label'), handle: text(row.handle, 100, 'social handle'), action: row.action, value: row.action === 'link' ? safeUrl(row.value, false) : text(row.value, 200, 'copy value') };
    })
  };
  if (!['black','preset'].includes(result.background.kind) && !result.background.url) throw new Error('Choose a background file or direct URL.');
  if (!result.avatar.url) throw new Error('Choose an avatar.');
  return result;
}

export function profileMedia(profile) {
  return [...new Set([profile.avatar.url, profile.avatar.poster, profile.background.url, profile.background.mobile, profile.background.poster, profile.music?.url, profile.overlays?.media?.url, profile.overlays?.media?.poster].filter(Boolean))];
}
