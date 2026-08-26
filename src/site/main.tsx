import { render } from 'solid-js/web';
import { App } from './App';

const root = document.getElementById('site-root');
if (!root) throw new Error('missing #site-root');
render(() => <App />, root);
