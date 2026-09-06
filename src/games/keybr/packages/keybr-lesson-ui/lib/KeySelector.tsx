import { LessonKey, Target } from "@keybr/lesson";
import { type Letter } from "@keybr/phonetic-model";
import { type KeyStatsMap } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { type FocusProps, useHotkeysHandler } from "@keybr/widget";
import { Key } from "./Key.tsx";
import * as styles from "./KeySelector.module.css";
export const KeySelector = (solidProps: {
    current: Letter;
    keyStatsMap: KeyStatsMap;
    title?: string;
    onSelect?: (letter: Letter) => void;
} & FocusProps) => {
    const { settings } = useSettings();
    const target = new Target(settings);
    const letters = () => solidProps.keyStatsMap.letters;
    const handlePrev = () => {
        if (solidProps.onSelect != null) {
            const currentIndex = letters().findIndex((letter) => letter.codePoint === solidProps.current.codePoint);
            let selectedIndex;
            if (currentIndex === -1 || currentIndex === 0) {
                selectedIndex = letters().length - 1;
            }
            else {
                selectedIndex = currentIndex - 1;
            }
            solidProps.onSelect(letters()[selectedIndex]);
        }
    };
    const handleNext = () => {
        if (solidProps.onSelect != null) {
            const currentIndex = letters().findIndex((letter) => letter.codePoint === solidProps.current.codePoint);
            let selectedIndex;
            if (currentIndex === -1 || currentIndex === letters().length - 1) {
                selectedIndex = 0;
            }
            else {
                selectedIndex = currentIndex + 1;
            }
            solidProps.onSelect(letters()[selectedIndex]);
        }
    };
    return (<span class={styles.root} tabindex={solidProps.disabled ? undefined : (solidProps.tabIndex ?? 0)} title={solidProps.title} onFocus={solidProps.onFocus} onBlur={solidProps.onBlur} onKeyDown={useHotkeysHandler({
            ["ArrowLeft"]: handlePrev,
            ["ArrowUp"]: handlePrev,
            ["ArrowRight"]: handleNext,
            ["ArrowDown"]: handleNext,
        })}>
      {letters().map((letter) => (<Key lessonKey={LessonKey.from(solidProps.keyStatsMap.get(letter), target).asIncluded()} isSelectable={true} isCurrent={solidProps.current.codePoint === letter.codePoint} onClick={() => {
                if (solidProps.onSelect != null) {
                    solidProps.onSelect(letter);
                }
            }}/>))}
    </span>);
};
