import {publicProfileUrl} from './share-policy.mjs';
export const CAPTURE_HOSTS=new Set(['ascendo.lol','fstdttaxflayhtwhnbih.supabase.co','open.spotify.com','api.spotify.com','api-partner.spotify.com','embed-cdn.spotifycdn.com','i.scdn.co','encore.scdn.co','image-cdn-fa.spotifycdn.com','embed.music.apple.com','is1-ssl.mzstatic.com','is2-ssl.mzstatic.com','is3-ssl.mzstatic.com','is4-ssl.mzstatic.com','is5-ssl.mzstatic.com','www.youtube-nocookie.com','www.youtube.com','i.ytimg.com','s.ytimg.com','player.twitch.tv','static.twitchcdn.net']);
export function captureOptions(slug,revision){
  if(!Number.isSafeInteger(revision)||revision<1)throw Error('Invalid saved revision.');
  const url=new URL(publicProfileUrl(slug));url.searchParams.set('__ascendo_capture','1');url.searchParams.set('__ascendo_revision',String(revision));
  return {url:url.href,viewport:{width:1280,height:720,deviceScaleFactor:1.5},screenshot:{type:'png',fullPage:true,captureBeyondViewport:true},timeout:45000};
}
