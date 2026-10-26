import {tr} from './studio-i18n.mjs?v=20261026-3';
export function createQuickGuide({layout}){
  const doc=document,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal,reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
  const trigger=make('button','studio-button','Quick Guide?');trigger.id='quickGuide';trigger.type='button';trigger.disabled=true;doc.querySelector('.studio-header__actions').prepend(trigger);
  const dialog=make('dialog','studio-guide'),highlight=make('div','studio-guide-highlight');highlight.hidden=true;highlight.setAttribute('aria-hidden','true');dialog.setAttribute('aria-labelledby','studioGuideTitle');dialog.setAttribute('aria-describedby','studioGuideDescription');
  const top=make('div','studio-guide__top'),count=make('span','studio-help'),close=make('button','studio-guide__close','×');close.type='button';close.setAttribute('aria-label','Close guide');top.append(count,close);
  const heading=make('h2'),description=make('p','studio-help');heading.id='studioGuideTitle';description.id='studioGuideDescription';
  const actions=make('div','studio-guide__actions'),skip=make('button','studio-button','Skip'),back=make('button','studio-button','Back'),next=make('button','studio-button studio-button--primary','Next');for(const button of [skip,back,next])button.type='button';actions.append(skip,back,next);dialog.append(top,heading,description,actions);doc.body.append(highlight,dialog);
  const steps=[
    ['displayName','Your identity','Add your name, picture and links. Your profile address stays the same.'],
    ['colorTheme','Make it yours','Choose colors, fonts and a layout. Everything updates in your private preview.'],
    ['backgroundKind','Set the scene','Choose a background, upload music and set the starting volume. Only your selected background runs.'],
    ['overlaysEnabled','Add a little atmosphere','Pick up to three overlays. Each layer has separate settings and an on/off switch.'],
    ['expandPreview','Check your preview','Expand the preview to check your card. Your draft stays private.'],
    ['saveChanges','Ready when you are','Save publishes your changes. Discard returns to your last save. The guide never changes your settings.']
  ];let index=0,frame=0,target;
  function position(){frame=0;if(!dialog.open||!target)return;const element=target.closest('.studio-section')||target.closest('.studio-dock-action')||target,box=element.getBoundingClientRect();highlight.style.cssText=`left:${Math.max(4,box.left-5)}px;top:${Math.max(4,box.top-5)}px;width:${Math.max(0,Math.min(win.innerWidth-8,box.width+10))}px;height:${Math.max(0,Math.min(win.innerHeight-8,box.height+10))}px`;dialog.dataset.placement=box.top>win.innerHeight*.6?'top':'bottom';}
  function queue(){if(dialog.open&&!frame)frame=win.requestAnimationFrame(position);}
  function render(){
    const [id,title,copy]=steps[index];target=doc.getElementById(id);if(index===4&&win.matchMedia('(max-width:820px)').matches)doc.getElementById('previewTab').click();else if(index<4)layout.reveal(target);
    count.textContent=`${index+1} / ${steps.length}`;heading.textContent=tr(title);description.textContent=tr(copy);back.disabled=index===0;next.textContent=tr(index===steps.length-1?'Finish':'Next');
    (target.closest('.studio-section')||target).scrollIntoView?.({block:'center',behavior:reduced.matches?'instant':'smooth'});highlight.hidden=false;position();
    if(dialog.animate&&!reduced.matches)dialog.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function end(){if(dialog.open)dialog.close();highlight.hidden=true;if(frame)win.cancelAnimationFrame(frame);frame=0;trigger.focus({preventScroll:true});}
  trigger.addEventListener('click',()=>{if(dialog.open)return;index=0;dialog.showModal();render();next.focus({preventScroll:true});},{signal});
  next.addEventListener('click',()=>{if(index===steps.length-1)end();else{index++;render();}},{signal});back.addEventListener('click',()=>{if(index){index--;render();}},{signal});for(const button of [skip,close])button.addEventListener('click',end,{signal});
  dialog.addEventListener('cancel',event=>{event.preventDefault();end();},{signal});dialog.addEventListener('close',()=>{highlight.hidden=true;trigger.focus({preventScroll:true});},{signal});
  doc.addEventListener('ascendo:language',()=>{if(dialog.open)render();},{signal});win.addEventListener('scroll',queue,{capture:true,passive:true,signal});win.addEventListener('resize',queue,{passive:true,signal});
  win.addEventListener('pagehide',event=>{end();if(!event.persisted){abort.abort();dialog.remove();highlight.remove();}},{signal});
  return {ready(){trigger.disabled=false;},close:end};
}
