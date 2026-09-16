import { createMemo } from "solid-js";
import { LessonKey, Target } from "@keybr/lesson";
import { type Letter } from "@keybr/phonetic-model";
import { type KeyStatsMap } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { type FocusProps, useHotkeysHandler } from "@keybr/widget";
import { Key } from "./Key.tsx";
import * as styles from "./KeySelector.module.css";
export const KeySelector = (props: {
    current: Letter;
    keyStatsMap: KeyStatsMap;
    title?: string;
    onSelect?: (letter: Letter) => void;
} & FocusProps) => {
    const { settings } = useSettings();
    const target = createMemo(() => new Target(settings));
    const letters = () => props.keyStatsMap.letters;
    const handlePrev = () => {
        if (props.onSelect != null) {
            const currentIndex = letters().findIndex((letter) => letter.codePoint === props.current.codePoint);
            let selectedIndex;
            if (currentIndex === -1 || currentIndex === 0) {
                selectedIndex = letters().length - 1;
            }
            else {
                selectedIndex = currentIndex - 1;
            }
            props.onSelect(letters()[selectedIndex]);
        }
    };
    const handleNext = () => {
        if (props.onSelect != null) {
            const currentIndex = letters().findIndex((letter) => letter.codePoint === props.current.codePoint);
            let selectedIndex;
            if (currentIndex === -1 || currentIndex === letters().length - 1) {
                selectedIndex = 0;
            }
            else {
                selectedIndex = currentIndex + 1;
            }
            props.onSelect(letters()[selectedIndex]);
        }
    };
    return (<span class={styles.root} tabindex={props.disabled ? undefined : (props.tabIndex ?? 0)} title={props.title} onFocus={props.onFocus} onBlur={props.onBlur} onKeyDown={useHotkeysHandler({
            ["ArrowLeft"]: handlePrev,
            ["ArrowUp"]: handlePrev,
            ["ArrowRight"]: handleNext,
            ["ArrowDown"]: handleNext,
        })}>
      {letters().map((letter) => (<Key lessonKey={LessonKey.from(props.keyStatsMap.get(letter), target()).asIncluded()} isSelectable={true} isCurrent={props.current.codePoint === letter.codePoint} onClick={() => {
                if (props.onSelect != null) {
                    props.onSelect(letter);
                }
            }}/>))}
    </span>);
};
