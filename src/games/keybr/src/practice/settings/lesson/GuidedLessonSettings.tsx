import type { JSX } from "@solidjs/web";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
import { AlphabetSizeProp } from "./AlphabetSizeProp.tsx";
import { KeyboardOrderProp } from "./KeyboardOrderProp.tsx";
import { LessonLengthProp } from "./LessonLengthProp.tsx";
import { NaturalWordsProp } from "./NaturalWordsProp.tsx";
import { RecoverKeysProp } from "./RecoverKeysProp.tsx";
import { RepeatWordsProp } from "./RepeatWordsProp.tsx";
import { TargetSpeedProp } from "./TargetSpeedProp.tsx";
import { TextManglingProp } from "./TextManglingProp.tsx";
export function GuidedLessonSettings(): JSX.Element {
    const { formatMessage } = useIntl();
    return (<>
      <Explainer>
        <Description>
          <FormattedMessage id="lessonType.guided.description" defaultMessage="Generate typing lessons with random words using the phonetic rules of your language. The key set is expanded dynamically based on your performance. This mode is for the beginners."/>
        </Description>
      </Explainer>
      <FieldSet legend={formatMessage({
            id: "t_Lesson_options",
            defaultMessage: "Lesson options",
        })}>
        <TargetSpeedProp />
        <RecoverKeysProp />
        <KeyboardOrderProp />
        <NaturalWordsProp />
        <RepeatWordsProp />
        <AlphabetSizeProp />
        <TextManglingProp />
        <LessonLengthProp />
      </FieldSet>
    </>);
}
