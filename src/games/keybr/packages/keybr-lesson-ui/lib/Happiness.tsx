import { Icon } from "@keybr/widget";
import { Smile, Frown } from "@keybr/widget";
import * as styles from "./Happiness.module.css";
export function Happiness(solidProps: {
    learningRate: number;
}) {
    const content = () => solidProps.learningRate > 0 ? (<span class={styles.happy}>
      <Happy />
      {solidProps.learningRate >= 5 && <Happy />}
      {solidProps.learningRate >= 10 && <Happy />}
    </span>) : solidProps.learningRate < 0 ? (<span class={styles.sad}>
      <Sad />
      {solidProps.learningRate <= -5 && <Sad />}
      {solidProps.learningRate <= -10 && <Sad />}
    </span>) : null;
    return <>{content()}</>;
}
function Happy() {
    return <Icon className={styles.icon} shape={Smile}/>;
}
function Sad() {
    return <Icon className={styles.icon} shape={Frown}/>;
}
