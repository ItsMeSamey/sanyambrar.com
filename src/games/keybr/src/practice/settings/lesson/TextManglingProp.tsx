import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../../../intl/numbers.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";
import { Value } from "../../../widget/components/text/NameValue.tsx";

import { FormattedMessage } from "../../../intl/runtime.tsx";
export function TextManglingProp(): JSX.Element {
    const { formatPercents } = useIntlNumbers();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Add_capital_letters:" defaultMessage="Add capital letters:"/>
        </Field>
        <Field>
          <Range size={16} min={0} max={100} step={1} value={Math.round(settings.get(lessonProps.capitals) * 100)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.capitals, value / 100));
        }}/>
        </Field>
        <Field>
          <Value value={formatPercents(settings.get(lessonProps.capitals))}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.capitalLetters.description" defaultMessage="Adjust the amount of capital letters added to the lesson text. Use this option to practice typing the capital letters. We recommend to increase this value only if you have all letters above the target speed."/>
        </Description>
      </Explainer>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Add_punctuation_characters:" defaultMessage="Add punctuation characters:"/>
        </Field>
        <Field>
          <Range size={16} min={0} max={100} step={1} value={Math.round(settings.get(lessonProps.punctuators) * 100)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.punctuators, value / 100));
        }}/>
        </Field>
        <Field>
          <Value value={formatPercents(settings.get(lessonProps.punctuators))}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.punctuation.description" defaultMessage="Adjust the amount of basic punctuation characters added to the lesson text. Use this option to practice typing the punctuation characters. We recommend to increase this value only if you have all letters above the target speed."/>
        </Description>
      </Explainer>
    </>);
}
