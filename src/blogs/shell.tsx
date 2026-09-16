import { render } from '@solidjs/web';
import { BackLink, TopBar } from '../shared/components/TopBar.tsx';
import './btop-lock.ts';

const host = document.getElementById('article-chrome');
if (host) {
  const dispose = render(() => <TopBar start={<BackLink href="../../blog">Writing</BackLink>}/>, host);
  addEventListener('samey-pageleave', dispose, {once:true});
}
