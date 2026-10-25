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
  let config, entranceKey, bounds, scopeBounds, artwork, pendingEntrance;
  let frame = 0, lastTime = 0, slowFrames = 0, limited = false, onscreen = true;
  let painted = !preview && (doc.readyState === 'complete' || (win.performance.getEntriesByType?.('paint') || []).some(entry => entry.name === 'first-contentful-paint'));
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0, lightOpacity = 0, targetLight = 0;
  let mouseX = 0, mouseY = 0, lastMove = -Infinity, trailStarted = false;
  const animations = new Set();
  const firstPaint = win.requestAnimationFrame(() => { painted = true; });
  const interactive = () => !!config && fine.matches && !reduced.matches && !limited && onscreen && !doc.hidden;
  const cursorEnabled = () => !!config?.cursorEffects.enabled && fine.matches && onscreen && !doc.hidden;
  const cardEnabled = () => interactive() && config.cardEffects.enabled;

  function geometry() {
    bounds = boundary.getBoundingClientRect();
    scopeBounds = scope.getBoundingClientRect();
  }
  function clearEntrances() {
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  function clearParticles() {
    for (const particle of particles) { particle.animation?.cancel(); particle.animation = null; particle.node.style.opacity = '0'; }
  }
  function neutral() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = lastTime = 0;
    targetX = targetY = currentX = currentY = lightOpacity = targetLight = 0;
    surface.style.removeProperty('transform');
    artwork?.style.removeProperty('translate');
    light.style.opacity = '0';
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
  function schedule() { if (!frame && interactive()) frame = win.requestAnimationFrame(step); }
  function step(time) {
    frame = 0;
    if (!interactive()) { neutral(); return; }
    const elapsed = lastTime ? time - lastTime : 16;
    lastTime = time;
    slowFrames = elapsed > 34 ? slowFrames + 1 : 0;
    if (slowFrames >= 10) { limited = true; neutral(); return; }
    let unsettled = false;
    if (config.cardEffects.enabled) {
      const card = config.cardEffects;
      const response = 1 - Math.exp(-Math.min(elapsed,40) * .014 * card.speed);
      currentX += (targetX - currentX) * response;
      currentY += (targetY - currentY) * response;
      lightOpacity += (targetLight - lightOpacity) * response;
      const strength = card.intensity / 100;
      surface.style.transform = card.tilt ? `perspective(900px) rotateX(${-currentY * 6 * strength}deg) rotateY(${currentX * 6 * strength}deg)` : '';
      if (artwork) artwork.style.translate = card.parallax ? `${currentX * 8 * strength}px ${currentY * 8 * strength}px` : '';
      light.style.opacity = card.glow ? String(lightOpacity * strength * .42) : '0';
      orb.style.transform = `translate3d(${(currentX + 1) * bounds.width / 2 - 130}px,${(currentY + 1) * bounds.height / 2 - 130}px,0)`;
      unsettled = Math.abs(targetX-currentX) + Math.abs(targetY-currentY) + Math.abs(targetLight-lightOpacity) > .001;
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
    if (cardEnabled()) {
      const overCard = boundary.contains(event.target) && bounds.width > 0 && bounds.height > 0;
      targetX = overCard ? Math.max(-1,Math.min(1,(event.clientX - bounds.left) / bounds.width * 2 - 1)) : 0;
      targetY = overCard ? Math.max(-1,Math.min(1,(event.clientY - bounds.top) / bounds.height * 2 - 1)) : 0;
      targetLight = overCard ? 1 : 0;
    }
    if (config.cursorEffects.enabled && config.cursorEffects.trail) {
      mouseX = event.clientX - scopeBounds.left; mouseY = event.clientY - scopeBounds.top;
      lastMove = win.performance.now();
      if (!trailStarted) for (const point of trail) { point.x = mouseX; point.y = mouseY; }
      trailStarted = true;
    }
    if (config.cardEffects.enabled || trailStarted) schedule();
  }
  function leave() { targetX = targetY = targetLight = 0; lastMove = -Infinity; schedule(); }
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
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation),() => animations.delete(animation));
    };
    if (!full) { play(entry,[{transform:'translateY(3px)'},{transform:'none'}]); return; }
    if (settings.style === 'stagger') {
      const nodes = [...panel.children].flatMap(node => node.classList.contains('social-list') ? [...node.children] : [node]);
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

  function update(next, { replayEntrance = false } = {}) {
    const old = config;
    config = next;
    const nextArtwork = panel.querySelector('.avatar');
    if (artwork !== nextArtwork) { artwork?.style.removeProperty('translate'); artwork = nextArtwork; targetX = targetY = targetLight = 0; schedule(); }
    surface.style.setProperty('--accent-rgb',[1,3,5].map(offset=>parseInt(config.accent.slice(offset,offset+2),16)).join(','));
    geometry();
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
      targetX = targetY = currentX = currentY = lightOpacity = targetLight = 0;
      surface.style.removeProperty('transform'); artwork?.style.removeProperty('translate'); light.style.opacity = '0';
    } else if (JSON.stringify(old?.cardEffects) !== JSON.stringify(config.cardEffects)) schedule();
    if (!config.cursorEffects.trail && !config.cardEffects.enabled && frame) { win.cancelAnimationFrame(frame); frame = lastTime = 0; }
    if (!config.entranceEffects.enabled) { clearEntrances(); pendingEntrance = undefined; }
    else if (changed || replayEntrance) replay({full:preview || !painted});
    else if (pendingEntrance !== undefined && onscreen && bounds.width && bounds.height) replay({full:pendingEntrance});
    syncCursor();
  }
  function suspend() { neutral(); clearEntrances(); syncCursor(); }
  function visibility() { if (doc.hidden) suspend(); else { geometry(); syncCursor(); if (pendingEntrance !== undefined) replay({full:pendingEntrance}); } }
  function preferences() { suspend(); pendingEntrance = undefined; geometry(); }
  listen(scope,'pointermove',pointer,{passive:true});
  listen(scope,'pointerleave',leave,{passive:true});
  listen(scope,'pointerdown',click,{passive:true});
  listen(doc,'visibilitychange',visibility);
  listen(win,'scroll',() => { neutral(); bounds = scopeBounds = null; },{passive:true,capture:true});
  listen(win,'resize',() => { neutral(); geometry(); },{passive:true});
  listen(win,'pagehide',suspend);
  listen(win,'pageshow',() => { geometry(); syncCursor(); });
  listen(reduced,'change',preferences); listen(fine,'change',preferences);
  const observer = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    if (!onscreen) suspend(); else { geometry(); syncCursor(); if (pendingEntrance !== undefined) replay({full:pendingEntrance}); }
  }) : null;
  observer?.observe(scope);
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { neutral(); geometry(); }) : null;
  resize?.observe(boundary);
  function destroy() {
    suspend(); abort.abort(); observer?.disconnect(); resize?.disconnect(); win.cancelAnimationFrame(firstPaint);
    scope.classList.remove('profile-custom-cursor'); scope.style.removeProperty('--custom-cursor');
    decorations.remove(); boundary.before(panel); boundary.remove();
  }
  return {update,replay,destroy};
}
