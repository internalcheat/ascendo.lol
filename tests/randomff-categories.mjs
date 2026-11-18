import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {getVideoCategoryIds, listCategories, matchesCategory} from '../randomff/categories.mjs';

const catalogue = JSON.parse(readFileSync(new URL('../randomff/catalogue.json', import.meta.url), 'utf8')).videos;
const video = (title, isShort = false) => ({title, isShort});

test('every available video is classified or appears exclusively in Other', () => {
  const categories = listCategories(catalogue, {includeShorts: true});
  const ids = new Set(categories.map(category => category.id));
  assert.equal(ids.size, categories.length);
  for (const entry of catalogue) {
    const memberships = getVideoCategoryIds(entry);
    assert.ok(memberships.length, entry.title);
    assert.equal(new Set(memberships).size, memberships.length);
    if (memberships.includes('other')) assert.deepEqual(memberships, ['other']);
    for (const id of memberships) {
      assert.ok(ids.has(id), `${entry.title}: ${id}`);
      assert.equal(matchesCategory(entry, id), true);
    }
    assert.equal(matchesCategory(entry, 'all'), true);
  }
});

test('requested recurring series include original and numbered title variants', () => {
  const series = [
    ['College Scavenger Hunt', 'college-scavenger-hunt', 4],
    ['Omegle Last Man Standing', 'omegle-last-man-standing', 4],
    ['Omegle: Try Not To Laugh', 'omegle-try-not-to-laugh', 1],
    ['Try Not To Laugh: Zoom Meeting', 'zoom-try-not-to-laugh', 2],
  ];
  // Title fixtures do not freeze the live channel's growing video counts.
  for (const [title, id, count] of series) {
    for (let number = 1; number <= count; number++) {
      const entry = video(title + (number === 1 ? '' : ` ${number}`));
      assert.equal(matchesCategory(entry, id), true, entry.title);
    }
  }
  for (const title of ['Presenting Offensive Companies To Strangers 5', 'We Pitched Illegal Products To Strangers (again)', 'We Pitched Offensive City Plans To Locals 3', 'We Pitched Offensive Video Games To Strangers']) {
    assert.equal(matchesCategory(video(title), 'we-pitched'), true, title);
  }
});

test('title normalization keeps punctuation, case and future numbered series stable', () => {
  const fixtures = [
    ['COLLEGE—SCAVENGER HUNT 99!', 'college-scavenger-hunt'],
    ['Omegle: Last Man Standing (FINALE)', 'omegle-last-man-standing'],
    ['Omegle — Try Not To Laugh 7', 'omegle-try-not-to-laugh'],
    ['TRY NOT TO LAUGH: Zoom Meeting 50', 'zoom-try-not-to-laugh'],
    ['TikTok Live: Try Not To Laugh 20', 'tiktok-try-not-to-laugh'],
    ['We Pitched Offensive Ideas To Strangers (AGAIN)', 'we-pitched'],
  ];
  for (const [title, id] of fixtures) assert.equal(matchesCategory(video(title), id), true, title);
});

test('Shorts only join explicitly named themes without guessed parent series', () => {
  assert.equal(matchesCategory(video('We Pranked a Zoom Meeting 🤣', true), 'zoom'), true);
  assert.equal(matchesCategory(video('We Pranked a Zoom Meeting 🤣', true), 'zoom-try-not-to-laugh'), false);
  assert.equal(matchesCategory(video('We Pranked Strangers On Omegle', true), 'omegle'), true);
  assert.equal(matchesCategory(video('We Pranked Strangers On Omegle', true), 'omegle-last-man-standing'), false);
  assert.equal(matchesCategory(video('Omegle Olympics', true), 'omegle-olympics'), true);
  assert.equal(matchesCategory(video('We Pranked Strangers With Offensive Plans', true), 'we-pitched'), true);
  assert.equal(matchesCategory(video('We Pranked Strangers With Offensive Plans', true), 'pitched-city-plans'), false);
  for (const title of ['She Said WHAT??', 'We Pranked Strangers Again', 'A WHAT?! 😂']) {
    assert.deepEqual(getVideoCategoryIds(video(title, true)), ['other']);
  }
});

test('category counts exactly match the eligible catalogue and retain Shorts-only categories', () => {
  for (const includeShorts of [false, true]) {
    const categories = listCategories(catalogue, {includeShorts});
    for (const category of categories) {
      const actual = catalogue.filter(entry => (includeShorts || !entry.isShort) && matchesCategory(entry, category.id));
      assert.equal(category.count, actual.length, category.id);
    }
  }
  const shortOnlyVideos = [video('We Made Offensive Products', true)];
  const shortOnly = listCategories(shortOnlyVideos).find(category => category.id === 'offensive-creations');
  assert.equal(shortOnly.count, 0);
  assert.equal(listCategories(shortOnlyVideos, {includeShorts: true}).find(category => category.id === 'offensive-creations').count, 1);
  assert.deepEqual(listCategories([]), [{id: 'all', label: 'All videos', count: 0}]);
});

test('unknown categories fail closed and unmatched uploads remain reachable', () => {
  assert.equal(matchesCategory(video('College Scavenger Hunt'), 'unknown'), false);
  assert.equal(matchesCategory(video('College Scavenger Hunt'), '__proto__'), false);
  assert.equal(matchesCategory(null, 'all'), false);
  const future = video('An entirely new Family Friendly series');
  assert.equal(matchesCategory(future), true);
  assert.equal(matchesCategory(future, 'other'), true);
});
