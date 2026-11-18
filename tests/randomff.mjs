import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseCatalogue, randomIndex, selectVideo} from '../randomff/selection.mjs';

const channelId = 'UCrR-9qug_zHoiBBGTXGP2Hw';
const fixture = Array.from({length: 244}, (_, index) => ({id: String(index).padStart(11, '0'), title: `Video ${index}`, isShort: index >= 115}));
const source = (...values) => ({getRandomValues(word) { assert.ok(values.length, 'Random source exhausted.'); word[0] = values.shift(); return word; }});

test('uniform selection reaches every entry in the complete catalogue and excludes Shorts by default', () => {
  for (let index = 0; index < fixture.length; index++) {
    assert.equal(selectVideo(fixture, {includeShorts: true, source: source(index)}).id, fixture[index].id);
  }
  for (let index = 0; index < 115; index++) {
    const video = selectVideo(fixture, {source: source(index)});
    assert.equal(video.id, fixture[index].id);
    assert.equal(video.isShort, false);
  }
});

test('rejection sampling rejects the biased uint32 tail', () => {
  assert.equal(randomIndex(3, source(4294967295, 4294967294)), 2);
  assert.equal(randomIndex(1, source(4294967295)), 0);
  assert.equal(randomIndex(2 ** 32, source(4294967295)), 4294967295);
  for (const length of [0, -1, NaN, Infinity, 1.5, 2 ** 32 + 1]) assert.throws(() => randomIndex(length), RangeError);
  assert.throws(() => randomIndex(2, {}), /unavailable/);
});

test('previous videos and unavailable videos are excluded without breaking the Shorts filter', () => {
  const previousId = fixture[0].id;
  const excluded = new Set(fixture.slice(1, 114).map(video => video.id));
  assert.equal(selectVideo(fixture, {previousId, excluded, source: source(0)}).id, fixture[114].id);
  excluded.add(fixture[114].id);
  assert.equal(selectVideo(fixture, {previousId, excluded}), null);
  assert.equal(selectVideo(fixture, {previousId, excluded, includeShorts: true, source: source(0)}).id, fixture[115].id);
  assert.equal(selectVideo([fixture[0]], {previousId}), null);
  let last = '';
  for (let index = 0; index < 100; index++) {
    const video = selectVideo(fixture, {previousId: last, source: source(0)});
    assert.notEqual(video.id, last);
    last = video.id;
  }
});

test('catalogue parsing validates its format, removes malformed rows, and never renders titles as HTML', () => {
  const values = parseCatalogue({schemaVersion: 1, channelId, videos: [
    fixture[0], fixture[0], {id: '../invalid', isShort: false}, {id: fixture[1].id},
    {...fixture[2], title: '<img onerror="alert(1)">'}
  ]});
  assert.equal(values.length, 2);
  assert.equal(values[1].title, '<img onerror="alert(1)">');
  for (const value of [null, {}, {schemaVersion: 2, channelId, videos: fixture}, {schemaVersion: 1, channelId: 'wrong', videos: fixture}, {schemaVersion: 1, channelId, videos: []}]) {
    assert.throws(() => parseCatalogue(value));
  }
});

// Exercise the browser controller without loading YouTube or making network requests.
class Element extends EventTarget {
  constructor() { super(); this.children = []; this.attributes = {}; this.hidden = true; this.checked = false; this.disabled = false; this.textContent = ''; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  remove() { this.removed = true; }
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('controller retries unavailable videos, preserves browser errors, prevents repeats and defaults Shorts off', async () => {
  const savedGlobals = Object.fromEntries(['document', 'window', 'sessionStorage', 'location', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const elements = Object.fromEntries(['randomButton', 'includeShorts', 'videoCategory', 'status', 'playerRegion', 'playerMount'].map(id => [id, new Element()]));
  const instances = [];
  const storage = new Map([['ascendo-randomff-last-video', fixture[0].id]]);
  let fetches = 0;
  class Player {
    constructor(iframe, {events}) {
      this.iframe = iframe; this.events = events; this.destroyed = false;
      instances.push(this);
      queueMicrotask(() => events.onReady({target: this}));
    }
    playVideo() {}
    destroy() { this.destroyed = true; }
    error(code) { this.events.onError({data: code}); }
  }
  try {
    globalThis.document = {getElementById: id => elements[id], createElement: () => new Element(), head: new Element()};
    globalThis.window = {YT: {Player, PlayerState: {PLAYING: 1, CUED: 5}}};
    globalThis.sessionStorage = {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)};
    globalThis.location = {origin: 'https://ascendo.lol'};
    globalThis.fetch = async () => { fetches++; return {ok: true, json: async () => ({schemaVersion: 1, channelId, videos: fixture})}; };
    await import(`../randomff/app.mjs?test=${Date.now()}`);
    assert.equal(fetches, 1, 'The small catalogue loads immediately to populate categories.');
    assert.equal(elements.includeShorts.checked, false);
    elements.randomButton.dispatchEvent(new Event('click'));
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(fetches, 1);
    assert.equal(instances.length, 1, 'Rapid clicks create one request.');
    const first = new URL(instances[0].iframe.src).pathname.split('/').at(-1);
    assert.notEqual(first, fixture[0].id, 'The previous session selection is excluded.');
    assert.ok(fixture.find(video => video.id === first && !video.isShort));
    assert.equal(instances[0].iframe.referrerPolicy, 'strict-origin-when-cross-origin');
    assert.equal(new URL(instances[0].iframe.src).searchParams.get('origin'), 'https://ascendo.lol');
    instances[0].error(100);
    await flush();
    assert.equal(instances.length, 2);
    assert.equal(instances[0].destroyed, true);
    const replacement = new URL(instances[1].iframe.src).pathname.split('/').at(-1);
    assert.notEqual(replacement, first);
    assert.notEqual(replacement, fixture[0].id);
    instances[0].error(150);
    assert.equal(instances.length, 2, 'Stale player errors are ignored.');
    instances[1].error(153);
    await flush();
    assert.equal(instances.length, 2, 'Configuration errors do not discard videos.');
    assert.equal(elements.randomButton.disabled, false);
    assert.match(elements.status.textContent, /could not play/);
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(instances.length, 3);
    assert.notEqual(new URL(instances[2].iframe.src).pathname.split('/').at(-1), replacement);
    assert.equal(fetches, 1, 'The full catalogue is reused between selections.');
    for (let retry = 0; retry < 5; retry++) { instances.at(-1).error(101); await flush(); }
    assert.equal(instances.length, 7, 'Unavailable retries stop after five candidates.');
    assert.equal(elements.randomButton.disabled, false);
    assert.match(elements.status.textContent, /unavailable/);
  } finally {
    for (const [key, descriptor] of Object.entries(savedGlobals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
