import { Show, createSignal, onCleanup, onMount, type JSX } from 'solid-js';

type Disposer = () => void;

export function EngineBoundary<T>(props: {
  load: () => Promise<T>;
  mount: (module: T) => Disposer | void;
  label: string;
  children: JSX.Element;
}) {
  const [error, setError] = createSignal<unknown>(null);
  const [loading, setLoading] = createSignal(true);
  let disposed = false;
  let generation = 0;
  let disposeEngine: Disposer = () => {};

  const start = async () => {
    const releaseLoading = globalThis.SameyLoadingBegin?.() ?? (() => {});
    const id = ++generation;
    setError(null);
    setLoading(true);
    try { disposeEngine(); } catch {}
    disposeEngine = () => {};
    try {
      const module = await props.load();
      if (disposed || id !== generation) return;
      disposeEngine = props.mount(module) || (() => {});
      setLoading(false);
    } catch (cause) {
      if (disposed || id !== generation) return;
      setLoading(false);
      setError(cause);
    } finally {
      releaseLoading();
    }
  };

  onMount(() => { void start(); });
  onCleanup(() => {
    disposed = true;
    generation++;
    try { disposeEngine(); } catch {}
  });

  return <>
    {props.children}
    <Show when={loading()}>
      <div class="engine-state engine-state-loading" role="status" aria-live="polite">Loading {props.label}</div>
    </Show>
    <Show when={error()}>{cause =>
      <aside class="engine-state engine-state-error" role="alert" aria-live="assertive">
        <strong>{props.label} failed to start</strong>
        <span>{cause() instanceof Error ? (cause() as Error).message : String(cause())}</span>
        <button type="button" onClick={() => void start()}>Retry</button>
      </aside>
    }</Show>
  </>;
}
