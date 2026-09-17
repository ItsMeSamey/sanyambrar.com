import type { JSX } from "@solidjs/web";
import { getDir } from "../../../intl/locale.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { useFormatter } from "../../../lesson-ui/format.ts";
import { useSettings } from "../../../settings/context.ts";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { Icon } from "../../../widget/components/icon/Icon.tsx";
import { IconButton } from "../../../widget/components/button/IconButton.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";
import { Value } from "../../../widget/components/text/NameValue.tsx";
import { SkipForward, SkipBack } from "../../../widget/icons.ts";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
export function TargetSpeedProp(): JSX.Element {
    const { formatSpeed } = useFormatter();
    const { locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    const { settings, updateSettings } = useSettings();
    const targetSpeed = () => settings.get(lessonProps.targetSpeed);
    return (<span style={{ display: "contents" }}>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Target_typing_speed:" defaultMessage="Target typing speed:"/>
        </Field>
        <Field>
          <Range size={16} min={lessonProps.targetSpeed.min} max={lessonProps.targetSpeed.max} step={1} value={targetSpeed()} onChange={(value) => {
            updateSettings(settings.set(lessonProps.targetSpeed, value));
        }}/>
        </Field>
        <Field>
          <span style={{ display: "contents" }}>
            <IconButton icon={<Icon shape={rtl ? SkipForward : SkipBack}/>} disabled={targetSpeed() === lessonProps.targetSpeed.min} onClick={() => {
            updateSettings(settings.set(lessonProps.targetSpeed, Math.ceil(targetSpeed() / 5) * 5 - 5));
        }}/>
            <IconButton icon={<Icon shape={rtl ? SkipBack : SkipForward}/>} disabled={targetSpeed() === lessonProps.targetSpeed.max} onClick={() => {
            updateSettings(settings.set(lessonProps.targetSpeed, Math.floor(targetSpeed() / 5) * 5 + 5));
        }}/>
          </span>
        </Field>
        <Field>
          <Value value={formatSpeed(targetSpeed())}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.targetSpeed.description" defaultMessage="The target speed is used to measure the confidence level and the color of a letter. The closer to the target speed, the greener. In the guided mode a letter is only unlocked when you pass a target speed threshold. When you unlock all letters, you can increase the target speed to go back to the learning mode and unlock the letters again, this time with a higher speed threshold. We recommend to increase the target speed in modest steps only when you have all letters above the target speed."/>
        </Description>
      </Explainer>
    </span>);
}
