import type { JSX } from "@solidjs/web";
import { Syntax } from "../../../code/syntax.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { CheckBox } from "../../../widget/components/checkbox/CheckBox.tsx";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";
import { OptionList } from "../../../widget/components/optionlist/OptionList.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
export function CodeLessonSettings(): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    const syntax = () => settings.get(lessonProps.code.syntax);
    const flags = () => settings.get(lessonProps.code.flags);
    return (<>
      <Explainer>
        <Description>
          <FormattedMessage id="lessonType.code.description" defaultMessage="Practice punctuation characters that are specific to a programming language syntax."/>
        </Description>
      </Explainer>
      <FieldSet legend={formatMessage({
            id: "t_Lesson_options",
            defaultMessage: "Lesson options",
        })}>
        <FieldList>
          <Field>
            <FormattedMessage id="t_Syntax:" defaultMessage="Syntax:"/>
          </Field>
          <Field>
            <OptionList options={Syntax.ALL.map((item) => ({
            value: item.id,
            name: item.name,
        }))} value={syntax().id} onSelect={(id) => {
            updateSettings(settings.set(lessonProps.code.syntax, Syntax.ALL.get(id)));
        }}/>
          </Field>
          {[...syntax().flags].map((flag) => {
            return (<Field>
                <CheckBox label={flag} checked={flags().includes(flag)} onChange={(checked) => {
                    const set = new Set(flags());
                    if (checked) {
                        set.add(flag);
                    }
                    else {
                        set.delete(flag);
                    }
                    updateSettings(settings.set(lessonProps.code.flags, [...set]));
                }}/>
              </Field>);
        })}
        </FieldList>
        <Explainer>
          <Description>
            <FormattedMessage id="lessonType.syntax.description" defaultMessage="Generate lessons that resemble the specified programming language syntax."/>
          </Description>
        </Explainer>
      </FieldSet>
    </>);
}
