import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {listCategories, matchesCategory} from '../randomff/categories.mjs';
import {parseCatalogue, selectVideo} from '../randomff/selection.mjs';

const videos = parseCatalogue(JSON.parse(readFileSync(new URL('../randomff/catalogue.json', import.meta.url), 'utf8')));
const source = value => ({getRandomValues(word) { word[0] = value; return word; }});

test('every eligible video remains reachable with equal weight within each category and Shorts setting', () => {
  for (const includeShorts of [false, true]) {
    for (const category of listCategories(videos, {includeShorts})) {
      const eligible = videos.filter(video => (includeShorts || !video.isShort) && matchesCategory(video, category.id));
      assert.equal(category.count, eligible.length, category.id);
      if (!eligible.length) {
        assert.equal(selectVideo(videos, {includeShorts, categoryId: category.id}), null);
        continue;
      }
      for (let index = 0; index < eligible.length; index++) {
        assert.equal(selectVideo(videos, {includeShorts, categoryId: category.id, source: source(index)}).id, eligible[index].id, category.id);
      }
    }
  }
});

test('category selection preserves previous and unavailable exclusions without widening its pool', () => {
  const categoryId = 'college-scavenger-hunt';
  const eligible = videos.filter(video => !video.isShort && matchesCategory(video, categoryId));
  assert.ok(eligible.length > 2);
  const previousId = eligible[0].id;
  const excluded = new Set(eligible.slice(1, -1).map(video => video.id));
  assert.equal(selectVideo(videos, {categoryId, previousId, excluded, source: source(0)}).id, eligible.at(-1).id);
  excluded.add(eligible.at(-1).id);
  assert.equal(selectVideo(videos, {categoryId, previousId, excluded}), null);
  assert.equal(selectVideo(videos, {categoryId: 'missing-category'}), null);
});

test('single-video categories cannot repeat or silently play a different series', () => {
  const categoryId = 'omegle-try-not-to-laugh';
  const eligible = videos.filter(video => !video.isShort && matchesCategory(video, categoryId));
  assert.ok(eligible.length > 0);
  assert.equal(selectVideo([eligible[0]], {categoryId, previousId: eligible[0].id}), null);
});
