import { booleanProp, Preferences } from "@keybr/settings";
import { Button, Field, FieldList, useExplainerState } from "@keybr/widget";
import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";

export function ExplainToggle({ preference, messageId, defaultMessage }: { readonly preference: string; readonly messageId: string; readonly defaultMessage: string }) {
  const { formatMessage } = useIntl();
  const { explainersVisible, toggleExplainers } = useExplainerState();
  const prop = booleanProp(preference, true);
  useLayoutEffect(() => toggleExplainers(Preferences.get(prop)));
  return (
    <FieldList>
      <Field>
        <Button
          onClick={() => {
            toggleExplainers(!explainersVisible);
            Preferences.set(prop, !explainersVisible);
          }}
        >
          {explainersVisible
            ? `\u25BC ${formatMessage({ id: "t_Hide_explanations", defaultMessage: "Hide explanations" })}`
            : `\u25BA ${formatMessage({ id: messageId, defaultMessage })}`}
        </Button>
      </Field>
    </FieldList>
  );
}
