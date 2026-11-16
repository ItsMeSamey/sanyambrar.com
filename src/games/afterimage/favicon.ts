const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function afterimageFavicon(background: string, ink: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${escapeAttribute(background)}"/><g transform="translate(4 4)" fill="none" stroke="${escapeAttribute(ink)}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 3v18M3 12h9"/><path d="M12 3h5a4 4 0 0 1 4 4v5h-9Z" fill="${escapeAttribute(ink)}" stroke="none"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function installAfterimageFavicon() {
  const icon = document.querySelector<HTMLLinkElement>('link[data-afterimage-icon]');
  if (!icon) return;
  const original = icon.getAttribute('href');
  const update = () => {
    const style = getComputedStyle(document.documentElement);
    const background = style.getPropertyValue('--site-bg').trim();
    const ink = style.getPropertyValue('--site-accent-fg').trim();
    if (background && ink) icon.href = afterimageFavicon(background, ink);
  };
  update();
  window.addEventListener('samey-themechange', update);
  return () => {
    window.removeEventListener('samey-themechange', update);
    if (original) icon.setAttribute('href', original);
  };
}
