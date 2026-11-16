(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
    if (document.body.matches('.page--home, .page--plugins, .page--notfound') || nativeTransitions || reduceMotion.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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

  const pluginFinePointer = matchMedia('(hover: hover) and (pointer: fine)');
  for (const card of document.querySelectorAll('[data-plugin]')) {
    const button = card.querySelector('.plugin-toggle');
    const panel = card.querySelector('.plugin-description');
    if (!button || !panel) continue;
    let pinned = false;
    let hovered = false;
    let dismissed = true;
    function render() {
      const expanded = pinned || (!dismissed && ((pluginFinePointer.matches && hovered) || card.contains(document.activeElement)));
      card.classList.toggle('is-expanded', expanded);
      button.setAttribute('aria-expanded', String(expanded));
      panel.setAttribute('aria-hidden', String(!expanded));
      panel.inert = !expanded;
    }
    function dismiss() {
      pinned = false;
      dismissed = true;
      render();
    }
    button.hidden = false;
    card.classList.add('is-enhanced');
    render();
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !pluginFinePointer.matches) return;
      hovered = true;
      dismissed = false;
      render();
    });
    card.addEventListener('pointerleave', () => { hovered = false; render(); });
    card.addEventListener('focusin', event => {
      if (!card.contains(event.relatedTarget)) dismissed = false;
      render();
    });
    card.addEventListener('focusout', () => queueMicrotask(render));
    button.addEventListener('click', () => {
      pinned = !pinned;
      dismissed = !pinned;
      render();
    });
    card.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !card.classList.contains('is-expanded')) return;
      button.focus({ preventScroll: true });
      dismiss();
      event.preventDefault();
    });
    document.addEventListener('pointerdown', event => { if (!card.contains(event.target)) dismiss(); });
    pluginFinePointer.addEventListener('change', () => { hovered = false; dismiss(); });
    window.addEventListener('pageshow', () => { hovered = false; dismiss(); });
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
  // Continuous pointer travel; keyboard adjustments retain whole-percent steps.
  if(volumeControl){volumeControl.max='70';volumeControl.step='any';}

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

  import('./profile-music.mjs?v=20261027-1').then(({createProfilePlayer})=>{
    const player=createProfilePlayer(video,{onState:media=>{
      const volume=Math.max(0,Math.min(70,media.muted?0:media.volume*100)),percentage=Math.round(volume);
      if(volumeControl){
        if(Math.abs(Number(volumeControl.value)-volume)>.00001)volumeControl.value=String(volume);
        const fill=`${volume/70*100}%`,label=volume===0?'Muted':`${percentage} percent`;
        if(volumeControl.style.getPropertyValue('--volume')!==fill)volumeControl.style.setProperty('--volume',fill);
        if(volumeControl.getAttribute('aria-valuetext')!==label)volumeControl.setAttribute('aria-valuetext',label);
      }
      if(volumeValue&&volumeValue.textContent!==`${percentage}%`)volumeValue.textContent=`${percentage}%`;
      if(mediaControls){mediaControls.hidden=!media.getAttribute('src');mediaControls.classList.toggle('is-muted',volume===0);}
    }});
    player.fromDataset();
    volumeControl?.addEventListener('input',()=>player.volume(Number(volumeControl.value)));
    volumeControl?.addEventListener('keydown',event=>{
      const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[event.key];
      if(delta===undefined&&event.key!=='Home'&&event.key!=='End')return;
      event.preventDefault();
      const value=event.key==='Home'?0:event.key==='End'?70:Math.round(Number(volumeControl.value))+delta;
      volumeControl.value=String(Math.max(0,Math.min(70,value)));
      volumeControl.dispatchEvent(new Event('input',{bubbles:true}));
    });
    document.addEventListener('pointerdown',()=>player.start(true),{once:true});
    document.addEventListener('keydown',()=>player.start(true),{once:true});
  });
  }
  initializeProfileMedia();
  document.addEventListener('ascendo:profile-ready',initializeProfileMedia);
})();
