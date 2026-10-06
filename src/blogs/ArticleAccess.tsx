import { createEffect, createSignal, Show } from 'solid-js';
import { Check, Copy, Lock, LockOpen } from '../shared/components/Icons.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../shared/components/Popover.tsx';

export function ArticleAccess() {
  const [open, setOpen] = createSignal(false);
  const [unlocked, setUnlocked] = createSignal(document.documentElement.dataset.articleUnlocked === 'true');
  const [hasKey, setHasKey] = createSignal(document.documentElement.dataset.articleHasKey === 'true');
  const [copyState, setCopyState] = createSignal<'idle' | 'copying' | 'copied' | 'error'>('idle');
  let copyRequest: symbol | undefined;
  createEffect(() => null, () => {
    const update = () => {
      setUnlocked(document.documentElement.dataset.articleUnlocked === 'true');
      setHasKey(document.documentElement.dataset.articleHasKey === 'true');
      copyRequest = undefined;
      setCopyState('idle');
    };
    const copied = (event: Event) => {
      const { request, success } = (event as CustomEvent<{ request: symbol; success: boolean }>).detail;
      if (request !== copyRequest) return;
      copyRequest = undefined;
      setCopyState(success ? 'copied' : 'error');
    };
    addEventListener('samey-article-state', update);
    addEventListener('samey-article-copy-result', copied);
    update();
    return () => {
      copyRequest = undefined;
      removeEventListener('samey-article-state', update);
      removeEventListener('samey-article-copy-result', copied);
    };
  });
  const act = (action: 'lock' | 'copy-link') => {
    if (action === 'copy-link') {
      if (copyRequest || !hasKey()) return;
      copyRequest = Symbol();
      setCopyState('copying');
      dispatchEvent(new CustomEvent('samey-article-copy-link', { detail: copyRequest }));
      return;
    }
    setOpen(false);
    dispatchEvent(new Event('samey-article-' + action));
  };
  return <Popover open={open()} onOpenChange={value => {
    setOpen(value);
    if (value && !copyRequest) setCopyState('idle');
  }} placement="bottom-end">
    <PopoverTrigger class="site-topbar-icon" aria-label="Article access" title={unlocked() ? 'Article unlocked' : 'Article locked'}>
      <Show when={unlocked()} fallback={<Lock/>}><LockOpen/></Show>
    </PopoverTrigger>
    <PopoverContent class="article-access-menu" aria-label="Article access">
      <button type="button" disabled={!hasKey() || copyState() === 'copying'} onClick={() => act('copy-link')}>
        <Show when={copyState() === 'copied'} fallback={<Copy/>}><Check/></Show>
        <span aria-live="polite">{copyState() === 'copying' ? 'Copying' : copyState() === 'copied' ? 'Copied' : copyState() === 'error' ? 'Copy failed. Try again' : 'Copy URL with key'}</span>
      </button>
      <button type="button" disabled={!hasKey()} onClick={() => act('lock')}><Lock/><span>Lock article</span></button>
    </PopoverContent>
  </Popover>;
}
