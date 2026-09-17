import { booleanProp } from "../settings/props.ts";
import { Preferences } from "../settings/preferences.ts";
import { Button } from "../widget/components/button/Button.tsx";
import { useExplainerState } from "../widget/components/explainer/context.ts";
import { onSettled } from "solid-js";
import { useIntl } from "../intl/runtime.tsx";

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
