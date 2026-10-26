import {element} from './profile-view.mjs?v=20261026-3';

const categories=[
  {id:'profile',name:'Profile',help:'Your name, picture and the places people can find you.',icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-2a7 7 0 0 1 14 0v2'},
  {id:'appearance',name:'Appearance',help:'Color, typography and the shape of your card.',icon:'M4 4h7v7H4zM14 4h6v6h-6zM4 14h6v6H4zM14 13h7v7h-7z'},
  {id:'backgrounds',name:'Backgrounds',help:'Video, images, music and animated backgrounds.',icon:'m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5'},
  {id:'widgets',name:'Widgets',help:'Your soundtrack, game settings, kit, details and media players.',icon:'M3 3h8v8H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h8v7H3z'},
  {id:'effects',name:'Effects',help:'A little movement, light and atmosphere. Make it your own.',icon:'m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z'},
  {id:'media',name:'Media',help:'Manage your uploaded pictures and videos.',icon:'M4 3h16v18H4V3Zm0 13 5-5 4 4 3-3 4 4M8 7h.01'}
];
const definitions=[
  ['identity','Identity','profile','Name, bio and badge'],['avatar','Avatar','profile','Profile picture and crop'],['socials','Social rows','profile','Links and copy buttons'],
  ['style','Style','appearance','Theme, color and glass'],['fonts','Fonts','appearance','Display and body faces, gothic and bubbly'],['sizes','Text Sizes','appearance','Individual text sizes'],['layout','Card Layout','appearance','Classic, Crest, Portrait, Bento, Magazine, Deck, Stack, Wall, Spine, Collage, Flow, Numbers'],
  ['backgrounds','Backgrounds & soundtrack','backgrounds','Video, image, music and animated presets'],
  ['enter','Enter Screen','backgrounds','Click to enter, intro text, second line and sounds','enterEnabled'],
  ['soundtrack','Soundtrack Card','widgets','Optional song card, removable, audio information','soundtrackEnabled'],['gamewidget','Game Settings Widget','widgets','Sensitivity, DPI, resolution, crosshair and game settings','gameWidgetEnabled'],['hardwarewidget','Hardware Widget','widgets','Mouse, keyboard, PC, headset, trackers and hardware','hardwareWidgetEnabled'],['aboutwidget','About Me Widget','widgets','About me, personal details and information','aboutWidgetEnabled'],['embedwidget','Embed Widgets','widgets','Spotify, Apple Music, YouTube, Twitch, playlist and album players','embedsWidgetEnabled'],
  ['name','Name Animation','effects','Glitch, shimmer, typewriter, glow'],['cursor','Custom Cursors','effects','Cursor, trails and click effects','cursorEnabled'],['card','Interactive Cards','effects','Tilt, parallax and dynamic glow','cardEnabled'],['entrance','Animated Entrances','effects','Fade, slide, zoom and stagger','entranceEnabled'],['electric','Electric Border','effects','Moving outlines and light','electricEnabled'],['overlays','Overlays','effects','Snow, rain, petals and custom media','overlaysEnabled'],
  ['titles','Animated Page Titles','effects','Browser tab title, typewriter, scroll and time on page','titleEnabled'],
  ['media','Your media','media','Upload library and storage']
];
const searchable=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();

export function createEditorLayout({isBusy=()=>false,onNavigate=()=>{}}={}){
  const byId=id=>document.getElementById(id),form=byId('profileForm'),controls=byId('controlsPanel');
  if(!byId('studioActionDock'))return {refresh(){},reveal(){}};
  const win=document.defaultView,abort=new win.AbortController(),signal=abort.signal;
  const listen=(target,type,callback,options={})=>target.addEventListener(type,callback,{...options,signal});
  let active='profile',query='',beforeSearch,disposed=false;
  const icon=path=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d',path);svg.append(line);return svg;};
  const nameSection=element('section','studio-section studio-panel');nameSection.append(element('h2','','Name Animation'),element('p','studio-help','Glows and movement for your display name.'));
  const nameFields=element('div','studio-fields');for(const id of ['effect','glow','effectSpeed','effectStrength'])nameFields.append(byId(id).closest('label'));
  nameFields.append(byId('effectHelp').closest('.studio-effect-tools'));nameSection.append(nameFields);controls.insertBefore(nameSection,byId('cursorEnabled').closest('.studio-section'));

  const tools=element('div','studio-tools'),searchBox=element('div','studio-search');searchBox.append(icon('m21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z'));
  const search=element('input','studio-input');Object.assign(search,{id:'studioSearch',type:'search',placeholder:'Find a setting…',autocomplete:'off'});search.setAttribute('aria-label','Find a setting');search.setAttribute('aria-describedby','studioSearchCount');
  const shortcut=element('kbd','studio-search-shortcut','Ctrl K');shortcut.setAttribute('aria-hidden','true');searchBox.append(search,shortcut);tools.append(searchBox,element('p','studio-help','Search settings or choose a category.'));
  const workspace=element('div','studio-workspace'),rail=element('nav','studio-nav'),content=element('div','studio-workspace-content');rail.setAttribute('aria-label','Settings categories');
  const tabs=document.querySelector('.studio-tabs');form.before(tools,workspace);workspace.append(rail,content);content.append(tabs,form);
  const heading=element('div','studio-controls-heading'),categoryTitle=element('h2','','Profile'),categoryHelp=element('p','studio-help',categories[0].help),count=element('p','studio-search-count');count.id='studioSearchCount';count.setAttribute('role','status');count.setAttribute('aria-live','polite');heading.append(categoryTitle,categoryHelp,count);controls.prepend(heading);
  const empty=element('div','studio-empty studio-panel');empty.hidden=true;empty.append(element('h3','','No settings found'),element('p','studio-help','Try a shorter search, such as font, cursor or glow.'));const clear=element('button','studio-button','Clear search');clear.type='button';empty.append(clear);controls.append(empty);
  const navButtons=new Map(),records=[];

  function expanded(record,value){
    record.open=value;record.node.dataset.expanded=String(value);record.button.setAttribute('aria-expanded',String(value));record.body.inert=!value;record.body.setAttribute('aria-hidden',String(!value));
  }
  for(const [id,title,category,keywords,masterId]of definitions){
    const node=[...controls.querySelectorAll('.studio-section')].find(section=>section.querySelector('h2')?.textContent===title);if(!node)continue;
    const titleNode=node.querySelector('h2'),oldHeading=titleNode.parentElement,master=masterId?byId(masterId):null,masterLabel=master?.closest('label');
    const header=element('div','studio-section-heading studio-disclosure-heading'),button=element('button','studio-disclosure');button.type='button';button.id=`studio-section-${id}-toggle`;button.setAttribute('aria-controls',`studio-section-${id}-body`);
    const copy=element('span','studio-disclosure-copy'),summary=element('span','studio-section-summary');copy.append(element('span','studio-section-title',title),summary);button.append(copy,icon('m8 10 4 4 4-4'));titleNode.replaceChildren(button);header.append(titleNode);if(masterLabel)header.append(masterLabel);if(oldHeading!==node)oldHeading.remove();
    const body=element('div','studio-collapse'),inner=element('div','studio-collapse-inner');body.id=`studio-section-${id}-body`;body.setAttribute('role','region');body.setAttribute('aria-labelledby',button.id);for(const child of [...node.childNodes])if(child!==titleNode&&child!==header)inner.append(child);body.append(inner);node.replaceChildren(header,body);node.id=`studio-section-${id}`;node.dataset.studioCategory=category;
    const record={id,title,category,keywords,node,button,body,summary,master,open:false,lastEnabled:undefined};records.push(record);
    expanded(record,['identity','style','layout','backgrounds','media'].includes(id));
    listen(button,'click',()=>{expanded(record,!record.open);if(beforeSearch)beforeSearch.set(id,record.open);});
  }
  for(const category of categories){
    const button=element('button','studio-nav-button');button.type='button';button.dataset.category=category.id;button.setAttribute('aria-controls','controlsPanel');button.append(icon(category.icon),element('span','',category.name),element('span','studio-nav-count',String(records.filter(record=>record.category===category.id).length)));rail.append(button);navButtons.set(category.id,button);
    listen(button,'click',()=>{setSearch('');active=category.id;render();onNavigate();heading.scrollIntoView?.({block:'start',behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  }
  listen(rail,'keydown',event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const buttons=[...navButtons.values()],index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+buttons.length)%buttons.length;buttons[next].focus();});

  function setSearch(value){
    const next=searchable(value);if(next&&!query)beforeSearch=new Map(records.map(record=>[record.id,record.open]));if(!next&&query){for(const record of records)expanded(record,beforeSearch?.get(record.id)??record.open);beforeSearch=undefined;}query=next;search.value=value;
  }
  function render(){
    const category=categories.find(item=>item.id===active),terms=query.split(/\s+/).filter(Boolean);let matches=0;
    for(const record of records){
      const index=searchable(`${record.title} ${record.keywords} ${record.body.textContent}`),match=terms.every(term=>index.includes(term));record.node.hidden=query?!match:record.category!==active;
      if(query&&match){matches++;expanded(record,true);}
      record.node.querySelectorAll('.studio-label,.studio-check').forEach(label=>label.classList.toggle('studio-search-match',!!query&&terms.every(term=>searchable(label.textContent+' '+[...label.querySelectorAll('[aria-label]')].map(control=>control.getAttribute('aria-label')).join(' ')).includes(term))));
    }
    for(const [id,button]of navButtons)button.setAttribute('aria-current',String(!query&&id===active));
    categoryTitle.textContent=query?'Search results':category.name;categoryHelp.textContent=query?'Matching sections from across your studio.':category.help;count.textContent=query?`${matches} ${matches===1?'section':'sections'} found`:'';empty.hidden=!query||matches>0;
  }
  listen(search,'input',()=>{setSearch(search.value);render();});listen(clear,'click',()=>{setSearch('');render();search.focus();});
  listen(search,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();setSearch('');render();}if(event.key==='Enter'){event.preventDefault();records.find(record=>!record.node.hidden)?.button.focus();}});
  listen(document,'keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!byId('editorContent').hidden&&!byId('previewDialog').open){event.preventDefault();showStatus(false);search.focus();search.select();}});
  function reveal(control){const record=records.find(item=>item.node.contains(control));if(!record)return;setSearch('');active=record.category;expanded(record,true);render();onNavigate();}
  listen(form,'invalid',event=>reveal(event.target),{capture:true});

  const selected=id=>byId(id)?.options?.[byId(id).selectedIndex]?.textContent||'';
  function summaryFor(record){
    if(record.master&&!record.master.checked)return 'Off';
    switch(record.id){
      case 'identity':return byId('displayName').value||'Name, bio and badge';
      case 'socials':{const rows=byId('socialRows').children.length;return `${rows} social ${rows===1?'row':'rows'}`;}
      case 'style':return `${selected('colorTheme')} · ${byId('opacity').value}% glass`;
      case 'fonts':return selected('displayFont')===selected('bodyFont')?selected('displayFont'):`${selected('displayFont')} / ${selected('bodyFont')}`;
      case 'sizes':{const custom=[...document.querySelectorAll('[id^="sizeAuto-"]')].filter(control=>!control.checked).length;return custom?`${custom} custom ${custom===1?'size':'sizes'}`:'Auto sizing';}
      case 'layout':return document.querySelector('[name="cardLayout"]:checked')?.value.replace(/^./,letter=>letter.toUpperCase())||'Classic';
      case 'backgrounds':return selected('backgroundKind');
      case 'enter':return byId('enterSoundEnabled').checked?`Click to enter · ${selected('enterSound')}`:'Click to enter · sound off';
      case 'soundtrack':return 'Music and playback information';
      case 'titles':return `${selected('titleEffect')} · ${byId('titleLines').value.split(/\r?\n/).filter(line=>line.trim()).length} lines`;
      case 'gamewidget':return byId('widgetGameName').value||'Game settings and crosshair';
      case 'hardwarewidget':return 'Your kit and hardware';
      case 'aboutwidget':return byId('widgetAboutText').value?'About text and personal fields':'Personal fields';
      case 'embedwidget':return `${byId('embedWidgetRows').children.length} players`;
      case 'name':return byId('effect').value==='none'?'Off':`${selected('effect')} · ${(Number(byId('effectSpeed').value)/100).toFixed(1)}×`;
      case 'cursor':return `${selected('cursorStyle')} · ${byId('cursorSize').value}px`;
      case 'card':return `${byId('cardIntensity').value}% intensity · ${byId('cardSpeed').value}×`;
      case 'entrance':return `${selected('entranceStyle')} · ${byId('entranceDuration').value}ms`;
      case 'electric':return `${byId('electricIntensity').value}% intensity · ${byId('electricSpeed').value}×`;
      case 'overlays':{const layers=byId('overlayLayers').children.length,media=byId('overlayMediaEnabled').checked;return layers?`${layers} preset ${layers===1?'layer':'layers'}${media?' + media':''}`:media?'Custom media':'Choose a layer';}
      case 'media':{const files=byId('mediaLibrary').querySelectorAll('.media-library__item').length;return files?`${files} uploaded ${files===1?'file':'files'}`:'Upload library and storage';}
      default:return record.keywords;
    }
  }
  function refresh(){
    if(disposed)return;for(const record of records){record.summary.textContent=summaryFor(record);if(record.master){const enabled=record.master.checked;if(enabled!==record.lastEnabled){expanded(record,enabled);record.lastEnabled=enabled;if(beforeSearch)beforeSearch.set(record.id,enabled);}record.node.dataset.effectEnabled=String(enabled);}}
  }

  const dock=byId('studioActionDock'),statusButton=byId('studioStatusButton'),statusPanel=byId('studioStatusPanel');
  for(const button of document.querySelectorAll('.studio-floating-actions > button')){const slot=element('span','studio-dock-slot');button.before(slot);slot.append(button);}
  let hadConflict=false;
  function showStatus(open,focus=false){statusPanel.hidden=!open;statusButton.setAttribute('aria-expanded',String(open));if(!open&&focus)statusButton.focus();}
  listen(statusButton,'click',()=>showStatus(statusPanel.hidden));
  listen(document,'pointerdown',event=>{if(!dock.contains(event.target))showStatus(false);});
  listen(document,'keydown',event=>{if(event.key==='Escape'&&!statusPanel.hidden){event.preventDefault();showStatus(false,true);}});
  listen(statusPanel,'click',event=>{if(event.target.closest('button')&&!isBusy())showStatus(false);});
  function status(){
    const saving=form.getAttribute('aria-busy')==='true',conflict=!byId('reloadLatest').hidden,dirty=byId('saveState').textContent==='Unpublished changes';
    const text=saving?'Saving…':conflict?'Review':dirty?'Unsaved':'Saved';dock.dataset.state=saving?'saving':conflict?'conflict':dirty?'dirty':'saved';byId('studioDockStatusLabel').textContent=text;statusButton.setAttribute('aria-label',`${saving?'Publishing profile':conflict?'Profile changed in another tab':byId('saveState').textContent}. Show save status and recovery`);
    statusButton.querySelector('path').setAttribute('d',saving?'M12 7v5l3 2':conflict?'m9 9 6 6m0-6-6 6':dirty?'M12 7.5v5M12 16h.01':'m8.5 12 2.2 2.2 4.8-4.8');
    if(conflict&&!hadConflict)showStatus(true);hadConflict=conflict;
  }
  const observer=new win.MutationObserver(status);observer.observe(byId('saveState'),{childList:true,subtree:true});observer.observe(form,{attributes:true,attributeFilter:['aria-busy']});observer.observe(byId('reloadLatest'),{attributes:true,attributeFilter:['hidden']});
  const lists=new win.MutationObserver(refresh);for(const id of ['mediaLibrary','socialRows','overlayLayers','embedWidgetRows'])if(byId(id))lists.observe(byId(id),{childList:true});
  listen(win,'pagehide',event=>{if(event.persisted)return;disposed=true;abort.abort();observer.disconnect();lists.disconnect();});
  document.body.classList.add('studio-organized');refresh();render();status();
  return {refresh,reveal};
}
