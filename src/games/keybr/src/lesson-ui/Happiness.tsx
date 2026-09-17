import { Icon } from "../widget/components/icon/Icon.tsx";
import { Smile, Frown } from "../widget/icons.ts";
import styles from "./Happiness.module.css";
export function Happiness(props: {
    learningRate: number;
}) {
    const content = () => props.learningRate > 0 ? (<span class={styles.happy}>
      <Happy />
      {props.learningRate >= 5 && <Happy />}
      {props.learningRate >= 10 && <Happy />}
    </span>) : props.learningRate < 0 ? (<span class={styles.sad}>
      <Sad />
      {props.learningRate <= -5 && <Sad />}
      {props.learningRate <= -10 && <Sad />}
    </span>) : null;
    return <>{content()}</>;
}
function Happy() {
    return <Icon className={styles.icon} shape={Smile}/>;
}
function Sad() {
    return <Icon className={styles.icon} shape={Frown}/>;
}
