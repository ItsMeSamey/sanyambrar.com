import { clsx } from "@keybr/solid-compat/clsx";
import { Children, type ReactElement, type ReactNode, useState } from "@keybr/solid-compat/react";
import { useHotkeysHandler } from "../../hooks/use-hotkeys.ts";
import * as styles from "./TabList.module.css";
import { type TabListProps, type TabProps } from "./TabList.types.ts";
export function TabList({ disabled, children, selectedIndex = 0, onBlur, onFocus, onSelect, }: TabListProps): ReactNode {
    const [focused, setFocused] = useState(false);
    const tabs = Children.toArray(children) as ReactElement<TabProps>[];
    const selectedTab = tabs[selectedIndex];
    const select = (selectedIndex: number): void => {
        if (!disabled && onSelect != null) {
            if (selectedIndex < 0) {
                selectedIndex = tabs.length - 1;
            }
            else if (selectedIndex >= tabs.length) {
                selectedIndex = 0;
            }
            onSelect(selectedIndex);
        }
    };
    const selectPrev = () => {
        select(selectedIndex - 1);
    };
    const selectNext = () => {
        select(selectedIndex + 1);
    };
    const hotkeys = useHotkeysHandler({
        ["ArrowLeft"]: selectPrev,
        ["ArrowUp"]: selectPrev,
        ["ArrowRight"]: selectNext,
        ["ArrowDown"]: selectNext,
    });
    const items: ReactNode[] = [];
    items.push(<span class={clsx(styles.spacer, styles.spacerFirst)}/>);
    tabs.forEach((tab, index) => {
        const selected = tab === selectedTab;
        if (index > 0) {
            items.push(<span class={clsx(styles.spacer, styles.spacerMiddle)}/>);
        }
        items.push(<span ref={(element) => {
                if (focused() && selected) {
                    element?.focus();
                }
            }} class={clsx(styles.item, selected ? styles.itemActive : styles.itemInactive, disabled && styles.disabled)} tabIndex={!disabled && selected ? 0 : undefined} title={tab.props.title} onFocus={(event) => {
                setFocused(true);
                if (onFocus != null) {
                    onFocus(event);
                }
            }} onBlur={(event) => {
                setFocused(false);
                if (onBlur != null) {
                    onBlur(event);
                }
            }} onClick={(event) => {
                event.preventDefault();
                select(index);
                setFocused(true);
            }} onKeyDown={hotkeys}>
        {tab.props.label}
      </span>);
    });
    items.push(<span class={clsx(styles.spacer, styles.spacerLast)}/>);
    return (<>
      <div class={styles.root}>{items}</div>
      {selectedTab.props.children}
    </>);
}
export function Tab(props: TabProps): ReactNode {
    return null;
}
