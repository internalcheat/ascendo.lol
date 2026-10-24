(() => {
  'use strict';

  const visual = document.querySelector('.nf-visual');
  let visualIsVisible = true;
  function syncArtwork() { document.body.classList.toggle('nf-art-paused', document.hidden || !visualIsVisible); }
  if (visual && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visualIsVisible = entries.some(entry => entry.isIntersecting);
      syncArtwork();
    }, { threshold: .01 });
    observer.observe(visual);
  }
  document.addEventListener('visibilitychange', syncArtwork);
  window.addEventListener('pagehide', () => document.body.classList.add('nf-art-paused'));
  window.addEventListener('pageshow', syncArtwork);
  syncArtwork();
})();
