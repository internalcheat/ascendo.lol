import assert from 'node:assert/strict';
import {test} from 'node:test';

class Element extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.attributes = {};
    this.hidden = true;
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
    this.value = '';
  }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  remove() { this.removed = true; }
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const video = (id, title, isShort = false) => ({id: String(id).padStart(11, '0'), title, isShort});

async function withPage(videos, run, {firstFetchFails = false} = {}) {
  const keys = ['document', 'window', 'sessionStorage', 'location', 'fetch'];
  const saved = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const elements = Object.fromEntries(['randomButton', 'includeShorts', 'videoCategory', 'status', 'playerRegion', 'playerMount'].map(id => [id, new Element()]));
  elements.videoCategory.value = 'all';
  const instances = [];
  const head = new Element();
  let fetches = 0;
  class Player {
    constructor(iframe, {events}) {
      this.iframe = iframe;
      this.events = events;
      this.destroyed = false;
      instances.push(this);
      queueMicrotask(() => events.onReady({target: this}));
    }
    playVideo() {}
    destroy() { this.destroyed = true; }
    error(code) { this.events.onError({data: code}); }
  }
  try {
    globalThis.document = {getElementById: id => elements[id], createElement: () => new Element(), head};
    globalThis.window = {YT: {Player, PlayerState: {PLAYING: 1, CUED: 5}}};
    globalThis.sessionStorage = {getItem: () => '', setItem() {}};
    globalThis.location = {origin: 'https://ascendo.lol'};
    globalThis.fetch = async () => {
      fetches++;
      if (firstFetchFails && fetches === 1) throw new Error('Offline');
      return {ok: true, json: async () => ({schemaVersion: 1, channelId: 'UCrR-9qug_zHoiBBGTXGP2Hw', videos})};
    };
    await import(`../randomff/app.mjs?ui=${Date.now()}-${Math.random()}`);
    await flush();
    await run({elements, instances, head, fetches: () => fetches});
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}
const currentId = instances => new URL(instances.at(-1).iframe.src).pathname.split('/').at(-1);

test('category filtering preserves the player, confines retries and prevents consecutive repeats', async () => {
  const videos = [video(1, 'College Scavenger Hunt'), video(2, 'College Scavenger Hunt 2'), video(3, 'Omegle Last Man Standing')];
  const collegeIds = new Set(videos.slice(0, 2).map(item => item.id));
  await withPage(videos, async ({elements, instances, head, fetches}) => {
    const category = elements.videoCategory;
    assert.equal(category.value, 'all');
    assert.equal(category.disabled, false);
    assert.equal(fetches(), 1);
    assert.equal(head.children.length, 0, 'Populating categories does not load YouTube.');
    assert.match(category.children.find(option => option.value === 'college-scavenger-hunt').textContent, /\(2\)$/);
    category.value = 'college-scavenger-hunt';
    category.dispatchEvent(new Event('change'));
    assert.equal(instances.length, 0, 'Changing categories never autoplays.');
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.ok(collegeIds.has(currentId(instances)));
    const first = currentId(instances);
    instances.at(-1).error(100);
    await flush();
    assert.ok(collegeIds.has(currentId(instances)), 'Unavailable retry remains in the chosen category.');
    assert.notEqual(currentId(instances), first);
    const previous = instances.at(-1);
    category.value = 'omegle-last-man-standing';
    category.dispatchEvent(new Event('change'));
    assert.equal(previous.destroyed, false, 'Changing filters keeps the current video playing.');
    assert.equal(instances.length, 2);
    previous.error(100);
    await flush();
    assert.equal(instances.length, 2, 'A late error cannot retry the old category after filters change.');
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(currentId(instances), videos[2].id);
    assert.equal(previous.destroyed, true);
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(instances.length, 3, 'A singleton category never repeats the current video.');
    assert.match(elements.status.textContent, /one matching video/);
    assert.equal(elements.randomButton.disabled, false);
  });
});

test('Shorts update category counts without silently changing a selected category', async () => {
  const videos = [video(1, 'College Scavenger Hunt', true), video(2, 'Omegle Last Man Standing')];
  await withPage(videos, async ({elements, instances}) => {
    const category = elements.videoCategory;
    assert.equal(category.children.find(option => option.value === 'college-scavenger-hunt').disabled, true);
    elements.includeShorts.checked = true;
    elements.includeShorts.dispatchEvent(new Event('change'));
    assert.equal(category.children.find(option => option.value === 'college-scavenger-hunt').disabled, false);
    category.value = 'college-scavenger-hunt';
    category.dispatchEvent(new Event('change'));
    elements.includeShorts.checked = false;
    elements.includeShorts.dispatchEvent(new Event('change'));
    assert.equal(category.value, 'college-scavenger-hunt');
    assert.equal(category.children.find(option => option.value === 'college-scavenger-hunt').disabled, true);
    assert.match(elements.status.textContent, /No videos match/);
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(instances.length, 0, 'An empty category never falls back to unrelated videos.');
    assert.equal(elements.randomButton.disabled, false);
    elements.includeShorts.checked = true;
    elements.includeShorts.dispatchEvent(new Event('change'));
    assert.equal(elements.status.textContent, '');
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(currentId(instances), videos[0].id);
    elements.includeShorts.checked = false;
    elements.includeShorts.dispatchEvent(new Event('change'));
    instances.at(-1).events.onStateChange({data: 1});
    assert.match(elements.status.textContent, /No videos match/, 'Late player events cannot clear an empty-filter status.');
  });
});

test('a failed initial category request is recoverable from the main button', async () => {
  await withPage([video(1, 'College Scavenger Hunt'), video(2, 'College Scavenger Hunt 2')], async ({elements, instances, fetches}) => {
    assert.match(elements.status.textContent, /Could not load categories/);
    assert.equal(elements.randomButton.disabled, false);
    elements.randomButton.dispatchEvent(new Event('click'));
    await flush();
    assert.equal(fetches(), 2);
    assert.equal(instances.length, 1);
    assert.equal(elements.videoCategory.disabled, false);
    assert.ok(elements.videoCategory.children.some(option => option.value === 'college-scavenger-hunt'));
    assert.equal(elements.status.textContent, '');
  }, {firstFetchFails: true});
});
