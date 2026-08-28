import { type ClassName } from "@keybr/widget";
import { mdiAlarmCheck, mdiTrophy } from "@keybr/solid-compat/mdi";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./event-icons.module.css";
import { Dynamic } from "solid-js/web";
export function TrophyIcon() {
    return <Icon shape={mdiTrophy} className={styles.trophy}/>;
}
export function DailyGoalIcon() {
    return <Icon shape={mdiAlarmCheck}/>;
}
function Icon({ shape, className, }: {
    readonly shape: string | ((props: any) => any);
    readonly className?: ClassName;
}) {
    if (typeof shape === "function") return <Dynamic component={shape as any} class={clsx(styles.icon, className)} />;
    return (<svg class={clsx(styles.icon, className)} viewBox="0 0 24 24"><path d={shape}/></svg>);
}
