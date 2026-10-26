import { createProfileClock } from './profile-clock.mjs?v=20261025-6';
import { createProfileAtmosphere } from './profile-atmosphere.mjs?v=20261026-5';
import {isTiledLayout,layoutWidth} from './visual-schema.mjs?v=20261026-5';

const templates = Object.freeze({
  arrow: '<path d="M5 3v24l6-7 5 11 5-2-5-11 10-1Z"/>',
  dot: '<circle cx="18" cy="18" r="7"/>',
  ring: '<circle cx="18" cy="18" r="11" fill="none" stroke-width="3"/>',
  crosshair: '<path d="M18 3v11m0 8v11M3 18h11m8 0h11" fill="none" stroke-width="2"/>'
});

export function nativeCursor(config) {
  if (!Object.hasOwn(templates,config.style) || !/^#[0-9a-f]{6}$/i.test(config.color) || !Number.isFinite(config.size) || config.size < 12 || config.size > 40) throw new Error('Invalid native cursor.');
  const size = Math.round(config.size);
  const hotspot = config.style === 'arrow' ? Math.round(size * 5 / 36) : Math.round(size / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36" fill="${config.color}" stroke="${config.color}" stroke-linecap="round" stroke-linejoin="round">${templates[config.style]}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${config.style === 'arrow' ? Math.round(size * 3 / 36) : hotspot}, auto`;
}

export function createProfileEffects(panel, { scope, preview = false } = {}) {
  const doc = panel.ownerDocument;
  const win = doc.defaultView;
  const clock = createProfileClock(win);
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  const abort = new AbortController();
  const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal:abort.signal });
  const make = className => { const node = doc.createElement('div'); node.className = className; return node; };
  const boundary = make('profile-effects-boundary');
  const entry = make('profile-effects-entry');
  const surface = make('profile-effects-surface');
  panel.before(boundary); boundary.append(entry); entry.append(surface); surface.append(panel);
  scope ||= boundary;
  const atmosphere = createProfileAtmosphere(panel,scope,{clock,preview});
  const cards = new Map();
  const light = make('profile-effects-light');
  const orb = make('profile-effects-orb');
  light.setAttribute('aria-hidden','true'); light.append(orb); surface.append(light);
  const decorations = make('profile-cursor-decorations');
  decorations.setAttribute('aria-hidden','true'); scope.append(decorations);
  const trail = [], particles = [];
  function prepareDecorations() {
    if (config.cursorEffects.enabled && config.cursorEffects.trail && !trail.length) for (let index=0;index<12;index++) {
      const node = make('profile-cursor-point'); decorations.append(node); trail.push({node,x:0,y:0});
    }
    if (config.cursorEffects.enabled && config.cursorEffects.clickEffect !== 'none' && !particles.length) for (let index=0;index<24;index++) {
      const node = make('profile-click-particle'); decorations.append(node); particles.push({node,animation:null});
    }
  }
  let config, entranceKey, bounds, scopeBounds, pendingEntrance;
  let frame = 0, lastTime = 0, slowFrames = 0, limited = false, onscreen = true;
  let painted = !preview && (doc.readyState === 'complete' || (win.performance.getEntriesByType?.('paint') || []).some(entry => entry.name === 'first-contentful-paint'));
  let mouseX = 0, mouseY = 0, lastMove = -Infinity, trailStarted = false;
  const animations = new Set();
  const firstPaint = clock.request(() => { painted = true; });
  const interactive = () => !!config && fine.matches && !reduced.matches && !limited && onscreen && !doc.hidden;
  const cursorEnabled = () => !!config?.cursorEffects.enabled && fine.matches && onscreen && !doc.hidden;
  const cardEnabled = () => interactive() && config.cardEffects.enabled;

  function geometry() {
    bounds = boundary.getBoundingClientRect();
    scopeBounds = scope.getBoundingClientRect();
    for (const record of cards.values()) record.bounds = record.boundary.getBoundingClientRect();
    atmosphere.geometry();
  }
  function resetCard(record) {
    record.targetX = record.targetY = record.currentX = record.currentY = record.opacity = record.targetOpacity = 0;
    record.surface.style.removeProperty('transform'); record.artwork?.style.removeProperty('translate'); record.light.style.opacity = '0';
  }
  function syncCards() {
    const targets = isTiledLayout(config.cardLayout) ? [panel.querySelector('.profile-identity'),...panel.querySelectorAll('.social-link,.now-playing,.profile-widget')].filter(Boolean) : [panel];
    light.hidden = isTiledLayout(config.cardLayout);
    for (const [node,record] of cards) if (!targets.includes(node) || !record.boundary.isConnected || !record.boundary.contains(node)) {
      resetCard(record);
      if (node !== panel) { record.boundary.before(node); record.boundary.remove(); }
      cards.delete(node);
    }
    for (const node of targets) {
      if (cards.has(node)) { cards.get(node).artwork = node.querySelector('.avatar'); continue; }
      let cardBoundary = boundary, cardSurface = surface, cardLight = light, cardOrb = orb;
      if (node !== panel) {
        cardBoundary = make('profile-tile-boundary'); cardSurface = make('profile-tile-surface');
        cardLight = make('profile-effects-light'); cardOrb = make('profile-effects-orb');
        cardLight.setAttribute('aria-hidden','true'); cardLight.append(cardOrb);
        node.before(cardBoundary); cardBoundary.append(cardSurface); cardSurface.append(node,cardLight);
      }
      const record = {node,boundary:cardBoundary,surface:cardSurface,light:cardLight,orb:cardOrb,artwork:node.querySelector('.avatar')};
      resetCard(record); cards.set(node,record);
    }
  }
  function clearEntrances() {
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  function clearParticles() {
    for (const particle of particles) { particle.animation?.cancel(); particle.animation = null; particle.node.style.opacity = '0'; }
  }
  function neutral() {
    if (frame) clock.cancel(frame);
    frame = lastTime = 0;
    for (const record of cards.values()) resetCard(record);
    trailStarted = false; lastMove = -Infinity;
    for (const point of trail) point.node.style.opacity = '0';
    clearParticles();
  }
  function syncCursor() {
    const enabled = cursorEnabled();
    scope.classList.toggle('profile-custom-cursor',enabled);
    if (enabled) scope.style.setProperty('--custom-cursor',nativeCursor(config.cursorEffects));
    else scope.style.removeProperty('--custom-cursor');
  }
  function schedule() { if (!frame && interactive()) frame = clock.request(step); }
  function step(time) {
    frame = 0;
    if (!interactive()) { neutral(); return; }
    const elapsed = lastTime ? time - lastTime : 16;
    lastTime = time;
    slowFrames = elapsed > 34 ? slowFrames + 1 : 0;
    if (slowFrames >= 10) { limited = true; neutral(); return; }
    let unsettled = false;
    if (config.cardEffects.enabled) for (const record of cards.values()) {
      const card = config.cardEffects;
      const response = 1 - Math.exp(-Math.min(elapsed,40) * .014 * card.speed);
      record.currentX += (record.targetX - record.currentX) * response;
      record.currentY += (record.targetY - record.currentY) * response;
      record.opacity += (record.targetOpacity - record.opacity) * response;
      const {currentX,currentY} = record;
      const strength = card.intensity / 100;
      record.surface.style.transform = card.tilt ? `perspective(900px) rotateX(${-currentY * 6 * strength}deg) rotateY(${currentX * 6 * strength}deg)` : '';
      if (record.artwork) record.artwork.style.translate = card.parallax ? `${currentX * 8 * strength}px ${currentY * 8 * strength}px` : '';
      record.light.style.opacity = card.glow ? String(record.opacity * strength * .42) : '0';
      record.orb.style.transform = `translate3d(${(currentX + 1) * record.bounds.width / 2 - 130}px,${(currentY + 1) * record.bounds.height / 2 - 130}px,0)`;
      unsettled ||= Math.abs(record.targetX-currentX) + Math.abs(record.targetY-currentY) + Math.abs(record.targetOpacity-record.opacity) > .001;
    }
    const cursor = config.cursorEffects;
    if (cursor.enabled && cursor.trail && trailStarted) {
      const age = time - lastMove;
      const opacity = Math.max(0,1 - Math.max(0,age - 100) / 450);
      const response = 1 - Math.exp(-Math.min(elapsed,40) / (14 + cursor.trailSmoothness * .9));
      let previousX = mouseX, previousY = mouseY;
      trail.forEach((point,index) => {
        if (index >= cursor.trailLength) { point.node.style.opacity = '0'; return; }
        point.x += (previousX - point.x) * response;
        point.y += (previousY - point.y) * response;
        point.node.style.transform = `translate3d(${point.x}px,${point.y}px,0) scale(${1 - index / (cursor.trailLength + 2)})`;
        point.node.style.opacity = String(opacity * (1-index/cursor.trailLength) * .42);
        previousX = point.x; previousY = point.y;
      });
      unsettled ||= opacity > 0;
      if (!opacity) trailStarted = false;
    }
    if (unsettled) schedule(); else lastTime = 0;
  }
  function pointer(event) {
    if (event.pointerType !== 'mouse' || !interactive()) return;
    if (!bounds || !scopeBounds) geometry();
    if (cardEnabled()) for (const record of cards.values()) {
      const box = record.bounds;
      const overCard = record.boundary.contains(event.target) && box.width > 0 && box.height > 0;
      record.targetX = overCard ? Math.max(-1,Math.min(1,(event.clientX - box.left) / box.width * 2 - 1)) : 0;
      record.targetY = overCard ? Math.max(-1,Math.min(1,(event.clientY - box.top) / box.height * 2 - 1)) : 0;
      record.targetOpacity = overCard ? 1 : 0;
    }
    if (config.cursorEffects.enabled && config.cursorEffects.trail) {
      mouseX = event.clientX - scopeBounds.left; mouseY = event.clientY - scopeBounds.top;
      lastMove = win.performance.now();
      if (!trailStarted) for (const point of trail) { point.x = mouseX; point.y = mouseY; }
      trailStarted = true;
    }
    if (config.cardEffects.enabled || trailStarted) schedule();
  }
  function leave() { for (const record of cards.values()) record.targetX = record.targetY = record.targetOpacity = 0; if (trailStarted) lastMove = win.performance.now() - 100; schedule(); }
  function click(event) {
    if (event.pointerType !== 'mouse' || !interactive() || !config.cursorEffects.enabled || config.cursorEffects.clickEffect === 'none' || typeof entry.animate !== 'function') return;
    if (!scopeBounds) geometry();
    const ripple = config.cursorEffects.clickEffect === 'ripple';
    const available = particles.filter(particle => !particle.animation).slice(0,ripple ? 1 : 6);
    available.forEach((particle,index) => {
      const x = event.clientX - scopeBounds.left, y = event.clientY - scopeBounds.top;
      const angle = index / 6 * Math.PI * 2;
      particle.node.dataset.kind = ripple ? 'ripple' : 'spark';
      const from = `translate(${x}px,${y}px) scale(${ripple ? .2 : 1})`;
      const to = ripple ? `translate(${x}px,${y}px) scale(2.6)` : `translate(${x+Math.cos(angle)*22}px,${y+Math.sin(angle)*22}px) scale(.2)`;
      const animation = particle.node.animate([{transform:from,opacity:.7},{transform:to,opacity:0}],{duration:ripple?480:380,easing:'cubic-bezier(.2,.7,.3,1)'});
      particle.animation = animation;
      const finish = () => { if (particle.animation === animation) { particle.animation = null; particle.node.style.opacity = '0'; } };
      animation.finished.then(finish,finish);
    });
  }

  function replay({ full = true } = {}) {
    clearEntrances();
    pendingEntrance = undefined;
    if (!config?.entranceEffects.enabled || reduced.matches || typeof entry.animate !== 'function') return;
    if (doc.hidden || !onscreen || !bounds?.width || !bounds?.height) { pendingEntrance = full; return; }
    const settings = config.entranceEffects;
    const play = (node,frames,delay = 0) => {
      const animation = node.animate(frames,{duration:full?settings.duration:Math.min(360,settings.duration),delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      animation.id = 'ascendo-profile-entrance';
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation),() => animations.delete(animation));
    };
    if (!full) { play(entry,[{transform:'translateY(3px)'},{transform:'none'}]); return; }
    if (settings.style === 'stagger') {
      const nodes = [...panel.querySelectorAll('.avatar,.profile__name,.profile-badge,.profile__bio,.social-link,.now-playing')];
      nodes.forEach((node,index) => play(node,[{opacity:0,transform:`translateY(${settings.distance}px)`},{opacity:1,transform:'none'}],Math.min(600,index*settings.stagger)));
      return;
    }
    let from = {opacity:0}, to = {opacity:1};
    if (settings.style === 'slide') {
      const offsets = {up:[0,settings.distance],down:[0,-settings.distance],left:[settings.distance,0],right:[-settings.distance,0]};
      const [horizontal,vertical] = offsets[settings.direction];
      from.transform = `translate(${horizontal}px,${vertical}px)`; to.transform = 'none';
    }
    if (settings.style === 'zoom') { from.transform = `scale(${1-settings.zoom/100})`; to.transform = 'none'; }
    play(entry,[from,to]);
  }

  function update(next, { replayEntrance = false, previewUrls } = {}) {
    const old = config;
    config = next.colorTheme === 'monochrome' ? {...next,accent:'#f2f2f2',cursorEffects:{...next.cursorEffects,color:'#f2f2f2'}} : next;
    const width = layoutWidth(config.cardLayout);
    boundary.style.setProperty('--layout-width',`${width}px`); scope.style.setProperty('--layout-width',`${width}px`);
    syncCards();
    surface.style.setProperty('--accent-rgb',[1,3,5].map(offset=>parseInt(config.accent.slice(offset,offset+2),16)).join(','));
    geometry();
    atmosphere.update(config,{previewUrls}); atmosphere.setActive(!doc.hidden && onscreen);
    const key = JSON.stringify(config.entranceEffects);
    const changed = key !== entranceKey;
    entranceKey = key;
    boundary.toggleAttribute('data-card-effects-active',config.cardEffects.enabled);
    boundary.dispatchEvent(new win.CustomEvent('ascendo:card-effects',{bubbles:true}));
    decorations.style.setProperty('--cursor-color',config.cursorEffects.color);
    prepareDecorations();
    if (JSON.stringify(old?.cursorEffects) !== JSON.stringify(config.cursorEffects)) {
      trailStarted = false; lastMove = -Infinity; clearParticles();
      for (const point of trail) point.node.style.opacity = '0';
    }
    if (!config.cardEffects.enabled) {
      for (const record of cards.values()) resetCard(record);
    } else if (JSON.stringify(old?.cardEffects) !== JSON.stringify(config.cardEffects)) schedule();
    if (!config.cursorEffects.trail && !config.cardEffects.enabled && frame) { clock.cancel(frame); frame = lastTime = 0; }
    if (!config.entranceEffects.enabled) { clearEntrances(); pendingEntrance = undefined; }
    else if (changed || replayEntrance) replay({full:preview || !painted});
    else if (pendingEntrance !== undefined && onscreen && bounds.width && bounds.height) replay({full:pendingEntrance});
    syncCursor();
  }
  function suspend() { neutral(); clearEntrances(); syncCursor(); atmosphere.setActive(false); }
  function visibility() { if (doc.hidden) suspend(); else { geometry(); syncCursor(); atmosphere.setActive(onscreen); if (pendingEntrance !== undefined) replay({full:pendingEntrance}); } }
  function preferences() { suspend(); pendingEntrance = undefined; geometry(); atmosphere.setActive(!doc.hidden && onscreen); }
  listen(scope,'pointermove',pointer,{passive:true});
  listen(scope,'pointerleave',leave,{passive:true});
  listen(scope,'pointerdown',click,{passive:true});
  listen(doc,'visibilitychange',visibility);
  listen(win,'scroll',() => { neutral(); bounds = scopeBounds = null; },{passive:true,capture:true});
  listen(win,'resize',() => { neutral(); geometry(); },{passive:true});
  listen(win,'pagehide',event => { if (event.persisted) suspend(); else destroy(); });
  listen(win,'pageshow',visibility);
  if (doc.fonts) listen(doc.fonts,'loadingdone',geometry);
  listen(scope,'ascendo:preview-size',() => { neutral(); geometry(); atmosphere.setActive(!doc.hidden && onscreen); });
  listen(scope,'ascendo:enter-profile',() => { geometry(); replay(); });
  listen(reduced,'change',preferences); listen(fine,'change',preferences);
  const observer = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    if (!onscreen) suspend(); else { geometry(); syncCursor(); atmosphere.setActive(!doc.hidden); if (pendingEntrance !== undefined) replay({full:pendingEntrance}); }
  }) : null;
  observer?.observe(scope);
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { neutral(); geometry(); }) : null;
  resize?.observe(boundary);
  function destroy() {
    suspend(); abort.abort(); observer?.disconnect(); resize?.disconnect(); clock.cancel(firstPaint); atmosphere.destroy();
    for (const [node,record] of cards) if (node !== panel) { record.boundary.before(node); record.boundary.remove(); }
    cards.clear(); clock.destroy();
    scope.classList.remove('profile-custom-cursor'); scope.style.removeProperty('--custom-cursor');
    decorations.remove(); boundary.before(panel); boundary.remove();
  }
  return {update,replay,destroy};
}
