import { Description, Explainer, FieldSet } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { BenfordProp } from "./BenfordProp.tsx";
export function NumbersLessonSettings(): ReactNode {
    const { formatMessage } = useIntl();
    return (<>
      <Explainer>
        <Description>
          <FormattedMessage id="lessonType.numbers.description" defaultMessage="Practice numbers only."/>
        </Description>
      </Explainer>
      <FieldSet legend={formatMessage({
            id: "t_Lesson_options",
            defaultMessage: "Lesson options",
        })}>
        <BenfordProp />
      </FieldSet>
    </>);
}
