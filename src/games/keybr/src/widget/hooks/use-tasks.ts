import { Tasks } from "@keybr/lang";
import { onCleanup } from "solid-js";

export const useTasks = () => {
  const tasks = new Tasks();
  onCleanup(() => tasks.cancelAll());
  return tasks;
};
