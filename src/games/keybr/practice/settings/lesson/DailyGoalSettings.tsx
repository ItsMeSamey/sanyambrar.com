import type { JSX } from "@solidjs/web";
import { useIntlDurations } from "../../../intl/durations.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";
import { Value } from "../../../widget/components/text/NameValue.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
export function DailyGoalSettings(): JSX.Element {
    const { formatMessage } = useIntl();
    const { formatDuration } = useIntlDurations();
    const { settings, updateSettings } = useSettings();
    return (<FieldSet>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:"/>
        </Field>
        <Field>
          <Range size={16} min={0} max={24} step={1} value={Math.round(settings.get(lessonProps.dailyGoal) / 5)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.dailyGoal, value * 5));
        }}/>
        </Field>
        <Field>
          {settings.get(lessonProps.dailyGoal) === 0 ? (formatMessage({
            id: "t_Not_set",
            defaultMessage: "Not set",
        })) : (<Value value={formatDuration({
                minutes: settings.get(lessonProps.dailyGoal),
            })}/>)}
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.dailyGoal.description" defaultMessage="Set the time you want to spend on the exercises daily. It is a simple reminder which does not limit you in any way. You can stop practicing whenever you want."/>
        </Description>
      </Explainer>
    </FieldSet>);
}
