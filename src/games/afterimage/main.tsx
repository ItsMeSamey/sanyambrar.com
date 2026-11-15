import './style.css';
import { render } from '@solidjs/web';
import { App } from './App.tsx';
import { renderFatalError } from '../../shared/error.ts';
import { onSharedRuntimeReady } from '../../shared/runtimeReady.ts';
import { afterVisualTransition } from '../../shared/afterVisualTransition.ts';

onSharedRuntimeReady(() => {
  afterVisualTransition(() => {
    const host = document.getElementById('app');
    if (!host) return;
    try { host.replaceChildren(); render(() => <App/>, host); }
    catch (error) { renderFatalError(host, 'Afterimage failed to start', error); throw error; }
  });
});
