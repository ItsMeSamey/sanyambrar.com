import { type ClassName } from "../../widget/components/types.ts";
import { AlarmClockCheck, Trophy } from "../../../../shared/components/Icons.tsx";
import { clsx } from "clsx";
import styles from "./event-icons.module.css";
import { Dynamic } from '@solidjs/web';
import { type LucideIcon } from '../../../../shared/components/Icons.tsx';
export function TrophyIcon() {
    return <Icon shape={Trophy} className={styles.trophy}/>;
}
export function DailyGoalIcon() {
    return <Icon shape={AlarmClockCheck}/>;
}
function Icon(props: {
    readonly shape: string | LucideIcon;
    readonly className?: ClassName;
}) {
    if (typeof props.shape === "function") return <Dynamic component={props.shape} class={clsx(styles.icon, props.className)} />;
    return (<svg class={clsx(styles.icon, props.className)} viewBox="0 0 24 24"><path d={props.shape}/></svg>);
}
