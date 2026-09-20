import { Tasks } from "../../../lang/tasks.ts";
import { Move } from "../../../../../shared/components/Icons.tsx";
import { clsx } from "clsx";
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { useDocumentEvent } from "../../hooks/use-document-event.ts";
import { useWindowEvent } from "../../hooks/use-window-event.ts";
import { Icon } from "../icon/Icon.tsx";
import { place } from "./place.ts";
import styles from "./Zoomer.module.css";
import { type ZoomablePosition, type ZoomerProps } from "./Zoomer.types.ts";

const globalMoving = { current: null as HTMLElement | null };
const savedPositions = new Map<string, ZoomablePosition>();

export function Zoomer(props: ZoomerProps): JSX.Element {
  let root!: HTMLDivElement;
  let dragBounds: {
    x: number;
    y: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null = null;
  let dragPosition: ZoomablePosition | null = null;
  const [hover, setHover] = createSignal(false);
  const [moving, setMoving] = createSignal(false);
  const [position, setPosition] = createSignal<ZoomablePosition>(() => (props.id && savedPositions.get(props.id)) || { x: 0, y: 0, zoom: 1 });

  useDocumentEvent("mousedown", (ev) => {
    if (!moving() && contains(root, ev.target)) {
      const p = position();
      const rect = root.getBoundingClientRect();
      dragBounds = {
        x: p.x,
        y: p.y,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
      dragPosition = { ...p };
      setMoving(true); setHover(false); globalMoving.current = root; ev.preventDefault();
    }
  });
  useDocumentEvent("mouseup", (ev) => {
    if (moving()) {
      const next = dragPosition;
      dragBounds = null;
      dragPosition = null;
      if (next) setPosition(next);
      setMoving(false); setHover(true); globalMoving.current = null; ev.preventDefault();
    }
  });
  useDocumentEvent("mousemove", (ev) => {
    if (!moving()) return;
    const current = dragPosition ?? position();
    let x = current.x + ev.movementX;
    let y = current.y + ev.movementY;
    const bounds = dragBounds;
    if (bounds) {
      const dx = x - bounds.x;
      const dy = y - bounds.y;
      const left = bounds.left + dx;
      const right = bounds.right + dx;
      const top = bounds.top + dy;
      const bottom = bounds.bottom + dy;
      if (left < 0) x -= left;
      else if (right > innerWidth) x -= right - innerWidth;
      if (top < 0) y -= top;
      else if (bottom > innerHeight) y -= bottom - innerHeight;
    }
    dragPosition = { x: Math.floor(x), y: Math.floor(y), zoom: current.zoom };
    root.style.left = String(dragPosition.x) + "px";
    root.style.top = String(dragPosition.y) + "px";
    ev.preventDefault();
  });
  useWindowEvent("blur", () => {
    if (!moving()) return;
    const next = dragPosition;
    dragBounds = null;
    dragPosition = null;
    if (next) setPosition(next);
    setMoving(false);
    setHover(false);
    if (globalMoving.current === root) globalMoving.current = null;
  });
  useWindowEvent("resize", () => setPosition((p) => place(root).fitToScreen(p)));

  createEffect(() => ({ position: position(), moving: moving() }), ({ position: p, moving: active }) => {
    if (active) return;
    const next = place(root).fitToScreen(p);
    if (next.x !== p.x || next.y !== p.y || next.zoom !== p.zoom) setPosition(next);
  });
  createEffect(() => ({ id: props.id, position: position() }), value => {
    if (value.id) savedPositions.set(value.id, value.position);
  });
  createEffect(hover, active => {
    if (!active) return;
    const tasks = new Tasks();
    tasks.delayed(1000, () => setHover(false));
    return () => tasks.cancelAll();
  });
  onCleanup(() => { if (globalMoving.current === root) globalMoving.current = null; });

  const child = () => typeof props.children === "function" ? props.children(moving) : props.children;
  return (
    <div
      ref={root}
      class={clsx(styles.root, (hover() || moving()) && styles.hover)}
      style={{ position: "relative", left: `${position().x}px`, top: `${position().y}px`, transform: `scale(${position().zoom})` }}
      onWheel={(ev) => {
        setPosition((p) => ({ ...p, zoom: p.zoom - Math.sign(ev.deltaY) * 0.05 }));
        setHover(true); ev.preventDefault();
      }}
      onMouseEnter={() => setHover(globalMoving.current == null)}
      onMouseLeave={() => setHover(false)}
      onClick={(ev) => { if (ev.altKey) { setHover(false); setMoving(false); setPosition({ x: 0, y: 0, zoom: 1 }); } }}
    >
      {child()}
      {(hover() || moving()) && <Icon className={styles.icon} shape={Move} />}
    </div>
  );
}

function contains(root: Element, target: unknown): boolean { return target instanceof Element && (root === target || root.contains(target)); }
