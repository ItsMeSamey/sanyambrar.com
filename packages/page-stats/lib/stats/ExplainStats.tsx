import { booleanProp, Preferences } from "@keybr/settings";
import { Button, Field, FieldList, useExplainerState } from "@keybr/widget";
import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";

const propExplainStats = booleanProp("prefs.stats.explain", true);

export function ExplainStats() {
  const { formatMessage } = useIntl();
  const { explainersVisible, toggleExplainers } = useExplainerState();
  useLayoutEffect(() => {
    toggleExplainers(Preferences.get(propExplainStats));
  });
  return (
    <FieldList>
      <Field.Filler />
      <Field>
        <Button
          onClick={() => {
            toggleExplainers(!explainersVisible);
            Preferences.set(propExplainStats, !explainersVisible);
          }}
        >
          {explainersVisible
            ? `\u25BC ${formatMessage({
                id: "t_Hide_explanations",
                defaultMessage: "Hide explanations",
              })}`
            : `\u25BA ${formatMessage({
                id: "t_Explain_charts",
                defaultMessage: "Explain charts",
              })}`}
        </Button>
      </Field>
    </FieldList>
  );
}
