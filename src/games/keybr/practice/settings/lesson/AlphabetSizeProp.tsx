import type { JSX } from "@solidjs/web";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";

import { FormattedMessage } from "../../../intl/runtime.tsx";
export function AlphabetSizeProp(): JSX.Element {
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Unlock_more_letters:" defaultMessage="Unlock more letters:"/>
        </Field>
        <Field>
          <Range size={16} min={1} max={100} step={1} value={Math.round(settings.get(lessonProps.guided.alphabetSize) * 100)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.guided.alphabetSize, value / 100));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.alphabetSize.description" defaultMessage="Manually unlock the remaining letters. Use this option if want a greater variety of words. We recommend using this option sparingly and stick to the algorithm to unlock letters for you."/>
        </Description>
      </Explainer>
    </>);
}
