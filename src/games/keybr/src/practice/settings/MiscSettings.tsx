import type { JSX } from "@solidjs/web";
import { SpeedUnit } from "../../result/speedunit.ts";
import { uiProps } from "../../result/settings.ts";
import { useSettings } from "../../settings/context.ts";
import { Description } from "../../widget/components/text/Description.tsx";
import { Explainer } from "../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../widget/components/fieldlist/FieldList.tsx";
import { FieldSet } from "../../widget/components/form/Form.tsx";
import { OptionList } from "../../widget/components/optionlist/OptionList.tsx";

import { FormattedMessage, useIntl } from "../../intl/runtime.tsx";
export function MiscSettings(): JSX.Element {
    const { formatMessage } = useIntl();
    return (<>
      <FieldSet legend={formatMessage({
            id: "t_Interface_options",
            defaultMessage: "Interface options",
        })}>
        <SpeedUnitProp />
      </FieldSet>
    </>);
}
function SpeedUnitProp(): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Measure_typing_speed_in:" defaultMessage="Measure typing speed in:"/>
        </Field>
        <Field>
          <OptionList options={SpeedUnit.ALL.map((item) => ({
            value: item.id,
            name: formatMessage(item.name),
        }))} value={settings.get(uiProps.speedUnit).id} onSelect={(id) => {
            updateSettings(settings.set(uiProps.speedUnit, SpeedUnit.ALL.get(id)));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.typingSpeedUnit.description" defaultMessage="For the purpose of typing measurement, each word is standardized to be five characters or keystrokes in English, including spaces and punctuation."/>
        </Description>
      </Explainer>
    </>);
}
