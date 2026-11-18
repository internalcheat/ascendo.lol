import {parseCatalogue, selectVideo} from './selection.mjs';

const button = document.getElementById('randomButton');
const shorts = document.getElementById('includeShorts');
const status = document.getElementById('status');
const region = document.getElementById('playerRegion');
const mount = document.getElementById('playerMount');
const LAST_VIDEO_KEY = 'ascendo-randomff-last-video';
const unavailable = new Set();
const PERMANENT_ERRORS = new Set([100, 101, 150]);
let cataloguePromise;
let youtubePromise;
let player;
let lastId = '';
let requestId = 0;
let playerId = 0;
let busy = false;
let readyTimer;
try { lastId = sessionStorage.getItem(LAST_VIDEO_KEY) || ''; } catch { /* Storage is optional. */ }

function message(text = '') { status.textContent = text; }
function setBusy(value) { busy = value; button.disabled = value; button.setAttribute('aria-busy', String(value)); }

async function catalogue() {
  if (!cataloguePromise) {
    cataloguePromise = fetch(new URL('./catalogue.json', import.meta.url), {cache: 'no-cache', signal: AbortSignal.timeout(15000)})
      .then(response => { if (!response.ok) throw new Error('Video catalogue request failed.'); return response.json(); })
      .then(parseCatalogue)
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
  const video = selectVideo(round.videos, {includeShorts: round.includeShorts, previousId: round.previousId, excluded});
  if (!video) {
    setBusy(false);
    message('No other videos are available. Try again later.');
    return;
  }
  play(video, round, attempt);
}

button.addEventListener('click', async () => {
  if (busy) return;
  const id = ++requestId;
  const includeShorts = shorts.checked;
  setBusy(true);
  message('Loading…');
  try {
    const [videos] = await Promise.all([catalogue(), youtube()]);
    if (id !== requestId) return;
    next({id, videos, includeShorts, previousId: lastId, excluded: new Set()});
  } catch {
    if (id !== requestId) return;
    setBusy(false);
    message('Could not load videos. Check your connection and try again.');
  }
});
