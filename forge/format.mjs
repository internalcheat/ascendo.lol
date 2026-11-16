// Format references:
// https://docs.papermc.io/adventure/minimessage/format/
// https://docs.papermc.io/adventure/serializer/legacy/
// https://docs.papermc.io/adventure/serializer/json/
// https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Properties.html
// JSON output is a component for compatible serializers, not a version-specific command.

export const MAX_TEXT_LENGTH = 500;
const DEFAULT_COLORS = ['#b88cff', '#6ce1ff'];
const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

export const LEGACY_COLORS = Object.freeze([
  ['0', '#000000'], ['1', '#0000aa'], ['2', '#00aa00'], ['3', '#00aaaa'],
  ['4', '#aa0000'], ['5', '#aa00aa'], ['6', '#ffaa00'], ['7', '#aaaaaa'],
  ['8', '#555555'], ['9', '#5555ff'], ['a', '#55ff55'], ['b', '#55ffff'],
  ['c', '#ff5555'], ['d', '#ff55ff'], ['e', '#ffff55'], ['f', '#ffffff'],
].map(([code, color]) => Object.freeze({ code, color })));

function normalizeColor(color) {
  if (typeof color !== 'string') return null;
  const value = color.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(value)) return value;
  if (/^#[\da-f]{3}$/.test(value)) {
    return `#${[...value.slice(1)].map(character => character.repeat(2)).join('')}`;
  }
  return null;
}

function normalizeColors(colors) {
  if (!Array.isArray(colors)) return DEFAULT_COLORS;
  const valid = colors.slice(0, 8).map(normalizeColor).filter(Boolean);
  return valid.length ? valid : DEFAULT_COLORS;
}

function segments(text) {
  if (typeof text !== 'string') return [];
  // Bound work before Unicode segmentation as well as bounding the output.
  let value = text.slice(0, 16384).replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (typeof value.toWellFormed === 'function') value = value.toWellFormed();
  return (graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), part => part.segment)
    : Array.from(value)).slice(0, MAX_TEXT_LENGTH);
}

function rgb(hex) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

function interpolate(colors, progress) {
  const position = Math.max(0, Math.min(1, progress)) * (colors.length - 1);
  const start = Math.min(Math.floor(position), colors.length - 1);
  const end = Math.min(start + 1, colors.length - 1);
  const fraction = position - start;
  const from = rgb(colors[start]);
  const to = rgb(colors[end]);
  return `#${from.map((channel, index) => Math.round(channel + (to[index] - channel) * fraction)
    .toString(16).padStart(2, '0')).join('')}`;
}

/** Returns one entry per grapheme. Newlines do not consume a gradient step. */
export function colorize(text = '', colors = DEFAULT_COLORS, mode = 'gradient') {
  const parts = segments(text);
  const palette = normalizeColors(colors);
  const steps = parts.filter(part => part !== '\n').length;
  let step = 0;
  return parts.map(part => {
    const progress = steps > 1 ? Math.min(step, steps - 1) / (steps - 1) : 0;
    const color = mode === 'solid' ? palette[0] : interpolate(palette, progress);
    if (part !== '\n') step++;
    return { text: part, color };
  });
}

/** MOTDs use the nearest of Java's 16 legacy colors, rather than RGB codes. */
export function nearestLegacyColor(color) {
  const channels = rgb(normalizeColor(color) || DEFAULT_COLORS[0]);
  let nearest = LEGACY_COLORS[0];
  let distance = Infinity;
  for (const candidate of LEGACY_COLORS) {
    const candidateChannels = rgb(candidate.color);
    const squaredDistance = channels.reduce((sum, channel, index) =>
      sum + (channel - candidateChannels[index]) ** 2, 0);
    if (squaredDistance < distance) {
      distance = squaredDistance;
      nearest = candidate;
    }
  }
  return nearest;
}

function runs(tokens) {
  const result = [];
  for (const token of tokens) {
    const previous = result[result.length - 1];
    if (previous && previous.color === token.color) previous.text += token.text;
    else result.push({ ...token });
  }
  return result;
}

function escapeMiniMessage(text) {
  return text.replace(/\\/g, '\\\\').replace(/</g, '\\<');
}

function miniMessage(tokens, decorations) {
  const enabled = Object.entries(decorations).filter(([, value]) => value).map(([key]) => key);
  return enabled.map(name => `<${name}>`).join('')
    + runs(tokens).map(token => `<${token.color}>${escapeMiniMessage(token.text)}</${token.color}>`).join('')
    + [...enabled].reverse().map(name => `</${name}>`).join('');
}

function styleCodes(decorations, marker) {
  return [['bold', 'l'], ['italic', 'o'], ['underlined', 'n'], ['strikethrough', 'm']]
    .filter(([name]) => decorations[name]).map(([, code]) => `${marker}${code}`).join('');
}

function legacy(tokens, decorations) {
  const style = styleCodes(decorations, '&');
  // A color code resets legacy decorations, so re-apply them after every color.
  // Per-grapheme colors also keep literal user '&a' sequences from forming codes.
  return tokens.map(token => token.text === '\n' ? '\n'
    : `&x${[...token.color.slice(1)].map(digit => `&${digit}`).join('')}${style}${token.text}`)
    .join('') + '&r';
}

function escapeProperties(text) {
  let result = '';
  // Escape UTF-16 code units, including surrogate pairs, for Java Properties readers.
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const code = text.charCodeAt(index);
    if (character === '\\') result += '\\\\';
    else if (character === '\n') result += '\\n';
    else if (character === '\t') result += '\\t';
    else if (code < 0x20 || code > 0x7e) result += `\\u${code.toString(16).padStart(4, '0')}`;
    else result += character;
  }
  return result;
}

function motd(tokens, decorations) {
  const marker = '\\u00A7';
  const style = styleCodes(decorations, marker);
  return 'motd=' + tokens.map(token => token.text === '\n' ? '\\n'
    : `${marker}${nearestLegacyColor(token.color).code}${style}${escapeProperties(token.text)}`)
    .join('') + `${marker}r`;
}

/** Generates literal text only; user-supplied tags, events, or commands are never parsed. */
export function generate(options = {}) {
  const tokens = colorize(options.text, options.colors, options.mode);
  if (!tokens.length) return '';
  const decorations = {
    bold: options.bold === true,
    italic: options.italic === true,
    underlined: options.underlined === true,
    strikethrough: options.strikethrough === true,
  };
  switch (options.format) {
    case 'legacy': return legacy(tokens, decorations);
    case 'motd': return motd(tokens, decorations);
    case 'json': return JSON.stringify({ text: '', ...decorations, extra: runs(tokens) });
    default: return miniMessage(tokens, decorations);
  }
}
