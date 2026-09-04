import { Tasks } from "@keybr/lang";
import { useEffect, useRef } from "@keybr/solid-compat/react";
export const useTasks = () => {
    const ref = useRef<Tasks>(null!);
    const tasks = ref.current ?? (ref.current = new Tasks());
    useEffect(() => {
        return () => {
            tasks.cancelAll();
        };
    }, () => []);
    return tasks;
};
