(() => {
  'use strict';

  const visual = document.querySelector('.nf-visual');
  const abort=new AbortController(),options={signal:abort.signal};let observer;
  let visualIsVisible = true;
  function syncArtwork() { document.body.classList.toggle('nf-art-paused', document.hidden || !visualIsVisible); }
  if (visual && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visualIsVisible = entries.some(entry => entry.isIntersecting);
      syncArtwork();
    }, { threshold: .01 });
    observer.observe(visual);
  }
  document.addEventListener('visibilitychange', syncArtwork,options);
  window.addEventListener('pagehide', () => document.body.classList.add('nf-art-paused'),options);
  window.addEventListener('pageshow', syncArtwork,options);
  document.addEventListener('ascendo:leave-notfound',()=>{abort.abort();observer?.disconnect();document.body.classList.remove('nf-art-paused');},{once:true});
  syncArtwork();
})();
