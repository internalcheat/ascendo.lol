import {Window} from 'happy-dom';
import {normalizeProfile} from './profile-schema.mjs';
import {renderProfile} from './profile-view.mjs';
import {profileSlug,metadataHtml,jsonForHtml} from './share-policy.mjs';

export function renderProfileDocument(template,slug,result){
  if(profileSlug('/'+slug)!==slug||!Number.isSafeInteger(result.revision)||result.revision<1)throw Error('Invalid published profile.');
  const config=normalizeProfile(result.config);
  const win=new Window({url:'https://ascendo.lol/'+slug+'/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
  const previous=globalThis.document;globalThis.document=win.document;
  try{
    const panel=win.document.createElement('section');panel.className='profile__panel';renderProfile(panel,config);
    const identity=panel.outerHTML;
    return template.replace('<!--PROFILE_METADATA-->',metadataHtml(slug,config)).replace('PROFILE_SLUG',slug)
      .replace('<section class="profile__panel"><!--PROFILE_IDENTITY--></section>',identity)
      .replace('<!--PROFILE_BOOTSTRAP-->',`<script id="profileBootstrap" type="application/json">${jsonForHtml({slug,revision:result.revision,config})}</script>`);
  }finally{globalThis.document=previous;win.happyDOM.close();}
}
