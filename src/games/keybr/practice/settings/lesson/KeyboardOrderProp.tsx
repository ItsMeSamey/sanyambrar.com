import type { JSX } from "@solidjs/web";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Toggle } from "../../../widget/components/toggle/Toggle.tsx";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
export function KeyboardOrderProp(): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <Toggle label={formatMessage({
            id: "setting.keyboardOrder.label",
            defaultMessage: "Sort letters in the order of keyboard keys",
        })} checked={settings.get(lessonProps.guided.keyboardOrder)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.guided.keyboardOrder, value));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="setting.keyboardOrder.description" defaultMessage="Sort letters in such a way that the letters from the home row come first, then the letters from the top row, and finally all the remaining letters. Home row is the row with the CapsLock key. Top row is the row with the Tab key. It is easier and faster to type when your fingers do not need to move away from the home row. This feature works best with optimized layouts, like Dvorak or Colemak. In the Qwerty layout, the only vowel on the home row is A, so it severely limits the choice of words, and the algorithm will use more pseudo-words than usual."/>
        </Description>
      </Explainer>
    </>);
}
