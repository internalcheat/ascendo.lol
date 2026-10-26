import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {API_URL,PUBLISHABLE_KEY} from '../customizer-config.mjs';
import {publicProfilePath,profileSlug} from '../share-policy.mjs';
import {renderProfileDocument} from '../profile-document.mjs';
import {RUNNER_AUDIENCE} from '../supabase/functions/profile-api/share-runner-auth.mjs';

if(process.env.GITHUB_ACTIONS!=='true')throw Error('This publisher runs only in GitHub Actions.');
const mode=process.argv[2],main=process.env.GITHUB_REF==='refs/heads/main';
async function token(){
  const target=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);target.searchParams.set('audience',RUNNER_AUDIENCE);
  const response=await fetch(target,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});if(!response.ok)throw Error('Could not obtain workflow identity.');
  const result=await response.json();console.log('::add-mask::'+result.value);return result.value;
}
const identity=await token();
async function request(action,{image,job,body={}}={}){
  const response=await fetch(API_URL+'/share/runner/'+action,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+identity,'Content-Type':image?'image/png':'application/json',...(job?{'X-Ascendo-Job':job}:{})},body:image||JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Runner request failed'),{status:response.status,code:response.status===413?'too_large':response.status===409?'profile_changed':'render_failed'});return result;
}
if(mode==='health'){await request('health');console.log('Workflow identity verified.');}
else if(mode==='run'){
  if(!main)throw Error('Only main may publish metadata or service export jobs.');
  const {profiles,jobs}=await request('check');
  if(profiles.length>200||jobs.length>2)throw Error('Unexpected work limit.');
  if(jobs.length){
    const {launchCaptureBrowser,captureProfile}=await import('./profile-capture.mjs');const browser=await launchCaptureBrowser();
    try{for(const job of jobs){try{const image=await captureProfile(browser,job);await request('upload',{job:job.job,image});}catch(error){const code=['timeout','profile_changed','too_large','unavailable'].includes(error.code)?error.code:'render_failed';await request('fail',{job:job.job,body:{code}}).catch(()=>{});console.log('An export could not finish; its owner can retry.');}}}finally{await browser.close();}
  }
  const template=fs.readFileSync('profile-shell.html','utf8'),changed=[];
  for(const profile of profiles){
    if(profileSlug('/'+profile.slug)!==profile.slug)throw Error('Invalid published handle.');
    const file=publicProfilePath(profile.slug).slice(1)+'index.html',html=renderProfileDocument(template,profile.slug,profile);
    if(!fs.existsSync(file)||fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')!==html.replaceAll('\r\n','\n')){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);changed.push(file);}
  }
  if(changed.length){
    execFileSync('git',['config','user.name','github-actions[bot]']);
    execFileSync('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
    execFileSync('git',['add','--',...changed]);execFileSync('git',['commit','-m','Refresh saved profile previews'],{stdio:'pipe'});
    // Refuse to overwrite a concurrent repository change.
    execFileSync('git',['push','origin','HEAD:main'],{stdio:'pipe'});
    const response=await fetch('https://api.github.com/repos/internalcheat/ascendo.lol/pages/builds',{method:'POST',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'},body:'{}'});
    if(!response.ok)throw Error('Could not request the Pages preview build: '+response.status);
  }

  console.log(JSON.stringify({updatedProfiles:changed.length,processedExports:jobs.length}));
}else throw Error('Unknown runner mode.');
