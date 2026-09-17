import type { JSX } from "@solidjs/web";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";
import { Value } from "../../../widget/components/text/NameValue.tsx";

import { FormattedMessage } from "../../../intl/runtime.tsx";
export function RepeatWordsProp(): JSX.Element {
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Repeat_each_word:" defaultMessage="Repeat each word:"/>
        </Field>
        <Field>
          <Range min={lessonProps.repeatWords.min} max={lessonProps.repeatWords.max} step={1} value={settings.get(lessonProps.repeatWords)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.repeatWords, value));
        }}/>
        </Field>
        <Field>
          <Value value={settings.get(lessonProps.repeatWords)}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.repeatWords.description" defaultMessage="Repeat each word a number of times. Type a word for the first time to develop your muscle memory. Typing the same word consecutively should be easier."/>
        </Description>
      </Explainer>
    </>);
}
