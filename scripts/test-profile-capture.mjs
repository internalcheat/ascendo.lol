import fs from 'node:fs';
import assert from 'node:assert/strict';
import {normalizeProfile} from '../profile-schema.mjs';
import {launchCaptureBrowser,captureProfile} from './profile-capture.mjs';
import {pngDimensions} from '../share-policy.mjs';

// Isolated fixtures on GitHub's runner, never in an owner's studio.
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Native screenshot checks run only in GitHub Actions.');
const seed=JSON.parse(fs.readFileSync('supabase/seed-profiles.json','utf8')).internalcheats;
const browser=await launchCaptureBrowser(),report=[];
fs.mkdirSync('test-results/capture',{recursive:true});
try{
  for(const layout of ['classic','crest','portrait','bento','magazine','deck','stack','wall','spine','collage','flow','numbers']){
    const config=normalizeProfile({...seed,name:'Saved profile',bio:'A complete profile, with its saved style.',cardLayout:layout,background:{kind:'black'},soundtrackCard:{enabled:true},
      widgets:{about:{enabled:true,text:'This is an isolated screenshot fixture. Nothing here changes a real profile.'}}});
    const image=await captureProfile(browser,{slug:'share-fixture',revision:1,config});
    const size=pngDimensions(image);assert.equal(size.width,1920);assert.ok(size.height>800);
    fs.writeFileSync('test-results/capture/'+layout+'.png',image);report.push({layout,...size,bytes:image.length});
  }
  const config=normalizeProfile({...seed,name:'A longer saved profile',bio:'Long saved biography. '.repeat(40),background:{kind:'black'},socials:Array.from({length:16},(_,i)=>({...seed.socials[0],handle:'Saved handle '+(i+1)}))});
  const long=await captureProfile(browser,{slug:'share-fixture',revision:1,config});const size=pngDimensions(long);
  assert.ok(size.height>1500);fs.writeFileSync('test-results/capture/long-profile.png',long);report.push({layout:'long',...size,bytes:long.length});
}finally{await browser.close();}
fs.writeFileSync('test-results/capture/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
