import { type LessonKeys } from "@keybr/lesson";
import { type ClassName, styleTextTruncate } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { Key } from "./Key.tsx";
import { KeyDetails } from "./KeyDetails.tsx";
export const CurrentKey = ({ id, className, lessonKeys, }: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
}) => {
    const focusedKey = lessonKeys.findFocusedKey();
    return (<span id={id} class={className}>
      {focusedKey != null ? (<>
          <Key lessonKey={focusedKey}/> <KeyDetails lessonKey={focusedKey}/>
        </>) : (<span class={styleTextTruncate}>
          <FormattedMessage id="t_All_keys_are_unlocked" defaultMessage="All keys are unlocked."/>
        </span>)}
    </span>);
};
