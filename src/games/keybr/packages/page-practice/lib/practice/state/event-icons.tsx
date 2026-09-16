import { type ClassName } from "@keybr/widget";
import { AlarmClockCheck, Trophy } from "@keybr/widget";
import { clsx } from "clsx";
import * as styles from "./event-icons.module.css";
import { Dynamic } from '@solidjs/web';
import { type LucideIcon } from '../../../../../../../ui-kit/components/lucide.tsx';
export function TrophyIcon() {
    return <Icon shape={Trophy} className={styles.trophy}/>;
}
export function DailyGoalIcon() {
    return <Icon shape={AlarmClockCheck}/>;
}
function Icon(solidProps: {
    readonly shape: string | LucideIcon;
    readonly className?: ClassName;
}) {
    if (typeof solidProps.shape === "function") return <Dynamic component={solidProps.shape} class={clsx(styles.icon, solidProps.className)} />;
    return (<svg class={clsx(styles.icon, solidProps.className)} viewBox="0 0 24 24"><path d={solidProps.shape}/></svg>);
}
