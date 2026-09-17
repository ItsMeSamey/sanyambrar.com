import type { JSX } from "@solidjs/web";
import { Description, Explainer, FieldSet } from "@keybr/widget";

import { FormattedMessage, useIntl } from "@keybr/intl";
import { BenfordProp } from "./BenfordProp.tsx";
export function NumbersLessonSettings(): JSX.Element {
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
