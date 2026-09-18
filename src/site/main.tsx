import { render } from '@solidjs/web';
import { App } from './App';

let disposeCurrent: (() => void) | undefined;

function mountSolidSite() {
  if (disposeCurrent) return;
  const root = document.getElementById('site-root');
  if (!root) throw new Error('Site mount node #site-root is missing');
  disposeCurrent = render(() => <App />, root);
}

function disposeSolidSite() {
  disposeCurrent?.();
  disposeCurrent = undefined;
}

Object.assign(globalThis, { SameyMountSolid: mountSolidSite, SameySolidDispose: disposeSolidSite });
mountSolidSite();
