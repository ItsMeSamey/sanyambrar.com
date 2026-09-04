import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useEffect, useRef } from "@keybr/solid-compat/react";
import { ensureVisible } from "../../utils/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListMenu.module.css";
export function OptionListMenu(solidProps: {
    readonly options: readonly OptionListOption[];
    readonly selectedOption: OptionListOption;
    readonly onSelect: (value: OptionListOption) => void;
}): ReactNode {
    const list = useRef<HTMLUListElement>();
    const item = useRef<HTMLLIElement>();
    useEffect(() => {
        ensureVisible(list.current, item.current);
    });
    return (<ul ref={el => list.current = el} role="menu" data-cursor-round="" data-samey-overlay="" class={styles.root}>
      {solidProps.options.map((option) => (<li ref={option === solidProps.selectedOption ? (el => item.current = el) : undefined} role="menuitem" class={clsx(styles.item, iconStyles.altIcon, option === solidProps.selectedOption && styles.itemSelected)} onClick={(event) => {
                event.preventDefault();
                solidProps.onSelect(option);
            }}>
          {option.name}
        </li>))}
    </ul>);
}
