import { booleanProp, Preferences } from "@keybr/settings";
import { Button, Field, FieldList, useExplainerState } from "@keybr/widget";
import { useLayoutEffect } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
export function ExplainToggle(solidProps: {
    readonly preference: string;
    readonly messageId: string;
    readonly defaultMessage: string;
}) {
    const { formatMessage } = useIntl();
    const { explainersVisible, toggleExplainers } = useExplainerState();
    const prop = booleanProp(solidProps.preference, true);
    useLayoutEffect(() => toggleExplainers(Preferences.get(prop)));
    return (<FieldList>
      <Field>
        <Button onClick={() => {
            toggleExplainers(!explainersVisible);
            Preferences.set(prop, !explainersVisible);
        }}>
          {explainersVisible
            ? `\u25BC ${formatMessage({ id: "t_Hide_explanations", defaultMessage: "Hide explanations" })}`
            : `\u25BA ${formatMessage({ id: solidProps.messageId, defaultMessage: solidProps.defaultMessage })}`}
        </Button>
      </Field>
    </FieldList>);
}
