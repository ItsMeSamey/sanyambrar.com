import { type LessonKeys } from "../lesson/key.ts";
import { type ClassName } from "../widget/components/types.ts";
import { styleTextTruncate } from "../widget/styles/text.ts";
import { FormattedMessage } from "../intl/runtime.tsx";
import { Show } from 'solid-js';
import { Key } from "./Key.tsx";
import { KeyDetails } from "./KeyDetails.tsx";
export const CurrentKey = (props: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
}) => {
    const focusedKey = () => props.lessonKeys.findFocusedKey();
    return (<span id={props.id} class={props.className}>
      <Show when={focusedKey()} keyed fallback={<span class={styleTextTruncate}>
        <FormattedMessage id="t_All_keys_are_unlocked" defaultMessage="All keys are unlocked."/>
      </span>}>{(key) => <><Key lessonKey={key}/> <KeyDetails lessonKey={key}/></>}</Show>
    </span>);
};
