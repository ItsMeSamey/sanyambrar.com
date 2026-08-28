import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useState } from "@keybr/solid-compat/react";
import { useHotkeysHandler } from "../../hooks/use-hotkeys.ts";
import * as styles from "./TabList.module.css";
import { type TabListProps, type TabProps } from "./TabList.types.ts";

export function TabList(props: TabListProps): ReactNode {
    const [focused, setFocused] = useState(false);
    const selectedIndex = () => props.selectedIndex ?? 0;
    const selectedTab = () => props.tabs[selectedIndex()] ?? null;
    const select = (index: number): void => {
        if (props.disabled || props.onSelect == null || props.tabs.length === 0) return;
        if (index < 0) index = props.tabs.length - 1;
        else if (index >= props.tabs.length) index = 0;
        props.onSelect(index);
    };
    const hotkeys = useHotkeysHandler({
        ArrowLeft: () => select(selectedIndex() - 1),
        ArrowUp: () => select(selectedIndex() - 1),
        ArrowRight: () => select(selectedIndex() + 1),
        ArrowDown: () => select(selectedIndex() + 1),
    });
    return (<>
      <div class={styles.root}>
        <span class={clsx(styles.spacer, styles.spacerFirst)}/>
        {props.tabs.map((tab, index) => (<>
          {index > 0 && <span class={clsx(styles.spacer, styles.spacerMiddle)}/>}
          <span ref={(element) => {
                if (focused() && index === selectedIndex()) element?.focus();
            }} class={clsx(styles.item, index === selectedIndex() ? styles.itemActive : styles.itemInactive, props.disabled && styles.disabled)} tabIndex={!props.disabled && index === selectedIndex() ? 0 : undefined} title={tab.title} onFocus={(event) => {
                setFocused(true);
                props.onFocus?.(event);
            }} onBlur={(event) => {
                setFocused(false);
                props.onBlur?.(event);
            }} onClick={(event) => {
                event.preventDefault();
                select(index);
                setFocused(true);
            }} onKeyDown={hotkeys}>
            {tab.label}
          </span>
        </>))}
        <span class={clsx(styles.spacer, styles.spacerLast)}/>
      </div>
      {selectedTab()?.children}
    </>);
}

// Retained for source compatibility. Solid does not expose React-style vnode props,
// so callers pass tab descriptors directly to TabList instead of introspecting children.
export function Tab(_props: TabProps): ReactNode { return null; }
