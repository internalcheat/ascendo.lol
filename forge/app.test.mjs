import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { normalizeHandle } from '../handle-policy.mjs';
import { profileSlug, publicProfilePath } from '../share-policy.mjs';

const STORAGE_KEY = 'ascendo-forge-v1';
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const nodeTimeout = globalThis.setTimeout;
let fixtureNumber = 0;

async function fixture({ saved, hash = '', clipboardFails = false, fallbackCopy = false, storageFails = false } = {}) {
  const win = new Window({
    url: `https://ascendo.lol/forge/${hash}`,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  win.document.write(html);
  win.document.close();
  if (saved !== undefined) win.localStorage.setItem(STORAGE_KEY, typeof saved === 'string' ? saved : JSON.stringify(saved));
  const copied = [];
  const fallbackCopied = [];
  Object.defineProperty(win.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async value => { if (clipboardFails) throw Error('blocked'); copied.push(value); } },
  });
  win.document.execCommand = command => {
    if (command === 'copy' && fallbackCopy) {
      fallbackCopied.push(win.document.body.lastElementChild.value);
      return true;
    }
    return false;
  };
  const storage = storageFails ? {
    getItem() { throw Error('Storage blocked'); },
    setItem() { throw Error('Storage blocked'); },
  } : win.localStorage;
  const bindings = {
    window: win, document: win.document, navigator: win.navigator,
    location: win.location, history: win.history, localStorage: storage,
    setTimeout: win.setTimeout.bind(win), clearTimeout: win.clearTimeout.bind(win),
  };
  const previous = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  try {
    await import(`./app.mjs?fixture=${++fixtureNumber}`);
  } catch (error) {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await win.happyDOM.close();
    throw error;
  }
  const $ = id => win.document.getElementById(id);
  const change = (id, value, event = 'input') => {
    $(id).value = value;
    $(id).dispatchEvent(new win.Event(event, { bubbles: true }));
  };
  return {
    win, $, copied, fallbackCopied, change,
    tool(name) { win.document.querySelector(`button[data-tool="${name}"]`).click(); },
    style(name) { win.document.querySelector(`button[data-style="${name}"]`).click(); },
    palette(name) { win.document.querySelector(`button[data-preset="${name}"]`).click(); },
    stored() { return win.localStorage.getItem(STORAGE_KEY); },
    async tick() { await new Promise(resolve => nodeTimeout(resolve, 0)); },
    async close() {
      await win.happyDOM.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

test('each of the four tools loads its own useful default, format and preview', async () => {
  const app = await fixture();
  try {
    const expected = {
      gradient: ['Gradient text', 'Ascendo', 'minimessage'],
      motd: ['Server MOTD', 'Ascendo Network\nSurvival · Creative', 'motd'],
      item: ['Item names', 'Eclipse Blade', 'json'],
      chat: ['Chat messages', 'Welcome to Ascendo.', 'minimessage'],
    };
    for (const [tool, [title, text, format]] of Object.entries(expected)) {
      app.tool(tool);
      assert.equal(app.$('tool-title').textContent, title);
      assert.equal(app.$('text-input').value, text);
      assert.equal(app.$('preview-text').textContent, text);
      assert.equal(app.$('format').value, format);
      assert.ok(app.$('output').value.length > 0);
      assert.equal(app.$('copy-output').disabled, false);
      assert.equal(app.win.document.querySelector(`button[data-tool="${tool}"]`).getAttribute('aria-pressed'), 'true');
      if (format === 'motd') assert.ok(app.$('output').value.startsWith('motd='));
      if (format === 'json') assert.equal(JSON.parse(app.$('output').value).extra.map(part => part.text).join(''), text);
    }
  } finally { await app.close(); }
});

test('typing updates preview and output immediately while preserving literal user text', async () => {
  const app = await fixture();
  try {
    const text = '<script data-forge-test="attack">alert(1)</script> 👩🏽‍🚀';
    app.change('text-input', text);
    assert.equal(app.$('preview-text').textContent, text);
    assert.equal(app.$('preview-text').getAttribute('role'), 'img');
    assert.ok(app.$('preview-text').getAttribute('aria-label').endsWith(text), 'The accessible preview label includes the full unsplit text.');
    assert.equal(app.$('preview-text').querySelectorAll('script').length, 0);
    assert.ok(app.$('output').value.includes('\\<'));
    app.change('format', 'json', 'change');
    const output = JSON.parse(app.$('output').value);
    assert.equal(output.extra.map(part => part.text).join(''), text);
    assert.ok(app.$('character-count').textContent.endsWith('240 max'));
  } finally { await app.close(); }
});

test('palette, styles, swapping and solid mode keep controls, preview and output in sync', async () => {
  const app = await fixture();
  try {
    app.palette('aurora');
    assert.equal(app.$('color-start').value, '#34d399');
    assert.equal(app.$('color-end').value, '#818cf8');
    app.style('bold'); app.style('italic'); app.style('underlined');
    assert.equal(app.$('preview-text').style.fontWeight, '700');
    assert.equal(app.$('preview-text').style.fontStyle, 'italic');
    assert.equal(app.$('preview-text').style.textDecoration, 'underline');
    assert.ok(app.$('output').value.startsWith('<bold><italic><underlined>'));
    app.$('swap-colors').click();
    assert.equal(app.$('color-start').value, '#818cf8');
    app.change('mode', 'solid', 'change');
    assert.equal(app.$('color-end').disabled, true);
    assert.equal(app.$('color-end-value').disabled, true);
    assert.equal(app.$('swap-colors').disabled, true);
    assert.equal(new Set([...app.$('preview-text').children].map(span => span.style.color)).size, 1);
    app.palette('sunset');
    assert.equal(app.$('mode').value, 'gradient');
    assert.equal(app.$('color-end').disabled, false);
  } finally { await app.close(); }
});

test('all supported format choices produce distinct usable output and truthful help', async () => {
  const app = await fixture();
  try {
    app.change('text-input', 'Hi');
    app.change('format', 'legacy', 'change');
    assert.ok(app.$('output').value.startsWith('&x'));
    assert.match(app.$('compatibility').textContent, /plugin/i);
    app.change('format', 'json', 'change');
    assert.equal(JSON.parse(app.$('output').value).extra.map(part => part.text).join(''), 'Hi');
    app.change('format', 'minimessage', 'change');
    assert.match(app.$('output').value, /<#/);
    assert.equal([...app.$('format').options].some(option => option.value === 'motd'), false);
    app.tool('motd');
    assert.equal([...app.$('format').options].some(option => option.value === 'motd'), true);
  } finally { await app.close(); }
});

test('a MOTD with more than two lines cannot be copied, shared or downloaded, then recovers', async () => {
  const app = await fixture();
  try {
    app.tool('motd');
    app.change('text-input', 'One\nTwo\nThree');
    assert.equal(app.$('text-input').getAttribute('aria-invalid'), 'true');
    assert.match(app.$('compatibility').textContent, /at most two lines/);
    assert.equal(app.$('output').value, '');
    for (const id of ['copy-output', 'download-output', 'share-link']) assert.equal(app.$(id).disabled, true);
    app.change('text-input', 'One\nTwo');
    assert.equal(app.$('text-input').getAttribute('aria-invalid'), 'false');
    assert.equal(app.$('copy-output').disabled, false);
    assert.ok(app.$('output').value.startsWith('motd='));
    assert.ok(app.$('output').value.includes('\\n'));
  } finally { await app.close(); }
});

test('item names reject extra lines and recover without discarding the user text', async () => {
  const app = await fixture();
  try {
    app.tool('item');
    app.change('text-input', 'Eclipse\nBlade');
    assert.equal(app.$('text-input').value, 'Eclipse\nBlade');
    assert.match(app.$('compatibility').textContent, /single line/);
    assert.equal(app.$('copy-output').disabled, true);
    app.change('text-input', 'Eclipse Blade');
    assert.equal(app.$('copy-output').disabled, false);
    assert.equal(JSON.parse(app.$('output').value).italic, false);
  } finally { await app.close(); }
});

test('empty and whitespace-only drafts expose a clear empty state with disabled exports', async () => {
  const app = await fixture();
  try {
    for (const text of ['', '   \n ']) {
      app.change('text-input', text);
      assert.equal(app.$('empty-preview').hidden, false);
      assert.equal(app.$('preview-text').hidden, true);
      assert.equal(app.$('output').value, '');
      for (const id of ['copy-output', 'download-output', 'share-link']) assert.equal(app.$(id).disabled, true);
    }
    app.change('text-input', 'Back again');
    assert.equal(app.$('empty-preview').hidden, true);
    assert.equal(app.$('preview-text').hidden, false);
    assert.equal(app.$('copy-output').disabled, false);
  } finally { await app.close(); }
});

test('drafts and the selected tool persist across a reload independently', async () => {
  let app = await fixture();
  let saved;
  try {
    app.change('text-input', 'My gradient draft');
    app.style('bold');
    app.tool('chat');
    app.change('text-input', 'My chat draft');
    app.palette('ice');
    saved = app.stored();
  } finally { await app.close(); }
  app = await fixture({ saved });
  try {
    assert.equal(app.$('tool-title').textContent, 'Chat messages');
    assert.equal(app.$('text-input').value, 'My chat draft');
    assert.equal(app.$('color-start').value, '#38bdf8');
    app.tool('gradient');
    assert.equal(app.$('text-input').value, 'My gradient draft');
    assert.equal(app.$('preview-text').style.fontWeight, '700');
  } finally { await app.close(); }
});

test('malformed saved state and invalid shared links fall back safely without losing a good local draft', async () => {
  let app = await fixture({ saved: '{invalid JSON' });
  try { assert.equal(app.$('text-input').value, 'Ascendo'); }
  finally { await app.close(); }
  for (const hash of ['#forge=%E0%A4%A', '#forge=' + encodeURIComponent('{"tool":"__proto__"}'), '#forge=' + 'a'.repeat(6001)]) {
    app = await fixture({ hash, saved: { tool: 'chat', drafts: { chat: { text: 'Kept local draft' } } } });
    try {
      assert.equal(app.$('text-input').value, 'Kept local draft');
      assert.equal(app.$('tool-title').textContent, 'Chat messages');
      assert.match(app.$('status').textContent, /could not be opened/);
    } finally { await app.close(); }
  }
});

test('reset restores only the current tool while preserving the other tool drafts', async () => {
  const app = await fixture();
  try {
    app.change('text-input', 'Keep this gradient'); app.style('bold');
    app.tool('motd'); app.change('text-input', 'Reset this MOTD'); app.palette('ember');
    app.$('reset-tool').click();
    assert.equal(app.$('text-input').value, 'Ascendo Network\nSurvival · Creative');
    assert.equal(app.$('color-start').value, '#a855f7');
    app.tool('gradient');
    assert.equal(app.$('text-input').value, 'Keep this gradient');
    assert.equal(app.$('preview-text').style.fontWeight, '700');
  } finally { await app.close(); }
});

test('copy exports the exact output, and a shared design link round-trips text and settings', async () => {
  let app = await fixture();
  let link;
  try {
    app.tool('item'); app.change('text-input', 'Frost & Fire 🗡'); app.palette('ice'); app.style('bold');
    app.$('copy-output').click(); await app.tick();
    assert.equal(app.copied[0], app.$('output').value);
    assert.equal(app.$('copy-label').textContent, 'Copied!');
    app.$('share-link').click(); await app.tick();
    link = new URL(app.copied.at(-1));
    assert.equal(link.origin, 'https://ascendo.lol');
    assert.equal(link.pathname, '/forge/');
    const payload = JSON.parse(decodeURIComponent(link.hash.slice(7)));
    assert.equal(payload.tool, 'item');
    assert.equal(payload.settings.text, 'Frost & Fire 🗡');
    assert.equal(payload.settings.bold, true);
  } finally { await app.close(); }
  app = await fixture({ hash: link.hash });
  try {
    assert.equal(app.$('tool-title').textContent, 'Item names');
    assert.equal(app.$('text-input').value, 'Frost & Fire 🗡');
    assert.equal(app.$('color-start').value, '#38bdf8');
    assert.equal(app.$('preview-text').style.fontWeight, '700');
    app.change('text-input', 'Edited design');
    assert.equal(app.win.location.hash, '');
  } finally { await app.close(); }
});

test('clicking the preview never switches tools', async () => {
  const app = await fixture();
  try {
    app.tool('motd');
    app.$('preview-text').click();
    assert.equal(app.$('tool-title').textContent, 'Server MOTD');
  } finally { await app.close(); }
});

test('invalid hex input keeps the last valid color and recovers on blur', async () => {
  const app = await fixture();
  try {
    app.change('color-start-value', '#123456');
    assert.equal(app.$('color-start').value, '#123456');
    app.change('color-start-value', '#ZZZZZZ');
    assert.equal(app.$('color-start').value, '#123456');
    assert.equal(app.$('color-start-value').getAttribute('aria-invalid'), 'true');
    app.$('color-start-value').dispatchEvent(new app.win.Event('blur'));
    assert.equal(app.$('color-start-value').value, '#123456');
    assert.equal(app.$('color-start-value').validity.valid, true);
    assert.equal(app.$('color-start-value').getAttribute('aria-invalid'), 'false');
  } finally { await app.close(); }
});

test('blocked browser storage does not prevent creating, editing or switching tools', async () => {
  const app = await fixture({ storageFails: true });
  try {
    app.change('text-input', 'Works without storage');
    app.style('bold');
    assert.equal(app.$('preview-text').textContent, 'Works without storage');
    assert.equal(app.$('copy-output').disabled, false);
    app.tool('item');
    assert.equal(app.$('tool-title').textContent, 'Item names');
    app.tool('gradient');
    assert.equal(app.$('text-input').value, 'Works without storage');
    assert.equal(app.$('preview-text').style.fontWeight, '700');
  } finally { await app.close(); }
});

test('clipboard rejection tries the selected-text fallback without leaking its helper', async () => {
  const app = await fixture({ clipboardFails: true, fallbackCopy: true });
  try {
    const textareaCount = app.win.document.querySelectorAll('textarea').length;
    app.$('copy-output').click(); await app.tick();
    assert.deepEqual(app.fallbackCopied, [app.$('output').value]);
    assert.equal(app.$('copy-label').textContent, 'Copied!');
    assert.equal(app.win.document.querySelectorAll('textarea').length, textareaCount);
  } finally { await app.close(); }
});

test('fully blocked clipboard selects output for manual copying and puts a share link in the address bar', async () => {
  const app = await fixture({ clipboardFails: true });
  try {
    app.change('text-input', 'Copy me manually');
    app.$('copy-output').click(); await app.tick();
    assert.equal(app.$('copy-label').textContent, 'Select & copy');
    assert.equal(app.win.document.activeElement, app.$('output'));
    assert.equal(app.$('output').selectionStart, 0);
    assert.equal(app.$('output').selectionEnd, app.$('output').value.length);
    assert.match(app.$('status').textContent, /Clipboard unavailable/);
    app.$('share-link').click(); await app.tick();
    const payload = JSON.parse(decodeURIComponent(app.win.location.hash.slice(7)));
    assert.equal(payload.settings.text, 'Copy me manually');
    assert.match(app.$('status').textContent, /address bar/);
  } finally { await app.close(); }
});

test('download creates an actual JSON file with the expected filename, MIME and exact output content', async t => {
  const app = await fixture();
  try {
    app.tool('item'); app.change('text-input', 'Downloadable Blade');
    let blob;
    let download;
    t.mock.method(URL, 'createObjectURL', value => { blob = value; return 'blob:forge-download-test'; });
    t.mock.method(URL, 'revokeObjectURL', () => {});
    t.mock.method(app.win.HTMLAnchorElement.prototype, 'click', function () {
      download = { url: this.href, filename: this.download };
    });
    app.$('download-output').click();
    assert.equal(download.url, 'blob:forge-download-test');
    assert.equal(download.filename, 'ascendo-item.json');
    assert.equal(blob.type, 'application/json;charset=utf-8');
    assert.equal(await blob.text(), app.$('output').value);
    assert.equal(JSON.parse(await blob.text()).extra.map(part => part.text).join(''), 'Downloadable Blade');
    assert.match(app.$('status').textContent, /downloaded/);
  } finally { await app.close(); }
});

test('Forge is a reserved static route for invitations, sharing and profile fallback routing', async () => {
  for (const handle of ['forge', 'Forge', ' FORGE ']) assert.throws(() => normalizeHandle(handle), /unavailable/);
  for (const path of ['/forge', '/forge/', '/Forge/']) assert.equal(profileSlug(path), '');
  assert.throws(() => publicProfilePath('forge'), /Invalid profile address/);
  assert.equal(normalizeHandle('new-crafter'), 'new-crafter');
  assert.equal(publicProfilePath('internalcheats'), '/internalcheats/');
  assert.equal(publicProfilePath('szikraaaa'), '/Szikraaaa/');
  const app = await fixture();
  try {
    const { routeHandle } = await import('../route-profile.mjs?forge-reservation-test');
    assert.equal(routeHandle('/forge/'), '');
    assert.equal(routeHandle('/Forge'), '');
    assert.equal(routeHandle('/new-crafter/'), 'new-crafter');
  } finally { await app.close(); }
});
