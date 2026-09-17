import { booleanProp, Preferences } from "@keybr/settings";
import { Button, useExplainerState } from "@keybr/widget";
import { onSettled } from "solid-js";
import { useIntl } from "@keybr/intl";

export function ExplainToggle(props: {
    readonly preference: string;
    readonly messageId: string;
    readonly defaultMessage: string;
}) {
    const { formatMessage } = useIntl();
    const explainerState = useExplainerState();
    const prop = booleanProp(props.preference, true);
    onSettled(() => explainerState.toggleExplainers(Preferences.get(prop)));
    return <Button onClick={() => {
        const visible = !explainerState.explainersVisible;
        explainerState.toggleExplainers(visible);
        Preferences.set(prop, visible);
    }}>
      {explainerState.explainersVisible
        ? `\u25BC ${formatMessage({ id: "t_Hide_explanations", defaultMessage: "Hide explanations" })}`
        : `\u25BA ${formatMessage({ id: props.messageId, defaultMessage: props.defaultMessage })}`}
    </Button>;
}
