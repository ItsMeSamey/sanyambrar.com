import { Field, FieldList, Range } from "@keybr/widget";
import { defineMessage, useIntl } from "@keybr/solid-compat/intl";
export function SmoothnessRange(solidProps: {
    value: number;
    disabled: boolean;
    onChange: (value: number) => void;
}) {
    const { formatMessage } = useIntl();
    return (<FieldList>
      <Field.Filler />
      <Field>
        <label>
          {formatMessage(defineMessage({
            id: "t_Smoothness:",
            defaultMessage: "Smoothness:",
        }))}
        </label>
      </Field>
      <Field>
        <Range size={16} disabled={solidProps.disabled} min={0} max={100} step={10} value={Math.round(solidProps.value * 100)} title={formatMessage(defineMessage({
            id: "stats.smoothness.description",
            defaultMessage: "Eliminate noise to see the long-term trend.",
        }))} onChange={(value) => {
            solidProps.onChange(value / 100);
        }}/>
      </Field>
      <Field.Filler />
    </FieldList>);
}
