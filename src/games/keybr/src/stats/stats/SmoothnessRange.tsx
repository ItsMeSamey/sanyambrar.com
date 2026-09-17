import { Field, FieldList } from "../../widget/components/fieldlist/FieldList.tsx";
import { Range } from "../../widget/components/range/Range.tsx";
import { defineMessage, useIntl } from "../../intl/runtime.tsx";
export function SmoothnessRange(props: {
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
        <Range size={16} disabled={props.disabled} min={0} max={100} step={10} value={Math.round(props.value * 100)} title={formatMessage(defineMessage({
            id: "stats.smoothness.description",
            defaultMessage: "Eliminate noise to see the long-term trend.",
        }))} onChange={(value) => {
            props.onChange(value / 100);
        }}/>
      </Field>
      <Field.Filler />
    </FieldList>);
}
