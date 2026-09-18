import { Key } from "../../lesson-ui/Key.tsx";
import type { JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { clsx } from "clsx";
import { AlarmClockCheck, Trophy, type LucideIcon } from "../../../../shared/components/Icons.tsx";
import { toastProps, useToast } from "../../widget/components/toast/context.tsx";
import { toast } from "../../widget/components/toast/Toaster.tsx";
import { FormattedMessage } from "../../intl/runtime.tsx";
import styles from "./EventAlert.module.css";
import { type LessonEvent } from "./event-types.ts";
function EventAlert(props: {
    readonly event: LessonEvent;
}) {
    switch (props.event.type) {
        case "new-letter":
            return (<Award icon={<Key lessonKey={props.event.lessonKey} size="announcement"/>}>
          <FormattedMessage id="t_ev_New_letter_unlocked" defaultMessage="New letter unlocked!"/>
        </Award>);
        case "top-speed":
            return (<Award icon={<TrophyIcon />}>
          <FormattedMessage id="t_ev_Top_speed" defaultMessage="Top speed!"/>
        </Award>);
        case "top-score":
            return (<Award icon={<TrophyIcon />}>
          <FormattedMessage id="t_ev_Top_score" defaultMessage="Top score!"/>
        </Award>);
        case "daily-goal":
            return (<Award icon={<DailyGoalIcon />}>
          <FormattedMessage id="t_ev_Daily_goal_reached" defaultMessage="Daily goal reached!"/>
        </Award>);
    }
}
export function displayEvent(event: LessonEvent): void {
    toast(() => <EventAlert event={event}/>, {
        autoClose: 3000,
        closeOnClick: true,
        pauseOnHover: true,
    });
}

function Award(props: { readonly icon: JSX.Element; readonly children: JSX.Element }): JSX.Element {
    const toast = useToast();
    return <div class={styles.award} {...toastProps(toast)}>
      <div class={styles.awardIcon}>{props.icon}</div>
      <div class={styles.message}>{props.children}</div>
    </div>;
}
function EventIcon(props: { readonly shape: LucideIcon; readonly trophy?: boolean }) {
    return <Dynamic component={props.shape} class={clsx(styles.icon, props.trophy && styles.trophy)}/>;
}
function TrophyIcon() { return <EventIcon shape={Trophy} trophy/>; }
function DailyGoalIcon() { return <EventIcon shape={AlarmClockCheck}/>; }
