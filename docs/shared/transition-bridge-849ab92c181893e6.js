(() => {
  const root = document.documentElement;
  let pendingNavigation = null;
  const navigate = (href, replace = false) => {
    const url = new URL(href, location.href);
    if (url.href === location.href) return;
    if (root.hasAttribute('data-samey-document-transition')) {
      pendingNavigation = { href: url.href, replace };
      return;
    }
    if (replace) location.replace(url.href);
    else location.assign(url.href);
  };
  const finish = () => {
    root.removeAttribute('data-samey-document-transition');
    dispatchEvent(new Event('samey-document-transitionend'));
    const pending = pendingNavigation;
    pendingNavigation = null;
    if (pending) requestAnimationFrame(() => navigate(pending.href, pending.replace));
  };
  globalThis.SameyDocumentNavigate = navigate;
  document.addEventListener('click', event => {
    if (!root.hasAttribute('data-samey-document-transition')) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.href === location.href) return;
    event.preventDefault();
    navigate(url.href);
  }, true);
  addEventListener('pagereveal', event => {
    const transition = event.viewTransition;
    if (!transition) return;
    root.setAttribute('data-samey-document-transition', '');
    transition.finished.then(finish, finish);
  });
})();
