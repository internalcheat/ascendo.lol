(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowScreen = matchMedia('(max-width: 620px)');
  const nativeTransitions = 'CSSViewTransitionRule' in window;
  let toastTimer;
  let navigationTimer;

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  document.addEventListener('click', event => {
    if (nativeTransitions || reduceMotion.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[data-transition]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.href === location.href) return;
    event.preventDefault();
    if (navigationTimer) return;
    document.body.classList.add('is-leaving');
    navigationTimer = setTimeout(() => location.assign(destination.href), 160);
  });

  window.addEventListener('pageshow', event => {
    clearTimeout(navigationTimer);
    navigationTimer = undefined;
    document.body.classList.remove('is-leaving', 'is-arriving');
    if (!nativeTransitions && !reduceMotion.matches && !event.persisted) {
      document.body.classList.add('is-arriving');
    }
  });

  for (const avatar of document.querySelectorAll('img[data-fallback]')) {
    function showPoster() {
      const poster = avatar.dataset.fallback;
      if (!poster) return;
      delete avatar.dataset.fallback;
      for (const source of avatar.parentElement.querySelectorAll('source')) source.remove();
      avatar.src = poster;
    }
    avatar.addEventListener('error', showPoster, { once: true });
    if (avatar.complete && avatar.naturalWidth === 0) showPoster();
  }

  const wordLayer = document.getElementById('floatingWords');
  if (wordLayer) {
    const phrases = ['The Best Client', 'Open Source', 'Best Visuals', 'Ascendo #1', 'Ascendo', "Minecraft's best client", 'Best visuals?', 'Holy client omg!'];
    let remainingPhrases = [];
    let wordTimer;

    function spawnWord() {
      const limit = narrowScreen.matches ? 2 : 4;
      if (wordLayer.childElementCount >= limit) return;
      if (!remainingPhrases.length) remainingPhrases = [...phrases];
      const phraseIndex = Math.floor(Math.random() * remainingPhrases.length);
      const word = document.createElement('span');
      word.className = 'floating-word';
      word.textContent = remainingPhrases.splice(phraseIndex, 1)[0];
      word.style.setProperty('--word-size', `${narrowScreen.matches ? 12 + Math.random() * 4 : 16 + Math.random() * 8}px`);
      word.style.setProperty('--word-drift', `${Math.random() * 48 - 24}px`);
      wordLayer.appendChild(word);

      const layerBounds = wordLayer.getBoundingClientRect();
      const protectedBounds = [...document.querySelectorAll('.brand-logo, .download-button, .plugins-button, .section-heading, .founders-list, .plugins-heading, .plugin-grid, .back-link')]
        .map(element => element.getBoundingClientRect());
      const existingBounds = [...wordLayer.children].filter(element => element !== word)
        .map(element => element.getBoundingClientRect());
      const wordWidth = word.offsetWidth;
      const wordHeight = word.offsetHeight;
      let placed = false;

      for (let attempt = 0; attempt < 24; attempt++) {
        const left = 36 + Math.random() * Math.max(0, layerBounds.width - wordWidth - 72);
        const top = 48 + Math.random() * Math.max(0, layerBounds.height - wordHeight - 100);
        const bounds = { left: layerBounds.left + left - 28, right: layerBounds.left + left + wordWidth + 28, top: layerBounds.top + top - 40, bottom: layerBounds.top + top + wordHeight + 28 };
        const overlaps = [...protectedBounds, ...existingBounds].some(other =>
          bounds.left < other.right && bounds.right > other.left && bounds.top < other.bottom && bounds.bottom > other.top);
        if (overlaps) continue;
        word.style.left = `${left}px`;
        word.style.top = `${top}px`;
        placed = true;
        break;
      }

      if (!placed) word.remove();
      else word.addEventListener('animationend', () => word.remove(), { once: true });
    }

    function scheduleWord() {
      wordTimer = setTimeout(() => {
        if (document.hidden || reduceMotion.matches) return;
        spawnWord();
        scheduleWord();
      }, narrowScreen.matches ? 1200 + Math.random() * 600 : 800 + Math.random() * 500);
    }

    function resetWords() {
      clearTimeout(wordTimer);
      wordLayer.replaceChildren();
      if (document.hidden || reduceMotion.matches) return;
      spawnWord();
      scheduleWord();
    }

    resetWords();
    document.addEventListener('visibilitychange', resetWords);
    reduceMotion.addEventListener('change', resetWords);
    narrowScreen.addEventListener('change', resetWords);
    window.addEventListener('resize', resetWords);
    window.addEventListener('pageshow', resetWords);
    window.addEventListener('pagehide', () => {
      clearTimeout(wordTimer);
      wordLayer.replaceChildren();
    });
  }

  async function copyValue(value) {
    try {
      if (navigator.clipboard && isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {}
    const previousFocus = document.activeElement;
    const temporary = document.createElement('textarea');
    temporary.value = value;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.appendChild(temporary);
    temporary.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    temporary.remove();
    previousFocus?.focus({ preventScroll: true });
    return copied;
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-copy]');
    if (!button) return;
    const value = button.dataset.copy;
    const copied = await copyValue(value);
    showToast(copied ? `${button.dataset.platform}: ${value} copied` : `${button.dataset.platform}: ${value}`);
  });

  function initializeProfileMedia() {
  const video = document.getElementById('musicBackground');
  const mediaControls = document.getElementById('mediaControls');
  const volumeButton = document.getElementById('volumeButton');
  const volumePanel = document.getElementById('volumePanel');
  const volumeControl = document.getElementById('volumeControl');
  const volumeValue = document.getElementById('volumeValue');
  if (!video) return;
  if(video.dataset.playerReady==='true')return;
  video.dataset.playerReady='true';

  if (mediaControls && volumeButton && volumePanel) {
    let pinned = false;
    let pointerInside = false;
    let dragging = false;
    let dismissed = false;

    function refreshDisclosure() {
      const expanded = pinned || dragging || (!dismissed && (pointerInside || mediaControls.contains(document.activeElement)));
      mediaControls.classList.toggle('is-expanded', expanded);
      volumeButton.setAttribute('aria-expanded', String(expanded));
      volumeButton.setAttribute('aria-label', expanded ? 'Hide volume control' : 'Show volume control');
      volumePanel.inert = !expanded;
      volumePanel.setAttribute('aria-hidden', String(!expanded));
    }

    function dismissDisclosure() {
      pinned = false;
      dragging = false;
      dismissed = true;
      refreshDisclosure();
    }

    mediaControls.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      pointerInside = true;
      dismissed = false;
      refreshDisclosure();
    });
    mediaControls.addEventListener('pointerleave', () => {
      pointerInside = false;
      refreshDisclosure();
    });
    mediaControls.addEventListener('focusin', event => {
      if (!mediaControls.contains(event.relatedTarget)) dismissed = false;
      refreshDisclosure();
    });
    mediaControls.addEventListener('focusout', () => queueMicrotask(refreshDisclosure));
    volumeButton.addEventListener('click', () => {
      pinned = !pinned;
      dismissed = !pinned;
      refreshDisclosure();
    });
    volumeControl?.addEventListener('pointerdown', () => {
      dragging = true;
      dismissed = false;
      refreshDisclosure();
    });
    for (const eventName of ['pointerup', 'pointercancel']) {
      document.addEventListener(eventName, () => {
        dragging = false;
        refreshDisclosure();
      });
    }
    document.addEventListener('pointerdown', event => {
      if (!mediaControls.contains(event.target)) dismissDisclosure();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !mediaControls.classList.contains('is-expanded')) return;
      volumeButton.focus({ preventScroll: true });
      dismissDisclosure();
      event.preventDefault();
    });
    window.addEventListener('pageshow', () => {
      pointerInside = false;
      dismissDisclosure();
    });
    refreshDisclosure();
  }

  function syncVolume() {
    if (!volumeControl) return;
    const percentage = Math.round(video.muted ? 0 : video.volume * 100);
    volumeControl.value = String(percentage);
    volumeControl.style.setProperty('--volume', `${percentage}%`);
    if (volumeValue) volumeValue.textContent = `${percentage}%`;
    mediaControls?.classList.toggle('is-muted', percentage === 0);
    volumeControl.setAttribute('aria-valuetext', percentage === 0 ? 'Muted' : `${percentage} percent`);
  }

  video.addEventListener('volumechange', syncVolume);
  video.addEventListener('playing', () => {
    if(video.dataset.entryBlocked==='true'){video.pause();return;}
    document.body.classList.add('has-video');
    if (mediaControls) mediaControls.hidden = false;
    syncVolume();
  });
  video.addEventListener('error', () => {
    document.body.classList.remove('has-video');
    if (mediaControls) mediaControls.hidden = true;
    showToast('Background media could not be loaded');
  });

  const saveData = navigator.connection?.saveData === true;
  const smallMedia = matchMedia('(max-width: 820px), (pointer: coarse)');
  let desiredSource;
  let sourceGeneration = 0;
  function backgroundSource() {
    const kind = video.dataset.backgroundKind || 'video';
    if (kind !== 'video') return '';
    return smallMedia.matches && video.dataset.mobileSrc ? video.dataset.mobileSrc : video.dataset.backgroundSrc || '../assets/music-background.mp4';
  }
  function quietBackground() { return reduceMotion.matches || saveData; }
  async function startBackground(userInitiated = false) {
    if(video.dataset.entryBlocked==='true'){video.pause();return;}
    const source = backgroundSource();
    const quiet = quietBackground();
    document.body.classList.toggle('media-poster-only', quiet);
    if (mediaControls) mediaControls.hidden = !source;
    const stage = video.closest?.('.video-stage');
    const poster = video.getAttribute?.('poster') || '';
    if (stage && poster) {
      stage.style.backgroundImage = `url(${JSON.stringify(poster)})`;
      stage.style.backgroundSize = 'cover';
      stage.style.backgroundPosition = 'center';
    }
    if (!source) {
      desiredSource = undefined;
      sourceGeneration++;
      video.pause(); video.removeAttribute('src'); video.load();
      document.body.classList.remove('has-video');
      return;
    }
    const absolute = new URL(source,location.href).href;
    if (quiet && ((!userInitiated && (video.muted || !video.currentSrc)) || (video.muted && video.volume === 0))) {
      video.pause(); video.muted = true; syncVolume();
      return;
    }
    const changed = desiredSource !== absolute;
    if (changed) {
      desiredSource = absolute;
      sourceGeneration++;
      video.src = source;
      document.body.classList.remove('has-video');
    }
    if (!changed && !video.paused) return;
    const generation = sourceGeneration;
    try { await video.play(); }
    catch {
      if (video.error || generation !== sourceGeneration || video.dataset.entryBlocked==='true') return;
      video.muted = true; syncVolume();
      try { await video.play(); } catch { if (generation === sourceGeneration) showToast('Background playback is unavailable'); }
    }
  }
  video.volume = 0.65;
  video.muted = quietBackground();
  syncVolume();
  startBackground();
  video.addEventListener('ascendo:background', () => startBackground());
  reduceMotion.addEventListener('change', () => startBackground());
  smallMedia.addEventListener('change', () => startBackground());

  volumeControl?.addEventListener('input', () => {
    const volume = Number(volumeControl.value) / 100;
    video.volume = volume;
    video.muted = volume === 0;
    syncVolume();
    if (!video.error) startBackground(true);
  });
  }
  initializeProfileMedia();
  document.addEventListener('ascendo:profile-ready',initializeProfileMedia);
})();
