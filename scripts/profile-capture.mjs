import fs from 'node:fs';
import path from 'node:path';
import {renderProfileDocument} from '../profile-document.mjs';
import {captureOptions,CAPTURE_HOSTS} from '../share-capture-policy.mjs';
import {pngDimensions,profileSlug} from '../share-policy.mjs';

const types={html:'text/html',mjs:'text/javascript',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',ico:'image/x-icon',woff2:'font/woff2',wasm:'application/wasm'};
export function publicAsset(root,pathname){
  let decoded;try{decoded=decodeURIComponent(pathname);}catch{return null;}
  if(decoded.split('/').some(part=>part.startsWith('.')||['supabase','node_modules','tests','scripts','worker'].includes(part)))return null;
  const extension=decoded.split('.').at(-1),mime=types[extension];if(!mime)return null;
  const target=path.resolve(root,'.'+decoded);if(!target.startsWith(path.resolve(root)+path.sep))return null;
  return fs.existsSync(target)&&fs.statSync(target).isFile()?{target,mime}:null;
}
export function permittedRequest(url,type){
  if(['media','websocket','eventsource','ping'].includes(type))return false;
  let parsed;try{parsed=new URL(url);}catch{return false;}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||!CAPTURE_HOSTS.has(parsed.hostname))return false;
  if(parsed.hostname==='fstdttaxflayhtwhnbih.supabase.co'&&!parsed.pathname.startsWith('/storage/v1/object/public/')&&!/^\/functions\/v1\/profile-api\/public\/[a-z0-9-]+\/?$/.test(parsed.pathname))return false;
  return true;
}
export async function captureProfile(browser,job,{root=process.cwd(),logger=()=>{}}={}){
  if(profileSlug('/'+job.slug)!==job.slug)throw Error('Invalid capture identity.');
  const options=captureOptions(job.slug,job.revision),html=renderProfileDocument(fs.readFileSync(path.join(root,'profile-shell.html'),'utf8'),job.slug,job);
  const context=await browser.createBrowserContext(),page=await context.newPage();let timer;
  const failure=code=>Object.assign(Error(code),{code});
  const run=async()=>{
    await page.setViewport(options.viewport);
    await page.setRequestInterception(true);
    page.on('popup',popup=>popup.close());
    page.on('request',request=>{
      const respond=async()=>{
        if(!['GET','HEAD'].includes(request.method())||!permittedRequest(request.url(),request.resourceType()))return request.abort();
        const url=new URL(request.url());
        if(url.hostname==='ascendo.lol'){
          if(request.isNavigationRequest()&&request.frame()===page.mainFrame()&&url.pathname===new URL(options.url).pathname)return request.respond({status:200,contentType:'text/html; charset=utf-8',body:html});
          const asset=publicAsset(root,url.pathname);
          if(asset)return request.respond({status:200,contentType:asset.mime,body:fs.readFileSync(asset.target)});
        }
        return request.continue();
      };
      respond().catch(()=>request.abort().catch(()=>{}));
    });
    await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForSelector('[data-share-capture-state="ready"],[data-share-capture-state="failed"]',{timeout:20000});
    const state=await page.evaluate(()=>({state:document.documentElement.dataset.shareCaptureState,error:document.documentElement.dataset.shareCaptureError,revision:Number(document.body.dataset.profileRevision)}));
    if(state.revision!==job.revision)throw failure('profile_changed');
    if(state.state!=='ready')throw failure(state.error||'render_failed');
    // CDP evaluates each provider in its own frame without clicking or playing it.
    await Promise.all(page.frames().filter(frame=>frame.parentFrame()).map(async frame=>{
      let loaded=false;
      try{
        loaded=await Promise.race([frame.evaluate(()=>{const text=(document.body?.innerText||'').trim();return text.length>15&&!/^(loading|access denied|forbidden|unavailable|error)[.!…\s]*$/i.test(text);}),new Promise(resolve=>setTimeout(()=>resolve(false),1500))]);
      }catch{}
      if(!loaded)try{const element=await frame.frameElement();await element.evaluate(node=>{const tile=document.createElement('div');tile.className='share-capture-fallback';const title=document.createElement('strong');title.textContent=node.title||'Media player';const detail=document.createElement('span');detail.textContent='Open the profile to play';tile.append(title,detail);node.replaceWith(tile);});}catch{}
    }));
    await page.evaluate(()=>{for(const media of document.querySelectorAll('audio,video')){media.muted=true;media.pause();}for(const animation of document.getAnimations()){try{const timing=animation.effect?.getComputedTiming();Number.isFinite(timing?.endTime)?animation.finish():animation.pause();}catch{}}});
    const image=new Uint8Array(await page.screenshot(options.screenshot));
    try{pngDimensions(image);}catch{throw failure('too_large');}
    logger({width:1920,bytes:image.length});return image;
  };
  try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(failure('timeout')),options.timeout);})]);}
  finally{clearTimeout(timer);await context.close().catch(()=>{});}
}

export async function launchCaptureBrowser(){
  if(process.env.GITHUB_ACTIONS!=='true')throw Error('Native capture runs only in the repository workflow.');
  const {default:puppeteer}=await import('puppeteer-core');
  const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(file=>fs.existsSync(file));
  if(!executablePath)throw Error('Chrome is unavailable on this runner.');
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL','DISPLAY','XDG_RUNTIME_DIR'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
  return puppeteer.launch({executablePath,headless:true,env,args:['--disable-dev-shm-usage','--mute-audio','--autoplay-policy=user-gesture-required']});
}
