import {parseEmbedUrl,embedSource} from './feature-schema.mjs?v=20261025-11';
const caches=new WeakMap();
const names={spotify:'Spotify',apple:'Apple Music',youtube:'YouTube',twitch:'Twitch'};

export function renderWidgets(panel,settings){
  const doc=panel.ownerDocument,win=doc.defaultView;
  const cache=caches.get(panel)||new Map();caches.set(panel,cache);
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function card(title,kind){const node=make('section',`profile-widget profile-widget--${kind}`);node.dataset.widgetKind=kind;node.setAttribute('aria-label',title);const header=make('div','profile-widget__header');header.append(make('span','profile-widget__mark',kind==='game'?'⌖':kind==='hardware'?'⌘':kind==='about'?'i':'♫'),make('h2','profile-widget__title',title));header.firstChild.setAttribute('aria-hidden','true');node.append(header);return node;}
  function fields(node,rows){const list=make('dl','profile-widget__rows');for(const row of rows.filter(row=>row.label&&row.value)){const wrapper=make('div','profile-widget__row'),value=make('dd');value.append(make('span','profile-widget__value',row.value));if(row.copy){const copy=make('button','widget-copy','Copy');copy.type='button';copy.dataset.copy=row.value;copy.dataset.platform=row.label;copy.setAttribute('aria-label',`Copy ${row.label}: ${row.value}`);value.append(copy);}wrapper.append(make('dt','',row.label),value);list.append(wrapper);}node.append(list);}
  function player(media,item){const frame=make('iframe','profile-embed-frame');frame.addEventListener('load',()=>{frame.dataset.embedReady='true';});frame.addEventListener('error',()=>{frame.dataset.embedReady='false';});frame.src=embedSource(media,{showTracks:item.showTracks,parent:win.location.hostname});frame.dataset.embedSrc=frame.src;frame.title=`${names[media.provider]} player: ${item.title||media.kind}`;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.width='100%';frame.height=String(media.provider==='spotify'?(item.showTracks&&['album','playlist'].includes(media.kind)?352:152):media.provider==='apple'?(media.kind==='song'?175:450):media.provider==='twitch'?480:260);return frame;}
  const wanted=[];
  function use(id,value,build){const key=JSON.stringify(value);let record=cache.get(id);if(record?.key!==key){record?.dispose?.();record?.node.remove();record={key,...build()};cache.set(id,record);}wanted.push([id,record.node]);}
  for(const kind of ['game','hardware','about']){
    const value=settings[kind];if(!value.enabled||!value.rows.some(row=>row.label&&row.value)&&!(kind==='about'&&value.text)&&!(kind==='game'&&value.game))continue;
    use(kind,value,()=>{const node=card(value.title||({game:'Game settings',hardware:'Hardware',about:'About me'}[kind]),kind);if(kind==='game'&&value.game)node.append(make('p','profile-widget__subtitle',value.game));if(kind==='about'&&value.text)node.append(make('p','profile-widget__about',value.text));fields(node,value.rows);return {node};});
  }
  if(settings.embeds.enabled)for(const item of settings.embeds.items){
    if(!item.enabled||!item.url)continue;const media=parseEmbedUrl(item.url);
    use('embed-'+item.id,item,()=>{
      const title=item.title||`${names[media.provider]} ${media.kind==='channel'?media.id:media.kind}`;
      const node=card(title,'embed');node.dataset.provider=media.provider;
      const external=make('a','profile-widget__external',`Open ${names[media.provider]} ↗`);external.href=media.url;external.target='_blank';external.rel='noopener noreferrer';external.setAttribute('aria-label',`Open ${title} on ${names[media.provider]} in a new tab`);
      let dialog;
      if(media.provider==='twitch'){
        const open=make('button','widget-player-button','Open Twitch player');open.type='button';node.append(make('p','profile-widget__subtitle',media.kind==='channel'?media.id:'Twitch video'),open,make('p','widget-twitch-note','On small screens, watch on Twitch for a full-size player.'));
        open.addEventListener('click',()=>{
          if(win.innerWidth<480)return;
          if(!dialog){dialog=make('dialog','profile-player-dialog');dialog.setAttribute('aria-label',title);const close=make('button','widget-player-close','Close player');close.type='button';dialog.append(close);doc.body.append(dialog);close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{for(const frame of dialog.querySelectorAll('iframe')){frame.removeAttribute('src');frame.remove();}open.focus({preventScroll:true});});}
          if(!dialog.querySelector('iframe'))dialog.append(player(media,item));dialog.showModal();
        });
      }else node.append(player(media,item));
      node.append(external);
      return {node,dispose(){if(dialog){if(dialog.open)dialog.close();dialog.remove();}for(const frame of node.querySelectorAll('iframe'))frame.removeAttribute('src');}};
    });
  }
  const keep=new Set(wanted.map(([id])=>id));for(const [id,record]of cache)if(!keep.has(id)){record.dispose?.();record.node.remove();cache.delete(id);}
  return wanted.map(([,node])=>node);
}

export function suspendWidgetPlayers(panel){
  for(const node of caches.get(panel)?.values()||[]){for(const frame of node.node.querySelectorAll('iframe[src]')){frame.removeAttribute('src');frame.dataset.suspended='true';}}
  for(const dialog of panel.ownerDocument.querySelectorAll('.profile-player-dialog[open]'))dialog.close();
}
export function resumeWidgetPlayers(panel){for(const frame of panel.querySelectorAll('iframe[data-suspended]')){frame.src=frame.dataset.embedSrc;delete frame.dataset.suspended;}}
