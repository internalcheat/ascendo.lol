import {parseCatalogue, selectVideo} from './selection.mjs?v=20261118-2';
import {listCategories} from './categories.mjs?v=20261118-2';

const button = document.getElementById('randomButton');
const shorts = document.getElementById('includeShorts');
const category = document.getElementById('videoCategory');
const status = document.getElementById('status');
const region = document.getElementById('playerRegion');
const mount = document.getElementById('playerMount');
const LAST_VIDEO_KEY = 'ascendo-randomff-last-video';
const unavailable = new Set();
const PERMANENT_ERRORS = new Set([100, 101, 150]);
let cataloguePromise;
let catalogueVideos;
let youtubePromise;
let player;
let lastId = '';
let requestId = 0;
let playerId = 0;
let busy = false;
let readyTimer;
try { lastId = sessionStorage.getItem(LAST_VIDEO_KEY) || ''; } catch { /* Storage is optional. */ }

function message(text = '') { status.textContent = text; }
function setBusy(value) {
  busy = value;
  button.disabled = value;
  button.setAttribute('aria-busy', String(value));
  category.disabled = value || !catalogueVideos;
  shorts.disabled = value;
}

function refreshCategories() {
  if (!catalogueVideos) return;
  const selected = category.value || 'all';
  const categories = listCategories(catalogueVideos, {includeShorts: shorts.checked});
  const options = categories.map(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.label} (${item.count})`;
    option.disabled = item.count === 0;
    return option;
  });
  category.replaceChildren(...options);
  category.value = selected;
  category.disabled = busy;
}

function filtersChanged() {
  refreshCategories();
  if (busy || !catalogueVideos) return;
  // Keep the current video playing, but its later callbacks must not replace
  // it using filters the visitor has since changed or clear the filter status.
  if (player) { requestId++; clearTimeout(readyTimer); }
  const selected = listCategories(catalogueVideos, {includeShorts: shorts.checked}).find(item => item.id === category.value);
  message(selected?.count === 0 ? 'No videos match. Include Shorts or choose another category.' : '');
}

async function catalogue() {
  if (!cataloguePromise) {
    cataloguePromise = fetch(new URL('./catalogue.json', import.meta.url), {cache: 'no-cache', signal: AbortSignal.timeout(15000)})
      .then(response => { if (!response.ok) throw new Error('Video catalogue request failed.'); return response.json(); })
      .then(parseCatalogue)
      .then(videos => { catalogueVideos = videos; refreshCategories(); return videos; })
      .catch(error => { cataloguePromise = undefined; throw error; });
  }
  return cataloguePromise;
}

function youtube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubePromise) {
    youtubePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const previous = window.onYouTubeIframeAPIReady;
      const finish = error => {
        clearTimeout(timer);
        if (window.onYouTubeIframeAPIReady === loaded) window.onYouTubeIframeAPIReady = previous;
        script.onerror = null;
        if (error) { script.remove(); youtubePromise = undefined; reject(error); }
        else resolve(window.YT);
      };
      const loaded = () => { if (typeof previous === 'function') previous(); finish(window.YT?.Player ? null : new Error('Player unavailable.')); };
      const timer = setTimeout(() => finish(new Error('Player request timed out.')), 15000);
      window.onYouTubeIframeAPIReady = loaded;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => finish(new Error('Player request failed.'));
      document.head.append(script);
    });
  }
  return youtubePromise;
}

function destroyPlayer() {
  clearTimeout(readyTimer);
  if (player) { try { player.destroy(); } catch { /* A failed player may already be gone. */ } }
  player = undefined;
  mount.replaceChildren();
}

function remember(id) {
  lastId = id;
  try { sessionStorage.setItem(LAST_VIDEO_KEY, id); } catch { /* Storage is optional. */ }
}

function play(video, round, attempt) {
  if (round.id !== requestId) return;
  const activePlayer = ++playerId;
  destroyPlayer();
  remember(video.id);
  round.excluded.add(video.id);
  region.hidden = false;
  const iframe = document.createElement('iframe');
  iframe.title = video.title;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  const parameters = new URLSearchParams({enablejsapi: '1', origin: location.origin, autoplay: '1', playsinline: '1', rel: '0'});
  iframe.src = `https://www.youtube.com/embed/${video.id}?${parameters}`;
  mount.append(iframe);
  const current = () => round.id === requestId && activePlayer === playerId;
  readyTimer = setTimeout(() => {
    if (!current()) return;
    setBusy(false);
    message('The player is taking too long. Try another video.');
  }, 20000);
  player = new window.YT.Player(iframe, {events: {
    onReady(event) {
      if (!current()) return;
      clearTimeout(readyTimer);
      setBusy(false);
      message();
      event.target.playVideo();
    },
    onStateChange(event) {
      if (!current()) return;
      if (event.data === window.YT.PlayerState?.PLAYING || event.data === window.YT.PlayerState?.CUED) message();
    },
    onAutoplayBlocked() {
      if (!current()) return;
      setBusy(false);
      message('Press play to start the video.');
    },
    onError(event) {
      if (!current()) return;
      clearTimeout(readyTimer);
      if (!PERMANENT_ERRORS.has(event.data)) {
        setBusy(false);
        message('YouTube could not play this video. Try again, or check your connection.');
        return;
      }
      unavailable.add(video.id);
      if (attempt >= 5) {
        setBusy(false);
        message('These videos are unavailable. Try another.');
        return;
      }
      setBusy(true);
      message('Finding another video…');
      next(round, attempt + 1);
    }
  }});
}

function next(round, attempt = 1) {
  if (round.id !== requestId) return;
  const excluded = new Set([...unavailable, ...round.excluded]);
  const video = selectVideo(round.videos, {includeShorts: round.includeShorts, categoryId: round.categoryId, previousId: round.previousId, excluded});
  if (!video) {
    setBusy(false);
    const matched = listCategories(round.videos, {includeShorts: round.includeShorts}).find(item => item.id === round.categoryId)?.count || 0;
    const previous = round.videos.find(item => item.id === round.previousId);
    const previousMatches = previous && listCategories([previous], {includeShorts: round.includeShorts}).find(item => item.id === round.categoryId)?.count;
    if (!matched) message('No videos match. Include Shorts or choose another category.');
    else if (matched === 1 && previousMatches) message('This category has one matching video. Choose another category to avoid a repeat.');
    else message('No other matching videos are available. Choose another category or try later.');
    return;
  }
  play(video, round, attempt);
}

button.addEventListener('click', async () => {
  if (busy) return;
  const id = ++requestId;
  const includeShorts = shorts.checked;
  const categoryId = category.value || 'all';
  setBusy(true);
  message('Loading…');
  try {
    const [videos] = await Promise.all([catalogue(), youtube()]);
    if (id !== requestId) return;
    next({id, videos, includeShorts, categoryId, previousId: lastId, excluded: new Set()});
  } catch {
    if (id !== requestId) return;
    setBusy(false);
    message('Could not load videos. Check your connection and try again.');
  }
});

category.addEventListener('change', filtersChanged);
shorts.addEventListener('change', filtersChanged);
// Populate the small filter immediately; the YouTube API still loads on demand.
catalogue().catch(() => {
  if (!requestId) message('Could not load categories. Use the button to try again.');
});
