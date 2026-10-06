import { render } from '@solidjs/web';
import { BackLink, TopBar } from '../shared/components/TopBar.tsx';
import { ArticleAccess } from './ArticleAccess.tsx';

const host = document.getElementById('article-chrome');
const canonicalPath = document.querySelector<HTMLMetaElement>('meta[name="article-path"]')?.content;
if (canonicalPath && location.pathname !== canonicalPath) history.replaceState(history.state, '', canonicalPath + location.search + location.hash);
if (host) {
  const privateArticle = document.documentElement.dataset.siteKind === 'private-article';
  let dispose: (() => void) | undefined;
  const mount = () => {
    dispose ??= render(() => <TopBar start={<BackLink href="/blog/">Writing</BackLink>} actions={privateArticle ? <ArticleAccess/> : undefined}/>, host);
  };
  const leave = () => { dispose?.(); dispose = undefined; };
  mount();
  addEventListener('samey-pageleave', leave);
  addEventListener('pagehide', leave);
  addEventListener('pageshow', event => { if (event.persisted) mount(); });
}
