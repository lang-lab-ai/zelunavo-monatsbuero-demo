(() => {
  'use strict';
  const links = [...document.querySelectorAll('nav.main-menu a')];
  const update = () => {
    const active = links.some(link => link.getAttribute('href') === location.hash)
      ? location.hash : '#month-title';
    for (const link of links) {
      if (link.getAttribute('href') === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  addEventListener('hashchange', update);
  const menu=document.querySelector('.main-menu-dropdown');
  menu?.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    target?.closest('details')?.setAttribute('open', '');
    setTimeout(() => { menu.open = false; }, 0);
  });
  update();
})();
