import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useEffect, useRef } from "@keybr/solid-compat/react";
import { ensureVisible } from "../../utils/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListMenu.module.css";
export function OptionListMenu({ options, selectedOption, onSelect, }: {
    readonly options: readonly OptionListOption[];
    readonly selectedOption: OptionListOption;
    readonly onSelect: (value: OptionListOption) => void;
}): ReactNode {
    const list = useRef(null);
    const item = useRef(null);
    useEffect(() => {
        ensureVisible(list.current, item.current);
    });
    return (<ul ref={el => list.current = el} role="menu" class={styles.root}>
      {options.map((option, index) => (<li ref={option === selectedOption ? (el => item.current = el) : undefined} role="menuitem" class={clsx(styles.item, iconStyles.altIcon, option === selectedOption && styles.itemSelected)} onClick={(event) => {
                event.preventDefault();
                onSelect(option);
            }}>
          {option.name}
        </li>))}
    </ul>);
}
