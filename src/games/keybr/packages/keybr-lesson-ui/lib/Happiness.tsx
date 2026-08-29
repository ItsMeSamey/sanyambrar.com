import { Icon } from "@keybr/widget";
import { mdiEmoticonHappy, mdiEmoticonSad } from "@keybr/solid-compat/mdi";
import * as styles from "./Happiness.module.css";
export function Happiness(solidProps: {
    learningRate: number;
}) {
    if (solidProps.learningRate > 0) {
        return (<span class={styles.happy}>
        <Happy />
        {solidProps.learningRate >= +5 && <Happy />}
        {solidProps.learningRate >= +10 && <Happy />}
      </span>);
    }
    if (solidProps.learningRate < 0) {
        return (<span class={styles.sad}>
        <Sad />
        {solidProps.learningRate <= -5 && <Sad />}
        {solidProps.learningRate <= -10 && <Sad />}
      </span>);
    }
    return null;
}
function Happy() {
    return <Icon className={styles.icon} shape={mdiEmoticonHappy}/>;
}
function Sad() {
    return <Icon className={styles.icon} shape={mdiEmoticonSad}/>;
}
