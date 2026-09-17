import type { JSX } from "@solidjs/web";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
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
