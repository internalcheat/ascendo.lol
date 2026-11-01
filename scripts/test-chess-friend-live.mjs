import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchCaptureBrowser} from './profile-capture.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Live checks run only on GitHub Actions.');
const out='test-results/chess-friend-live',errors=[],responses=[];fs.mkdirSync(out,{recursive:true});
const browser=await launchCaptureBrowser(),pages=[];const square=s=>`#board [data-square="${s}"]`;
async function page(){const c=await browser.createBrowserContext(),p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/functions/v1/chess-api/'))responses.push({method:r.request().method(),status:r.status()});});return p;}
async function move(p,from,to){await p.waitForSelector(square(from)+'.can-select');await p.click(square(from));await p.waitForSelector(square(to)+'.legal');await p.click(square(to));}
try{
 const a=await page(),b=await page();await a.setViewport({width:1280,height:1000});await b.setViewport({width:390,height:950,isMobile:true,hasTouch:true});
 await a.goto('https://ascendo.lol/chess/',{waitUntil:'networkidle0'});await a.type('#nickname','Ascendo audit A');await a.click('[name=color][value=w]');await a.click('[name=time][value=untimed]');await a.click('#startButton');await a.waitForSelector('#game:not([hidden])');const invite=await a.$eval('#inviteUrl',n=>n.value);
 await b.goto(invite,{waitUntil:'networkidle0'});await b.type('#nickname','Ascendo audit B');await b.click('#startButton');await b.waitForSelector('#game:not([hidden])');await a.waitForFunction(()=>document.getElementById('boardNotice').hidden);
 await move(a,'e2','e4');await b.waitForFunction(()=>document.querySelector('[data-square=e4]').getAttribute('aria-label').includes('white pawn'));await move(b,'e7','e5');await a.waitForFunction(()=>document.querySelector('[data-square=e5]').getAttribute('aria-label').includes('black pawn'));
 await move(b,'b8','c6');assert.equal(await b.$eval('#premoveStatus',n=>n.hidden),false);await move(a,'g1','f3');for(const p of [a,b])await p.waitForFunction(()=>document.querySelectorAll('#moveList li span').length===4);assert.equal(await b.$eval('#premoveStatus',n=>n.hidden),true);
 await b.click('#offerDraw');await a.waitForSelector('#drawPanel:not([hidden])');await a.click('#acceptDraw');for(const p of [a,b])await p.waitForFunction(()=>document.getElementById('gameStatus').textContent.includes('Draw agreed'));
 const connections=await Promise.all(pages.map(p=>p.$eval('#connection',n=>n.textContent)));assert.deepEqual(errors,[]);assert.equal(responses.some(r=>r.status>=400),false,JSON.stringify(responses));await a.screenshot({path:out+'/desktop.png',fullPage:true});await b.screenshot({path:out+'/mobile.png',fullPage:true});fs.writeFileSync(out+'/results.json',JSON.stringify({live:true,privateGuestGameFinished:true,plies:4,connections,responses,errors},null,2));console.log(JSON.stringify({live:true,privateGuestGameFinished:true,plies:4,connections,errors}));
}catch(e){for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:out+`/failure-${i}.png`,fullPage:true});fs.writeFileSync(out+'/failure.json',JSON.stringify({message:e.message,stack:e.stack,responses,errors},null,2));throw e;}finally{await browser.close();}
