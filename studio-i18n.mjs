import {EXPRESSION_HU} from './expression-hu.mjs?v=20261026-9';
import {HU} from './studio-hu.mjs?v=20261026-9';
import {STUDIO_COPY} from './studio-copy.mjs?v=20261025-15';
Object.assign(HU,EXPRESSION_HU);
for(const [source,short]of Object.entries(STUDIO_COPY))HU[short]=HU[source];
let language='en';
const parts={'display name':'megjelenő név',bio:'bemutatkozás',badge:'jelvény','song title':'zeneszám címe',artist:'előadó','social label':'oldal neve','social handle':'felhasználónév','copy value':'másolandó érték','music volume':'kezdő hangerő','music source':'zene forrása','background preset':'háttér','avatar crop':'profilkép kivágása','animation speed':'animáció sebessége','effect strength':'effekt erőssége','custom cursor':'egyéni kurzor','cursor style':'kurzor formája','cursor size':'kurzor mérete','cursor trail':'kurzorcsóva','trail length':'csóva hossza','trail smoothness':'csóva simasága','click effect':'kattintási effekt','interactive card':'interaktív kártya','card tilt':'kártya döntése','card parallax':'térbeli mozgás','card glow':'kártya ragyogása','card intensity':'mozgás erőssége','card response speed':'követés sebessége','animated entrance':'megjelenési animáció','entrance style':'megjelenés típusa','slide direction':'becsúszás iránya','entrance duration':'animáció hossza','entrance distance':'elmozdulás','entrance zoom':'nagyítás','stagger gap':'késleltetés','font':'betűtípus','card layout':'elrendezés','color theme':'színvilág',glow:'ragyogás','card opacity':'kártya fedettsége',music:'zene'};
export const studioLanguage=()=>language;
Object.assign(parts,{'theme colors':'téma színei',typography:'tipográfia','text sizes':'szövegméretek','text size':'szövegméret','electric border':'elektromos szegély',overlays:'fedőeffektek','overlay media':'feltöltött fedőréteg','overlay layer':'effektréteg','overlay preset':'fedőeffekt','overlay opacity':'effekt fedettsége','overlay density':'effekt sűrűsége','overlay speed':'effekt sebessége','overlay color mode':'effekt színezése','overlay media type':'fedőréteg típusa','overlay fit':'fedőréteg illesztése','media opacity':'média fedettsége','green-screen removal':'háttérszín eltávolítása','main theme':'fő','secondary theme':'másodlagos','display font':'név betűtípusa','body font':'szöveg betűtípusa','profile color theme':'profil színvilága','electric intensity':'szegély erőssége','electric speed':'szegély sebessége','main card border':'fő kártya szegélye','panel borders':'panelek szegélye','avatar border':'profilkép szegélye','custom overlay':'egyéni fedőréteg',key:'eltávolítandó','key tolerance':'színtűrés','key softness':'szélek lágyítása','soundtrack card':'zenekártya','enter screen':'belépőképernyő','page title':'lapcím',widgets:'widgetek','game settings widget':'játékbeállítások widget','hardware widget':'felszerelés widget','about me widget':'rólam widget','embed widgets':'beágyazott lejátszók','embed widget':'beágyazott lejátszó','field label':'mező megnevezése','field value':'mező értéke','copy action':'másolás','enter-screen text':'belépési szöveg','second enter-screen line':'második belépési sor','enter-screen sound':'belépési hang','enter sound':'belépési hang','enter-sound volume':'belépési hangerő','animated page title':'animált lapcím','page-title effect':'lapcím effektje','title interval':'lapcím váltási ideje','title speed':'lapcím sebessége','widget title':'widget címe',game:'játék',hardware:'felszerelés','about me':'rólam','game settings':'játékbeállítás','embed identifier':'lejátszó azonosítója','embed URL':'lejátszó hivatkozása','embed title':'lejátszó címe','Spotify track list':'Spotify számlista',overlay:'fedőréteg'});
export function tr(value){
  const text=String(value??'');if(language==='en'||!text)return STUDIO_COPY[text]||text;
  if(HU[text])return HU[text];
  let match;
  if((match=text.match(/^Editing (.*?) · Your profile URL stays (.*)$/)))return `${match[1]} szerkesztése · Profilod címe: ${match[2]}`;
  if((match=text.match(/^(\d+) points$/)))return `${match[1]} pont`;
  if((match=text.match(/^(\d+) social rows?$/)))return `${match[1]} elérhetőség`;
  if((match=text.match(/^(\d+) custom sizes?$/)))return `${match[1]} egyéni méret`;
  if((match=text.match(/^(\d+) sections? found$/)))return `${match[1]} találat`;
  if((match=text.match(/^(\d+) (lines|players)$/)))return `${match[1]} ${match[2]==='lines'?'sor':'lejátszó'}`;
  if((match=text.match(/^Uploading (\d+)%$/)))return `Feltöltés: ${match[1]}%`;
  if((match=text.match(/^([\d.]+) MB \/ (250|500) MB used\..*$/)))return `${match[1]} MB / ${match[2]} MB felhasználva. Az eredeti Ascendo-fájlok nem foglalják a tárhelyedet.`;
  if((match=text.match(/^Check (.*?) \((\d+) characters maximum\)\.$/)))return `Ellenőrizd: ${parts[match[1]]||match[1]} (legfeljebb ${match[2]} karakter).`;
  if((match=text.match(/^Check (.*?)\.$/)))return `Ellenőrizd ezt a beállítást: ${parts[match[1]]||tr(match[1])}.`;
  if((match=text.match(/^Choose a supported (.*?)\.$/)))return `Válassz támogatott beállítást: ${parts[match[1]]||tr(match[1])}.`;
  if((match=text.match(/^Choose a valid (.*?) color\.$/)))return `Válassz érvényes színt ehhez: ${parts[match[1]]||match[1]}.`;
  if((match=text.match(/^Use up to twelve (.*?) fields\.$/)))return `Legfeljebb tizenkét mezőt adhatsz meg ehhez: ${parts[match[1]]||match[1]}.`;
  if((match=text.match(/^(Move up|Move down|Remove): (.*)$/)))return `${tr(match[1])}: ${match[2]}`;
  if((match=text.match(/^(.+) hex$/)))return `${tr(match[1])} – hex`;
  if((match=text.match(/^(avatar|poster|backgroundImage|video|overlayImage|overlayVideo|audio) · ([\d.]+ MB) · (pending|ready|published)$/)))return `${{avatar:'Profilkép',poster:'Állókép',backgroundImage:'Háttérkép',video:'Videó',overlayImage:'Fedőkép',overlayVideo:'Fedővideó',audio:'Zene'}[match[1]]} · ${match[2]} · ${{pending:'feltöltés alatt',ready:'privát',published:'közzétéve'}[match[3]]}`;
  if((match=text.match(/^(.*) · (Still preview|Live preview|Animation unavailable\. Showing still preview\.)$/)))return `${match[1]} · ${tr(match[2])}`;
  if((match=text.match(/^Loading (.*)…$/)))return `${match[1]} betöltése…`;
  if(text==='Click to enter')return 'Kattintásos belépés';
  if((match=text.match(/^(\d+)% (glass|intensity)$/)))return `${match[1]}% ${match[2]==='glass'?'üveg':'erősség'}`;
  if(text.includes(' · '))return text.split(' · ').map(part=>tr(part)).join(' · ');
  if(text.includes(' · ')&&/MB/.test(text))return text;
  return text;
}
export function createStudioLanguage({request,onChange=()=>{}}){
  const doc=document,win=doc.defaultView,abort=new win.AbortController(),originals=new WeakMap(),attributes=new WeakMap();let account='',revision=0,saving=Promise.resolve();
  const button=doc.createElement('button');button.type='button';button.id='studioLanguage';button.className='studio-button studio-language';button.textContent='EN';doc.querySelector('.studio-header__actions').prepend(button);
  const excluded=node=>!!node.parentElement?.closest('#previewCard,input,textarea,script,style,[data-user-content]');
  function translateNode(node){
    if(node.nodeType===3){if(excluded(node))return;const actual=node.textContent,record=originals.get(node),source=record&&actual===record.output?record.source:actual,trim=source.trim(),output=source.replace(trim,tr(trim));originals.set(node,{source,output});if(actual!==output)node.textContent=output;return;}
    if(node.nodeType!==1||node.matches('script,style,input:not([aria-label]):not([placeholder]),textarea:not([aria-label]):not([placeholder])'))return;
    if(node.closest('#previewCard,[data-user-content]'))return;
    let records=attributes.get(node);if(!records){records=new Map();attributes.set(node,records);}
    for(const name of ['aria-label','aria-valuetext','placeholder','title','label']){if(!node.hasAttribute(name))continue;const actual=node.getAttribute(name),record=records.get(name),source=record&&actual===record.output?record.source:actual,output=tr(source);records.set(name,{source,output});if(actual!==output)node.setAttribute(name,output);}
    for(const child of node.childNodes)translateNode(child);
  }
  const observer=new win.MutationObserver(records=>{for(const record of records){if(record.type==='childList')for(const node of record.addedNodes)translateNode(node);else if(record.type==='characterData')translateNode(record.target);else translateNode(record.target);}});
  function apply(next){language=next==='hu'?'hu':'en';doc.documentElement.lang=language;button.textContent=language.toUpperCase();button.setAttribute('aria-label',language==='hu'?'Nyelv: magyar. Váltás angolra.':'Language: English. Switch to Hungarian.');translateNode(doc.body);onChange(language);doc.dispatchEvent(new win.CustomEvent('ascendo:language',{detail:{language}}));}
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','aria-valuetext','placeholder','title','label']});
  button.addEventListener('click',()=>{revision++;apply(language==='en'?'hu':'en');if(!account)return;const current=language;try{win.localStorage.setItem(`ascendo-language:${account}`,current);}catch{}saving=saving.catch(()=>{}).then(async()=>{try{await request('/preferences',{method:'PUT',body:{language:current}});}catch{const status=doc.getElementById('editorStatus');if(status)status.textContent=tr('Language saved on this device. Try again later to sync it.');}});},{signal:abort.signal});
  async function setAccount(slug){account=slug;const current=revision;try{apply(win.localStorage.getItem(`ascendo-language:${slug}`)||'en');}catch{apply('en');}try{const result=await request('/preferences');if(revision===current){apply(result.language);try{win.localStorage.setItem(`ascendo-language:${slug}`,language);}catch{}}}catch{}}
  function destroy(){abort.abort();observer.disconnect();button.remove();}
  win.addEventListener('pagehide',event=>{if(!event.persisted)destroy();},{signal:abort.signal});apply('en');
  return {setAccount,apply,translate:()=>translateNode(doc.body),destroy};
}
