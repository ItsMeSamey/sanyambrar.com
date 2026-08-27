import { createEffect, createSignal, onCleanup } from 'solid-js';
import type { Entry } from '../data';

function githubReadme(href: string) {
  const url = new URL(href);
  if (url.hostname === 'github.com' && !url.hash) url.hash = 'readme';
  return url.href;
}

type DragState = {
  id: number;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
  moved: boolean;
};

export function ExternalBrowser(props: { entry: Entry }) {
  const href = githubReadme(props.entry.href);
  const [fullscreen, setFullscreen] = createSignal(false);
  let controls!: HTMLDivElement;
  let drag: DragState | null = null;

  const resetControls = () => {
    controls.style.left = '';
    controls.style.top = '';
    controls.style.right = '';
    controls.removeAttribute('data-dragging');
  };

  const toggleFullscreen = () => {
    setFullscreen(value => !value);
    resetControls();
  };

  const clampControls = () => {
    if (!fullscreen() || !controls.style.left) return;
    const rect = controls.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, innerHeight - rect.height - margin);
    controls.style.left = `${Math.min(Math.max(margin, rect.left), maxLeft)}px`;
    controls.style.top = `${Math.min(Math.max(margin, rect.top), maxTop)}px`;
    controls.style.right = 'auto';
  };

  createEffect(() => {
    document.documentElement.toggleAttribute('data-external-browser-open', fullscreen());
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && fullscreen()) toggleFullscreen();
  };
  const onResize = () => clampControls();
  addEventListener('keydown', onKeyDown);
  addEventListener('resize', onResize, { passive: true });
  onCleanup(() => {
    removeEventListener('keydown', onKeyDown);
    removeEventListener('resize', onResize);
    document.documentElement.removeAttribute('data-external-browser-open');
  });

  const onPointerDown = (event: PointerEvent) => {
    if (!fullscreen() || (event.target as Element).closest('button')) return;
    const rect = controls.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    controls.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    controls.dataset.dragging = '';
    const margin = 8;
    const maxLeft = Math.max(margin, innerWidth - drag.width - margin);
    const maxTop = Math.max(margin, innerHeight - drag.height - margin);
    controls.style.right = 'auto';
    controls.style.left = `${Math.min(Math.max(margin, drag.left + dx), maxLeft)}px`;
    controls.style.top = `${Math.min(Math.max(margin, drag.top + dy), maxTop)}px`;
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (controls.hasPointerCapture(event.pointerId)) controls.releasePointerCapture(event.pointerId);
    controls.removeAttribute('data-dragging');
    drag = null;
  };

  return <section class="detail-browser-section" aria-label={`${props.entry.title} preview`}>
    <div class="detail-browser" data-fullscreen={fullscreen() ? '' : undefined}>
      <div
        ref={controls}
        class="detail-browser-controls"
        aria-label="Embedded page controls"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          class="detail-browser-button"
          type="button"
          onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
          aria-label="Open in new tab"
          title="Open in new tab"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>
        </button>
        <span class="detail-browser-divider" aria-hidden="true"/>
        <button
          class="detail-browser-button"
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen() ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={fullscreen() ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {fullscreen()
              ? <><path d="M8 8H3V3"/><path d="M16 8h5V3"/><path d="M8 16H3v5"/><path d="M16 16h5v5"/></>
              : <><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></>}
          </svg>
        </button>
      </div>
      <iframe src={href} title={props.entry.title} loading="lazy" referrerpolicy="strict-origin-when-cross-origin"/>
    </div>
  </section>;
}
