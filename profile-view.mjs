import { normalizeProfile, safeUrl } from './profile-schema.mjs?v=20261025-4';

export function element(tag, className = '', content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

const marks = {
  instagram: ['M7 3.5h10a3.5 3.5 0 0 1 3.5 3.5v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5Z','M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M17.5 6.5h.01'],
  tiktok: ['M14 3v12.5a4.5 4.5 0 1 1-4-4.47','M14 3c1 4 3 5 6 5'],
  twitch: ['M4 3h17v12l-5 5h-5l-4 3v-3H4V3Z','M10 7v6m5-6v6'],
  x: ['M4 3h4l12 18h-4L4 3Z','m20 3-7 8m-2 3-7 7'],
  spotify: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z','M6 9c4-1.4 8-1 12 .7M7 12.5c3-1 6-1 10 .7M8 16c3-.8 5-.6 8 .5'],
  website: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z','M2 12h20M12 2c5 5 5 15 0 20-5-5-5-15 0-20Z'],
  external: ['M13 5h6v6M19 5l-9 9M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5'],
  copy: ['M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z','M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2']
};

export function icon(name) {
  const local = { discord:'discord.svg', github:'github.svg', minecraft:'minecraft-creeper.svg', youtube:'youtube.svg',tiktok:'tiktok.svg' };
  if (local[name]) {
    const image = element('img');
    image.src = `/assets/${local[name]}`;
    image.alt = '';
    image.width = 24;
    image.height = 24;
    image.setAttribute('aria-hidden', 'true');
    return image;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  for (const [name, value] of Object.entries({ viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true' })) svg.setAttribute(name, value);
  for (const value of marks[name] || marks.website) {
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d', value);
    svg.append(path);
  }
  return svg;
}

export function appendBio(container, bio) {
  for (const line of bio.split('\n')) {
    if (!line.trim()) continue;
    const paragraph = element('p');
    let offset = 0;
    for (const match of line.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/g)) {
      paragraph.append(document.createTextNode(line.slice(offset, match.index)));
      try {
        const anchor = element('a','',match[1]);
        anchor.href = safeUrl(match[2], false);
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        paragraph.append(anchor);
      } catch { paragraph.append(document.createTextNode(match[0])); }
      offset = match.index + match[0].length;
    }
    paragraph.append(document.createTextNode(line.slice(offset)));
    container.append(paragraph);
  }
}

export function musicCard(soundtrack) {
  const card = element('section','now-playing');
  card.setAttribute('aria-label','Profile soundtrack');
  const symbol = element('span','now-playing__symbol','♫');
  symbol.setAttribute('aria-hidden','true');
  const info = element('div','now-playing__info');
  info.append(element('span','now-playing__eyebrow','Soundtrack'),element('strong','now-playing__title',soundtrack.title || 'Profile soundtrack'));
  if (soundtrack.artist) info.append(element('span','now-playing__artist',soundtrack.artist));
  const state = element('span','now-playing__state','Loading');
  state.dataset.musicState = '';
  const footer = element('div','now-playing__footer');
  const track = element('span','now-playing__track');
  const fill = element('span','now-playing__fill');
  track.append(fill);
  const time = element('span','now-playing__time','0:00 / —');
  footer.append(track,time);
  card.append(symbol,info,state,footer);
  return card;
}

const effectDurations = { glitch:2800, shimmer:3200, typewriter:1100, pulse:2800, aurora:4600, wave:2400, float:3600 };

function profileName(config) {
  const heading = element('h1','profile__name');
  heading.setAttribute('aria-label',config.name);
  heading.dataset.displayName = config.name;
  heading.dataset.effect = config.effect;
  heading.style.setProperty('--name-length',String(Array.from(config.name).length));
  const text = element('span','name-text');
  text.setAttribute('aria-hidden','true');
  text.dataset.text = config.name;
  if(config.effect === 'wave') {
    const letters = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(config.name)].map(part=>part.segment) : Array.from(config.name);
    letters.forEach((letter,index)=>{
      const span = element('span','name-letter',letter);
      span.style.setProperty('--letter-index',String(index));
      text.append(span);
    });
  } else text.textContent = config.name;
  heading.append(text);
  return heading;
}

export function replayNameEffect(panel) {
  const heading = panel.querySelector('.profile__name');
  for(const animation of heading?.getAnimations?.({subtree:true}) || []) {
    if(animation.id === 'ascendo-profile-entrance') continue;
    animation.currentTime = 0;
    animation.play();
  }
}

export function bindNameEffectVisibility() {
  const update = () => document.documentElement.classList.toggle('name-effects-paused',document.hidden);
  document.addEventListener('visibilitychange',update);
  update();
}

export function renderProfile(panel, input, options = {}) {
  const config = normalizeProfile(input);
  const resolved = value => options.previewUrls?.get(value) || value;
  panel.classList.add('custom-profile');
  panel.dataset.effect = config.effect;
  const rgb = [1,3,5].map(offset => parseInt(config.accent.slice(offset,offset+2),16)).join(',');
  panel.style.setProperty('--profile-accent',config.accent);
  panel.style.setProperty('--accent-rgb',rgb);
  panel.style.setProperty('--profile-opacity',String(config.opacity / 100));
  panel.style.setProperty('--name-glow',String(config.glow / 100));
  panel.style.setProperty('--effect-strength',String(config.effectStrength / 100));
  const tint = (channels) => `rgb(${channels.map(channel=>Math.round(255+(channel-255)*config.effectStrength/100)).join(',')})`;
  panel.style.setProperty('--effect-color',tint(rgb.split(',').map(Number)));
  panel.style.setProperty('--effect-cyan',tint([126,232,255]));
  panel.style.setProperty('--effect-duration',`${(effectDurations[config.effect] || 2800) * 100 / config.effectSpeed}ms`);
  panel.style.setProperty('--effect-step',`${-50 * 100 / config.effectSpeed}ms`);
  const avatar = element('span','avatar avatar--large');
  const image = element('img');
  image.src = resolved(config.avatar.url);
  image.alt = '';
  image.width = image.height = 112;
  image.style.objectPosition = `${config.avatar.x}% ${config.avatar.y}%`;
  if (config.avatar.poster) {
    const picture = element('picture');
    const source = element('source');
    source.media = '(prefers-reduced-motion: reduce)';
    source.srcset = resolved(config.avatar.poster);
    picture.append(source,image);
    image.addEventListener('error',()=>{source.remove(); if(image.src !== resolved(config.avatar.poster)) image.src=resolved(config.avatar.poster);},{once:true});
    avatar.append(picture);
  } else avatar.append(image);
  const existingName = panel.querySelector('.profile__name');
  const name = existingName?.dataset.displayName === config.name && existingName.dataset.effect === config.effect ? existingName : profileName(config);
  const nodes = [avatar,name];
  if (config.badge) nodes.push(element('span','profile-badge',config.badge));
  if (config.bio) { const bio = element('div','profile__bio'); appendBio(bio,config.bio); nodes.push(bio); }
  nodes.push(element('div','profile__divider'));
  const socials = element('nav','social-list');
  socials.setAttribute('aria-label',`${config.name} socials`);
  for (const row of config.socials) {
    const control = element(row.action === 'copy' ? 'button' : 'a','social-link');
    if (row.action === 'copy') {
      control.type = 'button'; control.dataset.copy = row.value; control.dataset.platform = row.label;
      control.setAttribute('aria-label',`Copy ${row.label}: ${row.handle}`);
    } else {
      control.href = row.value; control.target='_blank'; control.rel='noopener noreferrer';
      control.setAttribute('aria-label',`Open ${row.label}: ${row.handle} (opens in a new tab)`);
    }
    const symbol = element('span','social-link__symbol'); symbol.append(icon(row.icon));
    const info = element('span','social-link__info'); info.append(element('span','social-link__platform',row.label),element('span','social-link__handle',row.handle));
    const arrow = icon(row.action === 'copy' ? 'copy' : 'external'); arrow.classList.add('copy-mark');
    control.append(symbol,info,arrow); socials.append(control);
  }
  nodes.push(socials);
  if (config.background.kind === 'video') nodes.push(musicCard(config.soundtrack));
  nodes.forEach((node,index)=>{
    const current = panel.children[index];
    if(current === node) return;
    if(current) current.replaceWith(node);
    else panel.append(node);
  });
  while(panel.children.length > nodes.length) panel.lastElementChild.remove();
  panel.setAttribute('aria-label',`${config.name} profile`);
  return config;
}

export function bindMusic(video, panel) {
  const time = value => { const seconds = Number.isFinite(value) ? Math.max(0,Math.floor(value)) : 0; return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; };
  function update() {
    if(document.hidden)return;
    const card = panel.querySelector('.now-playing');
    if (!card) return;
    const state = video.error ? 'Unavailable' : !video.currentSrc ? 'Sound off' : video.readyState < 2 ? 'Loading' : video.paused ? 'Not playing' : video.muted || video.volume === 0 ? 'Muted' : 'Playing';
    card.querySelector('.now-playing__state').textContent=state;
    card.dataset.state=state.toLowerCase().replaceAll(' ','-');
    card.querySelector('.now-playing__time').textContent=`${time(video.currentTime)} / ${Number.isFinite(video.duration)?time(video.duration):'—'}`;
    const ratio = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1,video.currentTime/video.duration) : 0;
    card.querySelector('.now-playing__fill').style.transform=`scaleX(${ratio})`;
  }
  for (const event of ['timeupdate','durationchange','loadedmetadata','playing','pause','volumechange','waiting','error','emptied']) video.addEventListener(event,update);
  update();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  return update;
}
