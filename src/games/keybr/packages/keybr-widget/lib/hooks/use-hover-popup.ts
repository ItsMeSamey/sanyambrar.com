import { useEffect, useState } from "@keybr/solid-compat/react";
import { useTasks } from "./use-tasks.ts";

type Visible<T> = T & { type: "visible-in" | "visible" | "visible-out" };
export type HoverPopupState<T> = { type: "hidden" } | Visible<T>;

export function useHoverPopup<T extends Record<string, unknown>>(delay = 300) {
  const [state, setState] = useState<HoverPopupState<T>>({ type: "hidden" });
  const tasks = useTasks();
  const replace = (next: HoverPopupState<T>) => setState(() => next);
  useEffect(() => {
    tasks.cancelAll();
    const current = state();
    if (current.type === "visible-in")
      tasks.delayed(delay, () => replace({ ...current, type: "visible" }));
    else if (current.type === "visible-out")
      tasks.delayed(delay, () => replace({ type: "hidden" }));
  }, () => [state()]);

  const leave = () => {
    const current = state();
    if (current.type === "visible-in") replace({ type: "hidden" });
    else if (current.type === "visible") replace({ ...current, type: "visible-out" });
  };
  const hold = () => {
    const current = state();
    if (current.type !== "hidden") replace({ ...current, type: "visible" });
  };
  const dismiss = () => {
    const current = state();
    if (current.type !== "hidden") replace({ ...current, type: "visible-out" });
  };
  return { state, show: (payload: T) => replace({ ...payload, type: "visible-in" }), leave, hold, dismiss };
}
