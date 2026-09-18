import type { JSX } from "@solidjs/web";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Toggle } from "../../../widget/components/toggle/Toggle.tsx";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
export function BenfordProp(): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <Toggle label={formatMessage({
            id: "settings.benfordsLaw.label",
            defaultMessage: "Benford’s law",
        })} checked={settings.get(lessonProps.numbers.benford)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.numbers.benford, value));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.benfordsLaw.description" defaultMessage="<a>Benford’s law</a> is an observation that in many real-life numerical data sets, the leading digit is likely to be small." values={{
            a: (chunks: JSX.Element) => (<a href="https://en.wikipedia.org/wiki/Benford's_law" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>),
        }}/>
        </Description>
      </Explainer>
    </>);
}
