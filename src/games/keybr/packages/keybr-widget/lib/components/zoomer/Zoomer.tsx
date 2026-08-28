import { Tasks } from "@keybr/lang";
import { mdiCursorMove } from "@keybr/solid-compat/mdi";
import { clsx } from "@keybr/solid-compat/clsx";
import { createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { useDocumentEvent, useWindowEvent } from "../../hooks/index.ts";
import { Icon } from "../icon/index.ts";
import { place } from "./place.ts";
import * as styles from "./Zoomer.module.css";
import { type ZoomablePosition, type ZoomerProps } from "./Zoomer.types.ts";

const globalMoving = { current: null as HTMLElement | null };
const savedPositions = new Map<string, ZoomablePosition>();

export function Zoomer(props: ZoomerProps): JSX.Element {
  let root!: HTMLDivElement;
  const [hover, setHover] = createSignal(false);
  const [moving, setMoving] = createSignal(false);
  const [position, setPosition] = createSignal<ZoomablePosition>((props.id && savedPositions.get(props.id)) || { x: 0, y: 0, zoom: 1 });

  useDocumentEvent("mousedown", (ev) => {
    if (!moving() && contains(root, ev.target)) {
      setMoving(true); setHover(false); globalMoving.current = root; ev.preventDefault();
    }
  });
  useDocumentEvent("mouseup", (ev) => {
    if (moving()) { setMoving(false); setHover(true); globalMoving.current = null; ev.preventDefault(); }
  });
  useDocumentEvent("mousemove", (ev) => {
    if (!moving()) return;
    setPosition((p) => ({ x: p.x + ev.movementX, y: p.y + ev.movementY, zoom: p.zoom }));
    ev.preventDefault();
  });
  useWindowEvent("resize", () => setPosition((p) => place(root).fitToScreen(p)));

  createEffect(() => {
    const p = position();
    queueMicrotask(() => setPosition(place(root).fitToScreen(p)));
  });
  createEffect(() => { if (props.id) savedPositions.set(props.id, position()); });
  createEffect(() => {
    if (!hover()) return;
    const tasks = new Tasks();
    tasks.delayed(1000, () => setHover(false));
    onCleanup(() => tasks.cancelAll());
  });

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
      {(hover() || moving()) && <Icon className={styles.icon} shape={mdiCursorMove} />}
    </div>
  );
}

function contains(root: Element, target: unknown): boolean { return target instanceof Element && (root === target || root.contains(target)); }
