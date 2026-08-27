import { render } from 'solid-js/web';
import { App } from './App';

let disposeCurrent: (() => void) | undefined;

function mountSolidSite() {
  if (disposeCurrent) return;
  const root = document.getElementById('site-root');
  if (!root) return;
  disposeCurrent = render(() => <App />, root);
}

function disposeSolidSite() {
  disposeCurrent?.();
  disposeCurrent = undefined;
}

Object.assign(globalThis, { SameyMountSolid: mountSolidSite, SameySolidDispose: disposeSolidSite });
mountSolidSite();
