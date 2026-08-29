import { type LessonKeys } from "@keybr/lesson";
import { type ClassName, styleTextTruncate } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { Show } from "solid-js";
import { Key } from "./Key.tsx";
import { KeyDetails } from "./KeyDetails.tsx";
export const CurrentKey = (solidProps: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
}) => {
    const focusedKey = () => solidProps.lessonKeys.findFocusedKey();
    return (<span id={solidProps.id} class={solidProps.className}>
      <Show when={focusedKey()} keyed fallback={<span class={styleTextTruncate}>
        <FormattedMessage id="t_All_keys_are_unlocked" defaultMessage="All keys are unlocked."/>
      </span>}>{(key) => <><Key lessonKey={key}/> <KeyDetails lessonKey={key}/></>}</Show>
    </span>);
};
