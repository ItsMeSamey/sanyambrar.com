import { type ClassName } from "@keybr/widget";
import { mdiAlarmCheck, mdiTrophy } from "@keybr/solid-compat/mdi";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./event-icons.module.css";
import { Dynamic } from "solid-js/web";
import { type LucideIcon } from "lucide-solid";
export function TrophyIcon() {
    return <Icon shape={mdiTrophy} className={styles.trophy}/>;
}
export function DailyGoalIcon() {
    return <Icon shape={mdiAlarmCheck}/>;
}
function Icon(solidProps: {
    readonly shape: string | LucideIcon;
    readonly className?: ClassName;
}) {
    if (typeof solidProps.shape === "function") return <Dynamic component={solidProps.shape} class={clsx(styles.icon, solidProps.className)} />;
    return (<svg class={clsx(styles.icon, solidProps.className)} viewBox="0 0 24 24"><path d={solidProps.shape}/></svg>);
}
