const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const UINT32_RANGE = 2 ** 32;

// Rejection sampling gives every catalogue entry the same probability.
export function randomIndex(length, source = globalThis.crypto) {
  if (!Number.isSafeInteger(length) || length < 1 || length > UINT32_RANGE) throw new RangeError('Invalid video count.');
  if (!source?.getRandomValues) throw new Error('Random selection is unavailable in this browser.');
  const limit = Math.floor(UINT32_RANGE / length) * length;
  const word = new Uint32Array(1);
  do { source.getRandomValues(word); } while (word[0] >= limit);
  return word[0] % length;
}

export function parseCatalogue(value) {
  if (value?.schemaVersion !== 1 || !/^UC[A-Za-z0-9_-]{22}$/.test(value.channelId) || !Array.isArray(value.videos)) throw new Error('Invalid video catalogue.');
  const seen = new Set();
  const videos = [];
  for (const video of value.videos) {
    if (!VIDEO_ID.test(video?.id) || typeof video.isShort !== 'boolean' || seen.has(video.id)) continue;
    seen.add(video.id);
    videos.push({id: video.id, title: typeof video.title === 'string' ? video.title : 'Family Friendly video', isShort: video.isShort});
  }
  if (!videos.length) throw new Error('No videos are available.');
  return videos;
}

export function selectVideo(videos, {includeShorts = false, previousId = '', excluded = new Set(), source} = {}) {
  const eligible = videos.filter(video => (includeShorts || !video.isShort) && video.id !== previousId && !excluded.has(video.id));
  if (!eligible.length) return null;
  return eligible[randomIndex(eligible.length, source)];
}
