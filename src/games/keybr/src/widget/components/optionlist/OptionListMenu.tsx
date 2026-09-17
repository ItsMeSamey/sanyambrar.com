import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { createEffect } from "solid-js";
import { ensureVisible } from "../../utils/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListMenu.module.css";
export function OptionListMenu(props: {
    readonly options: readonly OptionListOption[];
    readonly selectedOption: OptionListOption;
    readonly onSelect: (value: OptionListOption) => void;
}): JSX.Element {
    let list: HTMLUListElement | undefined;
    let item: HTMLLIElement | undefined;
    createEffect(() => props.selectedOption, () => ensureVisible(list ?? null, item ?? null));
    return (<ul ref={el => list = el} role="menu" data-cursor-round="" data-samey-overlay="" class={styles.root}>
      {props.options.map((option) => (<li ref={option === props.selectedOption ? (el => item = el) : undefined} role="menuitem" class={clsx(styles.item, iconStyles.altIcon, option === props.selectedOption && styles.itemSelected)} onClick={(event) => {
                event.preventDefault();
                props.onSelect(option);
            }}>
          {option.name}
        </li>))}
    </ul>);
}
