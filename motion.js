(() => {
  'use strict';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const navigationKey = 'ascendo-navigation';
  let arrivingFromSite = false;
  try {
    const previous = JSON.parse(sessionStorage.getItem(navigationKey) || 'null');
    arrivingFromSite = previous?.href === location.href && Date.now() - previous.time < 8000;
    sessionStorage.removeItem(navigationKey);
  } catch {}
  if (arrivingFromSite) document.body.classList.add('motion-entry-nav');

  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[data-transition]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.href === location.href) return;
    try { sessionStorage.setItem(navigationKey, JSON.stringify({ href: destination.href, time: Date.now() })); } catch {}
  }, { capture: true });

  const revealAnimations = new Set();
  const pendingReveals = new Set();
  let revealObserver;
  function showAllReveals() {
    revealObserver?.disconnect();
    for (const element of pendingReveals) element.classList.remove('motion-reveal-pending');
    pendingReveals.clear();
    for (const animation of revealAnimations) animation.cancel();
    revealAnimations.clear();
  }
  function reveal(element, delay = 0) {
    pendingReveals.delete(element);
    element.classList.remove('motion-reveal-pending');
    if (reducedMotion.matches || typeof element.animate !== 'function') return;
    const animation = element.animate([
      { opacity: 0, translate: '0 12px' },
      { opacity: 1, translate: '0 0' }
    ], { duration: 500, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    revealAnimations.add(animation);
    animation.finished.then(() => revealAnimations.delete(animation), () => revealAnimations.delete(animation));
  }
  if (!reducedMotion.matches && !arrivingFromSite) {
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          revealObserver.unobserve(entry.target);
          reveal(entry.target);
        }
      }, { threshold: .12 });
    }
    let visibleIndex = 0;
    for (const element of document.querySelectorAll('[data-reveal]')) {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight - 24 && bounds.bottom > 0) reveal(element, Math.min(visibleIndex++ * 70, 280));
      else if (revealObserver) {
        pendingReveals.add(element);
        element.classList.add('motion-reveal-pending');
        revealObserver.observe(element);
      }
    }
  }

  for (const card of document.querySelectorAll('[data-plugin]')) {
    const button = card.querySelector('.plugin-toggle');
    const panel = card.querySelector('.plugin-description');
    if (!button || !panel) continue;
    let pinned = false;
    let hovered = false;
    let dismissed = true;
    function render() {
      const expanded = pinned || (!dismissed && ((finePointer.matches && hovered) || card.contains(document.activeElement)));
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
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
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
    finePointer.addEventListener('change', () => { hovered = false; dismiss(); });
    window.addEventListener('pageshow', () => { hovered = false; dismiss(); });
  }

  const surfaceSelector = '.download-button, .plugins-button, .founder-pill, .social-link, .back-link, .plugin-card, .brand-logo';
  const records = new Map();
  const moving = new Set();
  let activeRecord;
  let frameId;
  let previousTime;
  let slowFrames = 0;
  let performanceLimited = false;

  function restoreRecord(record) {
    record.element.classList.remove('is-motion-active');
    if (record.art) {
      record.art.style.transform = record.initialTransform;
      record.art.style.filter = record.initialFilter;
    }
    record.positionX = record.positionY = record.velocityX = record.velocityY = 0;
    record.targetX = record.targetY = 0;
  }
  function stopMotion() {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    frameId = undefined;
    previousTime = undefined;
    activeRecord = undefined;
    for (const record of records.values()) restoreRecord(record);
    moving.clear();
  }
  function createRecord(element) {
    const isLogo = element.matches('.brand-logo');
    const art = isLogo ? element : element.querySelector('.plugin-card__icon svg, .social-link__symbol, svg');
    let orb;
    if (!isLogo) {
      element.classList.add('motion-surface');
      const light = document.createElement('span');
      light.className = 'motion-light';
      light.setAttribute('aria-hidden', 'true');
      orb = document.createElement('span');
      orb.className = 'motion-light__orb';
      light.appendChild(orb);
      element.appendChild(light);
    }
    art?.classList.add('motion-art');
    const record = {
      element, art, orb, bounds: element.getBoundingClientRect(),
      initialTransform: art?.style.transform || '', initialFilter: art?.style.filter || '',
      baseFilter: art ? getComputedStyle(art).filter : 'none',
      amplitude: isLogo ? 4 : 2,
      positionX: 0, positionY: 0, velocityX: 0, velocityY: 0, targetX: 0, targetY: 0
    };
    records.set(element, record);
    return record;
  }
  function releaseActive() {
    if (!activeRecord) return;
    activeRecord.targetX = activeRecord.targetY = 0;
    activeRecord.element.classList.remove('is-motion-active');
    moving.add(activeRecord);
    activeRecord = undefined;
  }
  function paint(record) {
    const { positionX, positionY, bounds } = record;
    if (record.orb) record.orb.style.transform = `translate3d(${(positionX + 1) * bounds.width / 2 - 110}px,${(positionY + 1) * bounds.height / 2 - 110}px,0)`;
    if (!record.art) return;
    record.art.style.transform = `perspective(600px) translate3d(${positionX * record.amplitude}px,${positionY * record.amplitude}px,0) rotateX(${-positionY}deg) rotateY(${positionX}deg)`;
    const blur = Math.min(1.5, Math.hypot(record.velocityX, record.velocityY) * .12);
    record.art.style.filter = blur > .04 ? `${record.baseFilter === 'none' ? '' : record.baseFilter} blur(${blur.toFixed(2)}px)` : record.initialFilter;
  }
  function step(time) {
    frameId = undefined;
    if (document.hidden || reducedMotion.matches || !finePointer.matches || performanceLimited) { stopMotion(); return; }
    const elapsed = previousTime === undefined ? 1000 / 60 : time - previousTime;
    previousTime = time;
    slowFrames = elapsed > 24 ? slowFrames + 1 : 0;
    if (slowFrames >= 8) { performanceLimited = true; stopMotion(); return; }
    const delta = Math.min(elapsed / 1000, 1 / 30);
    for (const record of moving) {
      record.velocityX += ((record.targetX - record.positionX) * 190 - record.velocityX * 28) * delta;
      record.velocityY += ((record.targetY - record.positionY) * 190 - record.velocityY * 28) * delta;
      record.positionX += record.velocityX * delta;
      record.positionY += record.velocityY * delta;
      record.positionX = Math.max(-1, Math.min(1, record.positionX));
      record.positionY = Math.max(-1, Math.min(1, record.positionY));
      paint(record);
      if (Math.abs(record.targetX - record.positionX) + Math.abs(record.targetY - record.positionY) + Math.abs(record.velocityX) + Math.abs(record.velocityY) < .012) {
        moving.delete(record);
        if (record !== activeRecord) restoreRecord(record);
        else if (record.art) record.art.style.filter = record.initialFilter;
      }
    }
    if (moving.size) frameId = requestAnimationFrame(step);
    else previousTime = undefined;
  }
  function scheduleMotion() {
    if (frameId !== undefined || !moving.size) return;
    previousTime = undefined;
    frameId = requestAnimationFrame(step);
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches || performanceLimited || document.hidden) return;
    if (event.target.closest?.('[data-card-effects-active]')) { stopMotion(); return; }
    const element = event.target.closest?.(surfaceSelector);
    if (!element) { releaseActive(); scheduleMotion(); return; }
    if (activeRecord?.element !== element) {
      releaseActive();
      activeRecord = records.get(element) || createRecord(element);
      activeRecord.bounds = element.getBoundingClientRect();
      activeRecord.element.classList.add('is-motion-active');
    }
    const { bounds } = activeRecord;
    if (!bounds.width || !bounds.height || bounds.bottom < 0 || bounds.top > window.innerHeight) { releaseActive(); scheduleMotion(); return; }
    activeRecord.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    activeRecord.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    moving.add(activeRecord);
    scheduleMotion();
  }, { passive: true });
  document.addEventListener('ascendo:card-effects', event => {
    if (!event.target.hasAttribute('data-card-effects-active')) return;
    for (const [element,record] of records) if (event.target.contains(element)) {
      restoreRecord(record); moving.delete(record); records.delete(element);
      element.querySelector('.motion-light')?.remove(); element.classList.remove('motion-surface');
      if (record === activeRecord) activeRecord = undefined;
    }
  });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) { releaseActive(); scheduleMotion(); }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
  window.addEventListener('scroll', stopMotion, { passive: true });
  window.addEventListener('resize', stopMotion, { passive: true });
  window.addEventListener('pagehide', () => { stopMotion(); showAllReveals(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { stopMotion(); showAllReveals(); } });
  finePointer.addEventListener('change', stopMotion);
  reducedMotion.addEventListener('change', () => { stopMotion(); if (reducedMotion.matches) showAllReveals(); });
})();
