import { colorize, generate, nearestLegacyColor } from './format.mjs?v=20261116-1';

const STORAGE_KEY = 'ascendo-forge-v1';
const TOOLS = {
  gradient: { title: 'Gradient text', text: 'Ascendo', format: 'minimessage' },
  motd: { title: 'Server MOTD', text: 'Ascendo Network\nSurvival · Creative', format: 'motd' },
  item: { title: 'Item names', text: 'Eclipse Blade', format: 'json' },
  chat: { title: 'Chat messages', text: 'Welcome to Ascendo.', format: 'minimessage' },
};
const PALETTES = {
  purple: ['#a855f7', '#ec4899'], aurora: ['#34d399', '#818cf8'],
  sunset: ['#fb923c', '#f472b6'], ice: ['#38bdf8', '#c4b5fd'], ember: ['#fbbf24', '#ef4444'],
};
const FORMATS = {
  minimessage: ['MiniMessage', 'For plugins that support Adventure MiniMessage.'],
  legacy: ['Legacy RGB (&x)', 'For plugins that accept &x RGB codes. Vanilla chat does not.'],
  json: ['Text component JSON', 'For compatible tools and plugins. Not a /give command.'],
  motd: ['server.properties', 'Replace the motd= line, then restart. Uses the 16 classic colors.'],
};
const $ = id => document.getElementById(id);
const field = $('text-input');
const output = $('output');
const preview = $('preview-text');
const styles = ['bold', 'italic', 'underlined', 'strikethrough'];
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
let tool = 'gradient';
let drafts = {};
let copyTimer;
let currentOutput = '';

function defaults(name) {
  return { text: TOOLS[name].text, colors: [...PALETTES.purple], mode: 'gradient', format: TOOLS[name].format, bold: false, italic: false, underlined: false, strikethrough: false };
}
function cleanColor(value) {
  const color = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null;
}
function normalize(candidate, name) {
  const result = defaults(name);
  if (!candidate || typeof candidate !== 'object') return result;
  if (typeof candidate.text === 'string') result.text = candidate.text.replace(/\r\n?/g, '\n').replace(/\0/g, '').slice(0, 240);
  if (Array.isArray(candidate.colors) && candidate.colors.length === 2 && candidate.colors.every(cleanColor)) result.colors = candidate.colors.map(cleanColor);
  if (candidate.mode === 'solid') result.mode = 'solid';
  if (Object.hasOwn(FORMATS, candidate.format) && (candidate.format !== 'motd' || name === 'motd')) result.format = candidate.format;
  for (const key of styles) result[key] = candidate[key] === true;
  return result;
}
function announce(message) { $('status').textContent = message; }
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tool, drafts })); } catch { /* The tools also work with browser storage blocked. */ }
}
function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.length < 20000) {
      const saved = JSON.parse(raw);
      if (Object.hasOwn(TOOLS, saved?.tool)) tool = saved.tool;
      for (const name of Object.keys(TOOLS)) if (saved?.drafts?.[name]) drafts[name] = normalize(saved.drafts[name], name);
    }
  } catch { /* Invalid or unavailable local state falls back to defaults. */ }
  if (location.hash.startsWith('#forge=')) {
    try {
      if (location.hash.length > 6000) throw new Error('too long');
      const shared = JSON.parse(decodeURIComponent(location.hash.slice(7)));
      if (!Object.hasOwn(TOOLS, shared?.tool)) throw new Error('unknown tool');
      tool = shared.tool;
      drafts[tool] = normalize(shared.settings, tool);
      announce('Design loaded.');
    } catch { announce('That design link could not be opened. Your local draft is still available.'); }
  }
}
function state() { return drafts[tool] ??= defaults(tool); }
function syncControls() {
  const value = state();
  document.documentElement.dataset.tool = tool;
  for (const button of document.querySelectorAll('button[data-tool]')) button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
  $('tool-title').textContent = TOOLS[tool].title;
  field.value = value.text;
  field.rows = tool === 'motd' ? 4 : 3;
  $('mode').value = value.mode;
  const formatSelect = $('format');
  formatSelect.replaceChildren();
  for (const [key, [label]] of Object.entries(FORMATS)) {
    if (key === 'motd' && tool !== 'motd') continue;
    const option = document.createElement('option');
    option.value = key; option.textContent = label; formatSelect.append(option);
  }
  formatSelect.value = value.format;
  for (const button of document.querySelectorAll('[data-style]')) button.setAttribute('aria-pressed', String(value[button.dataset.style]));
  syncColors();
  render();
}
function syncColors() {
  const value = state();
  ['start', 'end'].forEach((key, i) => {
    $(`color-${key}`).value = value.colors[i];
    $(`color-${key}-value`).value = value.colors[i].toUpperCase();
    $(`color-${key}-value`).setCustomValidity('');
    $(`color-${key}-value`).setAttribute('aria-invalid', 'false');
  });
  for (const button of document.querySelectorAll('[data-preset]')) {
    const colors = PALETTES[button.dataset.preset];
    button.setAttribute('aria-pressed', String(colors?.every((color, i) => color === value.colors[i])));
  }
}
function render() {
  const value = state();
  const count = segmenter ? [...segmenter.segment(value.text)].length : [...value.text].length;
  $('character-count').textContent = `${count} character${count === 1 ? '' : 's'} · 240 max`;
  const lineError = tool === 'motd' && value.text.split('\n').length > 2 ? 'A server MOTD can have at most two lines.' : tool === 'item' && value.text.includes('\n') ? 'Use a single line for an item name.' : '';
  field.setCustomValidity(lineError);
  field.setAttribute('aria-invalid', String(Boolean(lineError)));
  field.setAttribute('aria-describedby', lineError ? 'character-count compatibility' : 'character-count');
  const empty = !value.text.trim();
  $('empty-preview').hidden = !empty;
  preview.hidden = empty;
  preview.setAttribute('role', 'img');
  preview.setAttribute('aria-label', `Formatted preview: ${value.text}`);
  preview.replaceChildren();
  preview.style.fontWeight = value.bold ? '700' : '400';
  preview.style.fontStyle = value.italic ? 'italic' : 'normal';
  preview.style.textDecoration = [value.underlined && 'underline', value.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none';
  for (const piece of colorize(value.text, value.colors, value.mode)) {
    const span = document.createElement('span');
    span.textContent = piece.text;
    span.style.color = value.format === 'motd' ? nearestLegacyColor(piece.color).color : piece.color;
    preview.append(span);
  }
  $('compatibility').textContent = lineError || FORMATS[value.format][1];
  $('compatibility').classList.toggle('is-error', Boolean(lineError));
  currentOutput = empty || lineError ? '' : generate(value);
  output.value = currentOutput;
  $('copy-output').disabled = !currentOutput;
  $('download-output').disabled = !currentOutput;
  if ($('share-link')) $('share-link').disabled = empty || Boolean(lineError);
  $('color-end').disabled = value.mode === 'solid';
  $('color-end-value').disabled = value.mode === 'solid';
  $('swap-colors').disabled = value.mode === 'solid';
  $('copy-label').textContent = 'Copy';
  clearTimeout(copyTimer);
  persist();
}
function removeSharedHash() {
  if (location.hash.startsWith('#forge=')) history.replaceState(null, '', `${location.pathname}${location.search}`);
}
function update() { removeSharedHash(); render(); }
async function copyText(value) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; } } catch { /* Try the selected-text fallback below. */ }
  const active = document.activeElement;
  const helper = document.createElement('textarea');
  helper.value = value; helper.style.cssText = 'position:fixed;left:-9999px;top:0';
  helper.setAttribute('readonly', ''); document.body.append(helper); helper.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Display manual copy instructions. */ }
  helper.remove(); active?.focus({ preventScroll: true }); return copied;
}
for (const button of document.querySelectorAll('button[data-tool]')) button.addEventListener('click', () => {
  if (!Object.hasOwn(TOOLS, button.dataset.tool) || tool === button.dataset.tool) return;
  tool = button.dataset.tool; removeSharedHash(); syncControls(); announce(`${TOOLS[tool].title} selected.`);
});
field.addEventListener('input', () => { state().text = field.value.replace(/\r\n?/g, '\n').slice(0, 240); update(); });
for (const [i, key] of ['start', 'end'].entries()) {
  $(`color-${key}`).addEventListener('input', event => { state().colors[i] = event.target.value; syncColors(); update(); });
  $(`color-${key}-value`).addEventListener('input', event => {
    const color = cleanColor(event.target.value);
    event.target.setCustomValidity(color ? '' : 'Enter a six-digit hex color, such as #A855F7.');
    event.target.setAttribute('aria-invalid', String(!color));
    if (color) { state().colors[i] = color; $(`color-${key}`).value = color; update(); }
  });
  $(`color-${key}-value`).addEventListener('blur', event => {
    if (!cleanColor(event.target.value)) { announce('Invalid color. Your last valid color has been kept.'); syncColors(); }
  });
}
$('swap-colors').addEventListener('click', () => { state().colors.reverse(); syncColors(); update(); announce('Gradient colors swapped.'); });
for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
  if (!PALETTES[button.dataset.preset]) return;
  state().colors = [...PALETTES[button.dataset.preset]]; state().mode = 'gradient';
  $('mode').value = 'gradient'; syncColors(); update();
});
for (const button of document.querySelectorAll('[data-style]')) button.addEventListener('click', () => {
  const key = button.dataset.style;
  if (!styles.includes(key)) return;
  state()[key] = !state()[key]; button.setAttribute('aria-pressed', String(state()[key])); update();
});
$('mode').addEventListener('change', event => { state().mode = event.target.value; update(); });
$('format').addEventListener('change', event => { state().format = event.target.value; update(); });
$('reset-tool').addEventListener('click', () => { drafts[tool] = defaults(tool); removeSharedHash(); syncControls(); announce('This tool has been reset.'); });
$('copy-output').addEventListener('click', async () => {
  if (!currentOutput) return;
  const copied = await copyText(currentOutput);
  $('copy-label').textContent = copied ? 'Copied!' : 'Select & copy';
  if (!copied) { output.focus(); output.select(); }
  announce(copied ? 'Output copied to your clipboard.' : 'Clipboard unavailable. Output selected; press Ctrl+C or use your device’s Copy action.');
  copyTimer = setTimeout(() => { $('copy-label').textContent = 'Copy'; }, 2000);
});
$('download-output').addEventListener('click', () => {
  if (!currentOutput) return;
  const extension = state().format === 'json' ? 'json' : state().format === 'motd' ? 'properties' : 'txt';
  const url = URL.createObjectURL(new Blob([currentOutput], { type: extension === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ascendo-${tool}.${extension}`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Your output has been downloaded.');
});
$('share-link')?.addEventListener('click', async () => {
  const payload = encodeURIComponent(JSON.stringify({ tool, settings: state() }));
  const url = `${location.origin}${location.pathname}#forge=${payload}`;
  const copied = await copyText(url);
  announce(copied ? 'Design link copied. Anyone with the link can open this text and its style.' : 'Clipboard unavailable. The design link is now in your address bar; copy it to share.');
  if (!copied) history.replaceState(null, '', `#forge=${payload}`);
});
window.addEventListener('hashchange', () => { restore(); syncControls(); });
restore(); syncControls();
