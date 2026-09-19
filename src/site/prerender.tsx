import { createComponent, renderToString } from '@solidjs/web';
import { App, preloadSiteRoute } from './App';

export async function prerenderSiteRoute(href: string) {
  const url = new URL(href);
  await preloadSiteRoute(url);
  return renderToString(() => createComponent(App, { initialUrl: url.href }), {
    renderId: 'site',
    manifest: {},
    noScripts: true,
  });
}
