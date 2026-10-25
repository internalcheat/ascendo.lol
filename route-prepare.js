(() => {
  if(!/^\/[A-Za-z0-9-]{3,24}\/?$/.test(location.pathname))return;
  document.documentElement.classList.add('profile-route-pending');
  setTimeout(()=>document.documentElement.classList.remove('profile-route-pending'),5500);
})();
